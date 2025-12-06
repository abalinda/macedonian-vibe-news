import sys
import os
import time
import feedparser
from datetime import datetime, timedelta, timezone
from time import mktime
from urllib.parse import urljoin
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from curator import analyze_news_batch
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

TARGET_FEEDS = [
    # --- TECH & SCIENCE ---
    {"url": "https://it.mk/feed/", "source": "IT.mk"},
    {"url": "https://konekt.mk/category/смартфони/feed", "source": "Konekt - Смартфони"},
    {"url": "https://konekt.mk/category/софтвер-веб/feed", "source": "Konekt - Софтвер и Веб"},
    {"url": "https://konekt.mk/category/футуризам/feed", "source": "Konekt - Футуризам"},
    {"url": "https://konekt.mk/category/паметни-уреди/feed", "source": "Konekt - Паметни Уреди"},
    {"url": "https://konekt.mk/category/рецензии/feed", "source": "Konekt - Рецензии"},
    {"url": "https://konekt.mk/category/мултимедија/feed", "source": "Konekt - Мултимедија"},

    # --- CULTURE & LIFESTYLE ---
    {"url": "https://www.porta3.mk/feed/", "source": "Porta3"},
    {"url": "https://umno.mk/feed/", "source": "Umno"},
    {"url": "https://okno.mk/rss", "source": "Okno"},
    {"url": "https://radiomof.mk/feed/", "source": "Radio MOF"},
    {"url": "https://kajgana.com/rss.xml", "source": "Kajgana"},
    {"url": "https://www.crnobelo.com/latest-rss?format=feed&type=rss", "source": "CrnoBelo"},
    {"url": "https://www.kafepauza.mk/feed/", "source": "KafePauza"},
    {"url": "https://off.net.mk/feed", "source": "Off.net"},

    # --- GENERAL NEWS ---
    {"url": "https://a1on.mk/feed/", "source": "A1on"},
    {"url": "https://makfax.com.mk/feed/", "source": "Makfax"},
    {"url": "https://kanal5.com.mk/rss.aspx", "source": "Kanal 5"},
    {"url": "https://www.slobodenpecat.mk/feed/", "source": "Sloboden Pecat"},
    {"url": "https://mkd.mk/feed/", "source": "MKD.mk"},
    {"url": "https://www.slobodnaevropa.mk/api/z_poml-vomx-tpevjpy", "source": "RSE-Vesti"},
    {"url": "https://konekt.mk/feed/", "source": "Konekt"},
]

# ---- Helpers ----

def parse_date(entry):
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        dt = datetime.fromtimestamp(mktime(entry.published_parsed))
        return dt.isoformat()
    return datetime.now().isoformat()

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

        if not raw_articles: return

        # AI Analysis
        curated_articles = analyze_news_batch(raw_articles)
        if not curated_articles: return

        # Add timestamp
        now_str = datetime.now(timezone.utc).isoformat()
        for a in curated_articles:
            a["scraped_at"] = now_str

        # Check for Feature Rotation BEFORE removing internal keys
        for slot, meta in FEATURE_SLOTS.items():
            if feature_updated_this_run[slot]: continue # Already done this run
            if not feature_rotation_allowed[slot]: continue # Time hasn't passed
            
            candidate = pick_feature_candidate(curated_articles, meta['category'])
            if candidate:
                # We defer the lock until after we save to DB so we have an ID
                # We attach the slot request to the article object temporarily
                candidate["_target_slot"] = slot

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

        # Save to Turso
        success = save_batch_to_turso(db_ready_articles)
        
        # If save successful, update feature slots
        if success:
            print(f"✅ Saved {len(db_ready_articles)} articles.")
            for slot, link in slots_to_update:
                lock_feature_story(slot, link)

    except Exception as e:
        print(f"🔥 Critical error on {source}: {e}")

def main():
    global feature_states, feature_rotation_allowed
    print(f"🚀 Scraper started at {datetime.now()}")
    
    ensure_feature_slots()
    feature_states = get_feature_state_map()
    
    # Calculate if we are allowed to rotate
    for slot in FEATURE_SLOTS:
        feature_rotation_allowed[slot] = can_rotate_feature_slot(slot)
        if feature_rotation_allowed[slot]:
            print(f"🔓 Slot [{slot}] is open for rotation.")
        else:
            print(f"🔒 Slot [{slot}] is locked.")

    for config in TARGET_FEEDS:
        fetch_and_save_feed(config)
        
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