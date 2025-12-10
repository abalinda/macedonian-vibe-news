# Macedonian Vibes News 📰

[![Cloudflare](https://img.shields.io/badge/Pages-Cloudflare-F38020?logo=cloudflare)](https://pages.cloudflare.com/)
[![Turso](https://img.shields.io/badge/DB-Turso-3B82F6?logo=sqlite)](https://turso.tech/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-3E2CFF?logo=clerk)](https://clerk.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![Analytics](https://img.shields.io/badge/Analytics-GA_%2B_PostHog-111111?logo=google-analytics)](#analytics--pwa)

AI-curated Macedonian news aggregator. A Python scraper ingests 70+ RSS feeds, filters with Gemini/Gemma, writes to Turso, and a Next.js 16 + Clerk frontend serves category views, a latest feed, blog posts, PWA shell, and admin controls.

**Live:** [vibes.mk](https://vibes.mk)

---

## What’s Here Right Now
- Next.js 16 / React 19 App Router UI in Macedonian with categories (Tech, Culture, Lifestyle, Business, Sports, Blog) and a dedicated `/najnovo` page ordered by `scraped_at`.
- Turso as the single source of truth via `@libsql/client/web`; hero slots rotate automatically every 8h and can be overridden by admins.
- Clerk authentication in the nav drawer; admin-only blog composer and hero override surfaces gated by `web/lib/admins.ts`.
- Blog: rich-text composer (`/blog/new`), sanitized HTML storage in `posts.content`, and reader pages under `/blog/[id]`.
- Analytics: Google Analytics (`G-VG899CFSWV`) + PostHog JS, proxied through `/relay-Z6aO` with Clerk identity sync.
- PWA: manifest + `/public/sw.js` pre-cache shell, install prompt on load, and edge `/go/:id` redirect that increments click counts.
- Scraper GitHub Action runs every ~3h (01:30, 04:30, ...), batches writes to Turso, and keeps JSONL logs in `scraper/logs/`.

---

## Architecture (Current)
```
Browser/PWA ─┬─ Cloudflare Pages (Next.js 16, Edge-ready)
             ├─ Google Analytics + PostHog proxy (/relay-Z6aO)
             └─ Clerk (auth) middleware in web/proxy.ts
                 │
                 ▼
            Turso (libSQL)
                 ▲
      GitHub Actions cron (3h)
      scraper/scraper_2.py
      • cloudscraper + feedparser
      • Gemini/Gemma curation + hero scoring
      • Batch insert + feature slot locks (8h)
```

### Data Model (Turso)
- `posts`: `id`, `title`, `link`, `source`, `category`, `teaser`, `summary`, optional `content`, `image_url`, `published_at`, `scraped_at`, `clicks`, `updated_at`.
- `featured_slots`: `slot_id` (`main`, `tech`, `culture`, `lifestyle`, `business`, `sports`), `label`, `post_id`, `locked_until`, `updated_at`, `manual_override`, `admin_choice`.

---

## Frontend (web/)
- Home + categories: `web/app/page.tsx` (ISR 60s) with hero + sidebars; category filter drives hero slot selection.
- Latest feed: `web/app/najnovo/page.tsx` + `latest-feed.tsx` (client grid with infinite scroll on mobile).
- Archive: `web/app/all/page.tsx` with date/category filters and paged list.
- Blog: reader `web/app/blog/[id]/page.tsx`, composer `web/app/blog/new/page.tsx` (+ `composer.tsx`), normalize/clean rich text via `web/lib/rich-text.ts` and `web/lib/images.ts`.
- Admin: hero manager `web/app/admin` uses `/api/featured-slots` (4h lock warnings) and inline override on the homepage (`AdminHeroOverride`).
- Auth & middleware: Clerk provider in `web/app/layout.tsx`, middleware in `web/proxy.ts`, admin emails in `web/lib/admins.ts`.
- Analytics & PWA: GA and PostHog init in `web/app/layout.tsx`, `web/instrumentation-client.ts`, proxy rules in `web/vercel.json`, service worker in `web/public/sw.js`, installer in `web/app/_components/pwa-installer.tsx`.
- Edge redirect: `/go/[id]` (edge runtime) increments `clicks` then 307 redirects to the source link.

### Notable Defaults
- Revalidate: home 60s, blog 120s.
- Hero lock window: 4h for manual overrides; scraper rotates heroes every 8h when unlocked.
- PostHog proxy prefix: `/relay-Z6aO`.

---

## Scraper (scraper/scraper_2.py)
- Feeds: 70+ RSS sources across Tech, Culture/Lifestyle, Business, Sports, Local, and curated general news (see `TARGET_FEEDS`).
- Pipeline: cloudscraper fetch → feedparser parse → dedupe → coarse reject (politics/crime/weather) → AI budgeted queue (max 20 per run) → Gemini/Gemma JSON classification (category, hero flag/score, summary) → batch insert into Turso with `libsql-client`.
- Feature slots: ensures rows + `admin_choice` column exist; reserves hero slots before writing; locks slots for 8h after rotation unless manually overridden.
- Persistence: background writer thread consumes a queue, batches inserts, and updates `featured_slots`; failures release reservations.
- Logging: structured JSONL in `scraper/logs/scraper_log.jsonl`.
- Schedule: `.github/workflows/scraper.yml` runs every 3h on `ubuntu-latest` with Python 3.11 and `pip install -r requirements.txt`.

---

## Project Layout
```
macedonian-vibes-news/
├── web/                    # Next.js 16 app
│   ├── app/                # Pages, API routes, PWA assets
│   ├── lib/                # Turso client, admins, rich-text helpers
│   ├── instrumentation-client.ts
│   ├── proxy.ts            # Clerk middleware matcher
│   └── vercel.json         # PostHog proxy rewrites
├── scraper/                # Python scraper + Gemini/Gemma curator
│   ├── scraper_2.py        # Main entry used by GitHub Actions
│   ├── curator_2.py        # AI classification + hero scoring
│   ├── logger.py           # JSONL logging helper
│   └── requirements.txt
├── .github/workflows/      # scraper cron
├── wrangler.toml           # Cloudflare Pages (nodejs_compat, web/.next)
├── my-clerk-app/           # Clerk starter sandbox
└── README.md
```

---

## Local Development
Prereqs: Node 20+ (Next.js 16 supports 18.18+, 20+ recommended), Python 3.11, Turso auth token, Gemini API key (for scraper), Clerk keys, PostHog key/host.

### Frontend
```bash
cd web
npm install
# set env (see below)
npm run dev
```
Visit http://localhost:3000. Clerk auth works once `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set. Turso keys are required for any data fetch.

### Scraper
```bash
cd scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# add .env with TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GEMINI_API_KEY
python scraper_2.py
```
Logs write to `scraper/logs/scraper_log.jsonl`. The script exits after one run (the GitHub Action schedule repeats it).

---

## Environment Variables
**Frontend (`web/`):**
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (use the `/relay-Z6aO` proxy host)
- `NEXT_PUBLIC_SITE_URL` (for metadata, default https://vibes.mk)

**Scraper (`scraper/`):**
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- `GEMINI_API_KEY`

Google Analytics is currently hardcoded as `G-VG899CFSWV` in `web/app/layout.tsx`—change there if needed.

---

## Deployment & Ops
- **Frontend:** Cloudflare Pages with `pages_build_output_dir = web/.next` and `nodejs_compat` (see `wrangler.toml`). Works on Vercel as well; PostHog rewrites live in `web/vercel.json`.
- **Cron:** `.github/workflows/scraper.yml` runs every 3h, single concurrency group to avoid overlapping scrapes.
- **Admin controls:** `/admin` shows hero slot status and lock countdowns; homepage override widget appears for admin emails/localhost. Admin list is in `web/lib/admins.ts`.
- **Redirects:** `/go/:id` uses the edge runtime to count clicks then forward to `posts.link`.

---

## Notes
- A legacy Supabase helper (`web/lib/supabase.ts`) and `web/scripts/inject-env.sh` remain from an older setup but are unused by the live app; Turso is the active DB for both web and scraper.
- `.env` files are ignored; keep secrets in platform/env vars.

---

## License
MIT

Made with ❤️ in Macedonia  
*Last Updated: December 10, 2025*
