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
- **AI Curation**: Groq AI (llama-3.1-8b-instant) filters politics/crime/low-quality content
- **Smart Deduplication**: Title similarity matching and link-based dedup
- **Featured Slots**: Automatic hero rotation for homepage
- **Streaming Architecture**: Articles appear in DB within 60 seconds

## Status

🟢 **Running** - Scraper processes feeds every 15 minutes

Visit the [app URL] to see the health status.

## Architecture

```
RSS Feeds → Fetch → AI Filter → Turso DB → vibes.mk
```

- **Language**: Python 3.11
- **AI**: Groq API (llama-3.1-8b-instant)
- **Database**: Turso (libSQL)
- **Deployment**: HuggingFace Spaces (Docker)

## Environment Variables

Required secrets (set in HuggingFace Space settings):

- `TURSO_DATABASE_URL`: Your Turso database URL
- `TURSO_AUTH_TOKEN`: Turso authentication token
- `GROQ_API_KEY`: Groq API key for AI curation

## Logs

Check the HuggingFace Space logs to monitor scraper activity:
- ✅ Successful article saves
- 🧠 AI curation decisions
- ⚠️ Errors and retries

---

Built for [vibes.mk](https://vibes.mk) 🇲🇰
