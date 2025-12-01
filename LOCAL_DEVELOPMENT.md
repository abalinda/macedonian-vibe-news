# 🚀 Local Development Setup Guide

Complete instructions for running the macedonian-vibe-news project locally.

## Prerequisites

- Node.js & npm (for frontend)
- Python 3.11+ (for backend)
- Supabase project with credentials (already configured ✅)
- Gemini API key (already configured ✅)

**Status:** ✅ All prerequisites are already installed and configured!

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   LOCAL DEVELOPMENT SETUP                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Next.js)          Backend (Python Scraper)      │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │ localhost:3000  │         │ Manual/Scheduled Runs   │   │
│  │ • Hot reload    │         │ • Fetches RSS feeds     │   │
│  │ • Dev tools     │         │ • AI analysis (Gemini)  │   │
│  │ • TypeScript    │         │ • Stores to Supabase    │   │
│  └────────┬────────┘         └──────────┬──────────────┘   │
│           │                             │                  │
│           └─────────────────┬───────────┘                  │
│                             │                              │
│                   ┌─────────▼──────────┐                   │
│                   │  Supabase Cloud    │                   │
│                   │  PostgreSQL DB     │                   │
│                   │  (remote)          │                   │
│                   └────────────────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Quick Start (3 Steps)

### Terminal 1: Start Frontend

```bash
cd /Users/abalinda/Documents/programming/macedonian-vibes-news/web
npm run dev
```

**Expected Output:**
```
✓ Ready in XXXms
✓ Compiled successfully
http://localhost:3000
```

**Then:** Open browser → `http://localhost:3000`

### Terminal 2: Run Scraper (Optional)

```bash
cd /Users/abalinda/Documents/programming/macedonian-vibes-news/scraper
source .venv/bin/activate
python3 scraper.py
```

**Expected:** Scraper fetches news, analyzes with Gemini, saves to Supabase

### Result

- Frontend loads at `http://localhost:3000`
- Displays articles from Supabase (populated by scraper)
- Changes to code hot-reload instantly

---

## Detailed Setup Instructions

### Step 1: Frontend Development Server

**Location:** `/Users/abalinda/Documents/programming/macedonian-vibes-news/web`

**Environment File Already Configured:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://knvkyfafnnqbmgqeogpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_secret_CHJLq-Se0y7KM8po7xG8SA_qRLRDpzE
```

**Start Server:**
```bash
cd web
npm install  # If not already done
npm run dev
```

**Verify:**
- ✅ Server running on `http://localhost:3000`
- ✅ Supabase connection shows in browser console (no errors)
- ✅ Articles load (if scraper has populated database)

**Available Commands:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm test` - Run tests (if configured)

---

### Step 2: Backend Scraper Setup

**Location:** `/Users/abalinda/Documents/programming/macedonian-vibes-news/scraper`

**Python Virtual Environment:**
```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

✅ **Already Done!** Virtual environment created and dependencies installed.

**Environment File Already Configured:**
```env
GEMINI_API_KEY=AIzaSyBW9Pww8FARXuSV8tweHLlaJ5QKG1TIb-g
SUPABASE_URL=https://knvkyfafnnqbmgqeogpb.supabase.co
SUPABASE_KEY=sb_secret_CHJLq-Se0y7KM8po7xG8SA_qRLRDpzE%
```

**Run Scraper:**
```bash
source .venv/bin/activate
python3 scraper.py
```

**What It Does:**
1. Fetches RSS feeds from multiple sources
2. Parses articles with BeautifulSoup
3. Sends to Google Gemini for AI analysis
4. Extracts categories, summary, teaser
5. Stores in Supabase `posts` table
6. Logs to `scraper/logs/scraper_log.jsonl`

**Expected Output:**
```
[2025-12-01T22:00:00] Fetching Tech category...
[2025-12-01T22:00:05] Processing 12 articles
[2025-12-01T22:00:30] Analyzing with Gemini...
[2025-12-01T22:01:00] ✅ Successfully stored 12 posts
```

**Monitor Logs:**
```bash
tail -f scraper/logs/scraper_log.jsonl
```

---

## Running Both Together

### Option 1: Two Terminal Windows (Recommended for Development)

**Terminal 1 - Frontend:**
```bash
cd web
npm run dev
```

**Terminal 2 - Scraper (Optional, for testing backend):**
```bash
cd scraper
source .venv/bin/activate
python3 scraper.py
```

**Result:**
- Frontend at `http://localhost:3000`
- Frontend auto-reloads on code changes
- Scraper processes and updates Supabase
- Browser shows fresh articles

### Option 2: Just Frontend (Recommended if scraper runs separately)

**Terminal 1 - Frontend:**
```bash
cd web
npm run dev
```

**Then:**
- Open `http://localhost:3000`
- See articles already in Supabase (from previous scraper runs or CI/CD)
- Develop frontend features without running scraper locally

---

## Project Structure

```
macedonian-vibes-news/
├── web/                          # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx             # Home page
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   ├── lib/
│   │   └── supabase.ts          # Supabase client
│   ├── package.json             # Dependencies
│   ├── .env.local               # Frontend env vars (✅ configured)
│   ├── tsconfig.json            # TypeScript config
│   └── node_modules/            # Installed packages
│
├── scraper/                      # Python Backend
│   ├── scraper.py               # Main scraper logic
│   ├── curator.py               # Article curation
│   ├── logger.py                # Logging setup
│   ├── requirements.txt          # Python dependencies
│   ├── .env                     # Scraper env vars (✅ configured)
│   ├── .venv/                   # Virtual environment
│   ├── logs/
│   │   └── scraper_log.jsonl    # Execution logs
│   └── __pycache__/             # Python cache
│
├── .github/
│   └── workflows/               # CI/CD pipelines
│       ├── lint-build.yml       # Frontend CI
│       └── scraper.yml          # Backend automation
│
├── .gitignore                   # Git ignore rules
├── DEPLOYMENT.md                # Deployment guide
├── GITHUB_ACTIONS_SECRETS.md    # Secrets setup
├── CLOUDFLARE_PAGES.md          # Cloudflare guide
├── QUICK_START.md               # Deployment checklist
└── wrangler.toml                # Cloudflare Workers config
```

---

## Database Connection

### Supabase Connection String (from `.env` files)

**Frontend connects via:**
- URL: `https://knvkyfafnnqbmgqeogpb.supabase.co`
- Key: `sb_secret_CHJLq-Se0y7KM8po7xG8SA_qRLRDpzE` (anon, read-only)

**Scraper connects via:**
- URL: `https://knvkyfafnnqbmgqeogpb.supabase.co`
- Key: `sb_secret_CHJLq-Se0y7KM8po7xG8SA_qRLRDpzE` (service role, read-write)

### Database Tables (Already Set Up)

**posts** table structure:
```sql
id (int, primary key)
title (text) - Article title
url (text) - Article link
source (text) - RSS feed source
category (text) - Tech, Culture, Lifestyle, Business
teaser (text) - AI-generated teaser
summary (text) - Article summary
image_url (text) - Featured image
featured (boolean) - Is featured story
created_at (timestamp) - When article was added
```

---

## Common Development Tasks

### Check Frontend Is Running

```bash
curl http://localhost:3000
```

Should return HTML (no 404 error)

### View Supabase Data

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select project
3. Go to **SQL Editor** or **Table Editor**
4. Browse `posts` table
5. View articles populated by scraper

### Debug Scraper Issues

```bash
# View latest logs
tail -f scraper/logs/scraper_log.jsonl

# Check Gemini API status
python3 -c "import google.generativeai as genai; print('✅ Gemini API imported successfully')"

# Test Supabase connection
python3 -c "from supabase import create_client; print('✅ Supabase imported successfully')"
```

### Update Frontend Dependencies

```bash
cd web
npm update
npm run lint  # Check for issues
```

### Update Backend Dependencies

```bash
cd scraper
source .venv/bin/activate
pip install --upgrade -r requirements.txt
```

---

## Troubleshooting

### Frontend Won't Start

**Error:** `Port 3000 already in use`
```bash
# Kill process using port 3000
lsof -ti :3000 | xargs kill -9
# Then restart
npm run dev
```

**Error:** `ENOENT: no such file or directory, open '.env.local'`
```bash
# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://knvkyfafnnqbmgqeogpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_secret_CHJLq-Se0y7KM8po7xG8SA_qRLRDpzE
EOF
```

### Scraper Won't Run

**Error:** `ModuleNotFoundError: No module named 'supabase'`
```bash
# Activate virtual environment
source .venv/bin/activate
# Install dependencies
pip install -r requirements.txt
```

**Error:** `Gemini API key invalid`
```bash
# Verify key in .env
cat scraper/.env | grep GEMINI_API_KEY
# Should match: https://aistudio.google.com/apikey
```

### No Articles Showing on Frontend

1. **Check Scraper Ran Successfully:**
   ```bash
   tail -20 scraper/logs/scraper_log.jsonl
   ```

2. **Verify Database Has Data:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Check `posts` table
   - Should have rows if scraper ran

3. **Check Browser Console:**
   - Open `http://localhost:3000`
   - Press F12 → Console tab
   - Look for Supabase connection errors

4. **Check Network Tab:**
   - Press F12 → Network tab
   - Reload page
   - Look for failed requests

### Slow Performance

**Frontend is slow:**
- Check Node.js process: `top` or Activity Monitor
- Try: `npm run build && npm start` (production build)
- Clear Next.js cache: `rm -rf web/.next`

**Scraper is slow:**
- Check Gemini API rate limits: [Google AI Studio](https://aistudio.google.com)
- Check network: `ping 8.8.8.8`
- Try reducing article batch size in `scraper.py`

---

## Performance Tips

### Frontend Development

- Use **VS Code extensions**: ESLint, Prettier, TypeScript
- Enable **hot module replacement** (built into Next.js dev)
- Use **React DevTools** browser extension for debugging
- Keep browser DevTools open to watch network requests

### Backend Scraper

- Run scraper during off-hours (less API rate limiting)
- Test with single RSS feed before running all
- Use logging to identify bottlenecks
- Monitor Gemini API usage to avoid surprise bills

---

## Next: Deploy to Production

When ready to deploy:

1. **Configure GitHub Actions Secrets** → See `GITHUB_ACTIONS_SECRETS.md`
2. **Deploy Frontend to Cloudflare Pages** → See `CLOUDFLARE_PAGES.md`
3. **GitHub Actions Runs Scraper Automatically** → Every 4 hours

---

## Quick Reference Commands

```bash
# Frontend
cd web && npm run dev          # Start dev server
cd web && npm run build        # Build for production
cd web && npm run lint         # Check code style

# Backend
cd scraper && source .venv/bin/activate && python3 scraper.py   # Run scraper
tail -f scraper/logs/scraper_log.jsonl                           # View logs
pip list                       # Show installed packages

# Utilities
curl http://localhost:3000     # Test frontend
git status                     # Check git status
git log --oneline              # View commits
```

---

## Support

**Frontend Issues?**
- See: `web/` folder README
- Check: Browser DevTools (F12)
- Review: Next.js docs

**Backend Issues?**
- See: `scraper/scraper.py` for logic
- Check: `scraper/logs/scraper_log.jsonl`
- Review: Google Generative AI docs

**Database Issues?**
- See: [Supabase Dashboard](https://app.supabase.com)
- Check: Table structure in SQL Editor
- Review: Row-level security policies

---

**Status:** ✅ Ready to develop locally!

Start with: `cd web && npm run dev` then visit `http://localhost:3000`
