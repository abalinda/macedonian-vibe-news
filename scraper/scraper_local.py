import sys
import os
import time
import feedparser
import random
from datetime import datetime, timedelta, timezone
from time import mktime
from queue import Queue
from threading import Thread, Event
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


class AIBudget:
    def __init__(self, limit: int) -> None:
        self.remaining = limit

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
    {"url": "https://trn.mk/feed/", "source": "Трн", "category": "Lifestyle"},
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
    {"url": "https://sportclub.mk/feed/", "source": "Sport Club", "category": "Sports"},
    {"url": "https://ipon.mk/feed/", "source": "Ipon", "category": "Sports"},
    {"url": "https://www.fakulteti.mk/rss/rss.ashx?cat=sport", "source": "Факултети", "category": "Sports"},

    # --- BUSINESS & FINANCE ---
    {"url": "https://inovativnost.mk/category/makedonija/feed/", "source": "Иновативност", "category": "Business"},
    {"url": "https://zelenaberza.com.mk/feed/", "source": "Зелена Берза", "category": "Business"},



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
    print("💾 Persistence worker started.")
    
    while not persist_stop_event.is_set() or not persist_queue.empty():
        try:
            item = persist_queue.get(timeout=1)
            
            # 1. Insert Article
            writer_client.execute(
                """
                INSERT INTO articles (title, link, source, published_at, summary, teaser, category, tone, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(link) DO UPDATE SET
                    summary=excluded.summary,
                    teaser=excluded.teaser,
                    category=excluded.category,
                    image_url=excluded.image_url
                """,
                [
                    item['title'], item['link'], item['source'], item['published_at'],
                    item['summary'], item['teaser'], item['category'], item['tone'], item.get('image_url')
                ]
            )

            # 2. Hero Promotion Logic
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
            
            print(f"✅ Saved: {item['title']}")
            persist_queue.task_done()
        except Exception as e:
            # If empty queue timeout, just loop. If DB error, print it.
            if "Empty" not in str(e): 
                pass # Queue empty is normal
            else:
                print(f"⚠️ DB Write Error: {e}")
            continue
    
    writer_client.close()
    print("💾 Persistence worker stopped.")

def process_feeds():
    global feature_states, feature_rotation_allowed, last_curation_at
    
    # 1. Setup
    client = get_db_client()
    feature_states = get_feature_state_map(client)
    client.close()

    for slot in FEATURE_SLOTS:
        feature_rotation_allowed[slot] = can_rotate_feature_slot(slot)

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
                print(f"📡 Fetching {config['source']}...")
                # Skip general/curated feeds if curation is cooling down
                if not config.get('category') and not do_curation:
                    print(f"   Skipping curation for {config['source']} (cooldown).")
                    continue

                # Skip once AI budget is exhausted
                if not config.get('category') and ai_budget.remaining <= 0:
                    print("   AI budget exhausted for this run; skipping remaining curated feeds.")
                    continue

                feed = feedparser.parse(config['url'])
                entries = feed.entries[:4] # Grab top 4 items
                
                for entry in entries:
                    pub_date = datetime.now(timezone.utc)
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                         pub_date = datetime.fromtimestamp(mktime(entry.published_parsed), timezone.utc)

                    # LOGIC: Does this feed have a forced category?
                    if config.get('category'):
                        # 🟢 FAST LANE: Build object and save IMMEDIATELY
                        raw_summary = getattr(entry, 'summary', '') or getattr(entry, 'description', '')
                        clean_summary = clean_html_summary(raw_summary)
                        
                        enriched_item = {
                            "title": entry.title,
                            "link": entry.link,
                            "source": config['source'],
                            "published_at": pub_date.isoformat(),
                            "image_url": None,
                            "summary": clean_summary,
                            "teaser": clean_summary[:120],
                            "category": config['category'],
                            "tone": "Neutral",
                            "hero_candidate": True,
                            "hero_score": 50 # Moderate score for auto-content
                        }
                        
                            # 🚀 INSTANT QUEUE
                        persist_queue.put(enriched_item)
                        
                    else:
                        if ai_budget.remaining <= 0:
                            continue
                        raw_summary = getattr(entry, 'summary', '') or getattr(entry, 'description', '')
                        clean_summary = clean_html_summary(raw_summary)
                        # 🔴 SLOW LANE: Save for Phase 2
                        obj = {
                            'title': entry.title,
                            'link': entry.link,
                            'source': config['source'],
                            'published_at': pub_date.isoformat(),
                            'category': None,
                            'summary_text': clean_summary
                        }
                        raw_articles_for_ai.append(obj)
                        ai_budget.remaining -= 1
                        
            except Exception as e:
                print(f"⚠️ Error on {config['source']}: {e}")

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

if __name__ == "__main__":
    process_feeds()
