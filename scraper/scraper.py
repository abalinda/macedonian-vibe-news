import os
import time
import feedparser
from datetime import datetime, timedelta, timezone
from time import mktime
from urllib.parse import urljoin
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from curator import analyze_news_batch
from supabase import create_client, Client
from logger import log_event
import cloudscraper

# Load environment variables
load_dotenv()

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL") or ""
key: str = os.environ.get("SUPABASE_KEY") or ""
supabase: Client = create_client(url, key)

FEATURE_ROTATION_HOURS = 8
FEATURE_SLOTS = {
    "main": {"category": None, "label": "Main"},
    "tech": {"category": "Tech", "label": "Tech"},
    "culture": {"category": "Culture", "label": "Culture"},
    "lifestyle": {"category": "Lifestyle", "label": "Lifestyle"},
    "business": {"category": "Business", "label": "Business"},
}

feature_states: dict[str, dict] = {}
feature_rotation_allowed: dict[str, bool] = {slot: False for slot in FEATURE_SLOTS}
feature_updated_this_run: dict[str, bool] = {slot: False for slot in FEATURE_SLOTS}

TARGET_FEEDS = [
    # --- TECH & SCIENCE (Priority for "Cool" Vibes) ---
    {"url": "https://it.mk/feed/", "source": "IT.mk"},

    # --- CULTURE, ART & URBAN LIVING ---
    {"url": "https://www.porta3.mk/feed/", "source": "Porta3"},  # Architecture/Design
    {"url": "https://umno.mk/feed/", "source": "Umno"},          # Culture/Education
    {"url": "https://okno.mk/rss", "source": "Okno"},           # Alternative Culture
    {"url": "https://radiomof.mk/feed/", "source": "Radio MOF"}, # Youth/Activism (Good vibes)

    # --- LIFESTYLE & ENTERTAINMENT ---
    {"url": "https://kajgana.com/rss.xml", "source": "Kajgana"},        # General (needs filtering)
    {"url": "https://www.crnobelo.com/latest-rss?format=feed&type=rss", "source": "CrnoBelo"},    # Life hacks/Quizzes
    {"url": "https://www.kafepauza.mk/feed/", "source": "KafePauza"}, # Relaxed reading
    {"url": "https://off.net.mk/feed", "source": "Off.net"},        # Satire/Fun (Check if XML parses correctly)

    # --- GENERAL NEWS (Requires heavy AI filtering for Politics) ---
    {"url": "https://a1on.mk/feed/", "source": "A1on"},
    {"url": "https://makfax.com.mk/feed/", "source": "Makfax"},
    {"url": "https://kanal5.com.mk/rss.aspx", "source": "Kanal 5"},
    {"url": "https://www.slobodenpecat.mk/feed/", "source": "Sloboden Pecat"},
    {"url": "https://mkd.mk/feed/", "source": "MKD.mk"},
]

def parse_date(entry):
    """Helper to convert RSS time struct to Postgres timestamp format"""
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        dt = datetime.fromtimestamp(mktime(entry.published_parsed))
        return dt.isoformat()
    return datetime.now().isoformat()


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
    media_content = entry.get('media_content') or []
    for media in media_content:
        media_url = media.get('url') if isinstance(media, dict) else media.get('href')
        if media_url:
            candidates.append(media_url)

    media_thumbnails = entry.get('media_thumbnail') or []
    for media in media_thumbnails:
        thumb_url = media.get('url')
        if thumb_url:
            candidates.append(thumb_url)

    enclosures = entry.get('enclosures') or []
    for enclosure in enclosures:
        if 'image' in (enclosure.get('type') or ''):
            href = enclosure.get('href')
            if href:
                candidates.append(href)

    links = entry.get('links') or []
    for link in links:
        if link.get('rel') == 'enclosure' and 'image' in (link.get('type') or ''):
            href = link.get('href')
            if href:
                candidates.append(href)

    if entry.get('summary', '').find('<img') != -1:
        soup = BeautifulSoup(entry.get('summary', ''), 'html.parser')
        img = soup.find('img')
        if img and img.get('src'):
            candidates.append(img['src']) # type: ignore

    raw_image = entry.get('image')
    if raw_image:
        if isinstance(raw_image, dict) and raw_image.get('href'):
            candidates.append(raw_image['href'])
        elif isinstance(raw_image, str):
            candidates.append(raw_image)

    for candidate in candidates:
        normalized = normalize_image_url(candidate, base_link)
        if normalized:
            return normalized

    return None


def scrape_image_from_page(article_url: str, scraper) -> str | None:
    if not article_url:
        return None
    try:
        resp = scraper.get(article_url, timeout=12)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, 'html.parser')
        meta_props = [
            ('meta', {'property': 'og:image'}),
            ('meta', {'name': 'og:image'}),
            ('meta', {'property': 'twitter:image'}),
            ('meta', {'name': 'twitter:image'}),
        ]

        for tag_name, attrs in meta_props:
            tag = soup.find(tag_name, attrs=attrs) # if attrs: dict[str, Any]
            if tag and tag.get('content'):
                return normalize_image_url(tag['content'], article_url)

        article_img = soup.find('article')
        if article_img:
            img = article_img.find('img')
            if img and img.get('src'):
                return normalize_image_url(img['src'], article_url)

        fallback_img = soup.find('img')
        if fallback_img and fallback_img.get('src'):
            return normalize_image_url(fallback_img['src'], article_url)

    except Exception as err:
        log_event("image_scrape_error", {"url": article_url, "error": str(err)})

    return None


def resolve_image_url(entry, scraper) -> str | None:
    link = entry.get('link')
    inline = extract_inline_image(entry, link)
    if inline:
        return inline
    return scrape_image_from_page(link, scraper)


def extract_summary_text(entry) -> str:
    raw_summary = entry.get('summary') or entry.get('description') or ''
    if not raw_summary:
        return ''
    soup = BeautifulSoup(raw_summary, 'html.parser')
    text = soup.get_text(separator=' ', strip=True)
    return text[:400]

def _parse_iso(value: str | None):
    if not value:
        return None
    cleaned = value.replace("Z", "+00:00") if value.endswith("Z") else value
    try:
        return datetime.fromisoformat(cleaned)
    except ValueError:
        return None

def ensure_feature_slots():
    try:
        rows = []
        for slot, meta in FEATURE_SLOTS.items():
            rows.append({
                "slot": slot,
                "category": meta["category"],
            })
        supabase.table("featured_story").upsert(rows, on_conflict="slot").execute()
    except Exception as err:
        print(f"⚠️ Unable to ensure featured_story rows: {err}")


def get_feature_state_map():
    try:
        response = supabase.table("featured_story").select("slot, post_id, locked_until, manual_override").in_("slot", list(FEATURE_SLOTS.keys())).execute()
        data = getattr(response, "data", None) or []
        state = {row["slot"]: row for row in data}
        return state
    except Exception as err:
        print(f"⚠️ Unable to read featured state: {err}")
        return {}


def can_rotate_feature_slot(state: dict | None):
    if not state:
        return True
    if state.get("manual_override"):
        return False
    locked_until = _parse_iso(state.get("locked_until"))
    if not locked_until:
        return True
    # Ensure locked_until is timezone-aware in UTC so we can compare reliably
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) >= locked_until


def lock_feature_story(slot: str, article):
    global feature_states
    try:
        lookup = supabase.table("posts").select("id").eq("link", article["link"]).limit(1).execute()
        row = (getattr(lookup, "data", None) or [])
        if not row:
            return
        post_id = row[0]["id"]
        locked_until_dt = datetime.now(tz=timezone.utc) + timedelta(hours=FEATURE_ROTATION_HOURS)
        payload = {
            "slot": slot,
            "post_id": post_id,
            "locked_until": locked_until_dt.isoformat(),
            "manual_override": False,
            "updated_at": datetime.now(tz=timezone.utc).isoformat(),
            "notes": article.get("teaser"),
        }
        supabase.table("featured_story").upsert(payload, on_conflict="slot").execute()
        feature_states[slot] = payload
        log_event("feature_assigned", {
            "slot": slot,
            "title": article['title'],
            "link": article['link'],
            "source": article['source'],
            "post_id": post_id,
            "locked_until": payload['locked_until'],
        })
        print(f"🌟 [{slot}] Featured story locked: {article['title']}")
    except Exception as err:
        print(f"⚠️ Unable to lock featured story for slot {slot}: {err}")

def pick_feature_candidate(candidates, *, category: str | None = None):
    best = None
    best_score = -1
    for article in candidates:
        if not article.get("hero_candidate"):
            continue
        if category and article.get("category") != category:
            continue
        score = article.get("hero_score", 0) or 0
        score = int(score)
        if not article.get("image_url"):
            score -= 5
        if score <= 0:
            continue
        if score > best_score:
            best = article
            best_score = score
    return best

def fetch_and_save_feed(feed_config):
    global feature_updated_this_run
    url = feed_config['url']
    source = feed_config['source']
    
    print(f"--- 📡 Fetching {source} ---")
    log_event("feed_fetch_start", {"source": source, "url": url})
    
    try:
        # Create a scraper instance (mimics a desktop browser)
        scraper = cloudscraper.create_scraper() 
        
        # Use scraper.get instead of requests.get
        # We don't even need manual headers anymore, it handles them.
        resp = scraper.get(url, timeout=15)
        
        if resp.status_code != 200:
            print(f"❌ Blocked again ({resp.status_code}). Server is very strict.")
            log_event("feed_fetch_blocked", {"source": source, "status": resp.status_code})
            return

        resp.encoding = resp.apparent_encoding
        
        # Parse content
        feed = feedparser.parse(resp.content)
        
        if not feed.entries:
            print("❌ No entries found.")
            log_event("feed_no_entries", {"source": source})
            return

        raw_articles = []

        for entry in feed.entries[:10]:
            image_url = resolve_image_url(entry, scraper)
            summary_text = extract_summary_text(entry)
            raw_article = {
                "title": entry.get('title', 'No Title'),
                "link": entry.get('link', ''),
                "source": source,
                "published_at": parse_date(entry),
                "image_url": image_url,
                "summary_text": summary_text,
            }
            raw_articles.append(raw_article)

        if not raw_articles:
            print("⚠️ Nothing to analyze.")
            log_event("feed_empty_after_parse", {"source": source})
            return

        log_event("feed_raw_articles", {"source": source, "articles": raw_articles})

        curated_articles = analyze_news_batch(raw_articles)
        
        # Add scraped_at timestamp to all articles
        scraped_at = datetime.now(tz=timezone.utc).isoformat()
        for article in curated_articles:
            article["scraped_at"] = scraped_at

        if not curated_articles:
            print("⚠️ Brain rejected everything for this feed.")
            log_event("curation_empty", {"source": source})
            return

        pending_feature_articles: dict[str, dict] = {}
        for slot, meta in FEATURE_SLOTS.items():
            if feature_updated_this_run.get(slot):
                continue
            if not feature_rotation_allowed.get(slot):
                continue
            candidate = pick_feature_candidate(curated_articles, category=meta["category"])
            if candidate:
                pending_feature_articles[slot] = candidate
                feature_updated_this_run[slot] = True

        for article in curated_articles:
            article.pop("hero_candidate", None)
            article.pop("hero_score", None)
            article.pop("tone", None)

        data = supabase.table("posts").upsert(
            curated_articles,
            on_conflict="link"
        ).execute()
        print(f"✅ Upserted {len(curated_articles)} curated articles from {source}.")
        log_event("supabase_upsert", {
            "source": source,
            "count": len(curated_articles),
            "scraped_at": scraped_at
        })
        for slot, article in pending_feature_articles.items():
            lock_feature_story(slot, article)

    except Exception as e:
        print(f"🔥 Error processing {source}: {e}")
        log_event("feed_exception", {"source": source, "error": str(e)})
        
def main():
    global feature_rotation_allowed, feature_updated_this_run, feature_states
    print(f"🚀 Starting Scraper at {datetime.now()}")
    log_event("scraper_run_start", {})
    ensure_feature_slots()
    feature_states = get_feature_state_map()
    feature_rotation_allowed = {}
    feature_updated_this_run = {}
    for slot in FEATURE_SLOTS.keys():
        state = feature_states.get(slot)
        feature_rotation_allowed[slot] = can_rotate_feature_slot(state)
        feature_updated_this_run[slot] = False
    log_event("feature_rotation_state", {
        slot: {
            "allowed": feature_rotation_allowed.get(slot, False),
            "manual_override": feature_states.get(slot, {}).get("manual_override", False)
        }
        for slot in FEATURE_SLOTS.keys()
    })
    
    for config in TARGET_FEEDS:
        fetch_and_save_feed(config)
        time.sleep(1)
        
    print("\n🏁 Database sync complete.")
    log_event("scraper_run_complete", {"feature_updated": feature_updated_this_run})

if __name__ == "__main__":
    main()