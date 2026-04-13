import sys
import os
import feedparser
import random
from difflib import SequenceMatcher
from datetime import datetime, timedelta, timezone
from time import mktime
from queue import Queue, Empty
from threading import Thread, Event
from urllib.parse import urljoin
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from curator_groq import analyze_news_batch, ModelExhaustedError
import cloudscraper
import libsql_client

# Load environment variables
load_dotenv()

# ---- Turso Setup ----
URL = os.getenv("TURSO_DATABASE_URL")
TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if not URL or not TOKEN:
    raise ValueError("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN")

# ---- Config ----
HERO_ROTATION_MINUTES = 60
HERO_LOCK_MINUTES = 60
HERO_FALLBACK_LOOKBACK_HOURS = 24
MAX_AI_ARTICLES_PER_RUN = 30
MIN_CURATION_INTERVAL_MINUTES = 30
BATCH_SIZE = 5
TITLE_SIMILARITY_THRESHOLD = 0.9
TITLE_DEDUP_SEED_LIMIT = 100

last_curation_at = datetime.min.replace(tzinfo=timezone.utc)
FEATURE_SLOTS = {
    "main": {"category": None, "label": "Main Story"},
    "tech": {"category": "Tech", "label": "Tech Highlight"},
    "culture": {"category": "Culture", "label": "Culture Pick"},
    "lifestyle": {"category": "Lifestyle", "label": "Lifestyle"},
    "business": {"category": "Business", "label": "Business"},
    "sports": {"category": "Sports", "label": "Sports"},
    "iran": {"category": "Iran", "label": "Иран"},
}

persist_queue = Queue()
persist_stop_event = Event()
direct_seen_links: set[str] = set()
direct_seen_titles_normalized: list[str] = []


class AIBudget:
    def __init__(self, limit: int) -> None:
        self.remaining = limit

# ---- Helpers (aligned with scraper_2) ----

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
        meta_props = [
            {"property": "og:image"},
            {"property": "og:image:secure_url"},
            {"name": "twitter:image"},
        ]
        for attrs in meta_props:
            tag = soup.find("meta", attrs=attrs)
            if tag and tag.get("content"):
                normalized = normalize_image_url(tag["content"], article_url)
                if normalized:
                    return normalized

        def pick_img(container):
            if not container:
                return None
            for img in container.find_all("img"):
                src = (
                    img.get("src")
                    or img.get("data-src")
                    or img.get("data-lazy-src")
                )
                if not src:
                    srcset = img.get("srcset") or img.get("data-srcset")
                    if srcset:
                        src = srcset.split(",")[0].strip().split(" ")[0]
                if not src or src.startswith("data:"):
                    continue
                normalized = normalize_image_url(src, article_url)
                if normalized:
                    return normalized
            return None

        priority_scopes = [
            soup.find("article"),
            *soup.select(".entry-content, .post-content, .td-post-content, article"),
        ]
        for scope in priority_scopes:
            img_url = pick_img(scope)
            if img_url:
                return img_url

        return pick_img(soup)
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

def normalize_title_for_match(title: str) -> str:
    """Lower, strip punctuation, and collapse whitespace for stable comparisons."""
    if not title:
        return ""
    cleaned = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in title.lower())
    return " ".join(cleaned.split())


def entry_matches_keywords(entry, keywords: list[str]) -> bool:
    if not keywords:
        return True
    blob = " ".join(
        [
            str(entry.get("title", "")),
            str(entry.get("summary", "")),
            str(entry.get("description", "")),
        ]
    ).lower()
    return any(keyword in blob for keyword in keywords)


def is_duplicate_title(title: str, seen_normalized: list[str], threshold: float = TITLE_SIMILARITY_THRESHOLD):
    """Check if title is similar to any seen title using a simple similarity ratio."""
    normalized = normalize_title_for_match(title)
    if not normalized:
        return False, normalized

    for seen in seen_normalized:
        if not seen:
            continue
        similarity = SequenceMatcher(None, normalized, seen).ratio()
        if similarity >= threshold:
            return True, normalized

    return False, normalized


def seed_title_dedup_from_db(target: list[str], limit: int = TITLE_DEDUP_SEED_LIMIT) -> int:
    """Seed in-memory dedup list with recent DB titles so older stories win ties."""
    client = None
    try:
        client = get_db_client()
        rs = client.execute(
            """
            SELECT title
            FROM posts
            WHERE title IS NOT NULL AND title != ''
            ORDER BY scraped_at DESC
            LIMIT ?
            """,
            [limit],
        )
        rows = rs.rows or []
        for row in rows:
            title = row[0] if row else ""
            normalized = normalize_title_for_match(title)
            if normalized:
                target.append(normalized)
        return len(rows)
    except Exception as e:
        print(f"⚠️ Unable to preload titles for dedup: {e}")
        return 0
    finally:
        try:
            if client:
                client.close()
        except Exception:
            pass


def dedup_articles_by_link(articles):
    seen = set()
    deduped = []
    dropped = 0
    for art in articles:
        link = art.get("link")
        if not link or link in seen:
            dropped += 1
            continue
        seen.add(link)
        deduped.append(art)
    if dropped:
        print(f"ℹ️ Dedup removed {dropped} articles.")
    return deduped


def filter_existing_links(articles):
    """Drop articles whose links already exist in posts."""
    links = [a.get("link") for a in articles if a.get("link")]
    if not links:
        return []
    placeholders = ",".join(["?"] * len(links))
    try:
        client = get_db_client()
        rs = client.execute(f"SELECT link FROM posts WHERE link IN ({placeholders})", links)
        client.close()
        existing = {row[0] for row in rs.rows}
    except Exception as e:
        print(f"⚠️ Skipping duplicate filter due to DB error: {e}")
        return articles

    filtered = []
    skipped = 0
    for art in articles:
        link = art.get("link")
        if not link or link in existing:
            skipped += 1
            continue
        filtered.append(art)
    if skipped:
        print(f"ℹ️ Dropping {skipped} items already in DB.")
    return filtered


def backfill_images_for_recent_posts(limit: int = 200):
    """After scraping, try to add images to recent posts; delete if none can be found."""
    print(f"🖼️ Backfilling images for up to {limit} recent posts missing images...")
    scraper = cloudscraper.create_scraper()
    updated = 0
    deleted = 0
    checked = 0

    try:
        client = get_db_client()
    except Exception as e:
        print(f"⚠️ Unable to open DB for image backfill: {e}")
        return

    try:
        rs = client.execute(
            """
            SELECT link, title FROM posts
            WHERE image_url IS NULL OR image_url = ''
            ORDER BY published_at DESC
            LIMIT ?
            """,
            [limit],
        )
        rows = rs.rows or []
    except Exception as e:
        print(f"⚠️ Unable to fetch posts missing images: {e}")
        client.close()
        return

    for row in rows:
        if not row or not row[0]:
            continue
        link = row[0]
        title = row[1] if len(row) > 1 else "Untitled"
        checked += 1
        try:
            img = scrape_image_from_page(link, scraper)
        except Exception as e:
            print(f"⚠️ Error scraping image for {link}: {e}")
            img = None

        if img:
            try:
                client.execute(
                    """
                    UPDATE posts
                    SET image_url = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE link = ?
                    """,
                    [img, link],
                )
                updated += 1
                print(f"✅ Added image for '{title}' -> {img}")
            except Exception as e:
                print(f"⚠️ Failed to update image for {link}: {e}")
        else:
            try:
                client.execute("DELETE FROM posts WHERE link = ?", [link])
                deleted += 1
                print(f"🗑️ Deleted post without image: '{title}' ({link})")
            except Exception as e:
                print(f"⚠️ Failed to delete post without image ({link}): {e}")

    client.close()
    print(f"🖼️ Image backfill complete. Checked {checked}, updated {updated}, deleted {deleted}.")

# --- FEEDS CONFIGURATION ---
TARGET_FEEDS = [
    # ==========================================
    # 0. IRAN / WAR UPDATES (Curated + forced category)
    # ==========================================
    {
        "url": "https://www.index.hr/rss",
        "source": "Index.hr",
        "curate": True,
        "force_category": "Iran",
        "keywords": ["iran", "tehran", "irgc", "rat"],
    },
    {
        "url": "https://balkans.aljazeera.net/rss.xml",
        "source": "Al Jazeera Balkans",
        "curate": True,
        "force_category": "Iran",
        "keywords": ["iran", "tehran", "irgc", "hormuz", "strait"],
    },
    {
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "source": "Al Jazeera",
        "curate": True,
        "force_category": "Iran",
        "keywords": ["iran", "tehran", "iranian", "hormuz"],
    },

    # ==========================================
    # 1. TECH & SCIENCE
    # ==========================================
    {"url": "https://mk.voanews.com/api/z-myil-vomx-tperbtm", "source": "Voice of America", "category": "Tech"},
    {"url": "https://bulevar.mk/category/tech/feed", "source": "Bulevar", "category": "Tech"},
    {"url": "https://it.mk/feed/", "source": "IT.mk", "category": "Tech"},
    {"url": "https://smartportal.mk/feed/", "source": "Smart Portal", "category": "Tech"},
    {"url": "https://emiter.com.mk/emiter-rss-feed.xml", "source": "Emiter", "category": "Tech"},
    {"url": "https://konekt.mk/category/смартфони/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/софтвер-веб/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://provereno.mk/category/технологии/feed/", "source": "Проверено", "category": "Tech"},
    {"url": "https://konekt.mk/category/футуризам/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/паметни-уреди/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/рецензии/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://konekt.mk/category/мултимедија/feed", "source": "Конект", "category": "Tech"},
    {"url": "https://avtoplus.mk/category/noviteti/feed/", "source": "Авто Плус", "category": "Tech"},
    {"url": "https://24auto.mk/feed/", "source": "24auto", "category": "Tech"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=nauka", "source": "Факултети", "category": "Tech"},
    # New Tech Additions
    {"url": "https://gsm.mk/feed/", "source": "GSM.mk", "category": "Tech"},
    {"url": "https://usb.mk/feed/", "source": "USB.mk", "category": "Tech"},

    # ==========================================
    # 2. CULTURE & LIFESTYLE
    # ==========================================
    {"url": "https://sdk.mk/index.php/category/kultura/", "source": "SDK", "category": "Culture"},
    {"url": "https://www.porta3.mk/feed/", "source": "Porta3", "category": "Culture"},
    {"url": "https://gradska.mk/category/kultura/feed/", "source": "Градска", "category": "Culture"},
    {"url": "https://emagazin.mk/category/ubava-prikaznja/feed/", "source": "еМагазин", "category": "Culture"},
    {"url": "https://emagazin.mk/category/bash-ni-e-kef/feed/", "source": "еМагазин", "category": "Culture"},
    {"url": "https://umno.mk/feed/", "source": "Умно", "category": "Culture"},
    {"url": "https://okno.mk/rss", "source": "Окно", "category": "Culture"},
    {"url": "https://tera.mk/category/slobodno-vreme/showbiz/feed/", "source": "Тера", "category": "Culture"},
    {"url": "https://tera.mk/category/slobodno-vreme/zanimlivosti/feed/", "source": "Тера", "category": "Culture"},
    {"url": "https://antropol.mk/nastani/feed/", "source": "Антропол", "category": "Culture"},


    {"url": "https://radiomof.mk/feed/", "source": "Радио МОФ", "category": "Culture"},
    {"url": "https://provereno.mk/category/граѓански/feed/", "source": "Проверено", "category": "Culture"},
    {"url": "https://www.kafepauza.mk/feed/", "source": "Кафе Пауза", "category": "Lifestyle"},
    {"url": "https://off.net.mk/feed", "source": "Off.net", "category": "Lifestyle"},
    {"url": "https://pedijatar.mk/feed/", "source": "Педијатар", "category": "Lifestyle"},
    {"url": "https://fashionel.mk/feed/", "source": "Fashionel", "category": "Lifestyle"},
    {"url": "https://mk.voanews.com/api/ztmyvl-vomx-tpek-tt", "source": "Voice of America", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/zdravje/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/gastro/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/fitnes/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/kosa-lice-telo/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://provereno.mk/category/гастронаутика/feed/", "source": "Проверено", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/homestyle/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://www.ubavinaizdravje.mk/rubriki/semejstvo/feed/", "source": "Убавина и Здравје", "category": "Lifestyle"},
    {"url": "https://setaliste.mk/category/category/култура/feed/", "source": "Шеталиште", "category": "Culture"},
    {"url": "https://365.com.mk/category/zivot/feed/", "source": "365 - Умнибус", "category": "Lifestyle"},
    {"url": "https://365.com.mk/category/kultura/feed/", "source": "365 - Култура", "category": "Culture"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=umetnost", "source": "Факултети", "category": "Culture"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=kolumni", "source": "Факултети", "category": "Culture"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=kultura", "source": "Факултети", "category": "Culture"},
    # New Culture/Lifestyle Additions
    {"url": "https://popara.mk/feed/", "source": "Popara", "category": "Lifestyle"},
    # {"url": "https://motika.com.mk/feed/", "source": "Motika", "category": "Lifestyle"}, DO NOT DEAL
    {"url": "https://vidivaka.mk/feed/", "source": "Vidi Vaka", "category": "Culture"},
    {"url": "https://gledaj.mk/feed/", "source": "Gledaj.mk", "category": "Culture"},
    {"url": "https://plagij.at/feed/", "source": "Plagijat", "category": "Culture"},

    # ==========================================
    # 3. SPORTS (Filtered)
    # ==========================================
    {"url": "https://sportplus.mk/feed/", "source": "Sport Plus", "category": "Sports"},
    {"url": "https://topsport.mk/feed/", "source": "Top Sport", "category": "Sports"},
    {"url": "https://ipon.mk/feed/", "source": "Ipon", "category": "Sports"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=sport", "source": "Факултети", "category": "Sports"},
    # Keeping this section small as most major sports sites are in your Exclusion List.

    # ==========================================
    # 4. BUSINESS & FINANCE
    # ==========================================
    {"url": "https://mk.voanews.com/api/zymyml-vomx-tpet-ty", "source": "Voice of America", "category": "Business"},
    {"url": "https://inovativnost.mk/category/makedonija/feed/", "source": "Иновативност", "category": "Business"},
    {"url": "https://zelenaberza.com.mk/feed/", "source": "Зелена Берза", "category": "Business"},
    # New Business Additions
    {"url": "https://pari.com.mk/feed/", "source": "Pari", "category": "Business"},
    {"url": "https://bankarstvo.mk/feed/", "source": "Bankarstvo", "category": "Business"},
    {"url": "https://biznisinfo.mk/feed/", "source": "Biznis Info", "category": "Business"},
    {"url": "https://bi.mk/feed/", "source": "Biznis Vesti", "category": "Business"},

    # ==========================================
    # 5. GENERAL NEWS (Independent/Curated)
    # ==========================================
    {"url": "https://kajgana.com/rss.xml", "source": "Кајгана", "curate": True},
    {"url": "https://makfax.com.mk/feed/", "source": "Makfax", "curate": True},
    {"url": "https://glamur.mk/fashion/feed/", "source": "Glamur", "curate": True},
    {"url": "https://prizma.mk/feed/", "source": "Призма", "curate": True},
    {"url": "https://emagazin.mk/feed/", "source": "еМагазин", "curate": True},
    {"url": "https://www.slobodnaevropa.mk/api/z_poml-vomx-tpevjpy", "source": "Радио Слободна Европа", "curate": True},
    {"url": "https://skopskoeho.mk/feed/", "source": "Скопско Ехо", "curate": True},
    {"url": "https://vocentar.com/feed/", "source": "Во Центар", "curate": True},
    # Independent Journalism
    {"url": "https://sdk.mk/index.php/category/dopisna-mrezha/feed", "source": "SDK.mk", "curate": True},
    {"url": "https://sdk.mk/index.php/category/svet/feed/", "source": "SDK.mk", "curate": True},
    {"url": "https://meta.mk/feed/", "source": "Meta", "curate": True},
    {"url": "https://utro.mk/rss", "source": "Утро", "curate": True},
    {"url": "https://antropol.mk/feed/", "source": "Антропол", "curate": True},
    {"url": "https://pari.com.mk/feed/", "source": "Pari", "curate": True}, # Also good for general news
    {"url": "https://prizma.mk/feed/", "source": "Prizma", "curate": True},
    {"url": "https://rss.dw.com/rdf/rss-maz-all", "source": "Deutsche Welle", "curate": True},
    {"url": "https://mk.voanews.com/api/zimyql-vomx-tpem-ti", "source": "Voice of America", "curate": True},

    # ==========================================
    # 6. LOCAL NEWS (City Specific)
    # ==========================================
    {"url": "https://bitolanews.mk/feed/", "source": "Битола Њуз", "curate": True},
    # New Local Additions
    {"url": "http://skopjeinfo.mk/rss.xml", "source": "Skopje Info", "curate": True},
    {"url": "https://www.ohridnews.com/feed/", "source": "Ohrid News", "curate": True},
    {"url": "https://strugaonline.com/feed/", "source": "Struga Online", "curate": True},
    {"url": "https://gostivarpress.mk/feed/", "source": "Gostivar Press", "curate": True},
    {"url": "https://kumanovonews.mk/rss", "source": "Kumanovo News", "curate": True},
    {"url": "https://strumicadenes.mk/feed/", "source": "Strumica Denes", "curate": True},
]

def get_db_client():
    return libsql_client.create_client_sync(URL, auth_token=TOKEN)

def clean_html_summary(html_content):
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator=" ").strip()[:400] + "..."

def ensure_featured_slots_table(client):
    """Ensure featured_slots exists with the expected columns/rows."""
    try:
        client.execute("""
            CREATE TABLE IF NOT EXISTS featured_slots (
                slot_id TEXT PRIMARY KEY,
                label TEXT,
                post_id INTEGER,
                locked_until TEXT,
                updated_at TEXT,
                manual_override INTEGER DEFAULT 0,
                admin_choice INTEGER DEFAULT 0
            )
        """)
    except Exception as e:
        print(f"⚠️ Unable to ensure featured_slots table: {e}")

    # Try to add columns if they don't exist (silently ignore if they do)
    try:
        client.execute("ALTER TABLE featured_slots ADD COLUMN admin_choice INTEGER DEFAULT 0")
    except Exception:
        pass  # Column likely already exists

    try:
        client.execute("ALTER TABLE featured_slots ADD COLUMN manual_override INTEGER DEFAULT 0")
    except Exception:
        pass  # Column likely already exists

    for slot_id, meta in FEATURE_SLOTS.items():
        try:
            client.execute(
                "INSERT OR IGNORE INTO featured_slots (slot_id, label, post_id, manual_override, admin_choice) VALUES (?, ?, NULL, 0, 0)",
                [slot_id, meta["label"]],
            )
        except Exception as e:
            print(f"⚠️ Unable to ensure featured slot {slot_id}: {e}")


def _parse_ts(value):
    if not value:
        return None
    try:
        ts = datetime.fromisoformat(value)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    except Exception:
        return None


def get_featured_slot_states(client):
    """Return the current featured slot state (locked_until, admin flags, timestamps)."""
    try:
        rs = client.execute(
            "SELECT slot_id, post_id, locked_until, updated_at, admin_choice, manual_override FROM featured_slots"
        )
    except Exception as e:
        print(f"⚠️ Error reading featured_slots: {e}")
        return {}

    states = {}
    for row in rs.rows or []:
        states[row[0]] = {
            "post_id": row[1],
            "locked_until": _parse_ts(row[2]),
            "updated_at": _parse_ts(row[3]),
            "admin_choice": bool(row[4]),
            "manual_override": bool(row[5]) if len(row) > 5 else False,
        }
    return states


def should_rotate_slot(state, now):
    """Determine if a slot is eligible for rotation based on lock + freshness."""
    if not state or not state.get("post_id"):
        return True

    locked_until = state.get("locked_until")
    if locked_until and locked_until > now:
        return False

    if state.get("admin_choice") and locked_until and locked_until > now:
        return False

    if state.get("manual_override") and locked_until and locked_until > now:
        return False

    updated_at = state.get("updated_at")
    if not updated_at:
        return True

    return (now - updated_at) >= timedelta(minutes=HERO_ROTATION_MINUTES)


def _hero_score_key(article):
    try:
        score = int(article.get("hero_score", 0) or 0)
    except (TypeError, ValueError):
        score = 0
    if article.get("image_url"):
        score += 5
    return score


def _pick_candidate_for_slot(candidates, category, used_links):
    for art in candidates:
        link = art.get("link")
        if not link or link in used_links:
            continue
        if category and art.get("category") != category:
            continue
        used_links.add(link)
        return art
    return None


def select_ai_hero_assignments(hero_candidates, slots_to_update, used_links):
    """Map slots -> curated hero articles based on score/category."""
    sorted_candidates = sorted(hero_candidates, key=_hero_score_key, reverse=True)
    assignments = {}

    for slot in slots_to_update:
        target_category = FEATURE_SLOTS[slot]["category"]
        candidate = _pick_candidate_for_slot(sorted_candidates, target_category, used_links)

        if slot == "main" and not candidate:
            candidate = _pick_candidate_for_slot(sorted_candidates, None, used_links)

        if candidate:
            assignments[slot] = candidate

    return assignments


def load_recent_posts_for_random(client):
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=HERO_FALLBACK_LOOKBACK_HOURS)).isoformat()
    try:
        rs = client.execute(
            """
            SELECT id, link, category, image_url
            FROM posts
            WHERE image_url IS NOT NULL AND image_url != '' AND scraed_at >= ?
            ORDER BY scraped_at DESC
            LIMIT 200
            """,
            [cutoff],
        )
        posts = [
            {"id": row[0], "link": row[1], "category": row[2], "image_url": row[3]}
            for row in rs.rows or []
        ]
        random.shuffle(posts)
        return posts
    except Exception as e:
        print(f"⚠️ Unable to load posts for random hero fallback: {e}")
        return []


def select_random_assignments(client, slots_to_update, used_links):
    """Pick random posts (with images) for slots when AI is unavailable."""
    pool = load_recent_posts_for_random(client)
    assignments = {}

    def pop_for_category(cat: str | None):
        for idx, post in enumerate(pool):
            if post.get("link") in used_links:
                continue
            if cat and post.get("category") != cat:
                continue
            used_links.add(post["link"])
            return pool.pop(idx)
        return None

    for slot in slots_to_update:
        target_category = FEATURE_SLOTS[slot]["category"]
        candidate = None

        if slot == "main":
            candidate = pop_for_category("Tech") or pop_for_category("Culture") or pop_for_category(None)
        else:
            candidate = pop_for_category(target_category) or pop_for_category(None)

        if candidate:
            assignments[slot] = candidate

    return assignments


def resolve_post_ids_for_assignments(client, assignments):
    """Translate assignment links to post IDs so we can update featured_slots."""
    slot_post_map = {}
    link_to_slots = {}

    for slot, item in assignments.items():
        if item.get("id"):
            slot_post_map[slot] = item["id"]
        elif item.get("link"):
            link_to_slots.setdefault(item["link"], []).append(slot)

    if link_to_slots:
        placeholders = ",".join(["?"] * len(link_to_slots))
        try:
            rs = client.execute(
                f"SELECT id, link FROM posts WHERE link IN ({placeholders})",
                list(link_to_slots.keys()),
            )
            for row in rs.rows or []:
                post_id, link = row[0], row[1]
                for slot in link_to_slots.get(link, []):
                    slot_post_map[slot] = post_id
        except Exception as e:
            print(f"⚠️ Unable to resolve post IDs for heroes: {e}")

    return slot_post_map


def write_featured_slots(client, slot_post_map):
    if not slot_post_map:
        return 0

    lock_until = (datetime.now(timezone.utc) + timedelta(minutes=HERO_LOCK_MINUTES)).isoformat()
    updated = 0

    for slot, post_id in slot_post_map.items():
        if not post_id:
            continue
        try:
            client.execute(
                """
                UPDATE featured_slots
                SET post_id = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP, manual_override = 0, admin_choice = 0
                WHERE slot_id = ?
                """,
                [post_id, lock_until, slot],
            )
            updated += 1
        except Exception as e:
            print(f"⚠️ Failed to update featured slot {slot}: {e}")

    return updated


def rotate_featured_slots(curated_articles, ai_available=True):
    """Rotate hero slots hourly using AI-approved picks or random fallbacks."""
    try:
        client = get_db_client()
    except Exception as e:
        print(f"⚠️ Unable to open DB for hero rotation: {e}")
        return

    try:
        ensure_featured_slots_table(client)
        slot_states = get_featured_slot_states(client)

        now = datetime.now(timezone.utc)
        slots_to_update = [slot for slot in FEATURE_SLOTS if should_rotate_slot(slot_states.get(slot), now)]

        if not slots_to_update:
            print("ℹ️ Hero slots are locked or recently updated; no rotation needed.")
            return

        hero_candidates = [a for a in curated_articles if a.get("hero_candidate")]
        used_links: set[str] = set()
        assignments = {}

        if ai_available and hero_candidates:
            assignments = select_ai_hero_assignments(hero_candidates, slots_to_update, used_links)

        remaining_slots = [slot for slot in slots_to_update if slot not in assignments]

        if remaining_slots:
            random_assignments = select_random_assignments(client, remaining_slots, used_links)
            assignments.update(random_assignments)

        if not assignments:
            print("ℹ️ No hero assignments available after rotation step.")
            return

        slot_post_map = resolve_post_ids_for_assignments(client, assignments)
        updated = write_featured_slots(client, slot_post_map)

        if updated:
            print(f"🌟 Rotated {updated} hero slots. Next auto-change in ~{HERO_LOCK_MINUTES} minutes.")
        else:
            print("ℹ️ No hero slots updated (missing post IDs).")
    finally:
        try:
            client.close()
        except Exception:
            pass

def turso_persist_worker():
    """Background thread that writes to DB as fast as items arrive."""
    try:
        writer_client = get_db_client()
        print(f"💾 Persistence worker started at {datetime.now(timezone.utc).isoformat()}.")
    except Exception as e:
        print(f"🔥 CRITICAL: Persistence worker failed to connect to DB: {e}")
        print(f"🔥 DB writes will FAIL. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.")
        return
    
    while not persist_stop_event.is_set() or not persist_queue.empty():
        try:
            batch_items = [persist_queue.get(timeout=1)]
        except Empty:
            continue

        try:
            # Drain a small batch for more efficient DB writes
            while len(batch_items) < 10:
                try:
                    batch_items.append(persist_queue.get_nowait())
                except Empty:
                    break

            # Ensure required fields exist and build statements
            statements = []
            now_iso = datetime.now(timezone.utc).isoformat()
            for art in batch_items:
                art.setdefault("scraped_at", now_iso)
                art.setdefault("teaser", (art.get("summary") or art.get("summary_text") or "")[:90].strip())
                art_summary = art.get("summary") or art.get("summary_text") or ""

                sql = """
                    INSERT INTO posts (title, link, source, category, teaser, summary, image_url, published_at, scraped_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(link) DO UPDATE SET
                        updated_at = CURRENT_TIMESTAMP,
                        summary = excluded.summary,
                        image_url = excluded.image_url;
                """
                params = [
                    art.get('title') or "Untitled",
                    art.get('link') or "",
                    art.get('source') or "",
                    art.get('category'),
                    art.get('teaser'),
                    art_summary,
                    art.get('image_url'),
                    art.get('published_at'),
                    art.get('scraped_at'),
                ]
                statements.append(libsql_client.Statement(sql, params))

            print(f"💾 Writing batch of {len(batch_items)} items to DB...")
            writer_client.batch(statements)

            for item in batch_items:
                saved_at = datetime.now(timezone.utc).isoformat()
                print(f"✅ [{saved_at}] Saved '{item.get('title', 'Untitled')}' from {item.get('source', 'Unknown')} to DB.")
        except Exception as e:
            print(f"🔥 DB Write Error for batch of {len(batch_items)} items: {e}")
            print(f"🔥 First item in failed batch: {batch_items[0].get('title', 'Unknown') if batch_items else 'Empty batch'}")
        finally:
            for _ in batch_items:
                persist_queue.task_done()
    
    writer_client.close()
    print(f"💾 Persistence worker stopped at {datetime.now(timezone.utc).isoformat()}.")

def process_feeds():
    global last_curation_at

    # 1. Setup
    direct_seen_links.clear()
    direct_seen_titles_normalized.clear()
    seeded_titles = seed_title_dedup_from_db(direct_seen_titles_normalized)
    if seeded_titles:
        print(f"ℹ️ Seeded {seeded_titles} recent titles for deduping.")
    curated_articles = []

    now = datetime.now(timezone.utc)
    min_curation_interval = timedelta(minutes=MIN_CURATION_INTERVAL_MINUTES)
    do_curation = (now - last_curation_at) >= min_curation_interval
    if do_curation:
        print(f"🧠 Curation enabled (last run at {last_curation_at}).")
    else:
        wait = (last_curation_at + min_curation_interval) - now
        print(f"⏸️ Curation cooling down for ~{int(wait.total_seconds()//60)} minutes.")

    # 2. Start Worker
    global persist_stop_event
    persist_stop_event = Event()
    worker = Thread(target=turso_persist_worker)
    worker.start()

    ai_budget = AIBudget(MAX_AI_ARTICLES_PER_RUN)

    try:
        print(f"\n🔄 Processing {len(TARGET_FEEDS)} RSS feeds...")
        print(f"💰 AI Budget: {ai_budget.remaining} articles\n")
        # === PHASE 1: THE SWEEP (Fetch & Instant Save) ===
        print("\n🌪️ PHASE 1: Fetching & Instant Processing...")
        
        for config in TARGET_FEEDS:
            try:
                source_name = config.get('source', 'Unknown Source')
                needs_curation = bool(config.get('curate'))
                lane = "AI" if needs_curation else "direct"
                print(f"📡 Fetching {source_name} ({lane})...")

                # Skip curated feeds if curation is cooling down
                if needs_curation and not do_curation:
                    print(f"   Skipping AI curation for {source_name} (cooldown).")
                    continue

                # Skip once AI budget is exhausted
                if needs_curation and ai_budget.remaining <= 0:
                    print("   AI budget exhausted for this run; skipping remaining curated feeds.")
                    continue

                scraper = cloudscraper.create_scraper()
                resp = scraper.get(config["url"], timeout=20)
                if resp.status_code != 200:
                    print(f"   ❌ Status {resp.status_code}")
                    continue

                feed = feedparser.parse(resp.content)
                if not feed.entries:
                    print("   ❌ No entries.")
                    continue

                entries = feed.entries[:4]  # Grab top 4 items
                strict_iran_only = needs_curation and (config.get("force_category") == "Iran")

                keywords = [k.lower() for k in config.get("keywords", [])]
                if keywords and not strict_iran_only:
                    entries = [e for e in entries if entry_matches_keywords(e, keywords)]
                    if not entries:
                        print("   ℹ️ Skipping feed entries (no keyword match).")
                        continue
                elif strict_iran_only:
                    print("   🎯 Strict Iran mode: every fetched entry will be LLM-validated.")

                raw_articles = []
                for entry in entries:
                    summary_text = extract_summary_text(entry)
                    raw_articles.append(
                        {
                            "title": entry.get("title", "No Title"),
                            "link": entry.get("link", ""),
                            "source": source_name,
                            "published_at": parse_date(entry),
                            "image_url": resolve_image_url(entry, scraper),
                            "summary_text": summary_text,
                        }
                    )

                raw_articles = dedup_articles_by_link(raw_articles)
                raw_articles = filter_existing_links(raw_articles)

                fresh_articles = []
                skipped_similar_titles = 0
                for art in raw_articles:
                    link = art.get("link")
                    if not link or link in direct_seen_links:
                        continue
                    is_dup, normalized_title = is_duplicate_title(art.get("title", ""), direct_seen_titles_normalized)
                    if is_dup:
                        skipped_similar_titles += 1
                        continue
                    if normalized_title:
                        direct_seen_titles_normalized.append(normalized_title)
                    direct_seen_links.add(link)
                    fresh_articles.append(art)

                if skipped_similar_titles:
                    print(f"   ℹ️ Skipping {skipped_similar_titles} items with near-duplicate titles.")

                if not fresh_articles:
                    print("   ℹ️ No new links to process.")
                    continue

                if needs_curation and ai_budget.remaining <= 0:
                    print("   AI budget exhausted mid-feed; skipping remaining entries.")
                    continue

                now_iso = datetime.now(timezone.utc).isoformat()
                force_category = config.get("force_category")

                # ===== IMMEDIATE AI PROCESSING FOR CURATED FEEDS =====
                if needs_curation:
                    # Instead of accumulating, process this feed's articles immediately
                    articles_for_ai = []
                    for art in fresh_articles:
                        if ai_budget.remaining <= 0:
                            print("   AI budget exhausted mid-feed; skipping remaining entries.")
                            break
                        articles_for_ai.append({
                            'title': art["title"],
                            'link': art["link"],
                            'source': art["source"],
                            'published_at': art["published_at"],
                            'category': force_category,
                            'summary_text': art["summary_text"],
                            'image_url': art.get("image_url"),
                            'scraped_at': now_iso,
                        })
                        ai_budget.remaining -= 1
                    
                    # Process this batch immediately instead of waiting
                    if articles_for_ai:
                        print(f"   🧠 AI curating {len(articles_for_ai)} articles from {source_name}...")
                        try:
                            curated = analyze_news_batch(
                                articles_for_ai,
                                strict_iran_only=strict_iran_only,
                            )
                            curated_articles.extend(curated)
                            if strict_iran_only and not curated:
                                print("   ℹ️ Strict Iran gate rejected all items from this feed.")
                            
                            # Update last curation timestamp on first successful AI call
                            if do_curation and last_curation_at == datetime.min.replace(tzinfo=timezone.utc):
                                last_curation_at = datetime.now(timezone.utc)
                            
                            for item in curated:
                                if force_category:
                                    item["category"] = force_category
                                persist_queue.put(item)
                                print(f"   ✅ AI approved & queued: {item.get('title', 'Untitled')}")
                        except ModelExhaustedError:
                            print("🛑 AI Quota Exhausted. Skipping remaining curated feeds.")
                            ai_budget.remaining = 0  # Stop all AI processing
                        except Exception as e:
                            print(f"⚠️ AI curation failed for {source_name}: {e}")
                
                # ===== DIRECT SAVE FOR NON-CURATED FEEDS =====
                else:
                    category = force_category or config.get('category') or "General"
                    for art in fresh_articles:
                        enriched_item = {
                            "title": art["title"],
                            "link": art["link"],
                            "source": art["source"],
                            "published_at": art["published_at"],
                            "scraped_at": now_iso,
                            "image_url": art.get("image_url"),
                            "summary": art["summary_text"],
                            "teaser": art["summary_text"][:90].strip(),
                            "category": category,
                            "tone": "Neutral",
                            "hero_candidate": True,
                            "hero_score": 50 # Moderate score for auto-content
                        }
                        persist_queue.put(enriched_item)
                        print(f"   ↪️ Queued direct save: {art['title']}")
                        
            except Exception as e:
                print(f"⚠️ Error on {source_name}: {e}")

        # All feeds processed - AI curation happened inline above

    except Exception as e:
        print(f"🔥 Critical Scraper Error: {e}")

    finally:
        # Wait for worker to finish saving everything
        print("⏳ Waiting for DB writer to finish...")
        persist_queue.join()
        persist_stop_event.set()
        worker.join()
        try:
            ai_available_for_heroes = bool(curated_articles)
            rotate_featured_slots(curated_articles, ai_available_for_heroes)
        except Exception as e:
            print(f"⚠️ Hero rotation encountered an error: {e}")
        # try:
        #     backfill_images_for_recent_posts()
        # except Exception as e:
        #     print(f"⚠️ Image backfill encountered an error: {e}")

if __name__ == "__main__":
    process_feeds()
