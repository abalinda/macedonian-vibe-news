# Deployment Guide: Vibe News

A guide to deploying the macedonian-vibe-news project with autonomous scraping and frontend hosting.

## Prerequisites

- GitHub account with SSH key configured
- Supabase project (already set up)
- Gemini API key from [Google AI Studio](https://aistudio.google.com)
- Cloudflare account (or Vercel/Render for alternatives)

## Environment Variables

### Frontend (web/.env.local)
Never commit these. Set in deployment platform:
```
NEXT_PUBLIC_SUPABASE_URL=https://knvkyfafnnqbmgqeogpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_secret_...
```

### Scraper (scraper/.env)
Never commit these. Set in CI/cron environment:
```
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
```

## Step 1: Push to GitHub

```bash
# Create a new repository on GitHub.com (macedonian-vibe-news)

cd /Users/abalinda/Documents/programming/macedonian-vibe-news
git remote add origin git@github.com:<YOUR_USERNAME>/macedonian-vibe-news.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Frontend to Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Click "Create project" → "Connect to Git" → Select your GitHub repo
3. Configure:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `web`
4. Set environment variables under **Settings → Environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

**Alternative**: Use **Vercel** for native Next.js support and simpler setup.

## Step 3: Schedule the Scraper

Choose one option:

### Option A: GitHub Actions (Free, Recommended)

1. The workflow file `.github/workflows/scraper.yml` is already configured
2. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
3. Add secrets:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
4. Runs automatically every 4 hours; adjust cron in workflow file if needed

### Option B: Render Cron Jobs

1. Go to [Render](https://render.com)
2. Create a new **Cron Job**
3. Connect your GitHub repo, select `main` branch
4. **Build command**: `pip install -r scraper/requirements.txt`
5. **Run command**: `cd scraper && python3 scraper.py`
6. **Schedule**: `0 */4 * * *` (every 4 hours)
7. Add environment variables (same as above)

### Option C: Fly.io

1. Install `flyctl`: `brew install flyctl`
2. Run `fly launch` in project root
3. Configure `fly.toml` with scraper command and Python buildpack
4. Use `fly machine run` with cron scheduling

## Step 4: Monitor Logs

- **GitHub Actions**: View workflow runs at **Actions** tab
- **Render**: Check **Job Logs** dashboard
- **Cloudflare Pages**: View build logs in deployment history

## Local Development

```bash
# Frontend
cd web && npm install && npm run dev
# Open http://localhost:3000

# Scraper (one-time)
cd scraper && python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Create .env with secrets
python3 scraper.py
```

## Troubleshooting

- **Frontend shows "No stories"**: Check Supabase connection and database has posts
- **Scraper fails to run**: Verify API keys are correct and Gemini quota is not exceeded
- **Images not loading**: Ensure `image_url` in Supabase `posts` table is populated
- **Logs**: Check `scraper/logs/scraper_log.jsonl` for detailed event logs

## Future Enhancements

- Add Sentry for error tracking
- Set up Slack notifications for scraper failures
- Migrate to Supabase Edge Functions for native scheduling
- Add email digest of weekly top stories
