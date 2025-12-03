import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from logger import log_event

# Load environment variables
load_dotenv()

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("❌ GEMINI_API_KEY is missing in .env file!")

genai.configure(api_key=api_key)

MODEL_PRIORITY = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]

GENERATION_CONFIG = {
    "temperature": 0.1,
    "response_mime_type": "application/json"
}

_cached_models: dict[str, genai.GenerativeModel] = {}


def get_model_instance(model_name: str) -> genai.GenerativeModel:
    if model_name not in _cached_models:
        _cached_models[model_name] = genai.GenerativeModel(
            model_name=model_name,
            generation_config=GENERATION_CONFIG
        )
    return _cached_models[model_name]


def generate_with_fallback(prompt: str):
    last_error = None
    for model_name in MODEL_PRIORITY:
        try:
            model = get_model_instance(model_name)
            response = model.generate_content(prompt)
            if model_name != MODEL_PRIORITY[0]:
                log_event("curator_model_fallback", {"model_used": model_name})
            return response
        except Exception as err:
            last_error = err
            log_event("curator_model_error", {"model": model_name, "error": str(err)})
            continue
    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")

def analyze_news_batch(articles):
    """
    Takes a list of raw articles: [{'title': '...', 'source': '...', 'link': '...'}]
    Returns: A list of ONLY the approved articles with 'category' and 'summary'.
    """
    
    if not articles:
        return []

    print(f"🧠 Brain: Analyzing {len(articles)} headlines...")

    # 1. Prepare payload (Title + Source is usually enough for a vibe check)
    payload = []
    for i, article in enumerate(articles):
        payload.append({
            "id": i,
            "title": article['title'],
            "source": article['source'],
            "summary": article.get('summary_text', '')
        })

    log_event("curator_input", {"count": len(payload), "articles": payload})

    # 2. The Prompt
    prompt = f"""
        You are the "Vibe Editor" for a modern Macedonian news aggregator.

        Each input item includes:
        - title: headline text
        - source: outlet name
        - summary: short plain-text snippet scraped from the article

        YOUR MISSION
        1. Keep only elegant, good-vibe stories that make readers curious. Think clever tech, art, design, lifestyle upgrades, inspiring business wins, thoughtful human stories.
        2. Reject daily politics, crime, court drama, disasters, weather alerts, utility outages, celebrity gossip, horoscopes, sports match recaps, and bureaucratic notices.
        3. Categorize the survivors accurately and craft copy that feels smart and boutique.

        GOOD VIBE CHECKLIST
        ✅ Celebrate creativity, innovation, craftsmanship, community impact, travel/food culture, wellness breakthroughs, Macedonians doing impressive work.
        ✅ Prefer headlines that feel uplifting, clever, or tastefully provocative.
        ❌ Anything with parties, ministers, parliament, mayors, tenders, corruption, investigations, strikes, accidents, fires, police reports, tragedies, breakup scandals, or astrology goes straight to REJECT.
        ❌ If the summary screams "breaking news"/"urgent warning" rather than lifestyle/insightful tone, REJECT.

        CATEGORY RULES (choose exactly one):
        - Tech: AI, software, gadgets, startups, engineering, space/science, digital policy framed positively.
        - Culture: Art, architecture, film, literature, design, history, music, exhibitions, theatre, creative festivals.
        - Lifestyle: Wellness, productivity, travel, gastronomy, fashion, urban living, human-interest, education tips, youth initiatives.
        - Business: Entrepreneurs, funding, career growth, market trends, sustainability wins, Macedonians succeeding in business.
        - Sports: Sports events, athlete achievements, fitness trends, community sports initiatives, inspiring sports stories. Put preference for Macedonian sport stories.
        If nothing fits or vibes are off, REJECT the article rather than forcing a category.

        ENRICHMENT FIELDS FOR ACCEPTED STORIES
        - "category": one of ["Tech", "Culture", "Lifestyle", "Business", "Sports"].
        - "summary": 1 elegant Macedonian sentence (<= 25 words) highlighting why it matters.
        - "teaser": 6-10 word uppercase-friendly hook (no punctuation at the end) that could sit under a headline.
        - "tone": "positive", "neutral", or "negative" (if negative, strongly consider rejecting unless it's still inspiring).
        - "hero_candidate": true/false. TRUE only for the single most irresistible story in the batch (positive/neutral tone, strong curiosity hook, ideally with clear innovation or cultural impact).
        - "hero_score": integer 0-10 reflecting hero strength (0 when hero_candidate is false). Use 8-10 only for truly standout pieces.

        OUTPUT FORMAT (STRICT JSON):
        {{
            "accepted": [
                {{
                    "id": 0,
                    "category": "Tech",
                    "summary": "Кратко резиме ...",
                    "teaser": "AI стартап освојува милион",
                    "tone": "positive",
                    "hero_candidate": true,
                    "hero_score": 9
                }}
            ],
            "rejected": [
                {{ "id": 1, "reason": "Политички митинг" }}
            ]
        }}

        INPUT DATA:
        {json.dumps(payload, ensure_ascii=False)}
        """

    try:
        # 3. Call the Model with fallback logic
        response = generate_with_fallback(prompt)
        
        # 4. Parse JSON
        raw_text = response.text
        try:
            result_payload = json.loads(raw_text)
        except json.JSONDecodeError as parse_err:
            print("🔥 Brain JSON Error:", parse_err)
            print("📝 Model raw response:\n", raw_text)
            log_event("curator_parse_error", {"error": str(parse_err), "raw": raw_text})
            return []
        accepted_items = result_payload.get("accepted", []) if isinstance(result_payload, dict) else result_payload
        rejected_items = result_payload.get("rejected", []) if isinstance(result_payload, dict) else []

        log_event("curator_output_raw", {
            "accepted": accepted_items,
            "rejected": rejected_items,
        })

        # Log rejected items with reasons
        for item in rejected_items:
            idx = item.get('id')
            reason = item.get('reason', 'No reason provided')
            title = articles[idx]['title'] if idx is not None and idx < len(articles) else "Unknown"
            print(f"🚫 Rejected: {title} — {reason}")
        
        # 5. Reconstruct the final list
        final_articles = []
        for item in accepted_items:
            original_index = item['id']
            
            # Grab original data
            original_article = articles[original_index]

            teaser_text = item.get('teaser', '')
            if not teaser_text:
                teaser_text = item.get('summary', '')[:80]
                print(f"⚠️ Missing teaser for '{original_article['title']}'. Fallback to summary snippet.")
            
            # Create enriched object
            enriched_article = {
                "title": original_article['title'],
                "link": original_article['link'],
                "source": original_article['source'],
                "published_at": original_article['published_at'],
                "image_url": original_article.get('image_url'),
                # AI Fields
                "summary": item['summary'],
                "teaser": teaser_text,
                "category": item['category'],
                "tone": item.get('tone', ''),
                "hero_candidate": bool(item.get('hero_candidate', False)),
                "hero_score": int(item.get('hero_score', 0) or 0)
            }
            
            final_articles.append(enriched_article)

        for article in final_articles:
            hero_flag = " ⭐" if article.get("hero_candidate") else ""
            print(f"✅ Approved: {article['title']} — {article['teaser']}{hero_flag}")

        log_event("curator_output_final", {
            "approved": final_articles,
            "rejected_count": len(rejected_items),
        })

        print(f"✨ Vibe Check Complete: Approved {len(final_articles)} out of {len(articles)} articles.")
        return final_articles

    except Exception as e:
        print(f"🔥 Brain Error: {e}")
        log_event("curator_exception", {"error": str(e)})
        return []