import os
import sys
from datetime import datetime, timedelta, timezone
from queue import Empty, Queue
from threading import Event, Lock, Thread
from time import mktime
from typing import Any, Dict, List
from urllib.parse import urljoin

import cloudscraper
import feedparser
import libsql_client
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from curator_2 import analyze_news_batch, ModelExhaustedError
from logger import log_event

# Load environment variables
load_dotenv()

# ---- Turso Setup ----
url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

if not url or not token:
    raise ValueError("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN")

client = libsql_client.create_client_sync(url, auth_token=token)

# ---- Config ----
FEATURE_ROTATION_HOURS = 8
FEATURE_SLOTS = {
    "main": {"category": None, "label": "Main Story"},
    "tech": {"category": "Tech", "label": "Tech Highlight"},
    "culture": {"category": "Culture", "label": "Culture Pick"},
    "lifestyle": {"category": "Lifestyle", "label": "Lifestyle"},
    "business": {"category": "Business", "label": "Business"},
    "sports": {"category": "Sports", "label": "Sports"},
}

SAFE_FEED_LIMIT = 6
CURATED_FEED_LIMIT = 6
AI_BATCH_SIZE = 6
MAX_AI_ARTICLES_PER_RUN = 20

feature_states: Dict[str, Dict[str, Any]] = {}
feature_rotation_allowed: Dict[str, bool] = {slot: False for slot in FEATURE_SLOTS}
feature_updated_this_run: Dict[str, bool] = {slot: False for slot in FEATURE_SLOTS}
feature_lock = Lock()

# Background queue to push curated batches to Turso without waiting for the full scrape to finish
persist_queue: Queue = Queue()
persist_stop_event = Event()
direct_seen_links: set[str] = set()


class AIBudget:
    def __init__(self, limit: int) -> None:
        self.remaining = limit


def format_article_for_log(article: Dict[str, Any]) -> Dict[str, Any]:
    """Lightweight article shape for structured logging."""
    return {
        "title": (article.get("title") or "")[:140],
        "link": article.get("link", ""),
        "source": article.get("source", ""),
        "category": article.get("category"),
        "published_at": article.get("published_at"),
        "scraped_at": article.get("scraped_at"),
    }


# --- FEEDS CONFIGURATION ---
TARGET_FEEDS = [
    # --- TECH & SCIENCE ---
    {"url": "https://bulevar.mk/category/tech/feed", "source": "Bulevar", "category": "Tech"},
    {"url": "https://it.mk/feed/", "source": "IT.mk", "category": "Tech"},
    {"url": "https://smartportal.mk/feed/", "source": "Smart Portal", "category": "Tech"},
    {"url": "https://emiter.com.mk/emiter-rss-feed.xml", "source": "Emiter", "category": "Tech"},
    {"url": "https://konekt.mk/category/смартфони/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/софтвер-веб/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/футуризам/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/паметни-уреди/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/рецензии/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/мултимедија/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://avtoplus.mk/category/noviteti/feed/", "source": "Авто Плус", "category": "Tech"},
    {"url": "https://trn.mk/category/ha%d1%98tek/feed/", "source": "Трн", "category": "Tech"},
    {"url": "https://24auto.mk/feed/", "source": "24auto", "category": "Tech"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=nauka", "source": "Факултети", "category": "Tech"},

    # --- CULTURE & LIFESTYLE ---
    {"url": "https://www.porta3.mk/feed/", "source": "Porta3", "category": "Culture"},
    {"url": "https://gradska.mk/category/kultura/feed/", "source": "Градска", "category": "Culture"},
    {"url": "https://umno.mk/feed/", "source": "Умно", "category": "Culture"},
    {"url": "https://glamur.mk/fashion/feed/", "source": "Glamur", "category": "Culture"},
    {"url": "https://okno.mk/rss", "source": "Окно", "category": "Culture"},
    {"url": "https://radiomof.mk/feed/", "source": "Радио МОФ", "category": "Culture"},
    {"url": "https://www.kafepauza.mk/feed/", "source": "Кафе Пауза", "category": "Lifestyle"},
    {"url": "https://off.net.mk/feed", "source": "Off.net", "category": "Lifestyle"},
    {"url": "https://pedijatar.mk/feed/", "source": "Педијатар", "category": "Lifestyle"},
    {"url": "https://trn.mk/category/kult-art/feed/", "source": "Трн", "category": "Lifestyle"},
    {"url": "https://trn.mk/category/zeleno/feed/", "source": "Трн", "category": "Lifestyle"},
    {"url": "https://fashionel.mk/feed/", "source": "Fashionel", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/zdravje/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/gastro/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/fitnes/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/kosa-lice-telo/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/homestyle/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/semejstvo/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://setaliste.mk/category/category/култура/feed/", "source": "Шеталиште", "category": "Culture"},
    {"url": "https://365.com.mk/category/zivot/feed/", "source": "365 - Умнибус", "category": "Lifestyle"},
    {"url": "https://365.com.mk/category/kultura/feed/", "source": "365 - Култура", "category": "Culture"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=umetnost", "source": "Факултети", "category": "Culture"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=kolumni", "source": "Факултети", "category": "Culture"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=kultura", "source": "Факултети", "category": "Culture"},

    #--- Sports ---
    {"url": "https://sportplus.mk/feed/", "source": "Sport Plus", "category": "Sports"},
    {"url": "https://topsport.mk/feed/", "source": "Top Sport", "category": "Sports"},
    {"url": "https://ipon.mk/feed/", "source": "Ipon", "category": "Sports"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=sport", "source": "Факултети", "category": "Sports"},

    # --- BUSINESS & FINANCE ---
    {"url": "https://inovativnost.mk/category/makedonija/feed/", "source": "Иновативност", "category": "Business"},
    {"url": "https://zelenaberza.com.mk/feed/", "source": "Зелена Берза", "category": "Business"},

    # --- GENERAL NEWS (curated) ---
    {"url": "https://kajgana.com/rss.xml", "source": "Кајгана", "curate": True},
    {"url": "https://a1on.mk/feed/", "source": "A1on", "curate": True},
    {"url": "https://www.crnobelo.com/latest-rss?format=feed&type=rss", "source": "Црно Бело", "curate": True},
    {"url": "https://makfax.com.mk/feed/", "source": "Makfax", "curate": True},
    {"url": "https://kanal5.com.mk/rss.aspx", "source": "Канал 5", "curate": True},
    {"url": "https://www.slobodenpecat.mk/feed/", "source": "Слободен Печат", "curate": True},
    {"url": "https://mkd.mk/feed/", "source": "MKD.mk", "curate": True},
    {"url": "https://www.slobodnaevropa.mk/api/z_poml-vomx-tpevjpy", "source": "Радио Слободна Европа", "curate": True},
    {"url": "https://bitolanews.mk/feed/", "source": "Битола Њуз", "curate": True},
]

# ---- Helpers ----

def parse_date(entry):
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        dt = datetime.fromtimestamp(mktime(entry.published_parsed))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return datetime.now(timezone.utc).isoformat()


def normalize_image_url(url: str | None, base_link: str | None) -> str | None:
    if not url:
        return None
    if url.lower().startswith("http"):
        return url
    if not base_link:
        return url
    return urljoin(base_link, url)


def extract_inline_image(entry, base_link: str | None) -> str | None:
    candidates: list[str] = []

    media_content = entry.get("media_content") or []
    for media in media_content:
        if isinstance(media, dict) and media.get("url"):
            candidates.append(media["url"])

    enclosures = entry.get("enclosures") or []
    for enc in enclosures:
        if enc.get("type", "").startswith("image/") and enc.get("href"):
            candidates.append(enc["href"])

    if entry.get("summary", "").find("<img") != -1:
        soup = BeautifulSoup(entry.get("summary", ""), "html.parser")
        img = soup.find("img")
        if img and img.get("src"):
            candidates.append(img["src"])

    for candidate in candidates:
        normalized = normalize_image_url(candidate, base_link)
        if normalized:
            return normalized
    return None


def scrape_image_from_page(article_url: str, scraper) -> str | None:
    if not article_url:
        return None
    try:
        resp = scraper.get(article_url, timeout=10)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "html.parser")
        meta_props = [{"property": "og:image"}, {"name": "twitter:image"}]
        for attrs in meta_props:
            tag = soup.find("meta", attrs=attrs)
            if tag and tag.get("content"):
                return normalize_image_url(tag["content"], article_url)
    except Exception:
        pass
    return None


def resolve_image_url(entry, scraper) -> str | None:
    link = entry.get("link")
    inline = extract_inline_image(entry, link)
    if inline:
        return inline
    return scrape_image_from_page(link, scraper)


def extract_summary_text(entry) -> str:
    raw = entry.get("summary") or entry.get("description") or ""
    soup = BeautifulSoup(raw, "html.parser")
    return soup.get_text(separator=" ", strip=True)[:320]


def dedup_articles_by_link(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen: set[str] = set()
    deduped: List[Dict[str, Any]] = []
    dropped: List[Dict[str, Any]] = []
    for art in articles:
        link = art.get("link")
        if not link:
            dropped.append({**format_article_for_log(art), "reason": "missing_link"})
            continue
        if link in seen:
            dropped.append({**format_article_for_log(art), "reason": "duplicate_link"})
            continue
        seen.add(link)
        deduped.append(art)

    if dropped:
        print(f"ℹ️ Dedup removed {len(dropped)} articles.")
    log_event(
        "dedup_summary",
        {
            "input_count": len(articles),
            "kept": len(deduped),
            "dropped": dropped,
        },
    )
    return deduped


def filter_existing_links(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Drop articles whose links already exist in the posts table."""
    links = [a.get("link") for a in articles if a.get("link")]
    if not links:
        return []
    placeholders = ",".join(["?"] * len(links))
    try:
        rs = client.execute(f"SELECT link FROM posts WHERE link IN ({placeholders})", links)
        existing = {row[0] for row in rs.rows}
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ Skipping duplicate filter due to DB error: {e}")
        log_event("db_duplicate_filter_error", {"error": str(e), "links_checked": len(links)})
        return articles

    filtered: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    for art in articles:
        link = art.get("link")
        if not link or link in existing:
            skipped.append({**format_article_for_log(art), "reason": "already_in_db"})
            continue
        filtered.append(art)

    if skipped:
        print(f"ℹ️ Dropping {len(skipped)} items already in DB.")
        log_event(
            "db_duplicate_filter",
            {
                "skipped_count": len(skipped),
                "kept_count": len(filtered),
                "skipped": skipped,
            },
        )
    return filtered


# ---- Feature Slot Logic (Turso Version) ----

def ensure_feature_slots():
    """Ensure the featured_slots table has the required rows."""
    for slot_id, meta in FEATURE_SLOTS.items():
        client.execute(
            "INSERT OR IGNORE INTO featured_slots (slot_id, label, post_id) VALUES (?, ?, ?)",
            (slot_id, meta["label"], None),
        )


def get_feature_state_map():
    try:
        rs = client.execute("SELECT slot_id, locked_until, manual_override FROM featured_slots")
        state = {}
        for row in rs.rows:
            state[row[0]] = {"locked_until": row[1], "manual_override": bool(row[2])}
        return state
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ Failed to get feature state: {e}")
        log_event("feature_state_error", {"error": str(e)})
        return {}


def can_rotate_feature_slot(slot: str):
    state = feature_states.get(slot)
    if not state:
        return True
    if state.get("manual_override"):
        return False

    locked_until_str = state.get("locked_until")
    if not locked_until_str:
        return True

    try:
        locked_until = datetime.fromisoformat(locked_until_str)
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= locked_until
    except ValueError:
        return True


def lock_feature_story(slot: str, article_link: str):
    """Update the featured_slots table to point to the new article."""
    try:
        rs = client.execute("SELECT id FROM posts WHERE link = ?", [article_link])
        if not rs.rows:
            return
        post_id = rs.rows[0][0]

        new_lock_time = (datetime.now(timezone.utc) + timedelta(hours=FEATURE_ROTATION_HOURS)).isoformat()

        client.execute(
            """
            UPDATE featured_slots
            SET post_id = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP
            WHERE slot_id = ?
            """,
            [post_id, new_lock_time, slot],
        )
        log_event("feature_rotated", {"slot": slot, "post_id": post_id})

        with feature_lock:
            feature_updated_this_run[slot] = True

    except Exception as e:  # noqa: BLE001
        print(f"⚠️ Failed to lock feature: {e}")
        log_event("feature_lock_error", {"slot": slot, "error": str(e), "article_link": article_link})


# ---- Persistence ----

def save_batch_to_turso(articles: List[Dict[str, Any]]):
    """Save a batch of articles using a transaction for speed."""
    if not articles:
        return

    stmts = []
    for art in articles:
        sql = """
            INSERT INTO posts (title, link, source, category, teaser, summary, image_url, published_at, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(link) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP,
                summary = excluded.summary,
                image_url = excluded.image_url;
        """
        params = [
            art.get("title") or "Untitled",
            art.get("link") or "",
            art.get("source") or "",
            art.get("category"),
            art.get("teaser"),
            art.get("summary") or art.get("summary_text") or "",
            art.get("image_url"),
            art.get("published_at"),
            art.get("scraped_at"),
        ]
        stmts.append(libsql_client.Statement(sql, params))

    try:
        client.batch(stmts)
        log_event(
            "turso_batch_success",
            {
                "count": len(articles),
                "sources": list({a.get("source", "") for a in articles}),
                "articles": [format_article_for_log(a) for a in articles],
            },
        )
        return True
    except Exception as e:  # noqa: BLE001
        print(f"🔥 Turso Batch Error: {e}")
        log_event(
            "turso_batch_failure",
            {"error": str(e), "count": len(articles), "articles": [format_article_for_log(a) for a in articles]},
        )
        return False


def release_feature_reservations(slots: List[str]) -> None:
    """Reset feature slot reservations when a batch fails to persist."""
    if not slots:
        return
    log_event("feature_reservations_released", {"slots": slots})
    with feature_lock:
        for slot in slots:
            feature_updated_this_run[slot] = False


def enqueue_for_persistence(articles: List[Dict[str, Any]], slots_to_update: List[tuple[str, str]], source: str) -> None:
    """Send curated articles to the background Turso writer."""
    log_event(
        "turso_enqueue",
        {
            "source": source,
            "count": len(articles),
            "slots_to_update": slots_to_update,
            "articles": [format_article_for_log(a) for a in articles],
        },
    )
    persist_queue.put((articles, slots_to_update, source))


def turso_writer_worker():
    """Background worker that writes curated batches to Turso immediately."""
    while not persist_stop_event.is_set() or not persist_queue.empty():
        try:
            articles, slots_to_update, source = persist_queue.get(timeout=1)
        except Empty:
            continue

        try:
            success = save_batch_to_turso(articles)
            if success:
                print(f"✅ [{source}] Saved {len(articles)} articles.")
                log_event(
                    "turso_worker_saved",
                    {"source": source, "count": len(articles), "articles": [format_article_for_log(a) for a in articles]},
                )
                for slot, link in slots_to_update:
                    lock_feature_story(slot, link)
            else:
                log_event(
                    "turso_worker_batch_failed",
                    {"source": source, "count": len(articles), "slots_to_update": slots_to_update},
                )
                release_feature_reservations([slot for slot, _ in slots_to_update])
        except Exception as e:  # noqa: BLE001
            print(f"🔥 Turso write failure: {e}")
            log_event(
                "turso_worker_exception",
                {"error": str(e), "source": source, "count": len(articles), "slots_to_update": slots_to_update},
            )
            release_feature_reservations([slot for slot, _ in slots_to_update])
        finally:
            persist_queue.task_done()


def start_turso_worker() -> Thread:
    worker = Thread(target=turso_writer_worker, name="turso-writer", daemon=True)
    worker.start()
    return worker


def pick_feature_candidate(candidates: List[Dict[str, Any]], target_category):
    """Find the best article in the batch for a specific category."""
    best = None
    best_score = 0

    for art in candidates:
        if target_category and art.get("category") != target_category:
            continue

        score = int(art.get("hero_score", 0) or 0)
        if not art.get("image_url"):
            score -= 5

        if score > best_score and score > 60:
            best_score = score
            best = art

    return best


def fast_reject_general(article: Dict[str, Any]) -> bool:
    """Skip obviously bad/general articles before they reach the LLM."""
    text = f"{article.get('title', '')} {article.get('summary_text', '')}".lower()
    banned = [
        "полит",
        "парламент",
        "министер",
        "претседател",
        "кампања",
        "избор",
        "протест",
        "осуд",
        "суд",
        "обвинител",
        "апсе",
        "затвор",
        "стрела",
        "уби",
        "несреќ",
        "пожар",
        "експлози",
        "кражб",
        "полици",
        "корупц",
        "воен",
        "рат",
        "земјотрес",
        "времен",
        "температур",
        "хороскоп",
        "лото",
    ]
    return any(token in text for token in banned)


def process_feed(feed_config: Dict[str, Any], ai_pool: List[Dict[str, Any]], budget: AIBudget):
    url = feed_config["url"]
    source = feed_config["source"]
    should_curate = feed_config.get("curate", False)
    default_category = feed_config.get("category")

    print(f"--- 📡 Fetching {source} ---")
    log_event(
        "feed_fetch_start",
        {
            "source": source,
            "url": url,
            "curated": should_curate,
            "category": default_category,
        },
    )

    try:
        scraper = cloudscraper.create_scraper()
        resp = scraper.get(url, timeout=20)
        if resp.status_code != 200:
            print(f"❌ Status {resp.status_code}")
            log_event(
                "feed_fetch_error",
                {"source": source, "url": url, "status_code": resp.status_code},
            )
            return

        feed = feedparser.parse(resp.content)
        if not feed.entries:
            print("❌ No entries.")
            log_event("feed_empty", {"source": source, "url": url})
            return

        limit = CURATED_FEED_LIMIT if should_curate else SAFE_FEED_LIMIT
        log_event(
            "feed_parsed",
            {"source": source, "total_entries": len(feed.entries), "limit": limit},
        )
        raw_articles = []
        for entry in feed.entries[:limit]:
            img = resolve_image_url(entry, scraper)
            txt = extract_summary_text(entry)
            raw_articles.append(
                {
                    "title": entry.get("title", "No Title"),
                    "link": entry.get("link", ""),
                    "source": source,
                    "published_at": parse_date(entry),
                    "image_url": img,
                    "summary_text": txt,
                }
            )

        raw_articles = dedup_articles_by_link(raw_articles)
        raw_articles = filter_existing_links(raw_articles)
        fresh_articles: List[Dict[str, Any]] = []
        for art in raw_articles:
            link = art.get("link")
            if not link or link in direct_seen_links:
                continue
            direct_seen_links.add(link)
            fresh_articles.append(art)

        if not fresh_articles:
            print("ℹ️ No new links to process.")
            log_event("feed_no_new_links", {"source": source})
            return

        log_event(
            "feed_fresh_articles",
            {
                "source": source,
                "count": len(fresh_articles),
                "articles": [format_article_for_log(a) for a in fresh_articles],
                "budget_remaining": budget.remaining,
            },
        )

        if not should_curate:
            now_str = datetime.now(timezone.utc).isoformat()
            direct_articles = []
            for art in fresh_articles:
                summary_text = art.get("summary_text", "")
                direct_articles.append(
                    {
                        "title": art["title"],
                        "link": art["link"],
                        "source": source,
                        "category": default_category,
                        "teaser": summary_text[:90].strip(),
                        "summary": summary_text,
                        "image_url": art.get("image_url"),
                        "published_at": art["published_at"],
                        "scraped_at": now_str,
                    }
                )
            if direct_articles:
                print(f"➡️ Sending {len(direct_articles)} direct articles from {source} to Turso.")
                enqueue_for_persistence(direct_articles, [], source)
            return

        if budget.remaining <= 0:
            print("⏹️ AI budget exhausted; skipping curated feed.")
            return

        newly_queued: List[Dict[str, Any]] = []
        for art in fresh_articles:
            if budget.remaining <= 0:
                break
            if fast_reject_general(art):
                log_event(
                    "fast_reject_general",
                    {"source": source, "article": format_article_for_log(art)},
                )
                continue
            ai_pool.append(art)
            budget.remaining -= 1
            newly_queued.append(art)
        if newly_queued:
            print(f"🧠 Queued {len(newly_queued)} articles from {source} for AI curation.")
            log_event(
                "queued_for_curation",
                {
                    "source": source,
                    "queued_count": len(newly_queued),
                    "articles": [format_article_for_log(a) for a in newly_queued],
                    "budget_remaining": budget.remaining,
                },
            )

    except ModelExhaustedError:
        raise
    except Exception as e:  # noqa: BLE001
        print(f"🔥 Critical error on {source}: {e}")
        log_event("feed_processing_error", {"source": source, "error": str(e), "url": url})


def curate_and_persist(curation_pool: List[Dict[str, Any]]):
    if not curation_pool:
        return

    curated_articles: List[Dict[str, Any]] = []
    for i in range(0, len(curation_pool), AI_BATCH_SIZE):
        batch = curation_pool[i : i + AI_BATCH_SIZE]
        log_event(
            "curation_batch_start",
            {
                "batch_size": len(batch),
                "articles": [format_article_for_log(a) for a in batch],
            },
        )
        try:
            curated_articles.extend(analyze_news_batch(batch))
        except ModelExhaustedError:
            raise
        except Exception as err:  # noqa: BLE001
            print(f"⚠️ AI batch failed: {err}")
            log_event("curation_batch_error", {"error": str(err)})

    if not curated_articles:
        log_event("curation_no_results", {})
        return

    log_event(
        "curation_results",
        {
            "total_curated": len(curated_articles),
            "articles": [format_article_for_log(a) for a in curated_articles],
        },
    )

    reserved_slots: List[str] = []
    for slot, meta in FEATURE_SLOTS.items():
        with feature_lock:
            already_updated = feature_updated_this_run[slot]
        if already_updated:
            continue
        if not feature_rotation_allowed[slot]:
            continue
        candidate = pick_feature_candidate(curated_articles, meta["category"])
        if candidate:
            candidate["_target_slot"] = slot
            reserved_slots.append(slot)
            with feature_lock:
                feature_updated_this_run[slot] = True
    if reserved_slots:
        log_event("feature_slots_reserved", {"slots": reserved_slots})

    now_str = datetime.now(timezone.utc).isoformat()
    db_ready_articles: List[Dict[str, Any]] = []
    slots_to_update: List[tuple[str, str]] = []

    for art in curated_articles:
        target_slot = art.pop("_target_slot", None)
        art.pop("tone", None)
        art["scraped_at"] = now_str
        db_ready_articles.append(art)
        if target_slot:
            slots_to_update.append((target_slot, art["link"]))

    db_ready_articles = filter_existing_links(db_ready_articles)

    if not db_ready_articles:
        release_feature_reservations(reserved_slots)
        log_event("curation_no_new_after_filter", {"reserved_slots": reserved_slots})
        return

    log_event(
        "curation_ready_for_db",
        {
            "count": len(db_ready_articles),
            "slots_to_update": slots_to_update,
            "articles": [format_article_for_log(a) for a in db_ready_articles],
        },
    )
    enqueue_for_persistence(db_ready_articles, slots_to_update, "curated")


def main():
    global feature_states, feature_rotation_allowed

    run_started_at = datetime.now(timezone.utc)
    print(f"🚀 Scraper v2 started at {run_started_at}")
    log_event("scraper_run_start", {"started_at": run_started_at.isoformat()})

    ensure_feature_slots()
    feature_states = get_feature_state_map()

    for slot in FEATURE_SLOTS:
        feature_rotation_allowed[slot] = can_rotate_feature_slot(slot)
        status = "open" if feature_rotation_allowed[slot] else "locked"
        print(f"Slot [{slot}] is {status}.")
        log_event(
            "feature_slot_status",
            {"slot": slot, "status": status, "locked_until": feature_states.get(slot, {}).get("locked_until")},
        )

    worker_thread = start_turso_worker()
    ai_pool: List[Dict[str, Any]] = []
    budget = AIBudget(MAX_AI_ARTICLES_PER_RUN)

    try:
        for config in TARGET_FEEDS:
            process_feed(config, ai_pool, budget)

        curate_and_persist(ai_pool)

    except ModelExhaustedError as e:
        print(f"🛑 AI models unavailable, ending scrape early: {e}")
        log_event("scraper_model_exhausted", {"error": str(e)})
    finally:
        persist_queue.join()
        persist_stop_event.set()
        worker_thread.join(timeout=5)
        if worker_thread.is_alive():
            print("⚠️ Turso writer is still shutting down...")

    print("🏁 Done.")
    log_event(
        "scraper_run_complete",
        {
            "started_at": run_started_at.isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    try:
        client.close()
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ Error closing DB: {e}")
        log_event("scraper_close_error", {"error": str(e)})

    sys.exit(0)


if __name__ == "__main__":
    main()
