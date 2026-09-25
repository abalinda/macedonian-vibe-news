"""
On-demand blog review for vibes.mk admins.

The web editor sets `blog_drafts.review_status = 'pending'`; this loop (a daemon thread
started from run_local.py) claims one pending draft at a time, asks Claude (same Claude
Code CLI + Max OAuth session the curator uses) for an edited version, and writes it back
as `review_json` = {title, teaser, content_html, notes[]} with status 'done' / 'failed'.
The web never gets an inbound connection to the box — Turso is the queue.
"""

import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from curator_claude import _generate_with_claude
from logger import log_event

POLL_INTERVAL_S = int(os.getenv("BLOG_REVIEW_POLL_S", "30"))
REVIEW_TIMEOUT_S = int(os.getenv("BLOG_REVIEW_TIMEOUT_S", "300"))
# A 'running' row older than this was orphaned by a crash/restart -> mark failed.
STALE_RUNNING_MINUTES = 15
# Prompt goes to the CLI as one argv element; Linux caps a single arg at 128 KiB.
MAX_CONTENT_BYTES = 90_000


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_review_prompt(title: str, teaser: str, content_html: str) -> str:
    draft = json.dumps(
        {"title": title, "teaser": teaser, "content_html": content_html},
        ensure_ascii=False,
    )
    return f"""
RETURN ONLY VALID JSON. NO CODE FENCES. NO EXPLANATIONS.

You are the copy editor of vibes.mk, a Macedonian news site. An admin wrote (or pasted,
often from a press release) the blog draft below. Make it read well on the site WITHOUT
changing its meaning.

DRAFT:
{draft}

Rules:
- Language stays Macedonian Cyrillic. Keep the author's wording; only fix grammar, typos,
  punctuation and obvious awkwardness. Never invent facts, numbers, names or quotes.
- Use Macedonian quotation marks „…“ consistently.
- Structure for reading on a phone: short paragraphs; <h2> subheadings (plain, informative,
  no clickbait) between distinct topics; <ul><li> for lists of people/items; direct quotes as
  <blockquote><p>„quote“</p><p><em>— Name, role</em></p></blockquote>; bold the dateline
  (e.g. <strong>Скопје, 24.09.2026</strong>) and key product/proper names sparingly.
- Press-release boilerplate ("###", "За компанијата…") goes after an <hr>, with <h3> headings;
  turn bare URLs into <a href="…">domain</a>.
- Keep every existing <img> and <a> exactly (same src/href).
- Allowed tags ONLY: p, h2, h3, strong, em, u, a, ul, ol, li, blockquote, hr, br, img, figure.
  No inline styles, no classes, no other attributes except href, src, alt.
- title: sentence case (never ALL CAPS), no clickbait, keep it close to the original.
- teaser: 1–2 sentences summarising the post (plain text, max 220 characters). If the draft
  has a good teaser, lightly edit it instead.
- notes: 2–6 short notes in Macedonian telling the admin what you changed or what they
  should check (e.g. a missing cover image, an unclear sentence you did not change).

Respond with exactly:
{{"title": "...", "teaser": "...", "content_html": "...", "notes": ["...", "..."]}}
"""


def parse_review(raw: str) -> Dict[str, Any]:
    """Parse the model reply into {title, teaser, content_html, notes}. Raises ValueError."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").rstrip("`").strip()
    # Tolerate chatter around the object.
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in reply")
    data = json.loads(text[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("reply is not an object")

    content = str(data.get("content_html") or "").strip()
    if not content:
        raise ValueError("reply has empty content_html")
    notes = data.get("notes") or []
    if not isinstance(notes, list):
        notes = [str(notes)]
    return {
        "title": str(data.get("title") or "").strip(),
        "teaser": str(data.get("teaser") or "").strip(),
        "content_html": content,
        "notes": [str(n).strip() for n in notes if str(n).strip()][:8],
    }


def _claim_next(client):
    """Atomically move the oldest pending draft to 'running' and return it (or None)."""
    rs = client.execute(
        """
        UPDATE blog_drafts SET review_status = 'running', review_started_at = ?
        WHERE id = (
            SELECT id FROM blog_drafts WHERE review_status = 'pending'
            ORDER BY review_requested_at LIMIT 1
        ) AND review_status = 'pending'
        RETURNING id, title, teaser, content_html
        """,
        [_now()],
    )
    rows = rs.rows or []
    return rows[0] if rows else None


def _finish(client, draft_id, status: str, review=None, error: str = None):
    client.execute(
        "UPDATE blog_drafts SET review_status = ?, review_json = ?, review_error = ? WHERE id = ?",
        [
            status,
            json.dumps(review, ensure_ascii=False) if review else None,
            (error or "")[:500] or None,
            draft_id,
        ],
    )


def _fail_stale(client):
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=STALE_RUNNING_MINUTES)).isoformat()
    client.execute(
        "UPDATE blog_drafts SET review_status = 'failed', review_error = 'Прегледот заглави (рестарт).' "
        "WHERE review_status = 'running' AND review_started_at < ?",
        [cutoff],
    )


def review_one(client) -> bool:
    """Review a single pending draft. Returns True if one was processed."""
    row = _claim_next(client)
    if not row:
        return False

    draft_id, title, teaser, content = row[0], row[1] or "", row[2] or "", row[3] or ""
    started = time.time()
    try:
        if len(content.encode("utf-8")) > MAX_CONTENT_BYTES:
            raise ValueError("Објавата е предолга за автоматски преглед.")
        raw = _generate_with_claude(
            build_review_prompt(title, teaser, content), timeout_s=REVIEW_TIMEOUT_S
        )
        review = parse_review(raw)
        _finish(client, draft_id, "done", review=review)
        log_event("blog_review_done", {"draft_id": draft_id, "seconds": round(time.time() - started, 1)})
        print(f"📝 Blog review done for draft {draft_id}", flush=True)
    except Exception as err:  # never let a review kill the thread
        _finish(client, draft_id, "failed", error=str(err))
        log_event("blog_review_failed", {"draft_id": draft_id, "error": str(err)[:300]})
        print(f"⚠️ Blog review failed for draft {draft_id}: {err}", flush=True)
    return True


def blog_review_loop():
    """Daemon-thread entry point. Independent of the 15-min scrape job."""
    from scraper_local import get_db_client

    print(f"📝 Blog review worker polling every {POLL_INTERVAL_S}s", flush=True)
    client = None
    while True:
        try:
            if client is None:
                client = get_db_client()
            _fail_stale(client)
            while review_one(client):
                pass
        except Exception as err:
            # Most likely the table doesn't exist yet (the web creates it) or a network blip.
            if "no such table" not in str(err):
                print(f"⚠️ Blog review loop error: {err}", flush=True)
            try:
                client and client.close()
            except Exception:
                pass
            client = None
        time.sleep(POLL_INTERVAL_S)


if __name__ == "__main__":
    # Self-check for the parsing contract (no network): python blog_reviewer.py
    ok = parse_review('```json\n{"title":"Т","teaser":"x","content_html":"<p>a</p>","notes":["n"]}\n```')
    assert ok == {"title": "Т", "teaser": "x", "content_html": "<p>a</p>", "notes": ["n"]}
    assert parse_review('Ево: {"content_html":"<p>b</p>","notes":"one"}')["notes"] == ["one"]
    for bad in ["", "no json", '{"title":"x","content_html":""}']:
        try:
            parse_review(bad)
            raise AssertionError(f"should have failed: {bad!r}")
        except ValueError:
            pass
    assert "„" in build_review_prompt("a", "b", "<p>c</p>")
    print("blog_reviewer self-check OK")
