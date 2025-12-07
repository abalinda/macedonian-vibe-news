import os
import json
import time
import random
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from logger import log_event

# New SDK Imports (Migrated from google.generativeai)
from google import genai
from google.genai import types 

# Load environment variables
load_dotenv()

# Configure Gemini API and create the central client instance
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("❌ GEMINI_API_KEY is missing in .env file!")

client = genai.Client(api_key=api_key)

# -----------------------------------------------------------------------------
# 1. MODEL CONFIGURATION & CIRCUIT BREAKER
# -----------------------------------------------------------------------------

# Priority: High capacity/speed (Gemini Flash) -> Lower capacity/Open models (Gemma)
# Added the suggested Gemma models for capacity/cost management
MODEL_PRIORITY = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemma-3-27b-it",  # High intelligence open model (Assuming -it suffix for instruction-tuned)
    "gemma-3-12b-it"
]

# Use the new config type for stateless API calls
GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.1,
    response_mime_type="application/json"
)

# Global state to track model health during this script run (Circuit Breaker)
_model_state = {
    model: {"cooldown_until": datetime.min.replace(tzinfo=timezone.utc), "errors": 0} for model in MODEL_PRIORITY
}

def get_available_model():
    """Returns the highest priority model that isn't in cooldown."""
    now = datetime.now(timezone.utc)
    
    # 1. Find the best healthy model
    available_models = [m for m in MODEL_PRIORITY if now >= _model_state[m]["cooldown_until"]]
    
    if available_models:
        return available_models[0]
    
    # 2. If all are cooling down, force-pick the one with the shortest remaining wait
    print("⚠️ All models in cooldown. Forcing retry soon.")
    next_available = min(
        (m for m in MODEL_PRIORITY if _model_state[m]["cooldown_until"]),
        key=lambda m: _model_state[m]["cooldown_until"]
    )
    time_to_wait = (_model_state[next_available]["cooldown_until"] - now).total_seconds()
    if time_to_wait > 0:
        time.sleep(min(time_to_wait, 3)) # Wait max 3 seconds for quick recovery
    return next_available


def mark_model_failure(model_name, error_msg):
    """Marks a model as 'sick' for a short period to avoid hammering it."""
    now = datetime.now(timezone.utc)
    # Check for common rate limit or temporary server errors
    is_rate_limit = any(code in error_msg.lower() for code in ["429", "500", "503", "quota", "overloaded"])
    # 5 minutes for rate limit, 1 min for other failures
    cooldown_seconds = 300 if is_rate_limit else 60 
    
    _model_state[model_name]["cooldown_until"] = now + timedelta(seconds=cooldown_seconds)
    _model_state[model_name]["errors"] += 1
    print(f"💤 Circuit Breaker activated. Cooling down {model_name} for {cooldown_seconds}s (Error: {str(error_msg)[:50]}...)")
    log_event("curator_model_cooldown", {"model": model_name, "cooldown_s": cooldown_seconds, "error": str(error_msg)})

def generate_with_fallback(prompt: str):
    """
    Tries to generate content using the circuit breaker strategy and stateless client call.
    """
    max_retries = len(MODEL_PRIORITY) * 2
    attempts = 0
    last_error = None

    while attempts < max_retries:
        model_name = get_available_model()
        attempts += 1
        
        try:
            # NEW SDK CALL: Stateless call using client.models.generate_content
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=GENERATION_CONFIG,
            )
            
            if model_name != MODEL_PRIORITY[0]:
                log_event("curator_model_fallback", {"model_used": model_name})
            
            return response
            
        except Exception as err:
            last_error = err
            mark_model_failure(model_name, str(err))
            continue

    raise RuntimeError(f"❌ All models failed after {attempts} attempts. Last error: {last_error}")

# -----------------------------------------------------------------------------
# 2. CURATION LOGIC
# -----------------------------------------------------------------------------

def analyze_news_batch(articles):
    """
    Takes a list of raw articles.
    Returns enriched articles.
    """
    
    if not articles:
        return []

    print(f"🧠 Brain: Analyzing {len(articles)} headlines...")

    # 1. Prepare payload (Only send minimal data to save input tokens)
    payload = []
    for i, article in enumerate(articles):
        # OPTIMIZATION: Truncate context snippet to save input tokens
        payload.append({
            "id": i,
            "title": article['title'],
            "source": article['source'],
            "summary_snippet": article.get('summary_text', '')[:300]
        })

    log_event("curator_input", {"count": len(payload)})

    # 2. The Prompt - Optimized for Token Saving (Lazy Generation)
    prompt = f"""
        You are the "Vibe Editor" for a modern Macedonian news aggregator.

        Each input item includes:
        - id: unique index
        - title: headline text
        - source: outlet name
        - summary_snippet: short plain-text snippet of the article content

        YOUR MISSION
        1. Keep only elegant, good-vibe stories that make readers curious. Think clever tech, art, design, lifestyle upgrades, inspiring business wins, thoughtful human stories.
        2. Reject daily politics, crime, court drama, disasters, weather alerts, utility outages, celebrity gossip, horoscopes, sports match recaps, and bureaucratic notices.
        3. Categorize the survivors accurately.

        CATEGORY RULES (choose exactly one):
        - Tech: AI, software, gadgets, startups, engineering, space/science, digital policy framed positively.
        - Culture: Art, architecture, film, literature, design, history, music, exhibitions, theatre, creative festivals.
        - Lifestyle: Wellness, productivity, travel, gastronomy, fashion, urban living, human-interest, education tips, youth initiatives.
        - Business: Entrepreneurs, funding, career growth, market trends, sustainability wins, Macedonians succeeding in business.
        - Sports: Sports events, athlete achievements, fitness trends, community sports initiatives, inspiring sports stories.
        If nothing fits or vibes are off, REJECT the article rather than forcing a category.

        TOKEN-SAVING INSTRUCTION:
        - "hero_candidate": set to true ONLY for the single most irresistible story in the batch (positive/neutral tone, strong curiosity hook, ideally with clear innovation or cultural impact). Set score 8-10.
        - If "hero_candidate" is true: generate a unique "summary" (1 elegant Macedonian sentence, <= 25 words) and a unique "teaser" (6-10 word uppercase-friendly hook, no punctuation).
        - If "hero_candidate" is false: set both "summary" and "teaser" to **null**. This saves tokens and signals the caller to use the source snippet instead.

        OUTPUT SCHEMA (STRICT JSON ARRAY for robustness):
        {{
            "results": [
                {{
                    "id": 0,
                    "status": "accepted",
                    "category": "Culture",
                    "tone": "positive",
                    "hero_candidate": true,
                    "hero_score": 9,
                    "teaser": "СКОПЈЕ: НОВАТА СЦЕНА НА УЛИЧНАТА УМЕТНОСТ",
                    "summary": "Најновиот мурал во Центар го редефинира урбаниот пејзаж и ја подига свеста за рециклирање."
                }},
                {{
                    "id": 1,
                    "status": "accepted",
                    "category": "Tech",
                    "tone": "neutral",
                    "hero_candidate": false,
                    "hero_score": 5,
                    "teaser": null,
                    "summary": null
                }},
                {{ "id": 2, "status": "rejected", "reason": "Politics" }}
            ]
        }}

        INPUT DATA:
        {json.dumps(payload, ensure_ascii=False)}
        """

    try:
        # 3. Call the Model with fallback logic
        response = generate_with_fallback(prompt)
        
        # 4. Parse JSON
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.replace("```json", "").replace("```", "")
            
        try:
            result_json = json.loads(raw_text)
        except json.JSONDecodeError as parse_err:
            print("🔥 Brain JSON Error:", parse_err)
            log_event("curator_parse_error", {"error": str(parse_err), "raw": raw_text})
            return []
            
        # Standardize results format
        results = result_json.get("results", []) if isinstance(result_json, dict) else result_json
        
        # 5. Reconstruct the final list with fallback logic
        final_articles = []
        rejected_count = 0

        for item in results:
            idx = item.get('id')
            if idx is None or not isinstance(idx, int) or idx >= len(articles): continue
            
            original_article = articles[idx]

            if item.get('status') == 'rejected':
                rejected_count += 1
                reason = item.get('reason', 'No reason provided')
                print(f"🚫 Rejected: {original_article.get('title', 'Unknown Title')} — {reason}")
                continue

            # --- LAZY CONTENT FALLBACK LOGIC: Use original snippet if AI returned null ---
            ai_teaser = item.get('teaser')
            ai_summary = item.get('summary')
            original_summary_text = original_article.get('summary_text', '')
            
            # Fallback for teaser: use AI generated teaser or first 100 chars of original summary
            final_teaser = ai_teaser if ai_teaser else original_summary_text[:100].strip()
            
            # Fallback for summary: use AI generated summary or the full original scraped text
            final_summary = ai_summary if ai_summary else original_summary_text
            
            # Create enriched object
            enriched_article = {
                "title": original_article['title'],
                "link": original_article['link'],
                "source": original_article['source'],
                "published_at": original_article['published_at'],
                "image_url": original_article.get('image_url'),
                # AI Fields
                "summary": final_summary,
                "teaser": final_teaser,
                "category": item.get('category', 'Lifestyle'),
                "tone": item.get('tone', ''),
                "hero_candidate": bool(item.get('hero_candidate', False)),
                "hero_score": int(item.get('hero_score', 0) or 0)
            }
            
            final_articles.append(enriched_article)
            hero_flag = " ⭐" if enriched_article.get("hero_candidate") else ""
            print(f"✅ Approved: {original_article['title']} — {final_teaser}{hero_flag}")

        log_event("curator_output_final", {
            "approved_count": len(final_articles),
            "rejected_count": rejected_count,
        })

        print(f"✨ Vibe Check Complete: Approved {len(final_articles)} out of {len(articles)} articles.")
        return final_articles

    except Exception as e:
        print(f"🔥 Brain Error: {e}")
        log_event("curator_exception", {"error": str(e)})
        return []