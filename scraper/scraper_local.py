import sys
import os
import feedparser
import random
from datetime import datetime, timedelta, timezone
from time import mktime
from queue import Queue, Empty
from threading import Thread, Event
from urllib.parse import urljoin
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from curator_2 import analyze_news_batch, ModelExhaustedError
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
FEATURE_ROTATION_HOURS = 4
MAX_AI_ARTICLES_PER_RUN = 20
MIN_CURATION_INTERVAL_MINUTES = 30
BATCH_SIZE = 5

last_curation_at = datetime.min.replace(tzinfo=timezone.utc)
FEATURE_SLOTS = {
    "main": {"category": None, "label": "Main Story"},
    "tech": {"category": "Tech", "label": "Tech Highlight"},
    "culture": {"category": "Culture", "label": "Culture Pick"},
    "lifestyle": {"category": "Lifestyle", "label": "Lifestyle"},
    "business": {"category": "Business", "label": "Business"},
    "sports": {"category": "Sports", "label": "Sports"},
}

# State tracking
feature_states = {}
feature_rotation_allowed = {slot: False for slot in FEATURE_SLOTS}
persist_queue = Queue()
persist_stop_event = Event()
direct_seen_links: set[str] = set()


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

def get_feature_state_map(client):
    try:
        client.execute("""
            CREATE TABLE IF NOT EXISTS feature_states (
                slot_id TEXT PRIMARY KEY,
                article_id TEXT,
                updated_at DATETIME
            )
        """)
        rs = client.execute("SELECT slot_id, updated_at FROM feature_states")
        states = {}
        for row in rs.rows:
            try:
                states[row[0]] = datetime.fromisoformat(row[1])
            except (ValueError, TypeError):
                states[row[0]] = datetime.min.replace(tzinfo=timezone.utc)
        return states
    except Exception as e:
        print(f"⚠️ Error fetching feature states: {e}")
        return {}

def can_rotate_feature_slot(slot_id):
    last_update = feature_states.get(slot_id)
    if not last_update:
        return True
    
    now = datetime.now(timezone.utc)
    if last_update.tzinfo is None:
        last_update = last_update.replace(tzinfo=timezone.utc)

    diff = now - last_update
    return diff > timedelta(hours=FEATURE_ROTATION_HOURS)

def turso_persist_worker():
    """Background thread that writes to DB as fast as items arrive."""
    writer_client = get_db_client()
    print(f"💾 Persistence worker started at {datetime.now(timezone.utc).isoformat()}.")
    
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

            writer_client.batch(statements)

            # Hero promotion per item after successful save
            for item in batch_items:
                if item.get('hero_candidate'):
                    target_slot = None
                    item_cat_lower = (item.get('category') or "").lower()
                    
                    if item_cat_lower in FEATURE_SLOTS:
                        target_slot = item_cat_lower
                    elif item.get('hero_score', 0) > 85: 
                        target_slot = "main"

                    if target_slot and feature_rotation_allowed.get(target_slot):
                        print(f"🌟 PROMOTING to {target_slot}: {item['title']}")
                        writer_client.execute(
                            """
                            INSERT INTO feature_states (slot_id, article_id, updated_at)
                            VALUES (?, ?, ?)
                            ON CONFLICT(slot_id) DO UPDATE SET
                                article_id=excluded.article_id,
                                updated_at=excluded.updated_at
                            """,
                            [target_slot, item['link'], datetime.now(timezone.utc).isoformat()]
                        )
                        feature_rotation_allowed[target_slot] = False
                
                saved_at = datetime.now(timezone.utc).isoformat()
                print(f"✅ [{saved_at}] Saved '{item.get('title', 'Untitled')}' from {item.get('source', 'Unknown')} to DB.")
        except Exception as e:
            print(f"⚠️ DB Write Error for batch: {e}")
        finally:
            for _ in batch_items:
                persist_queue.task_done()
    
    writer_client.close()
    print(f"💾 Persistence worker stopped at {datetime.now(timezone.utc).isoformat()}.")

def process_feeds():
    global feature_states, feature_rotation_allowed, last_curation_at
    
    # 1. Setup
    client = get_db_client()
    feature_states = get_feature_state_map(client)
    client.close()

    for slot in FEATURE_SLOTS:
        feature_rotation_allowed[slot] = can_rotate_feature_slot(slot)
    direct_seen_links.clear()

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

    raw_articles_for_ai = []
    ai_budget = AIBudget(MAX_AI_ARTICLES_PER_RUN)

    try:
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
                for art in raw_articles:
                    link = art.get("link")
                    if not link or link in direct_seen_links:
                        continue
                    direct_seen_links.add(link)
                    fresh_articles.append(art)

                if not fresh_articles:
                    print("   ℹ️ No new links to process.")
                    continue

                if needs_curation and ai_budget.remaining <= 0:
                    print("   AI budget exhausted mid-feed; skipping remaining entries.")
                    continue

                now_iso = datetime.now(timezone.utc).isoformat()

                if needs_curation:
                    for art in fresh_articles:
                        if ai_budget.remaining <= 0:
                            print("   AI budget exhausted mid-feed; skipping remaining entries.")
                            break
                        obj = {
                            'title': art["title"],
                            'link': art["link"],
                            'source': art["source"],
                            'published_at': art["published_at"],
                            'category': None,
                            'summary_text': art["summary_text"],
                            'image_url': art.get("image_url"),
                            'scraped_at': now_iso,
                        }
                        raw_articles_for_ai.append(obj)
                        ai_budget.remaining -= 1
                else:
                    category = config.get('category') or "General"
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

        # === PHASE 2: THE DEEP THINK (AI Batching) ===
        if do_curation and raw_articles_for_ai:
            print(f"\n🧠 PHASE 2: AI Curation for {len(raw_articles_for_ai)} articles...")
            last_curation_at = datetime.now(timezone.utc)
            
            # Batch them to avoid hitting rate limits too hard all at once
            for i in range(0, len(raw_articles_for_ai), BATCH_SIZE):
                batch = raw_articles_for_ai[i:i + BATCH_SIZE]
                print(f"   Processing batch {i//BATCH_SIZE + 1}...")
                
                try:
                    curated = analyze_news_batch(batch)
                    for item in curated:
                        persist_queue.put(item)
                except ModelExhaustedError:
                    print("🛑 AI Quota Exhausted. Stopping Phase 2.")
                    break
                except Exception as e:
                    print(f"⚠️ Batch failed: {e}")
        elif not do_curation:
            print("ℹ️ Skipping AI curation this cycle (cooldown).")

    except Exception as e:
        print(f"🔥 Critical Scraper Error: {e}")

    finally:
        # Wait for worker to finish saving everything
        print("⏳ Waiting for DB writer to finish...")
        persist_queue.join()
        persist_stop_event.set()
        worker.join()
        try:
            backfill_images_for_recent_posts()
        except Exception as e:
            print(f"⚠️ Image backfill encountered an error: {e}")

if __name__ == "__main__":
    process_feeds()
