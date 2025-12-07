# Macedonian Vibes News 📰

[![Cloudflare](https://img.shields.io/badge/DNS-Cloudflare-F38020?logo=cloudflare)](https://www.cloudflare.com/)
[![Turso](https://img.shields.io/badge/DB-Turso-3B82F6?logo=sqlite)](https://turso.tech/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-3E2CFF?logo=clerk)](https://clerk.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![Analytics](https://img.shields.io/badge/Analytics-GA_%2B_PostHog-111111?logo=google-analytics)](#analytics)

**AI-curated Macedonian news aggregator** — Scrapes 30+ RSS feeds, curates with Google Gemini, stores in Turso (libSQL), and serves a Next.js 16 frontend with Clerk auth, blog, and dual analytics (Google Analytics + PostHog).

**Live:** [vibes.mk](https://vibes.mk)

---

## 🎯 What’s Inside (Current State)
- Turso database via `@libsql/client` on both the scraper and the Next.js app (Supabase removed).
- Clerk-powered accounts (sign-up/sign-in + profile in the nav drawer).
- Tracking wired to Google Analytics (`@next/third-parties/google`) and PostHog (JS SDK + proxy).
- Blog section with per-post pages; admin-only writer UI planned (read-only for now).
- New Sports category, refreshed feed list (30+ sources), and featured slot rotation.
- Cloudflare manages DNS; Next.js app configured for edge-friendly DB access.
- Scraper scheduled via GitHub Actions

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────┐
│                 Browser / Mobile                  │
└───────────────┬───────────────────────────────────┘
                │ HTTPS
       ┌────────▼────────┐    ┌───────────────────┐
       │ Cloudflare DNS  │    │ Google Analytics  │
       │  + Pages host   │    │ PostHog Proxy     │
       └────────┬────────┘    └───────────────────┘
                │
       ┌────────▼────────┐
       │ Next.js 16 (web)│
       │ React 19, Tailwind 4
       │ Clerk Provider (auth)
       └────────┬────────┘
                │ libSQL
       ┌────────▼────────┐
       │ Turso Database  │
       └────────▲────────┘
                │ writes curated posts
       ┌────────┴────────┐
       │ GitHub Actions  │  (cron */3h)
       │ Python Scraper  │
       │  • RSS ingest   │
       │  • Gemini curation
       └─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Clerk | UI, SSR/ISR, authentication |
| **Backend/Scraper** | Python 3.11, feedparser, cloudscraper, BeautifulSoup4 | RSS ingest & article parsing |
| **AI** | Google Gemini 2.5 / Gemma fallback | Summaries, categorization, hero selection |
| **Database** | Turso (libSQL) | Posts, featured slots, blog entries |
| **Analytics** | Google Analytics, PostHog JS + proxy | User & product analytics |
| **Automation** | GitHub Actions (cron every 12h) | Runs scraper and writes to Turso |
| **DNS/Edge** | Cloudflare DNS (Pages config present) | Domain + proxy rules |

---

## 📋 Project Structure

```
macedonian-vibes-news/
├── web/                     # Next.js 16 frontend (App Router)
│   ├── app/                 # Pages, components, providers, blog
│   ├── lib/                 # DB clients (turso)
│   ├── instrumentation-client.ts  # PostHog setup
│   ├── proxy.ts             # Clerk middleware
│   └── vercel.json          # PostHog proxy rewrites
├── scraper/                 # Python scraper + Gemini curator
│   ├── scraper.py           # RSS ingest → Turso writes
│   ├── curator.py           # Gemini/Gemma summarization
│   ├── logger.py            # Structured logging helper
│   └── requirements.txt
├── .github/workflows/       # GitHub Actions (scraper cron)
├── wrangler.toml            # Cloudflare Pages build config
├── my-clerk-app/            # (Playground) Clerk Next.js starter
└── README.md
```

---

## 🔄 Data Flow

1. **Scrape & Curate (GitHub Actions, every 3h)**  
   `scraper/scraper.py` pulls 30+ RSS feeds, dedupes links, scrapes images, and sends batches to Gemini (`scraper/curator.py`) for categorization, summaries, teaser text, and hero picks. Results are written to Turso tables (`posts`, `featured_slots`).

2. **Serve (Next.js)**  
   `web/app/page.tsx` and `web/app/all/page.tsx` query Turso via `@libsql/client/web`. ISR is set to 60s on the homepage and 120s for blog post pages. Featured slots determine the hero story; Sports and Blog are now first-class categories.

3. **Auth & Blog**  
   Clerk wraps the app layout for sign-in/sign-up/profile. Blog posts are rendered from Turso; an admin-only writer surface is planned but not yet shipped (read-only today).

4. **Analytics**  
   Google Analytics is injected via `@next/third-parties/google`. PostHog is initialized in `web/app/providers.tsx` with Clerk identity sync (`web/app/PostHogClerkSync.tsx`) and proxied routes (`vercel.json`) to avoid ad-blockers.

---

## 📊 RSS Sources (Sampling)

The scraper currently ingests 30+ feeds, including IT.mk, Конект, A1on, MKD.mk, Радио МОФ, Makfax, Porta3, Sloboden Pechat, Off.net, Fashionel, Sport Plus, and more. See `TARGET_FEEDS` in `scraper/scraper.py` for the live list.

---

## ⚙️ Environment & Deployment

**Frontend (Next.js / Cloudflare Pages or Vercel)**  
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`  
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (proxy host)  
- `NEXT_PUBLIC_SITE_URL` (for metadata)  
- Clerk defaults: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (+ optional sign-in/up URLs)

**Scraper (GitHub Actions or local)**  
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`  
- `GEMINI_API_KEY`

**Ops Notes**  
- Scraper cron: `*/3h` (`.github/workflows/scraper.yml`).  
- ISR: homepage 60s, blog pages 120s.  
- Cloudflare manages DNS for `vibes.mk`; wrangler config is present for Pages.

---

## 🔐 Security
- Secrets provided via GitHub Actions and hosting platform env vars (no secrets in repo).  
- Turso auth tokens are required for all DB writes/reads.  
- Clerk handles session + identity; PostHog identification is gated on signed-in users.  
- `.env` is ignored; keep local secrets out of version control.

---

## 🤝 Contributing
1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/amazing-feature`).  
3. Commit (`git commit -m 'Add amazing feature'`).  
4. Push and open a Pull Request.

---

## 📝 License
MIT

---

Made with ❤️ in Macedonia  
*Last Updated: December 07, 2025*
