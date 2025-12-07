import sys
import os
import time
import feedparser
from datetime import datetime, timedelta, timezone
from time import mktime
from urllib.parse import urljoin
from queue import Empty, Queue
from threading import Event, Lock, Thread
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from curator import analyze_news_batch, ModelExhaustedError
from logger import log_event
import cloudscraper
import libsql_client

# Load environment variables
load_dotenv()

# ---- Turso Setup ----
url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

if not url or not token:
    raise ValueError("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN")

# Create the sync client (best for scripts)
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

feature_states: dict = {}
feature_rotation_allowed: dict = {slot: False for slot in FEATURE_SLOTS}
feature_updated_this_run: dict = {slot: False for slot in FEATURE_SLOTS}
feature_lock = Lock()

# Background queue to push curated batches to Turso without waiting for the full scrape to finish
persist_queue: Queue = Queue()
persist_stop_event = Event()
direct_seen_links: set[str] = set()

TARGET_FEEDS = [
    # --- TECH & SCIENCE ---
    {"url": "https://it.mk/feed/", "source": "IT.mk", "category": "Tech"},
    {"url": "https://konekt.mk/category/смартфони/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/софтвер-веб/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/футуризам/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/паметни-уреди/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/рецензии/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/мултимедија/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://avtoplus.mk/category/noviteti/feed/", "source": "Авто Плус", "category": "Tech"},
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
    {"url": "https://trn.mk/feed/", "source": "Трн", "category": "Lifestyle"},
    {"url": "https://fashionel.mk/feed/", "source": "Fashionel", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/zdravje/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/gastro/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/fitnes/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/kosa-lice-telo/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/homestyle/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/semejstvo/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    

    #--- Sports ---
    {"url": "https://sportplus.mk/feed/", "source": "Sport Plus", "category": "Sports"},
    
    # --- GENERAL NEWS ---
    {"url": "https://kajgana.com/rss.xml", "source": "Кајгана","curate": True},
    {"url": "https://a1on.mk/feed/", "source": "A1on", "curate": True},
    {"url": "https://www.crnobelo.com/latest-rss?format=feed&type=rss", "source": "Црно Бело", "curate": True},
    {"url": "https://makfax.com.mk/feed/", "source": "Makfax", "curate": True},
    {"url": "https://kanal5.com.mk/rss.aspx", "source": "Канал 5", "curate": True},
    {"url": "https://www.slobodenpecat.mk/feed/", "source": "Слободен Печат", "curate": True},
    {"url": "https://mkd.mk/feed/", "source": "MKD.mk", "curate": True},
    {"url": "https://www.slobodnaevropa.mk/api/z_poml-vomx-tpevjpy", "source": "Радио Слободна Европа", "curate": True},
    {"url": "https://bitolanews.mk/feed/", "source": "Битола Њуз", "curate": True}
]

# ---- Helpers ----

def parse_date(entry):
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        dt = datetime.fromtimestamp(mktime(entry.published_parsed))
        # Ensure UTC timezone is applied if not present
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc) 
        return dt.isoformat()
    return datetime.now(timezone.utc).isoformat() # Use timezone.utc for consistency

def normalize_image_url(url: str | None, base_link: str | None) -> str | None:
    if not url: return None
    if url.lower().startswith("http"): return url
    if not base_link: return url
    return urljoin(base_link, url)

def extract_inline_image(entry, base_link: str | None) -> str | None:
    candidates: list[str] = []
    
    # Check media_content (common in standard RSS)
    media_content = entry.get('media_content') or []
    for media in media_content:
        if isinstance(media, dict) and media.get('url'):
            candidates.append(media['url'])
            
    # Check enclosures
    enclosures = entry.get('enclosures') or []
    for enc in enclosures:
        if enc.get('type', '').startswith('image/') and enc.get('href'):
            candidates.append(enc['href'])

    # Check HTML summary for <img> tags
    if entry.get('summary', '').find('<img') != -1:
        soup = BeautifulSoup(entry.get('summary', ''), 'html.parser')
        img = soup.find('img')
        if img and img.get('src'):
            candidates.append(img['src'])

    for candidate in candidates:
        normalized = normalize_image_url(candidate, base_link)
        if normalized:
            return normalized
    return None

def scrape_image_from_page(article_url: str, scraper) -> str | None:
    if not article_url: return None
    try:
        resp = scraper.get(article_url, timeout=10)
        if resp.status_code != 200: return None
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Priority: Open Graph -> Twitter Card -> Article First Image
        meta_props = [
            {'property': 'og:image'},
            {'name': 'twitter:image'},
        ]
        for attrs in meta_props:
            tag = soup.find('meta', attrs=attrs)
            if tag and tag.get('content'):
                return normalize_image_url(tag['content'], article_url)
                
    except Exception:
        pass # Fail silently on image scrape
    return None

def resolve_image_url(entry, scraper) -> str | None:
    link = entry.get('link')
    inline = extract_inline_image(entry, link)
    if inline: return inline
    return scrape_image_from_page(link, scraper)

def extract_summary_text(entry) -> str:
    raw = entry.get('summary') or entry.get('description') or ''
    soup = BeautifulSoup(raw, 'html.parser')
    return soup.get_text(separator=' ', strip=True)[:500]

def dedup_articles_by_link(articles: list[dict]) -> list[dict]:
    """Remove duplicate links within the provided list."""
    seen: set[str] = set()
    deduped: list[dict] = []
    for art in articles:
        link = art.get("link")
        if not link or link in seen:
            continue
        seen.add(link)
        deduped.append(art)
    print(f"🔍 Deduped articles: od {len(articles)} -> {len(deduped)}")
    return deduped

def filter_existing_links(articles: list[dict]) -> list[dict]:
    """Drop articles whose links already exist in the posts table."""
    links = [a.get("link") for a in articles if a.get("link")]
    if not links:
        return []
    placeholders = ",".join(["?"] * len(links))
    try:
        rs = client.execute(f"SELECT link FROM posts WHERE link IN ({placeholders})", links)
        existing = {row[0] for row in rs.rows}
    except Exception as e:
        print(f"⚠️ Skipping duplicate filter due to DB error: {e}")
        return articles

    return [a for a in articles if a.get("link") not in existing]

# ---- Feature Slot Logic (Turso Version) ----

def ensure_feature_slots():
    """Ensures the featured_slots table has the required rows."""
    for slot_id, meta in FEATURE_SLOTS.items():
        # 1. Use '?' for the post_id placeholder
        # 2. Pass None instead of 0 to create a valid NULL entry
        # 3. Use a tuple (...) for arguments, which is safer for some drivers
        client.execute(
            "INSERT OR IGNORE INTO featured_slots (slot_id, label, post_id) VALUES (?, ?, ?)", 
            (slot_id, meta['label'], None)
        )


def get_feature_state_map():
    """Loads current locks from DB."""
    try:
        rs = client.execute("SELECT slot_id, locked_until, manual_override FROM featured_slots")
        state = {}
        for row in rs.rows:
            state[row[0]] = {
                "locked_until": row[1],
                "manual_override": bool(row[2])
            }
        return state
    except Exception as e:
        print(f"⚠️ Failed to get feature state: {e}")
        return {}

def can_rotate_feature_slot(slot: str):
    state = feature_states.get(slot)
    if not state: return True
    if state.get("manual_override"): return False
    
    locked_until_str = state.get("locked_until")
    if not locked_until_str: return True
    
    try:
        locked_until = datetime.fromisoformat(locked_until_str)
        # Ensure UTC comparison
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= locked_until
    except ValueError:
        return True

def lock_feature_story(slot: str, article_link: str):
    """Updates the featured_slots table to point to the new article."""
    try:
        # 1. Get the ID of the newly inserted article
        rs = client.execute("SELECT id FROM posts WHERE link = ?", [article_link])
        if not rs.rows:
            return
        post_id = rs.rows[0][0]

        # 2. Update the slot
        new_lock_time = (datetime.now(timezone.utc) + timedelta(hours=FEATURE_ROTATION_HOURS)).isoformat()
        
        client.execute(
            """
            UPDATE featured_slots 
            SET post_id = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE slot_id = ?
            """,
            [post_id, new_lock_time, slot]
        )
        print(f"🌟 [{slot}] Rotated to: {post_id}")
        log_event("feature_rotated", {"slot": slot, "post_id": post_id})
        
        # Update local state to prevent double rotation in same run
        with feature_lock:
            feature_updated_this_run[slot] = True
        
    except Exception as e:
        print(f"⚠️ Failed to lock feature: {e}")

# ---- Main Scraping Logic ----

def save_batch_to_turso(articles: list[dict]):
    """Saves a batch of articles using a Transaction for speed."""
    if not articles: return

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
        
        # Prepare params (handle Nones safely)
        params = [
            art.get("title") or "Untitled",
            art.get("link") or "",
            art.get("source") or "",
            art.get("category"),
            art.get("teaser"),
            art.get("summary") or art.get("summary_text") or "",
            art.get("image_url"),
            art.get("published_at"),
            art.get("scraped_at")
        ]
        
        stmts.append(libsql_client.Statement(sql, params))

    try:
        client.batch(stmts)
        return True
    except Exception as e:
        print(f"🔥 Turso Batch Error: {e}")
        return False

# ---- Async Persistence Worker ----

def release_feature_reservations(slots: list[str]) -> None:
    """Resets feature slot reservations when a batch fails to persist."""
    if not slots:
        return
    with feature_lock:
        for slot in slots:
            feature_updated_this_run[slot] = False

def enqueue_for_persistence(articles: list[dict], slots_to_update: list[tuple[str, str]], source: str) -> None:
    """Send curated articles to the background Turso writer."""
    persist_queue.put((articles, slots_to_update, source))
    print(f"📤 [{source}] Queued {len(articles)} curated articles for Turso.")

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
                for slot, link in slots_to_update:
                    lock_feature_story(slot, link)
            else:
                release_feature_reservations([slot for slot, _ in slots_to_update])
        except Exception as e:
            print(f"🔥 Turso write failure: {e}")
            release_feature_reservations([slot for slot, _ in slots_to_update])
        finally:
            persist_queue.task_done()

def start_turso_worker() -> Thread:
    worker = Thread(target=turso_writer_worker, name="turso-writer", daemon=True)
    worker.start()
    return worker

def pick_feature_candidate(candidates, target_category):
    """Finds the best article in the batch for a specific category."""
    best = None
    best_score = 0
    
    for art in candidates:
        # If target_category is None, it means "Main" (accept any category)
        if target_category and art.get("category") != target_category:
            continue
            
        score = int(art.get("hero_score", 0) or 0)
        if not art.get("image_url"): score -= 5 # Penalize no image
        
        if score > best_score and score > 60: # Threshold for quality
            best_score = score
            best = art
            
    return best

def fetch_and_save_feed(feed_config):
    url = feed_config['url']
    source = feed_config['source']
    reserved_slots: list[str] = []
    should_curate = feed_config.get("curate", False)
    default_category = feed_config.get("category")
    
    print(f"--- 📡 Fetching {source} ---")
    
    try:
        scraper = cloudscraper.create_scraper()
        resp = scraper.get(url, timeout=20)
        if resp.status_code != 200:
            print(f"❌ Status {resp.status_code}")
            return

        feed = feedparser.parse(resp.content)
        if not feed.entries:
            print("❌ No entries.")
            return

        raw_articles = []
        for entry in feed.entries[:8]: # Limit to 8 per feed to save tokens
            img = resolve_image_url(entry, scraper)
            txt = extract_summary_text(entry)
            raw_articles.append({
                "title": entry.get('title', 'No Title'),
                "link": entry.get('link', ''),
                "source": source,
                "published_at": parse_date(entry),
                "image_url": img,
                "summary_text": txt,
            })

        raw_articles = dedup_articles_by_link(raw_articles)

        if not raw_articles: return

        # Fast path: skip AI curation for non-general sources
        if not should_curate:
            now_str = datetime.now(timezone.utc).isoformat()
            direct_articles = []
            for art in raw_articles:
                summary_text = art.get("summary_text", "")
                link = art.get("link")
                if not link or link in direct_seen_links:
                    continue
                direct_seen_links.add(link)
                direct_articles.append({
                    "title": art["title"],
                    "link": art["link"],
                    "source": source,
                    "category": default_category,
                    "teaser": summary_text[:100].strip(),
                    "summary": summary_text,
                    "image_url": art.get("image_url"),
                    "published_at": art["published_at"],
                    "scraped_at": now_str,
                })
            unique_sources = {article["source"] for article in direct_articles}
            direct_articles = filter_existing_links(direct_articles)
            print(f"📄 Direct articles after dedup and filter: {len(direct_articles)}, from {unique_sources}")
            if not direct_articles:
                print("❌ No new articles after filtering.")
                return

            enqueue_for_persistence(direct_articles, [], source)
            return

        # AI Analysis
        try:
            curated_articles = analyze_news_batch(raw_articles)
        except ModelExhaustedError:
            release_feature_reservations(reserved_slots)
            raise
        if not curated_articles:
            release_feature_reservations(reserved_slots)
            return

        # Add timestamp
        now_str = datetime.now(timezone.utc).isoformat()
        for a in curated_articles:
            a["scraped_at"] = now_str

        # Check for Feature Rotation BEFORE removing internal keys
        for slot, meta in FEATURE_SLOTS.items():
            with feature_lock:
                already_updated = feature_updated_this_run[slot]
            if already_updated: continue # Already done this run
            if not feature_rotation_allowed[slot]: continue # Time hasn't passed
            
            candidate = pick_feature_candidate(curated_articles, meta['category'])
            if candidate:
                # We defer the lock until after we save to DB so we have an ID
                # We attach the slot request to the article object temporarily
                candidate["_target_slot"] = slot
                reserved_slots.append(slot)
                with feature_lock:
                    feature_updated_this_run[slot] = True

        # Clean up AI internal keys before saving
        db_ready_articles = []
        slots_to_update = []
        
        for art in curated_articles:
            target_slot = art.pop("_target_slot", None)
            
            # Remove AI scoring keys that aren't in DB
            art.pop("hero_candidate", None)
            art.pop("hero_score", None)
            art.pop("tone", None)
            
            db_ready_articles.append(art)
            if target_slot:
                slots_to_update.append((target_slot, art['link']))

        if not db_ready_articles:
            release_feature_reservations(reserved_slots)
            return

        # Send curated batch to background Turso writer immediately
        enqueue_for_persistence(db_ready_articles, slots_to_update, source)

    except ModelExhaustedError:
        release_feature_reservations(reserved_slots)
        raise
    except Exception as e:
        release_feature_reservations(reserved_slots)
        print(f"🔥 Critical error on {source}: {e}")

def main():
    global feature_states, feature_rotation_allowed
    # Ensure datetime.now uses timezone for consistency
    print(f"🚀 Scraper started at {datetime.now(timezone.utc)}") 
    
    ensure_feature_slots()
    feature_states = get_feature_state_map()
    
    # Calculate if we are allowed to rotate
    for slot in FEATURE_SLOTS:
        feature_rotation_allowed[slot] = can_rotate_feature_slot(slot)
        if feature_rotation_allowed[slot]:
            print(f"🔓 Slot [{slot}] is open for rotation.")
        else:
            print(f"🔒 Slot [{slot}] is locked.")

    worker_thread = start_turso_worker()

    try:
        for config in TARGET_FEEDS:
            fetch_and_save_feed(config)

    except ModelExhaustedError as e:
        print(f"🛑 AI models unavailable, ending scrape early: {e}")
    finally:
        # Wait for queued writes to flush before shutting down
        persist_queue.join()
        persist_stop_event.set()
        worker_thread.join(timeout=5)
        if worker_thread.is_alive():
            print("⚠️ Turso writer is still shutting down...")
        
    print("🏁 Done.")
    try:
        client.close()
        print("🔌 Database connection closed.")
    except Exception as e:
        print(f"⚠️ Error closing DB: {e}")

    # Use sys.exit instead of exit()
    sys.exit(0)

if __name__ == "__main__":
    main()
