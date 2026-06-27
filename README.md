# Macedonian Vibes News 📰

[![Cloudflare Workers](https://img.shields.io/badge/Host-Cloudflare_Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![OpenNext](https://img.shields.io/badge/Adapter-OpenNext-000000?logo=next.js)](https://opennext.js.org/)
[![Turso](https://img.shields.io/badge/DB-Turso-3B82F6?logo=sqlite)](https://turso.tech/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-3E2CFF?logo=clerk)](https://clerk.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)

AI-curated Macedonian news aggregator. A Python scraper ingests 95+ RSS feeds, classifies articles with Groq/Llama (or Claude via Max subscription), writes to Turso, and a Next.js 16 + Clerk frontend serves category views, a latest feed, blog posts, and admin controls.

**Live:** [vibes.mk](https://vibes.mk)

---

## What's Here Right Now

- **Frontend:** Next.js 16 App Router (React 19) deployed on **Cloudflare Workers** via **OpenNext**.
- **Features:** 6 categories (Tech, Culture, Lifestyle, Business, Sports + main hero), `/najnovo` feed, `/all` archive with Macedonian/Latin search and date filters, blog, Admin Dashboard, dark mode, PWA, share buttons.
- **Two-tier homepage:** Stories tagged `good_vibes = 1` appear on the homepage; lower-quality accepted stories go only to *most recent* and *archive*. Tabloid/junk is rejected entirely.
- **Database:** Turso (libSQL) as single source of truth; 7 hero slots rotate automatically.
- **Auth:** Clerk (Edge middleware); admin-only areas gated by `web/lib/admins.ts`.
- **Scraper:** Python daemon running on **HuggingFace Spaces** every 15 min. Curator engine is runtime-switchable: `CURATOR=groq` (default, Llama via Groq REST) or `CURATOR=claude` (Claude Max OAuth, trial Space).
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
      HuggingFace Space: vibesmk/scraper
      run_local.py (daemon, port 7860)
        └─ scraper_local.py  process_feeds()
             ├─ cloudscraper + feedparser
             ├─ curator.py  ─ CURATOR=groq  → curator_groq.py  (Groq/Llama, default)
             │               CURATOR=claude → curator_claude.py (Claude Max OAuth, trial)
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
3. Coarse keyword reject (shared filter in `curator_groq.py`).
4. AI budget queue — at most `MAX_AI_ARTICLES_PER_RUN` (default 100) articles sent to the curator per run.
5. Curator classifies: **accept + `good_vibes=true`** (homepage tier) / **accept + `good_vibes=false`** (archive-only) / **reject** (dropped).
6. Background persist thread (`turso_persist_worker`) batch-inserts posts and rotates `featured_slots`.

### Curator engines

`scraper/curator.py` routes to the correct engine at startup based on `CURATOR`:

| `CURATOR` | Module | How |
|---|---|---|
| `groq` (default) | `curator_groq.py` | Groq REST API, Llama model fallback chain (`llama-3.1-8b-instant` → `llama-4-scout-17b-16e-instruct`) with per-model circuit breakers |
| `claude` | `curator_claude.py` | Shells out to the Claude Code CLI, authenticated via `CLAUDE_CODE_OAUTH_TOKEN` (Claude Max subscription). Supports `CLAUDE_MODEL` alias (`sonnet` / `haiku` / `opus`), `CURATOR_FALLBACK=groq` safety net |

### Two-tier curation (`good_vibes`)

- `good_vibes = true` → homepage-eligible (achievements, culture, science, sport wins, human interest, constructive tech/business).
- `good_vibes = false` → saved, but only surfaces in *most recent* (`/najnovo`) and *archive* (`/all`).
- Tabloid / yellow press / junk → rejected, not saved.

The `good_vibes` column is auto-created by the scraper with `DEFAULT 1` so all legacy posts remain visible on the homepage.

### Env-tunable constants

| Var | Default | Meaning |
|---|---|---|
| `CURATOR` | `groq` | `groq` or `claude` |
| `MAX_AI_ARTICLES_PER_RUN` | `100` | Cap on articles sent to the curator per run |
| `ENTRIES_PER_FEED` | `4` | Entries pulled per feed each run |
| `MIN_CURATION_INTERVAL_MINUTES` | `30` | Min minutes between curation passes |
| `MIN_HERO_SCORE` | `60` | Min hero_score to occupy a homepage slot |
| `BATCH_SIZE` | `8` | Curator batch size (mostly vestigial now) |
| `CLAUDE_MODEL` | `sonnet` | Claude model alias (when `CURATOR=claude`) |
| `CLAUDE_TIMEOUT_S` | `180` | Per-call CLI timeout (Claude path) |
| `CLAUDE_MAX_CONSECUTIVE_FAILURES` | `3` | Stop curating after this many consecutive CLI failures |
| `CURATOR_FALLBACK` | *(unset)* | Set to `groq` to fall back when Claude fails |

### Production deployment (HuggingFace Spaces)

- **Production Space:** `vibesmk/scraper` — `CURATOR=groq` (default), runs `run_local.py`, binds port 7860, curates every 15 min. Deploy = `git push` to the HF git remote.
- **Trial Space:** `vibesmk/scraper-claude-test` (or similar) — `CURATOR=claude`, uses `CLAUDE_CODE_OAUTH_TOKEN`. **Pause the prod Space while the trial runs** to avoid dual writes to `featured_slots`. See `scraper/TRIAL_SETUP.md` for full setup.

> ⚠️ The `.github/workflows/scraper.yml` GitHub Action is **stale and broken** (wrong entrypoint, wrong API key, schedule commented out). Production scraping happens on HuggingFace, not GitHub Actions. Do not rely on or try to fix the Action without a clear reason.

### Local run

```bash
cd scraper
pip install -r requirements.txt
cp .env.local.example .env.local  # fill TURSO_* + GROQ_API_KEY (or CLAUDE_CODE_OAUTH_TOKEN)
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
│   ├── curator.py              # Engine selector (CURATOR env var)
│   ├── curator_groq.py         # Groq/Llama curator (production default)
│   ├── curator_claude.py       # Claude Max curator (trial)
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
| Scraper (prod) | HuggingFace Space `vibesmk/scraper` | `git push` to HF remote |
| Scraper (trial) | HuggingFace Space `vibesmk/scraper-claude-test` | `git push` to trial HF remote |

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

- **Scraper runs on HuggingFace, not GitHub Actions.** The `.github/workflows/scraper.yml` workflow is stale: wrong entrypoint (`scraper_2.py`), wrong API key (`GEMINI_API_KEY`), schedule commented out.
- **Port 7860 is required.** HuggingFace Docker Spaces mark a Space `RUNTIME_ERROR` unless the app listens on its declared `app_port`. `run_local.py` starts an HTTP server there before the daemon loop.
- **Two Spaces can race.** If the Groq Space and the Claude trial Space both run at once, they will both rotate `featured_slots`. Pause the prod Space during any trial run. See `TRIAL_SETUP.md`.
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
*Last updated: June 2026*
