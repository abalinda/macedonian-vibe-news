# Macedonian Vibes News 📰

[![Cloudflare Workers](https://img.shields.io/badge/Host-Cloudflare_Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![OpenNext](https://img.shields.io/badge/Adapter-OpenNext-000000?logo=next.js)](https://opennext.js.org/)
[![Turso](https://img.shields.io/badge/DB-Turso-3B82F6?logo=sqlite)](https://turso.tech/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-3E2CFF?logo=clerk)](https://clerk.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)

AI-curated Macedonian news aggregator. A Python scraper ingests 95+ RSS feeds, curates articles with Claude (Claude Max subscription via the Claude Code CLI), writes to Turso, and a Next.js 16 + Clerk frontend serves category views, a latest feed, blog posts, and admin controls.

**Live:** [vibes.mk](https://vibes.mk)

---

## What's Here Right Now

- **Frontend:** Next.js 16 App Router (React 19) deployed on **Cloudflare Workers** via **OpenNext**.
- **Features:** 6 categories (Tech, Culture, Lifestyle, Business, Sports + main hero), `/najnovo` feed, `/all` archive with Macedonian/Latin search and date filters, blog, Admin Dashboard, dark mode, PWA, share buttons.
- **Two-tier homepage:** Stories tagged `good_vibes = 1` appear on the homepage; lower-quality accepted stories go only to *most recent* and *archive*. Tabloid/junk is rejected entirely.
- **Database:** Turso (libSQL) as single source of truth; 7 hero slots rotate automatically.
- **Auth:** Clerk (Edge middleware); admin-only areas gated by `web/lib/admins.ts`.
- **Scraper:** Python daemon running as a **Docker container on a private Hetzner VPS** every 15 min (migrated off HuggingFace Spaces, Aug 2026). Curation is Claude-only (`curator_claude.py`, Claude Max OAuth via the Claude Code CLI).
- **Analytics:** Google Analytics + PostHog (initialised in `web/app/layout.tsx` and `web/instrumentation-client.ts`).
- **PWA:** Service worker (`web/public/sw.js`), offline page, install prompt.

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
      Hetzner VPS (Docker container `scraper`)
      run_local.py (daemon, health server on 7860, localhost-only)
        └─ scraper_local.py  process_feeds()
             ├─ cloudscraper + feedparser
             ├─ curator_claude.py (Claude Max OAuth via Claude Code CLI)
             └─ batch insert + featured_slots rotation
```

### Data Model (Turso)

- **`posts`**: `id`, `title`, `link`, `source`, `category`, `teaser`, `summary`, optional `content`, `image_url`, `published_at`, `scraped_at`, `clicks`, `updated_at`, `good_vibes` (1 = homepage-eligible, 0 = archive-only; auto-created by scraper with `DEFAULT 1`).
- **`featured_slots`**: one row per hero slot — `slot_id` (`main`, `tech`, `culture`, `lifestyle`, `business`, `sports`), `label`, `post_id`, `locked_until`, `updated_at`, `manual_override`, `admin_choice`.

---

## Frontend (`web/`)

- **Home:** `web/app/page.tsx` (ISR 60s) — hero + sidebars, filters on `good_vibes = 1`, fallback to unfiltered if column absent.
- **Latest feed:** `web/app/najnovo/page.tsx` (client grid with infinite scroll on mobile, unfiltered).
- **Archive:** `web/app/all/page.tsx` — search (Macedonian Cyrillic ↔ Latin transliteration via `web/lib/transliterate.ts`), date/category filters, paged list.
- **Blog:** reader `web/app/blog/[id]/page.tsx`, composer `web/app/blog/new/page.tsx`.
- **Admin:** hero manager `web/app/admin/`, inline override via `AdminHeroOverride`.
- **Edge redirect:** `web/app/go/[id]/route.ts` — increments `posts.clicks` then 307s to the source link; used by share buttons site-wide.
- **Auth & middleware:** Clerk provider in `web/app/layout.tsx`, middleware in `web/middleware.ts`, admin emails in `web/lib/admins.ts`. Localhost requests bypass auth (dev convenience).
- **Analytics:** PostHog + Clerk identity sync via `web/app/PostHogClerkSync.tsx`.
- **PWA:** `web/public/sw.js`, installer in `web/app/_components/pwa-installer.tsx`, offline fallback at `web/app/offline/page.tsx`.

### Key defaults

| Setting | Value |
|---|---|
| Home ISR revalidate | 60 s |
| Blog revalidate | 120 s |
| Admin override lock | **4 hours** |
| Scraper hero rotation | 60 min (when unlocked) |

---

## Scraper (`scraper/`)

### Pipeline

`process_feeds()` in `scraper_local.py` is the entry point:

1. Fetch each feed (cloudscraper) → parse (feedparser) → take up to `ENTRIES_PER_FEED` (default 4) entries.
2. Deduplicate by link + fuzzy title (`SequenceMatcher`, threshold 0.9, seeded from recent DB titles).
3. AI budget queue — at most `MAX_AI_ARTICLES_PER_RUN` (default 100) articles sent to the curator per run. There is **no pre-LLM keyword filter**: every queued article is judged by the model.
4. Curator classifies: **accept + `good_vibes=true`** (homepage tier) / **accept + `good_vibes=false`** (archive-only) / **reject** (dropped).
5. Background persist thread (`turso_persist_worker`) batch-inserts posts and rotates `featured_slots`.

### Curation (Claude-only)

`scraper/curator_claude.py` shells out to the Claude Code CLI (`claude --print --output-format json`), authenticated via `CLAUDE_CODE_OAUTH_TOKEN` (Claude Max subscription — no API key). The editorial prompt is a signal-vs-noise policy: it rejects yellow-press/tabloid/daily political theatre, keeps substantive news, and tags homepage-worthy stories `good_vibes=true`. The old Groq/Llama curator has been deleted.

### Two-tier curation (`good_vibes`)

- `good_vibes = true` → homepage-eligible (achievements, culture, science, sport wins, human interest, constructive tech/business).
- `good_vibes = false` → saved, but only surfaces in *most recent* (`/najnovo`) and *archive* (`/all`).
- Tabloid / yellow press / junk → rejected, not saved.

The `good_vibes` column is auto-created by the scraper with `DEFAULT 1` so all legacy posts remain visible on the homepage.

### Env-tunable constants

| Var | Default | Meaning |
|---|---|---|
| `MAX_AI_ARTICLES_PER_RUN` | `100` | Cap on articles sent to the curator per run |
| `ENTRIES_PER_FEED` | `4` | Entries pulled per feed each run |
| `MIN_CURATION_INTERVAL_MINUTES` | `10` | Min minutes between curation passes |
| `MIN_HERO_SCORE` | `60` | Min hero_score to occupy a homepage slot |
| `CURATION_BATCH_SIZE` | `12` | Articles per curator batch |
| `CLAUDE_MODEL` | `sonnet` | Claude model alias (`sonnet` / `haiku` / `opus`) |
| `CLAUDE_TIMEOUT_S` | `180` | Per-call CLI timeout |
| `CLAUDE_MAX_CONSECUTIVE_FAILURES` | `3` | Stop curating after this many consecutive CLI failures |

### Production deployment (Hetzner VPS, since Aug 2026)

- Runs as a Docker Compose service (container `scraper`) on a **private Hetzner VPS** shared with another workload: image built from `scraper/Dockerfile` (Python 3.11 + Node 20 + Claude Code CLI), 1.5 GB memory cap, `restart: unless-stopped`, port 7860 bound to localhost only (healthcheck; nothing exposed publicly).
- Secrets (`CLAUDE_CODE_OAUTH_TOKEN`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) live in an `.env` on the box — never in git.
- Redeploy = rsync `scraper/` to the box, then `docker compose up -d --build`. A Telegram ops bot on the host provides `/status`, `/logs`, `/restart` from a phone.
- The former **HuggingFace Space** (`vibesmk/scraper_claude_test`) is **paused and deprecated**. Do not unpause it — two instances would double-write Turso and double-spend Claude usage.

> ⚠️ The `.github/workflows/scraper.yml` GitHub Action is **stale and broken** (wrong entrypoint, wrong API key, schedule commented out). Production scraping happens on the Hetzner box, not GitHub Actions. Do not rely on or try to fix the Action without a clear reason.

### Local run

```bash
cd scraper
pip install -r requirements.txt
cp .env.local.example .env.local  # fill TURSO_* + CLAUDE_CODE_OAUTH_TOKEN (mint with `claude setup-token`)
python scraper_local.py   # one pass
python run_local.py       # daemon (every 15 min, health server on 7860)
```

---

## Project Layout

```
macedonian-vibes-news/
├── web/                        # Next.js 16 app (Cloudflare Workers via OpenNext)
│   ├── app/
│   │   ├── _components/        # Shared components (nav, PWA, welcome modal)
│   │   ├── about/
│   │   ├── actions/            # Server actions (search, etc.)
│   │   ├── admin/              # Admin dashboard + hero manager
│   │   ├── all/                # Archive with search & date filters
│   │   ├── api/                # API routes (featured-slots)
│   │   ├── blog/               # Blog reader + composer
│   │   ├── go/                 # Edge redirect (click tracking + share)
│   │   ├── najnovo/            # Latest news feed
│   │   └── offline/            # PWA offline fallback
│   ├── lib/                    # Turso client, admins, rich-text, transliterate
│   ├── public/                 # Static assets, service worker, icons
│   ├── middleware.ts            # Clerk auth middleware
│   ├── instrumentation-client.ts  # PostHog client init
│   ├── wrangler.jsonc           # Cloudflare Workers config
│   └── open-next.config.ts     # OpenNext adapter config
├── scraper/                    # Python scraper + curator
│   ├── scraper_local.py        # Main pipeline (process_feeds)
│   ├── curator_claude.py       # Claude Max curator (the only curator)
│   ├── logger.py               # Structured JSONL logging
│   ├── run_local.py            # Daemon: health server (7860) + 15-min schedule
│   ├── Dockerfile              # Node 20 + claude CLI + Python 3.11
│   ├── benchmark.py            # Model-latency benchmark (not a test suite)
│   ├── TRIAL_SETUP.md          # How to run the Claude curation trial
│   └── requirements.txt
├── hugging/                    # Dead Gemini-based scraper copy — ignore
├── my-clerk-app/               # Clerk starter sandbox — ignore
├── .github/workflows/          # Stale GitHub Action (do not use)
└── README.md
```

---

## Deployment & Ops

| Component | Where | How |
|---|---|---|
| Frontend | Cloudflare Workers | `cd web && npm run deploy` |
| Scraper (prod) | Private Hetzner VPS (Docker Compose) | rsync `scraper/` to the box, `docker compose up -d --build` |

**Frontend commands (run from `web/`):**

```bash
npm run dev       # Next dev server on :3000
npm run build     # next build
npm run preview   # OpenNext build + local Cloudflare Workers preview
npm run deploy    # OpenNext build + deploy to Cloudflare Workers
npx eslint .      # lint (no npm lint script)
```

> Note: `next.config.ts` ignores TypeScript and ESLint errors during build. A green build does **not** mean type/lint-clean — run `npx eslint .` and `tsc` explicitly.

---

## Gotchas

- **Scraper runs on a Hetzner VPS, not GitHub Actions or HuggingFace.** The `.github/workflows/scraper.yml` workflow is stale: wrong entrypoint (`scraper_2.py`), wrong API key (`GEMINI_API_KEY`), schedule commented out. The old HF Space is paused/deprecated.
- **Two instances can race.** If the paused HF Space is ever resumed alongside the Hetzner container, both will rotate `featured_slots` and both will burn Claude usage. Keep exactly one instance running.
- **Port 7860 is the health endpoint.** `run_local.py` starts an HTTP server there before the daemon loop; in production it's bound to localhost on the box and used by the Docker healthcheck.
- **No migrations tooling.** Schema changes use idempotent runtime guards (e.g. `ensureAdminChoiceColumn()`, the scraper's `ensure_good_vibes_column()`). Add guards for any new column or slot rather than a migration file.
- **Admin override lock is 4 hours**, not 1 hour (the old README was wrong). Trust `FOUR_HOURS_MS` in `web/app/api/featured-slots/route.ts`.
- **`good_vibes` homepage filter** requires a web deploy to take effect. The scraper creates the column and tags posts; the homepage only filters on it after `npm run deploy`. The query falls back to unfiltered if the column doesn't exist, so deploy order doesn't break the site.
- **Multiple READMEs disagree.** Trust the code constants over prose (hero lock, feed count, API keys, etc.).
- **`web/lib/supabase.ts`** and the `@supabase/supabase-js` dependency are legacy/dead — not imported anywhere. Ignore Supabase references.
- **Preview deploy:** pushing a feature branch publishes to `<branch>.macedonian-vibe-news.balinda-centar.workers.dev` (e.g. `feature/foo` → `feature-foo.…`).

---

## License

MIT

Made with ❤️ in Macedonia  
*Last updated: August 2026*
