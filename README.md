# Macedonian Vibes News 📰

[![Cloudflare Workers](https://img.shields.io/badge/Host-Cloudflare_Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![OpenNext](https://img.shields.io/badge/Adapter-OpenNext-000000?logo=next.js)](https://opennext.js.org/)
[![Turso](https://img.shields.io/badge/DB-Turso-3B82F6?logo=sqlite)](https://turso.tech/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-3E2CFF?logo=clerk)](https://clerk.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)

AI-curated Macedonian news aggregator. A Python scraper ingests 70+ RSS feeds, filters with Gemini/Gemma, writes to Turso, and a Next.js 16 + Clerk frontend serves category views, a latest feed, blog posts, and admin controls.

**Live:** [vibes.mk](https://vibes.mk)

---

## What’s Here Right Now
- **Frontend:** Next.js 16 App Router (React 19) deployed on **Cloudflare Workers** via **OpenNext**.
- **Features:** Categories (Tech, Culture, Lifestyle, Business, Sports), dedicated `/najnovo` feed, and Admin Dashboard.
- **Database:** Turso (libSQL) as the single source of truth; hero slots rotate automatically every 8h.
- **Auth:** Clerk authentication (running on Edge middleware); admin-only areas gated by `web/lib/admins.ts`.
- **Scraper:** Python-based GitHub Action running every ~3h to curate news using Gemini/Gemma.

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
## Key Components
- Runtime: The main application runs on the nodejs_compat runtime (via OpenNext), allowing full Node.js API support on Cloudflare Workers.
- Middleware: Authentication runs on the experimental-edge runtime for low-latency request interception.

Data Model (Turso):
`posts: Content, summaries, metadata, and click tracking.

featured_slots: Hero story management with admin override locks.

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

## Deployment & Ops
- **The project is deployed to Cloudflare Workers.**


---

## License
MIT

Made with ❤️ in Macedonia  
*Last Updated: January 2026*
