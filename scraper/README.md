---
title: Macedonian Vibes News Scraper
emoji: 🗞️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
app_port: 7860
---

# 🗞️ Macedonian Vibes News Scraper

Automated news aggregator for [vibes.mk](https://vibes.mk) - scraping 95+ Macedonian RSS feeds every 15 minutes with AI-powered curation.

## Features

- **95+ RSS Feeds**: Tech, Culture, Lifestyle, Business, Sports, and Local News
- **AI Curation**: Claude (via a Claude Max subscription) separates signal from noise — it keeps
  substantive news (including serious/important stories) and drops yellow-press, tabloid, and
  daily political theatre. No pre-LLM keyword filter: every article is judged by the model.
- **Smart Deduplication**: Title similarity matching and link-based dedup
- **Featured Slots**: Automatic hero rotation for homepage
- **Streaming Architecture**: Articles appear in DB within 60 seconds

## Status

🟢 **Running** — Docker container on a private Hetzner VPS, processing feeds every 15 minutes (migrated off HuggingFace Spaces, Aug 2026; the old Space is paused/deprecated).

## Architecture

```
RSS Feeds → Fetch → Claude curation → Turso DB → vibes.mk
```

- **Language**: Python 3.11
- **AI**: Claude Code CLI (Claude Max subscription; see `TRIAL_SETUP.md`)
- **Database**: Turso (libSQL)
- **Deployment**: Docker Compose on a private Hetzner VPS (1.5 GB memory cap, localhost-only health server on 7860)

## Environment Variables

Required secrets (in production: `.env` next to the compose file on the box; locally: `.env.local`):

- `TURSO_DATABASE_URL`: Your Turso database URL
- `TURSO_AUTH_TOKEN`: Turso authentication token
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Max OAuth token for AI curation (mint with `claude setup-token`)

Optional tuning variables are documented in `TRIAL_SETUP.md` (`CLAUDE_MODEL`, `MAX_AI_ARTICLES_PER_RUN`, etc.).

## Logs

`docker logs --tail 50 scraper` on the box (or the Telegram ops bot's `/logs`) to monitor scraper activity:
- ✅ Successful article saves
- 🧠 AI curation decisions
- ⚠️ Errors and retries

---

Built for [vibes.mk](https://vibes.mk) 🇲🇰
