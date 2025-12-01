# ✅ Scraper Update: Added `scraped_at` Timestamp

## What Was Changed

### 1. Modified `scraper/scraper.py`

Added `scraped_at` timestamp to every article before upserting to Supabase.

**Location:** Lines 328-331 in `fetch_and_save_feed()` function

**Code Added:**
```python
# Add scraped_at timestamp to all articles
scraped_at = datetime.utcnow().isoformat() + "Z"
for article in curated_articles:
    article["scraped_at"] = scraped_at
```

**What It Does:**
- Creates a timestamp at the start of each feed processing run
- Adds the same `scraped_at` value to every article from that batch
- Format: ISO 8601 UTC (e.g., `2025-12-01T22:15:30Z`)

**Updated Log Event (Lines 359-362):**
```python
log_event("supabase_upsert", {
    "source": source,
    "count": len(curated_articles),
    "scraped_at": scraped_at
})
```

Now the logs track exactly when each batch was scraped.

### 2. Created `SUPABASE_SCHEMA.md`

Complete documentation of the `posts` table schema including:
- All column definitions
- New `scraped_at` column details
- SQL queries for filtering by timestamp
- Example data structures
- Use cases and monitoring tips

## How It Works

### Before Upsert
```python
# Article structure after curation:
article = {
    "title": "New Tech Innovation",
    "link": "https://example.com",
    "source": "IT.mk",
    "category": "Tech",
    "teaser": "AI BREAKTHROUGH",
    "summary": "...",
    "image_url": "https://...",
    "published_at": "2025-12-01T14:30:00Z"
}
```

### After Adding Timestamp
```python
article = {
    "title": "New Tech Innovation",
    "link": "https://example.com",
    "source": "IT.mk",
    "category": "Tech",
    "teaser": "AI BREAKTHROUGH",
    "summary": "...",
    "image_url": "https://...",
    "published_at": "2025-12-01T14:30:00Z",
    "scraped_at": "2025-12-01T22:15:30Z"  # ← NEW
}
```

### Upserted to Supabase
The `posts` table now receives:
```json
{
  "id": 1,
  "title": "New Tech Innovation",
  "link": "https://example.com",
  "source": "IT.mk",
  "category": "Tech",
  "teaser": "AI BREAKTHROUGH",
  "summary": "...",
  "image_url": "https://...",
  "published_at": "2025-12-01T14:30:00Z",
  "scraped_at": "2025-12-01T22:15:30Z",
  "created_at": "2025-12-01T22:15:31Z",
  "updated_at": "2025-12-01T22:15:31Z"
}
```

## Benefits

✅ **Track Data Freshness**
- Know exactly when articles were scraped
- Identify stale content

✅ **Monitor Scraper Runs**
- See all articles from the same run (identical `scraped_at`)
- Track scraper execution timing

✅ **Debugging & Analytics**
- Filter articles by scrape time: `WHERE scraped_at > NOW() - INTERVAL '4 hours'`
- Count articles per run: `GROUP BY scraped_at`
- Find missing feeds in specific run

✅ **Frontend Enhancements** (Future)
- Show "Last Updated" timestamp on website
- Filter "Recently Added" articles
- Track data freshness metrics

## Supabase Column Setup

**Important:** The `scraped_at` column must exist in your Supabase `posts` table.

### If Column Already Exists
Great! The scraper will now populate it on next run.

### If Column Doesn't Exist
Add it to Supabase:

**Via SQL Editor:**
```sql
ALTER TABLE posts
ADD COLUMN scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Optional: Add index for performance
CREATE INDEX idx_posts_scraped_at ON posts(scraped_at DESC);
```

**Via Supabase Dashboard:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor**
4. Paste the SQL above
5. Click **Run**

## Testing the Change

### Test Locally
```bash
cd scraper
source .venv/bin/activate
python3 scraper.py
```

Check logs for the new `scraped_at` field:
```bash
tail -f logs/scraper_log.jsonl | grep supabase_upsert
```

Expected output:
```json
{
  "event_type": "supabase_upsert",
  "source": "IT.mk",
  "count": 8,
  "scraped_at": "2025-12-01T22:15:30Z"
}
```

### Verify in Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project → **Table Editor**
3. Open `posts` table
4. Look for new `scraped_at` column
5. Should show timestamps for recently scraped articles

## Example Queries

### Get all articles from today
```sql
SELECT title, source, scraped_at
FROM posts
WHERE scraped_at::date = CURRENT_DATE
ORDER BY scraped_at DESC;
```

### Count articles per scraper run (last 10 runs)
```sql
SELECT scraped_at, COUNT(*) as count, COUNT(DISTINCT source) as sources
FROM posts
GROUP BY scraped_at
ORDER BY scraped_at DESC
LIMIT 10;
```

### Find articles missing from latest run
```sql
SELECT source, COUNT(*) as count
FROM posts
WHERE scraped_at = (SELECT MAX(scraped_at) FROM posts)
GROUP BY source;
```

## Files Changed

| File | Changes |
|------|---------|
| `scraper/scraper.py` | Added timestamp generation and assignment (3 lines + log update) |
| `SUPABASE_SCHEMA.md` | New comprehensive schema documentation |

## Git Commit Details

**Commit Message:**
```
feat: Add scraped_at timestamp to articles in Supabase

- Add scraped_at column to track when articles were scraped
- Timestamp set to UTC when scraper batch processes articles
- All articles in same run get identical timestamp for batch tracking
- Include scraped_at in supabase_upsert log events
- Add SUPABASE_SCHEMA.md with complete table documentation
```

**Files:**
- `scraper/scraper.py` ✏️ Modified
- `SUPABASE_SCHEMA.md` ➕ New

## Next Steps

1. **Add column to Supabase** (if doesn't exist)
   - Run SQL above

2. **Test scraper locally**
   - `python3 scraper.py`
   - Check logs and Supabase

3. **Commit changes** (when ready)
   - `git add .`
   - `git commit -m "..."`
   - `git push origin main`

4. **GitHub Actions** (automatic)
   - CI/CD will run on next push
   - Scraper runs every 4 hours automatically

## Questions?

See `SUPABASE_SCHEMA.md` for:
- Complete table structure
- All columns explained
- Advanced SQL queries
- Use cases and examples
