# Deployment Guide: Macedonian Vibe News

Complete guide to deploying this project with GitHub, Cloudflare Pages, and GitHub Actions automation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│  • Next.js frontend (web/)                                  │
│  • Python scraper (scraper/)                                │
│  • GitHub Actions CI/CD workflows                           │
└────────────────┬──────────────────────┬────────────────────┘
                 │                      │
        ┌────────▼───────┐      ┌──────▼────────┐
        │ Cloudflare     │      │ GitHub        │
        │ Pages          │      │ Actions       │
        │ (Frontend)     │      │ (Scraper)     │
        └────────┬───────┘      └──────┬────────┘
                 │                      │
        ┌────────▼──────────────────────▼────────┐
        │    Supabase PostgreSQL Database        │
        │  (Stores news posts, categories)      │
        └───────────────────────────────────────┘
```

## Prerequisites

- ✅ GitHub account (repo created at [github.com/abalinda/macedonian-vibe-news](https://github.com/abalinda/macedonian-vibe-news))
- ✅ Code pushed to `main` branch
- Supabase project configured (URL and API keys)
- Gemini API key from [Google AI Studio](https://aistudio.google.com)
- Cloudflare account (free tier available)

## Environment Variables Reference

### Frontend Environment (`web/.env.local`)
These are public variables (marked `NEXT_PUBLIC_*`) and safe to expose:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from:
1. [Supabase Dashboard](https://app.supabase.com) → Select your project
2. Settings → API
3. Copy `Project URL` and `anon public` key

### Scraper Environment (`scraper/.env`)
These are private secrets stored only in GitHub Actions:
```env
GEMINI_API_KEY=your-gemini-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-secret-key
```

---

## Step 1: Configure GitHub Actions Secrets ⚙️

All workflows are already in `.github/workflows/` and ready to use. You just need to configure secrets.

### Configure Secrets

1. Go to your GitHub repo: [github.com/abalinda/macedonian-vibe-news/settings](https://github.com/abalinda/macedonian-vibe-news/settings)
2. Click **Secrets and variables → Actions** in left sidebar
3. Click **New repository secret** for each:

**Required Secrets:**

| Secret Name | Value | Where to Get |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key | [Google AI Studio](https://aistudio.google.com) → Copy API Key |
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_KEY` | Service role secret key | Supabase Dashboard → Settings → API → Service role (SECRET) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key | Supabase Dashboard → Settings → API → anon public |

### Verify Workflows Are Active

After adding secrets, workflows will activate:

- **Frontend CI** (`.github/workflows/lint-build.yml`): Runs on every push to `web/` folder
  - Lints TypeScript/ESLint
  - Builds Next.js
  - Runs in ~2-3 minutes
  
- **Scraper Automation** (`.github/workflows/scraper.yml`): Runs every 4 hours automatically
  - Triggers via cron: `0 */4 * * *`
  - Can also manually trigger via "Actions" tab → "Run workflow"
  - Logs uploaded as artifacts (7-day retention)

Check status at: [github.com/abalinda/macedonian-vibe-news/actions](https://github.com/abalinda/macedonian-vibe-news/actions)

---

## Step 2: Deploy Frontend to Cloudflare Pages 🚀

### Initial Setup

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click **Create a project** → **Connect to Git**
3. Authorize GitHub (or log in if needed)
4. Select repository: `macedonian-vibe-news`
5. **Deployment settings**:
   - **Production branch**: `main`
   - **Build command**: `cd web && npm run build`
   - **Build output directory**: `web/.next`
   - **Root directory**: (leave blank)

### Configure Environment Variables

After creating the project:

1. Go to **Settings** → **Environment variables**
2. Add the following for **Production** environment:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

3. Click **Save** to redeploy with variables

### Result

✅ Your frontend is now live at: `https://macedonian-vibe-news.pages.dev`

Auto-redeployment happens automatically on:
- Every push to `main` branch
- You can see build logs in Cloudflare Pages dashboard
- Preview deployments for pull requests (optional setting)

### Custom Domain (Optional)

If you own a domain:
1. In Cloudflare Pages → **Custom domains**
2. Add your domain (must be managed by Cloudflare DNS)
3. Update DNS records if needed

---

## Step 3: Verify Scraper Execution ✓

The scraper is configured to run automatically every 4 hours via GitHub Actions.

### Check Scraper Status

1. Go to [github.com/abalinda/macedonian-vibe-news/actions](https://github.com/abalinda/macedonian-vibe-news/actions)
2. Click **scraper** workflow
3. You'll see scheduled runs:
   - ✅ Green checkmark = successful run
   - ❌ Red X = failed (check error logs)

### Manual Trigger (Testing)

1. Go to Actions tab → **scraper** workflow
2. Click **"Run workflow"** dropdown
3. Select `main` branch, click **"Run workflow"**
4. Workflow starts immediately (watch live logs)

### What the Scraper Does

Each run:
1. Fetches RSS feeds for news categories (Tech, Culture, Lifestyle, Business)
2. Parses with BeautifulSoup to extract article content
3. Sends to Google Gemini for AI analysis and categorization
4. Stores posts in Supabase `posts` table
5. Logs events to `scraper/logs/scraper_log.jsonl`
6. Rotates featured story every 8 hours

If articles don't appear on frontend:
- Check Supabase dashboard → `posts` table for records
- Review workflow logs for errors
- Verify API keys are correct in GitHub secrets

---

## Step 4: Monitor & Maintain 📊

### View Logs

**Frontend Errors:**
- Cloudflare Pages → **Deployments** → click a deployment → view build/runtime logs
- Browser console: Open website → F12 → Console tab

**Scraper Logs:**
- GitHub Actions → Actions tab → click workflow run → view job output
- Local file: `scraper/logs/scraper_log.jsonl` (JSON format, one log per line)

### Performance Tips

**Frontend Optimization:**
- Cloudflare Pages automatically serves from edge locations
- Images are cached (consider adding image optimization in future)
- TypeScript errors caught before deployment (CI/CD)

**Scraper Efficiency:**
- Runs only every 4 hours (adjust cron if needed in `.github/workflows/scraper.yml`)
- Queries Supabase efficiently with date filters
- Gemini API costs: ~$0-5/month depending on article volume

### Troubleshooting Common Issues

| Issue | Solution |
|---|---|
| Frontend shows "No stories" | Check Supabase connection, verify posts in database |
| Images not loading | Ensure `image_url` field populated in Supabase posts table |
| Scraper keeps failing | Verify secrets configured correctly, check Gemini API quota |
| Deploy takes too long | Clear Cloudflare cache or check build logs for dependency issues |
| Workflow runs not triggering | Verify secrets are set; cron workflows need at least one manual trigger first |

---

## Local Development

### Frontend

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

### Scraper (Test Locally)

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create .env file with your secrets
cat > .env << EOF
GEMINI_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
EOF

# Run once
python3 scraper.py
```

---

## Alternative: Deploy Frontend to Vercel (Optional)

If you prefer Vercel instead of Cloudflare Pages:

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project" → Connect GitHub
3. Select `macedonian-vibe-news`
4. Configure:
   - Root Directory: `web`
   - Framework: Next.js (auto-selected)
5. Add environment variables (same as Cloudflare setup)
6. Deploy

**Vercel Pros:** Native Next.js optimization, simpler UI
**Cloudflare Pros:** Same ecosystem as your domain, free tier more generous, edge caching

---

## Future Enhancements

- [ ] Migrate scraper to Supabase Edge Functions (runs in Postgres without GitHub Actions)
- [ ] Add Sentry error tracking (frontend & scraper)
- [ ] Implement Slack notifications for scraper failures
- [ ] Set up database backups to S3
- [ ] Add email digest of weekly top stories
- [ ] Implement CDN image optimization with Cloudflare Image Resizing
- [ ] Add authentication for admin panel (scraper management)

---

## Security Checklist

- ✅ All secrets stored in GitHub Actions (never committed)
- ✅ Frontend uses anon key (safe to expose publicly)
- ✅ Scraper uses service role key (private, only in GitHub secrets)
- ✅ `.gitignore` covers environment files
- ✅ Supabase Row Level Security (RLS) configured
- ⚠️ Keep API keys rotated quarterly
- ⚠️ Monitor Gemini API usage to prevent bill shock

---

## Quick Links

- 🔗 [GitHub Repository](https://github.com/abalinda/macedonian-vibe-news)
- 🔗 [Cloudflare Pages Dashboard](https://dash.cloudflare.com/)
- 🔗 [Supabase Dashboard](https://app.supabase.com)
- 🔗 [Google AI Studio](https://aistudio.google.com)
- 🔗 [GitHub Actions Logs](https://github.com/abalinda/macedonian-vibe-news/actions)
