# Macedonian Vibes News 📰

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://macedonian-vibe-news.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**AI-curated news aggregator for Macedonia** — Automatically fetches, analyzes, and displays news from top Macedonian RSS feeds using Google Gemini AI for intelligent summarization and categorization.

**Live:** [vibes.mk](https://vibes.mk)

---

## 🎯 Overview

Macedonian Vibes News is a full-stack news aggregation platform that:

- 🔄 **Automatically scrapes** 13+ Macedonian news sources via RSS feeds
- 🤖 **AI-analyzes** articles using Google Gemini for summaries and categorization
- 📊 **Stores** all articles in Supabase PostgreSQL database with metadata
- 🌐 **Displays** via a modern Next.js frontend with category filtering and featured stories
- ⚡ **Runs serverlessly** — Zero infrastructure management, fully automated

### Key Features

✅ **Automated News Scraping** — Runs every 4 hours via GitHub Actions  
✅ **AI-Powered Summaries** — Google Gemini generates teaser text and full summaries  
✅ **Category Filtering** — Browse by Tech, Culture, Lifestyle, Business  
✅ **Featured Stories** — Rotating 8-hour featured story slot system  
✅ **Responsive Design** — Mobile-first UI with Tailwind CSS  
✅ **Global CDN** — Deployed on Vercel for sub-second response times  
✅ **Zero Cost** — Free tier for all services (GitHub Actions, Vercel, Supabase, Gemini)  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Your Browser / Mobile               │
└────────────────────┬────────────────────────┘
                     │ HTTPS
         ┌───────────▼──────────┐
         │   Vercel CDN         │
         │ (Frontend Hosting)   │
         └───────────┬──────────┘
                     │ Fetches Data
         ┌───────────▼──────────┐
         │  Supabase PostgreSQL │
         │  (Article Database)  │
         └───────────▲──────────┘
                     │ Writes Data
         ┌───────────┴──────────┐
         │  GitHub Actions      │
         │  (Every 4 hours)     │
         │                      │
         │  scraper.py:         │
         │  • Fetch RSS feeds   │
         │  • Parse content     │
         │  • AI summarize      │
         │  • Save to DB        │
         └──────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS | Web UI with SSR |
| **Backend** | Python 3.11, BeautifulSoup4, feedparser | Article scraping & parsing |
| **AI/ML** | Google Gemini API | Content analysis & summarization |
| **Database** | Supabase (PostgreSQL) | Articles & metadata storage |
| **Hosting** | Vercel | Frontend deployment & CDN |
| **Automation** | GitHub Actions | Scheduled scraper execution |
| **Source Control** | GitHub | Repository & CI/CD 

---



## 📋 Project Structure

```
macedonian-vibes-news/
├── web/                          # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx             # Homepage with categories
│   │   ├── all/page.tsx         # All articles list view
│   │   └── layout.tsx           # Root layout
│   ├── lib/
│   │   └── supabase.ts          # Supabase client
│   ├── package.json             # Frontend dependencies
│   └── next.config.ts           # Next.js config
│
├── scraper/                      # Python Backend
│   ├── scraper.py               # Main scraping logic
│   ├── curator.py               # AI curation with Gemini
│   ├── logger.py                # Logging utilities
│   ├── requirements.txt          # Python dependencies
│   ├── logs/                    # Scraper logs (JSONL format)
│   └── .env.example             # Environment template
│
├── .github/workflows/            # GitHub Actions Automation
│   ├── scraper.yml              # Scheduled scraper (every 4h)
│   └── lint-build.yml           # Frontend CI/CD
│
├── docs/                         # Documentation
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── QUICK_START.md           # Quick setup checklist
│   └── SUPABASE_SCHEMA.md       # Database schema reference
│
└── README.md                     # This file
```

---

## 🔄 How It Works

### 1. **Scraper Runs Automatically (Every 4 Hours)**

GitHub Actions trigger `.github/workflows/scraper.yml`:

```
Scraper Start
    ↓
Fetch RSS feeds (13 Macedonian news sources)
    ↓
Parse HTML with BeautifulSoup
    ↓
Send to Google Gemini API for:
  • Content summarization
  • Category classification
  • Teaser text generation
    ↓
Upsert to Supabase `posts` table
    ↓
Log events to scraper_log.jsonl
```

### 2. **Frontend Fetches & Displays Data**

User visits site:
```
Browser → Vercel CDN
    ↓
Next.js server fetches from Supabase
    ↓
Renders homepage with categories
    ↓
User filters by category or browses "All"
    ↓
Click article → Opens in new tab
```

### 3. **Featured Story Rotation (Every 8 Hours)**

A random article from each category is featured:
- Tech, Culture, Lifestyle, Business each get 1 featured slot
- Homepage displays featured story prominently
- Rotates every 8 hours automatically

---

## 📊 RSS Feed Sources

The scraper aggregates from these Macedonian news sources:

- IT.mk
- Porta3.mk
- Telma.mk
- MKD.mk
- Dnevnik.mk
- Vesti.mk
- 24VESTI.mk
- Nova.mk
- TVM.mk
- Plus.mk
- MKDNews.mk
- Faktor.mk
- Ekonomija.mk

*(Sources defined in `scraper/scraper.py`)*


## 🔐 Security

- ✅ API keys stored in GitHub Actions Secrets (never in code)
- ✅ Frontend uses Supabase anon key (read-only public)
- ✅ Scraper uses service role key (private, GitHub-only)
- ✅ All data in transit encrypted (HTTPS/TLS)
- ✅ Supabase Row-Level Security (RLS) configured
- ✅ `.gitignore` prevents `.env` file commits

---

## 🤝 Contributing

This is a personal project, but improvements are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the MIT License.

---

**Made with ❤️ in Macedonia**

*Last Updated: December 2, 2025*
