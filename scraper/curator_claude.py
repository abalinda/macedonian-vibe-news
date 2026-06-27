"""
Claude-powered news curator (TRIAL).

Drop-in replacement for `curator_groq.analyze_news_batch`. Instead of calling the
Groq REST API, this shells out to the Claude Code CLI in one-shot print mode,
authenticated via a Claude Max subscription (`CLAUDE_CODE_OAUTH_TOKEN`).

Why the CLI and not the Messages API? Because the OAuth/subscription path is only
exposed through Claude Code / the Agent SDK — there is no API key here. The tradeoff
is that we do NOT get the Messages API's schema-enforced structured outputs, so JSON
validity still relies on prompting + parsing (same robustness guards as the Groq path).

Selected by `curator.py` when CURATOR=claude. Reuses the coarse keyword filter from
curator_groq. Output contract per approved article:
  {title, link, source, published_at, image_url, summary, teaser, category, tone,
   hero_candidate, hero_score, good_vibes}

Two quality tiers (see TRIAL_SETUP.md):
- accepted + good_vibes=true  -> homepage-eligible (the strict "good vibes" tier)
- accepted + good_vibes=false -> saved, but only shows in "most recent" + "archive"
- rejected                    -> dropped (tabloid / yellow press / junk)
`hero_candidate` is set equal to `good_vibes` so only homepage-tier stories compete
for hero slots.
"""

import json
import os
import subprocess
from typing import Any, Dict, List

from dotenv import load_dotenv

from logger import log_event

# Reuse the coarse keyword filter, the compact log helper, and the shared error type
# so the Claude path stays compatible with the Groq path's contract.
from curator_groq import (
    ModelExhaustedError,
    _article_summary_for_log,
    _is_coarse_reject,
)

load_dotenv()

# ---- Config (all env-overridable) ----
CLAUDE_BIN = os.getenv("CLAUDE_BIN", "claude")
# Alias `sonnet` always maps to the latest Sonnet (currently 4.6). Override with a full
# id (e.g. claude-sonnet-4-6) or another alias (opus / haiku) via CLAUDE_MODEL.
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "sonnet")
CLAUDE_TIMEOUT_S = int(os.getenv("CLAUDE_TIMEOUT_S", "180"))
# After this many consecutive CLI failures (bad token, rate-limit, CLI breakage) we
# raise ModelExhaustedError so the pipeline stops hammering Claude for the rest of the run.
MAX_CONSECUTIVE_FAILURES = int(os.getenv("CLAUDE_MAX_CONSECUTIVE_FAILURES", "3"))
# Optional safety net: if set to "groq", a failed Claude batch falls back to the Groq
# curator so the live site keeps getting fed. OFF by default for an honest trial.
CURATOR_FALLBACK = os.getenv("CURATOR_FALLBACK", "").strip().lower()

_consecutive_failures = 0

if not os.getenv("CLAUDE_CODE_OAUTH_TOKEN") and not os.getenv("ANTHROPIC_API_KEY"):
    print(
        "⚠️ curator_claude: neither CLAUDE_CODE_OAUTH_TOKEN nor ANTHROPIC_API_KEY is set; "
        "the claude CLI will fail to authenticate."
    )


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


def _build_prompt(payload: List[Dict[str, Any]], strict_iran_only: bool) -> str:
    """Editorial prompt for vibes.mk. Two tiers: accepted (feed) vs good_vibes (homepage)."""
    if strict_iran_only:
        return f"""
RETURN ONLY VALID JSON. NO CODE. NO EXPLANATIONS. JUST JSON.

Your response must start with {{ and contain a JSON object with a "results" array.

You are the editor of vibes.mk. Evaluate these headlines for IRAN-SPECIFIC relevance:
{json.dumps(payload, ensure_ascii=False)}

For each article, return:
{{
  "id": <number>,
  "status": "accepted" or "rejected",
  "reason": "<short, required if rejected>",
  "category": "Iran",
  "tone": "neutral" or "positive",
  "good_vibes": true or false,
  "hero_score": <0-100>,
  "teaser": "<6-9 words in UPPERCASE, required if good_vibes=true, else \\"\\">",
  "summary": "<one elegant Macedonian sentence, max 22 words, required if good_vibes=true, else \\"\\">"
}}

Rules:
- ACCEPT only if the story is explicitly about Iran (state, society, diplomacy, economy, military, culture, or direct actions involving Iran).
- REJECT if it is about other countries/conflicts and Iran is missing or only mentioned in passing.
- For every accepted item, category MUST be "Iran".
- good_vibes=true ONLY for the most homepage-worthy Iran stories: high-quality, substantive, broad interest. At most one or two per batch; it is fine for none to be good_vibes.
- hero_score (0-100) ranks homepage-worthiness; high only when good_vibes=true.
- If good_vibes=false: teaser="", summary="", low hero_score. If rejected: good_vibes=false, hero_score=0, teaser="", summary="".
- Return format: {{"results": [...]}}
- NO markdown, NO code blocks, ONLY JSON.
""".strip()

    return f"""
RETURN ONLY VALID JSON. NO CODE. NO EXPLANATIONS. JUST JSON.

Your response must start with {{ and contain a JSON object with a "results" array.

You are the editor of vibes.mk, a Macedonian "good vibes" news site. Evaluate these headlines:
{json.dumps(payload, ensure_ascii=False)}

For each article, return:
{{
  "id": <number>,
  "status": "accepted" or "rejected",
  "reason": "<short, only if rejected>",
  "category": "Tech" or "Culture" or "Lifestyle" or "Business" or "Sports" or "Iran",
  "tone": "neutral" or "positive",
  "good_vibes": true or false,
  "hero_score": <0-100>,
  "teaser": "<6-9 words in UPPERCASE, required if good_vibes=true, else \\"\\">",
  "summary": "<one elegant Macedonian sentence, max 22 words, required if good_vibes=true, else \\"\\">"
}}

REJECT (status="rejected") anything that is yellow press / tabloid / junk:
- clickbait or "shocking / you won't believe / this is why" framing
- celebrity gossip, scandal, relationship drama, reality-TV / influencer chatter
- crime, accidents, violence, tragedy, death, disaster (the Iran category is the only exception)
- horoscopes, astrology, lottery, betting, psychics
- rage-bait, outrage, fear-mongering, doom-and-gloom
- content-farm listicles, quizzes, "X things you must..." filler
- unsourced rumor, gossip-site reposts, thinly-veiled ads / PR puff

ACCEPT (status="accepted") legitimate, substantive stories worth keeping on the site.

good_vibes=true ONLY for HIGH-QUALITY, POSITIVE-LEANING stories worthy of the HOMEPAGE:
- genuine achievements, breakthroughs, innovation, discovery
- culture, art, science, sport wins, human interest, progress, constructive tech/business
- well-sourced and substantive, broadly interesting, with good energy
good_vibes=false for stories that are fine to keep but so-so: dry, minor, routine, or mildly
negative items that passed the reject filter yet are NOT homepage-worthy. They are still
saved (they appear only in "most recent" and "archive"), so do NOT inflate good_vibes.

Rules:
- Be selective: quality over quantity. Several articles may be good_vibes, or none.
- hero_score (0-100) ranks HOMEPAGE-worthiness; give a high score only when good_vibes=true.
- category is required for every accepted article.
- If good_vibes=false: teaser="", summary="", low hero_score. If rejected: good_vibes=false, hero_score=0, teaser="", summary="".
- Return format: {{"results": [...]}}
- NO markdown, NO code blocks, ONLY JSON.
""".strip()


def analyze_news_batch(
    articles: List[Dict[str, Any]], strict_iran_only: bool = False
) -> List[Dict[str, Any]]:
    """Claude-backed equivalent of curator_groq.analyze_news_batch (same signature & output)."""
    global _consecutive_failures

    if not articles:
        return []

    log_event(
        "curator_batch_received",
        {
            "engine": "claude",
            "model": CLAUDE_MODEL,
            "count": len(articles),
            "mode": "strict_iran" if strict_iran_only else "default",
            "articles": [_article_summary_for_log(a) for a in articles],
        },
    )
    print(f"🧠 [Claude/{CLAUDE_MODEL}] Curating {len(articles)} articles.")

    # ---- Same coarse keyword filter + payload shaping as the Groq path ----
    filtered_articles: List[Dict[str, Any]] = []
    payload: List[Dict[str, Any]] = []

    for article in articles:
        snippet = (article.get("summary_text") or "")[:200]
        if not strict_iran_only and _is_coarse_reject(article.get("title", ""), snippet):
            log_event(
                "curator_coarse_reject",
                {"title": article.get("title", ""), "source": article.get("source", "")},
            )
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

    log_event(
        "curator_input",
        {
            "engine": "claude",
            "count": len(filtered_articles),
            "mode": "strict_iran" if strict_iran_only else "default",
            "articles": [_article_summary_for_log(a) for a in filtered_articles],
        },
    )

    prompt = _build_prompt(payload, strict_iran_only)

    # ---- Call Claude; on failure, optionally fall back to Groq, else count toward exhaustion ----
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

        if CURATOR_FALLBACK == "groq":
            print("↩️ Falling back to Groq curator for this batch.")
            from curator_groq import analyze_news_batch as groq_analyze

            return groq_analyze(articles, strict_iran_only=strict_iran_only)

        if _consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
            log_event(
                "curator_claude_exhausted",
                {"consecutive_failures": _consecutive_failures},
            )
            raise ModelExhaustedError(
                f"Claude CLI failed {_consecutive_failures} times in a row."
            ) from err

        return []

    # ---- Parse (same guards as Groq: strip code fences, tolerate junk) ----
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
        if idx is None or not isinstance(idx, int) or idx >= len(filtered_articles):
            continue

        original = filtered_articles[idx]
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

        if strict_iran_only:
            declared_category = str(item.get("category") or "").strip().lower()
            if declared_category and declared_category != "iran":
                rejected_count += 1
                rejected_details.append(
                    {
                        "title": original.get("title", ""),
                        "link": original.get("link", ""),
                        "source": original.get("source", ""),
                        "reason": "strict_iran_category_mismatch",
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
                "category": "Iran"
                if strict_iran_only
                else (item.get("category") or "Lifestyle"),
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
            "mode": "strict_iran" if strict_iran_only else "default",
        },
    )
    print(
        f"✅ [Claude] approved {len(final_articles)} "
        f"({good_vibes_count} good-vibes/homepage), rejected {rejected_count}."
    )
    return final_articles
