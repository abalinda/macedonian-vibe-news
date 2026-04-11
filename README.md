# Macedonian Vibes News 📰

[![Cloudflare Workers](https://img.shields.io/badge/Host-Cloudflare_Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![OpenNext](https://img.shields.io/badge/Adapter-OpenNext-000000?logo=next.js)](https://opennext.js.org/)
[![Turso](https://img.shields.io/badge/DB-Turso-3B82F6?logo=sqlite)](https://turso.tech/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-3E2CFF?logo=clerk)](https://clerk.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)

AI-curated Macedonian news aggregator. A Python scraper ingests 70+ RSS feeds, classifies articles with Groq (Llama models), writes to Turso, and a Next.js 16 + Clerk frontend serves category views, a latest feed, blog posts, and admin controls.

**Live:** [vibes.mk](https://vibes.mk)

---

## What's Here Right Now
- **Frontend:** Next.js 16 App Router (React 19) deployed on **Cloudflare Workers** via **OpenNext**.
- **Features:** Categories (Tech, Culture, Lifestyle, Business, Sports), dedicated `/najnovo` feed, `/all` archive with search and date filters, `/about` page, and Admin Dashboard.
- **Database:** Turso (libSQL) as the single source of truth; hero slots rotate automatically.
- **Auth:** Clerk authentication (Edge middleware in `web/middleware.ts`); admin-only areas gated by `web/lib/admins.ts`.
- **Scraper:** Python-based GitHub Action for curating news using Groq/Llama. Also runnable locally via Docker or `run_local.py`.
- **Analytics:** Google Analytics + PostHog (initialized in `web/app/layout.tsx` and `web/instrumentation-client.ts`).
- **PWA:** Service worker (`web/public/sw.js`), offline page, and install prompt.

---

## Architecture
```
Browser/PWA ─┬─ Cloudflare Workers (Next.js 16, nodejs_compat)
             ├─ Google Analytics + PostHog
             └─ Clerk auth middleware (web/middleware.ts)
                 │
                 ▼
            Turso (libSQL)
                 ▲
      GitHub Actions (workflow_dispatch)
      scraper/scraper_local.py
      • cloudscraper + feedparser
      • Groq/Llama curation + hero scoring (curator_groq.py)
      • Batch insert + feature slot locks
```

### Data Model (Turso)
- `posts`: `id`, `title`, `link`, `source`, `category`, `teaser`, `summary`, optional `content`, `image_url`, `published_at`, `scraped_at`, `clicks`, `updated_at`.
- `featured_slots`: `slot_id` (`main`, `tech`, `culture`, `lifestyle`, `business`, `sports`), `label`, `post_id`, `locked_until`, `updated_at`, `manual_override`, `admin_choice`.

---

## Key Components

- **Runtime:** The application runs on the `nodejs_compat` runtime (via OpenNext), allowing full Node.js API support on Cloudflare Workers.
- **Middleware:** Clerk auth middleware in `web/middleware.ts` handles authentication on the edge.

## Frontend (`web/`)
- **Home + categories:** `web/app/page.tsx` (ISR 60s) with hero + sidebars; category filter drives hero slot selection.
- **Latest feed:** `web/app/najnovo/page.tsx` (client grid with infinite scroll on mobile).
- **Archive:** `web/app/all/page.tsx` with search bar, date/category filters, and paged stories list.
- **About:** `web/app/about/page.tsx`.
- **Blog:** reader `web/app/blog/[id]/page.tsx`, composer `web/app/blog/new/page.tsx`, normalize/clean rich text via `web/lib/rich-text.ts` and `web/lib/images.ts`.
- **Admin:** hero manager `web/app/admin/` uses `/api/featured-slots`, inline override on the homepage (`AdminHeroOverride`), and blog CTA (`AdminBlogCta`).
- **Auth & middleware:** Clerk provider in `web/app/layout.tsx`, middleware in `web/middleware.ts`, admin emails in `web/lib/admins.ts`.
- **Analytics:** PostHog + Clerk sync via `web/app/PostHogClerkSync.tsx`, instrumentation in `web/instrumentation-client.ts`.
- **PWA:** Service worker in `web/public/sw.js`, installer in `web/app/_components/pwa-installer.tsx`, offline fallback at `web/app/offline/page.tsx`.
- **Edge redirect:** `/go/[id]` increments `clicks` then 307 redirects to the source link.
- **Components:** Navigation, welcome modal, PWA installer in `web/app/_components/`.

### Notable Defaults
- Revalidate: home 60s, blog 120s.
- Hero lock window: 1h for manual overrides; scraper rotates heroes every 1h when unlocked.

---

## Scraper (`scraper/`)
- **Feeds:** 70+ RSS sources across Tech, Culture/Lifestyle, Business, Sports, Local, and curated general news.
- **Pipeline:** cloudscraper fetch → feedparser parse → dedupe (title similarity threshold 0.9) → coarse reject → AI budgeted queue (max 30 per run) → Groq/Llama JSON classification (category, hero flag/score, summary) → batch insert into Turso via `libsql-client`.
- **AI Curation:** `curator_groq.py` uses Groq API with Llama model fallback chain (`llama-3.1-8b-instant` → `llama-4-scout-17b-16e-instruct`).
- **Feature slots:** Reserves hero slots before writing; locks slots after rotation unless manually overridden.
- **Persistence:** Background writer thread consumes a queue, batches inserts, and updates `featured_slots`; failures release reservations.
- **Logging:** Structured JSONL in `scraper/logs/scraper_log.jsonl`.
- **Local run:** `scraper/run_local.py` or Docker (`scraper/Dockerfile`).
- **CI:** `.github/workflows/scraper.yml` — currently manual trigger only (`workflow_dispatch`), runs on `ubuntu-latest` with Python 3.11.

---

## Project Layout
```
macedonian-vibes-news/
├── web/                        # Next.js 16 app
│   ├── app/                    # Pages, API routes, components
│   │   ├── _components/        # Shared components (nav, PWA, welcome modal)
│   │   ├── about/              # About page
│   │   ├── actions/            # Server actions
│   │   ├── admin/              # Admin dashboard + hero manager
│   │   ├── all/                # Archive with search & date filters
│   │   ├── api/                # API routes (featured-slots)
│   │   ├── blog/               # Blog reader + composer
│   │   ├── go/                 # Edge redirect (click tracking)
│   │   ├── najnovo/            # Latest news feed
│   │   └── offline/            # PWA offline fallback
│   ├── lib/                    # Turso client, admins, rich-text, transliterate
│   ├── public/                 # Static assets, service worker, icons
│   ├── middleware.ts           # Clerk auth middleware
│   ├── instrumentation-client.ts  # PostHog client init
│   ├── wrangler.jsonc          # Cloudflare Workers config
│   └── open-next.config.ts     # OpenNext adapter config
├── scraper/                    # Python scraper + Groq/Llama curator
│   ├── scraper_local.py        # Main scraper entry point
│   ├── curator_groq.py         # AI classification + hero scoring
│   ├── logger.py               # JSONL logging helper
│   ├── run_local.py            # Local development runner
│   ├── Dockerfile              # Container build for scraper
│   ├── hugging/                # HuggingFace model experiments
│   └── requirements.txt
├── hugging/                    # HuggingFace scraper experiments
├── .github/workflows/          # Scraper CI workflow
├── my-clerk-app/               # Clerk starter sandbox
└── README.md
```

---

## Deployment & Ops
- **Frontend** is deployed to **Cloudflare Workers** via OpenNext (`web/wrangler.jsonc`).
- **Scraper** runs as a GitHub Action (manual dispatch) or locally via Docker/`run_local.py`.

---

## License
MIT

Made with ❤️ in Macedonia
*Last Updated: April 2026*
