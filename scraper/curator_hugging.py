import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from dotenv import load_dotenv
from google import genai
from google.genai import types

# from logger import log_event


class ModelExhaustedError(RuntimeError):
    """Raised when all Gemini/Gemma models fail and no further curation is possible."""


# Load environment variables
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("❌ GEMINI_API_KEY is missing in .env file!")

# Central client instance for all generations
client = genai.Client(api_key=api_key)

# Prefer lighter/cheaper models first to reduce token burn
MODEL_PRIORITY = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemma-3-27b-it"
    "gemma-3-12b-it",
]

GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.1,
    response_mime_type="application/json",
    max_output_tokens=400,
)

# Circuit breaker state (keeps us from spamming a sick model)
_model_state: Dict[str, Dict[str, Any]] = {
    model: {"cooldown_until": datetime.min.replace(tzinfo=timezone.utc), "errors": 0}
    for model in MODEL_PRIORITY
}


def _article_summary_for_log(article: Dict[str, Any]) -> Dict[str, Any]:
    """Compact article data for structured logging."""
    return {
        "title": (article.get("title") or "")[:140],
        "link": article.get("link", ""),
        "source": article.get("source", ""),
        "published_at": article.get("published_at"),
    }


def get_available_model() -> str:
    """Return the highest priority model that is not cooling down."""
    now = datetime.now(timezone.utc)
    available = [m for m in MODEL_PRIORITY if now >= _model_state[m]["cooldown_until"]]
    if available:
        return available[0]

    next_available = min(
        MODEL_PRIORITY, key=lambda m: _model_state[m]["cooldown_until"]
    )
    wait_seconds = max(
        0.0, (_model_state[next_available]["cooldown_until"] - now).total_seconds()
    )
    if wait_seconds:
        time.sleep(min(wait_seconds, 2))
    return next_available


def mark_model_failure(model_name: str, error_msg: str) -> None:
    """Mark a model as unavailable for a short cooldown window."""
    now = datetime.now(timezone.utc)
    lower_msg = error_msg.lower()
    is_rate_limit = any(
        key in lower_msg for key in ["429", "quota", "rate", "overloaded"]
    )
    cooldown_seconds = 240 if is_rate_limit else 60
    _model_state[model_name]["cooldown_until"] = now + timedelta(
        seconds=cooldown_seconds
    )
    _model_state[model_name]["errors"] += 1
    # log_event(
    #     "curator_model_cooldown",
    #     {
    #         "model": model_name,
    #         "cooldown_s": cooldown_seconds,
    #         "error": str(error_msg),
    #     },
    # )
    print(f"⚠️ Model {model_name} failed ({error_msg}); cooling down for {cooldown_seconds}s.")


def generate_with_fallback(prompt: str, max_retries: int | None = None):
    """Try each model with the circuit breaker until one succeeds or we give up."""
    if max_retries is None:
        max_retries = len(MODEL_PRIORITY) * 2

    attempts = 0
    last_error: Exception | None = None

    while attempts < max_retries:
        model_name = get_available_model()
        attempts += 1
        # log_event("curator_model_attempt", {"model": model_name, "attempt": attempts})
        try:
            result = client.models.generate_content(
                model=model_name, contents=prompt, config=GENERATION_CONFIG
            )
            # log_event("curator_model_success", {"model": model_name, "attempt": attempts})
            print(f"🤖 Curator used model {model_name} on attempt {attempts}.")
            return result
        except Exception as err:  # noqa: BLE001
            last_error = err
            mark_model_failure(model_name, str(err))
            continue

    failure_message = f"❌ All models failed after {attempts} attempts. Last error: {last_error}"
    # log_event("curator_model_exhausted", {"attempts": attempts, "last_error": str(last_error)})
    raise ModelExhaustedError(failure_message)


def _is_coarse_reject(title: str, snippet: str) -> bool:
    """
    Quick keyword filter to keep obvious politics/crime/weather fluff away from the LLM.
    Keeps AI token spend for ambiguous cases.
    """
    blob = f"{title} {snippet}".lower()
    banned = ["парламент",        "претседател",        "министер",        "влада",      "совет",        "кампања",       "партија",
        "избор",
        "протест",
        "осуден",
        "суд",
        "обвинител",
        "апсење",
        "затвор",
        "убиство",
        "несреќа",
        "пожар",
        "експлозија",
        "кражба",
        "полиција",
        "корупција","воен","земјотрес","температура","хороскоп","лото"]
    return any(token in blob for token in banned)


def analyze_news_batch(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Classify and lightly enrich a batch of articles while minimizing prompt/response tokens.
    Only ambiguous/general items should reach this function.
    """
    if not articles:
        return []

    # log_event(
    #     "curator_batch_received",
    #     {"count": len(articles), "articles": [_article_summary_for_log(a) for a in articles]},
    # )
    print(f"🧠 Curating {len(articles)} articles.")

    filtered_articles: List[Dict[str, Any]] = []
    payload: List[Dict[str, Any]] = []

    for idx, article in enumerate(articles):
        snippet = (article.get("summary_text") or "")[:200]
        if _is_coarse_reject(article.get("title", ""), snippet):
            # log_event(
            #     "curator_coarse_reject",
            #     {"title": article.get("title", ""), "source": article.get("source", "")},
            # )
            print(f"⏩ Coarse reject: {article.get('title', '')}")
            continue

        payload.append(
            {
                "id": len(filtered_articles),
                "title": article.get("title", ""),
                "source": article.get("source", ""),
                "snippet": snippet,
            }
        )
        filtered_articles.append(article)

    if not filtered_articles:
        return []

    # log_event(
    #     "curator_input",
    #     {"count": len(filtered_articles), "articles": [_article_summary_for_log(a) for a in filtered_articles]},
    # )

    prompt = f"""
Return strictly JSON. Evaluate Macedonian headlines.
Fields: id, status ("accepted"|"rejected"), reason (only if rejected), category (Tech|Culture|Lifestyle|Business|Sports), tone, hero_candidate, hero_score (0-100).
Only ONE hero_candidate is allowed across the batch. If hero_candidate=false, set teaser and summary to "" to save tokens.
If hero_candidate=true, also provide:
- teaser: 6-9 words, uppercase-friendly, no punctuation.
- summary: elegant Macedonian sentence, max 22 words, neutral/positive tone.
Input: {json.dumps(payload, ensure_ascii=False)}
""".strip()

    try:
        response = generate_with_fallback(prompt)
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.removeprefix("```json").removeprefix("```").rstrip("`").strip()

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError as parse_err:
            # log_event(
            #     "curator_parse_error", {"error": str(parse_err), "raw": raw_text[:500]}
            # )
            print(f"⚠️ Curator parse error: {parse_err}")
            return []

        results = parsed.get("results", []) if isinstance(parsed, dict) else parsed
        final_articles: List[Dict[str, Any]] = []
        rejected_count = 0
        rejected_details: List[Dict[str, Any]] = []

        for item in results:
            idx = item.get("id")
            if idx is None or not isinstance(idx, int) or idx >= len(filtered_articles):
                continue

            original = filtered_articles[idx]
            if item.get("status") == "rejected":
                rejected_count += 1
                rejected_details.append(
                    {
                        "title": original.get("title", ""),
                        "link": original.get("link", ""),
                        "source": original.get("source", ""),
                        "reason": item.get("reason", ""),
                    }
                )
                continue

            summary_text = (original.get("summary_text") or "")[:500]
            teaser = (item.get("teaser") or summary_text[:90]).strip()
            summary = (item.get("summary") or summary_text).strip()

            hero_score = item.get("hero_score", 0) or 0
            try:
                hero_score_int = max(0, min(100, int(hero_score)))
            except (TypeError, ValueError):
                hero_score_int = 0

            final_articles.append(
                {
                    "title": original.get("title", ""),
                    "link": original.get("link", ""),
                    "source": original.get("source", ""),
                    "published_at": original.get("published_at"),
                    "image_url": original.get("image_url"),
                    "summary": summary,
                    "teaser": teaser,
                    "category": item.get("category") or "Lifestyle",
                    "tone": item.get("tone", ""),
                    "hero_candidate": bool(item.get("hero_candidate", False)),
                    "hero_score": hero_score_int,
                }
            )

        # log_event(
        #     "curator_output_final",
        #     {
        #         "approved_count": len(final_articles),
        #         "rejected_count": rejected_count,
        #         "approved": [_article_summary_for_log(a) for a in final_articles],
        #         "rejected": rejected_details,
        #     },
        # )
        print(f"✅ Curator approved {len(final_articles)} and rejected {rejected_count}.")
        return final_articles

    except ModelExhaustedError:
        raise
    except Exception as err:  # noqa: BLE001
        # log_event("curator_exception", {"error": str(err)})
        print(f"⚠️ Curator exception: {err}")
        return []
