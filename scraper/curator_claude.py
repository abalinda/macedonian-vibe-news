"""
Claude-powered news curator for vibes.mk.

This is the ONLY curation engine. It shells out to the Claude Code CLI in one-shot
print mode, authenticated via a Claude Max subscription (`CLAUDE_CODE_OAUTH_TOKEN`).

Why the CLI and not the Messages API? Because the OAuth/subscription path is only
exposed through Claude Code / the Agent SDK — there is no API key here. The tradeoff
is that we do NOT get the Messages API's schema-enforced structured outputs, so JSON
validity relies on prompting + parsing (the robustness guards below).

There is NO pre-LLM keyword stripping: every fetched article reaches the model, and the
editorial prompt alone decides signal vs. noise. Output contract per approved article:
  {title, link, source, published_at, image_url, summary, teaser, category, tone,
   hero_candidate, hero_score, good_vibes}

Two quality tiers (see TRIAL_SETUP.md):
- accepted + good_vibes=true  -> homepage-eligible (the front-of-house tier)
- accepted + good_vibes=false -> saved, but only shows in "most recent" + "archive"
- rejected                    -> dropped (tabloid / yellow press / political theatre / junk)
`hero_candidate` is set equal to `good_vibes` so only homepage-tier stories compete
for hero slots.
"""

import json
import os
import subprocess
from typing import Any, Dict, List

from dotenv import load_dotenv

from logger import log_event

load_dotenv()


class ModelExhaustedError(RuntimeError):
    """Raised when the curator can no longer curate (repeated CLI failures)."""


# ---- Config (all env-overridable) ----
CLAUDE_BIN = os.getenv("CLAUDE_BIN", "claude")
# Alias `sonnet` always maps to the latest Sonnet. Override with a full id
# (e.g. claude-sonnet-4-6) or another alias (opus / haiku) via CLAUDE_MODEL.
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "sonnet")
CLAUDE_TIMEOUT_S = int(os.getenv("CLAUDE_TIMEOUT_S", "180"))
# After this many consecutive CLI failures (bad token, rate-limit, CLI breakage) we
# raise ModelExhaustedError so the pipeline stops hammering Claude for the rest of the run.
MAX_CONSECUTIVE_FAILURES = int(os.getenv("CLAUDE_MAX_CONSECUTIVE_FAILURES", "3"))

_consecutive_failures = 0

if not os.getenv("CLAUDE_CODE_OAUTH_TOKEN") and not os.getenv("ANTHROPIC_API_KEY"):
    print(
        "⚠️ curator_claude: neither CLAUDE_CODE_OAUTH_TOKEN nor ANTHROPIC_API_KEY is set; "
        "the claude CLI will fail to authenticate."
    )


def _article_summary_for_log(article: Dict[str, Any]) -> Dict[str, Any]:
    """Compact article data for structured logging."""
    return {
        "title": (article.get("title") or "")[:140],
        "link": article.get("link", ""),
        "source": article.get("source", ""),
        "published_at": article.get("published_at"),
    }


def _generate_with_claude(prompt: str) -> str:
    """Run one one-shot Claude Code CLI call and return the model's text (.result)."""
    # Prompt is passed as the trailing positional arg. subprocess (no shell) handles
    # quoting/Cyrillic/newlines safely; a single argv element is fine well past our size.
    cmd = [
        CLAUDE_BIN,
        "--print",
        "--output-format",
        "json",
        "--model",
        CLAUDE_MODEL,
        "--permission-mode",
        "bypassPermissions",
        prompt,
    ]

    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=CLAUDE_TIMEOUT_S,
    )

    if proc.returncode != 0:
        # Surface stderr so the very first failed run tells us exactly what to fix.
        raise RuntimeError(
            f"claude CLI exited {proc.returncode}: {(proc.stderr or '').strip()[:400]}"
        )

    stdout = (proc.stdout or "").strip()
    if not stdout:
        raise RuntimeError("claude CLI produced empty stdout")

    # --output-format json wraps the answer in an envelope: {"result": "...", ...}.
    try:
        envelope = json.loads(stdout)
    except json.JSONDecodeError:
        # Defensive: if it ever returns raw text instead of the envelope, use it as-is.
        return stdout

    if isinstance(envelope, dict):
        if envelope.get("is_error") or envelope.get("subtype") == "error":
            raise RuntimeError(f"claude CLI error envelope: {stdout[:400]}")
        result = envelope.get("result")
        if not result:
            raise RuntimeError(f"claude CLI envelope had no result: {stdout[:400]}")
        return str(result).strip()

    # Unexpected shape (e.g. a bare string/array) — treat raw stdout as the answer.
    return stdout


def _build_prompt(payload: List[Dict[str, Any]]) -> str:
    """Editorial prompt for vibes.mk. Signal vs. noise, then two tiers: feed vs. homepage."""
    return f"""
RETURN ONLY VALID JSON. NO CODE. NO EXPLANATIONS. JUST JSON.

Your response must start with {{ and contain a JSON object with a "results" array.

You are the editor of vibes.mk, a Macedonian news site with taste. Your job is to separate
SIGNAL from NOISE — NOT to make everything cheerful, and NOT to purge every negative or political
story. Evaluate these headlines:
{json.dumps(payload, ensure_ascii=False)}

For each article, return:
{{
  "id": <number>,
  "status": "accepted" or "rejected",
  "reason": "<short, only if rejected>",
  "category": "Tech" or "Culture" or "Lifestyle" or "Business" or "Sports",
  "tone": "neutral" or "positive",
  "good_vibes": true or false,
  "hero_score": <0-100>,
  "teaser": "<6-9 words in UPPERCASE, required if good_vibes=true, else \\"\\">",
  "summary": "<one elegant Macedonian sentence, max 22 words, required if good_vibes=true, else \\"\\">"
}}

Two questions decide everything: (1) is this real, substantive news worth a reader's time, or is
it junk? (2) if it's worth keeping, is it strong and interesting enough for the HOMEPAGE?

REJECT (status="rejected") — NOISE that wastes the reader's attention:
- clickbait / "shocking / you won't believe / this is why" framing, rage-bait, fear-mongering
- celebrity gossip, scandal, relationship drama, reality-TV / influencer chatter
- DAILY POLITICAL THEATRE: he-said/she-said between politicians, party point-scoring, campaign
  spin, "X official said / promised / accused / slammed Y", cabinet squabbles, procedural
  back-and-forth, opinion or polemic with no real-world consequence
- tabloid crime blotter: routine car crashes, petty theft, random local violence with no wider significance
- horoscopes, astrology, lottery, betting, psychics
- content-farm listicles, quizzes, "X things you must…" filler, thinly-veiled ads / PR puff
- unsourced rumor or gossip-site reposts

ACCEPT (status="accepted") — SIGNAL. Legitimate, substantive stories worth keeping, EVEN IF serious
or not cheerful. This explicitly INCLUDES:
- politics/policy that actually MATTERS: laws and decisions that change people's lives,
  infrastructure, budgets, science/education funding, international agreements, real institutional
  change — as opposed to politicians merely talking about or attacking each other
- weighty but genuinely important news: the death of a notable/important person, or a major event
  of real public consequence
- business, tech, culture, science, sport, health, and human-interest of real substance

Do NOT reject a story merely because it is political, or merely because it is negative. Reject it
only if it is noise (theatre / tabloid / junk) by the definitions above. When unsure whether a
serious story is "news of consequence" vs. "daily theatre", lean ACCEPT.

good_vibes=true ONLY for stories strong enough for the HOMEPAGE — high-quality, substantive, and
broadly interesting. The homepage is the site's front-of-house, so favour:
- genuine achievements, breakthroughs, discovery, innovation, wins, progress, constructive stories
- AND landmark stories of real weight (e.g. the passing of a beloved national figure, a decision of
  major consequence) when they are important enough that an informed reader would expect them front-page
Keep the homepage's centre of gravity POSITIVE and energetic, but do not exclude a genuinely
significant serious story just because it isn't upbeat.

good_vibes=false for accepted stories that are fine to keep but minor, dry, routine, or middling.
They are still saved (they appear only in "most recent" and "archive"), just not homepage-worthy,
so do NOT inflate good_vibes.

Rules:
- Be selective: quality over quantity. Several articles may be good_vibes, or none.
- hero_score (0-100) ranks HOMEPAGE-worthiness; give a high score only when good_vibes=true.
- category is required for every accepted article.
- If good_vibes=false: teaser="", summary="", low hero_score. If rejected: good_vibes=false, hero_score=0, teaser="", summary="".
- Return format: {{"results": [...]}}
- NO markdown, NO code blocks, ONLY JSON.
""".strip()


def analyze_news_batch(
    articles: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Curate a batch of articles with Claude. Every article reaches the model (no pre-filter)."""
    global _consecutive_failures

    if not articles:
        return []

    log_event(
        "curator_batch_received",
        {
            "engine": "claude",
            "model": CLAUDE_MODEL,
            "count": len(articles),
            "articles": [_article_summary_for_log(a) for a in articles],
        },
    )
    print(f"🧠 [Claude/{CLAUDE_MODEL}] Curating {len(articles)} articles.")

    # ---- No pre-LLM stripping: every article is shaped into the payload and judged by Claude. ----
    queued_articles: List[Dict[str, Any]] = []
    payload: List[Dict[str, Any]] = []

    for article in articles:
        snippet = (article.get("summary_text") or "")[:200]
        payload.append(
            {
                "id": len(queued_articles),
                "title": article.get("title", ""),
                "source": article.get("source", ""),
                "snippet": snippet,
            }
        )
        queued_articles.append(article)

    if not queued_articles:
        return []

    log_event(
        "curator_input",
        {
            "engine": "claude",
            "count": len(queued_articles),
            "articles": [_article_summary_for_log(a) for a in queued_articles],
        },
    )

    prompt = _build_prompt(payload)

    # ---- Call Claude; on failure, count toward exhaustion so the run eventually gives up ----
    try:
        raw_text = _generate_with_claude(prompt)
        _consecutive_failures = 0
    except Exception as err:  # noqa: BLE001
        _consecutive_failures += 1
        log_event(
            "curator_claude_call_failed",
            {
                "error": str(err),
                "consecutive_failures": _consecutive_failures,
                "model": CLAUDE_MODEL,
            },
        )
        print(f"⚠️ Claude curation call failed ({_consecutive_failures}x): {err}")

        if _consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
            log_event(
                "curator_claude_exhausted",
                {"consecutive_failures": _consecutive_failures},
            )
            raise ModelExhaustedError(
                f"Claude CLI failed {_consecutive_failures} times in a row."
            ) from err

        return []

    # ---- Parse (strip code fences, tolerate junk) ----
    if not raw_text or not raw_text.strip():
        log_event("curator_empty_response", {"engine": "claude"})
        print("⚠️ Claude returned empty response; skipping batch.")
        return []

    if raw_text.startswith("```"):
        raw_text = (
            raw_text.removeprefix("```json").removeprefix("```").rstrip("`").strip()
        )

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as parse_err:
        log_event(
            "curator_parse_error",
            {"engine": "claude", "error": str(parse_err), "raw": raw_text[:500]},
        )
        print(f"⚠️ Claude parse error: {parse_err}")
        print(f"⚠️ Raw response (first 200 chars): {raw_text[:200]}")
        return []

    results = parsed.get("results", []) if isinstance(parsed, dict) else parsed
    final_articles: List[Dict[str, Any]] = []
    rejected_count = 0
    good_vibes_count = 0
    rejected_details: List[Dict[str, Any]] = []

    for item in results:
        idx = item.get("id")
        if idx is None or not isinstance(idx, int) or idx >= len(queued_articles):
            continue

        original = queued_articles[idx]
        log_event(
            "curator_article_model",
            {
                "engine": "claude",
                "model": CLAUDE_MODEL,
                "status": item.get("status", "unknown"),
                "good_vibes": bool(item.get("good_vibes", False)),
                "article": _article_summary_for_log(original),
            },
        )

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

        good_vibes = bool(item.get("good_vibes", False))
        if good_vibes:
            good_vibes_count += 1

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
                # good_vibes is the homepage tier; only good_vibes stories compete for heroes.
                "good_vibes": good_vibes,
                "hero_candidate": good_vibes,
                "hero_score": hero_score_int,
            }
        )

    log_event(
        "curator_output_final",
        {
            "engine": "claude",
            "model": CLAUDE_MODEL,
            "approved_count": len(final_articles),
            "good_vibes_count": good_vibes_count,
            "rejected_count": rejected_count,
            "approved": [_article_summary_for_log(a) for a in final_articles],
            "rejected": rejected_details,
        },
    )
    print(
        f"✅ [Claude] approved {len(final_articles)} "
        f"({good_vibes_count} good-vibes/homepage), rejected {rejected_count}."
    )
    return final_articles
