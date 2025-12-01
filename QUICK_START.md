# 🚀 Quick Start Checklist

Your project is on GitHub and ready for deployment. Follow this checklist to go live.

**Estimated time: 30 minutes**

---

## ✅ Phase 1: GitHub Actions Secrets (10 minutes)

### Step 1: Gather Your Credentials

Go to [Supabase Dashboard](https://app.supabase.com) → Select project → Settings → API

Copy and save these values:
- [ ] **Project URL** (format: `https://xxxx.supabase.co`)
- [ ] **Service role SECRET** key
- [ ] **anon public** key

Go to [Google AI Studio](https://aistudio.google.com) → API keys

Copy and save:
- [ ] **Gemini API key**

### Step 2: Add Secrets to GitHub

1. Open: [github.com/abalinda/macedonian-vibe-news/settings/secrets/actions](https://github.com/abalinda/macedonian-vibe-news/settings/secrets/actions)
2. Click **New repository secret** for each:

| # | Secret Name | Paste Value From |
|---|---|---|
| 1 | `GEMINI_API_KEY` | Google AI Studio API key |
| 2 | `SUPABASE_URL` | Supabase Project URL |
| 3 | `SUPABASE_KEY` | Supabase Service role key |
| 4 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (same as #2) |
| 5 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

After each secret, click **Add secret**

### Step 3: Verify

All 5 secrets should now appear on the Secrets page. ✅

---

## ✅ Phase 2: Cloudflare Pages Deployment (10-15 minutes)

### Step 1: Create Cloudflare Project

1. Open: [pages.cloudflare.com](https://pages.cloudflare.com/)
2. Click **Create a project** → **Connect to Git**
3. Authorize GitHub
4. Select repository: `macedonian-vibe-news`

### Step 2: Configure Build

Fill in these settings:

- **Project name:** `macedonian-vibe-news` (or your choice)
- **Production branch:** `main`
- **Build command:** `cd web && npm run build`
- **Build output directory:** `web/.next`
- **Root directory:** (leave empty)

Click **Save and Deploy**

Cloudflare will start building. This takes **2-3 minutes**. ⏳

### Step 3: Add Environment Variables

While it builds:

1. Go to **Settings** → **Environment variables**
2. Click **Add variable** for Production:

| Variable | Paste Value From |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

Click **Save and Deploy**

### Step 4: Verify Deployment

1. Watch **Deployments** tab
2. Wait for green ✅ checkmark
3. Click deployment URL: `https://macedonian-vibe-news.pages.dev`
4. Site should be live! 🎉

---

## ✅ Phase 3: Test Everything (5-10 minutes)

### Test 1: Frontend CI/CD

1. Go to GitHub repo
2. Edit any file in `web/` folder
3. Commit and push
4. Go to **Actions** tab
5. Watch `lint-build` workflow
6. Verify it passes ✅

### Test 2: Scraper Automation

1. Go to GitHub Actions → **scraper** workflow
2. Click **Run workflow** dropdown
3. Select `main` branch → **Run workflow**
4. Watch logs execute (takes 2-3 minutes)
5. Check for ✅ success message

### Test 3: Live Site

1. Visit: `https://macedonian-vibe-news.pages.dev`
2. Articles should load (if scraper ran successfully)
3. Test clicking on articles
4. Check browser console (F12) for errors

---

## 📋 Reference Documents

| Document | Purpose |
|----------|---------|
| `IMPLEMENTATION_SUMMARY.md` | Overview of what was set up |
| `DEPLOYMENT.md` | Main deployment reference guide |
| `GITHUB_ACTIONS_SECRETS.md` | Detailed secrets configuration |
| `CLOUDFLARE_PAGES.md` | Cloudflare Pages complete guide |
| `wrangler.toml` | Cloudflare Workers config (future) |

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| Build fails | Check build logs in Cloudflare dashboard |
| No articles showing | Scraper needs to run; manually trigger in Actions |
| Secrets not working | Verify secret names are exact (case-sensitive) |
| Stuck on "Building" | Refresh page; if > 10 min, click "Retry" |
| Environment variables not applied | Hard refresh browser (Cmd+Shift+R) |

---

## 🔒 Security Reminders

- Never commit `.env` files (already in `.gitignore`)
- Treat `SUPABASE_KEY` (service role) as sensitive
- Rotate API keys every 3 months
- Monitor Gemini API usage

---

## ✨ You're Done!

- ✅ Code on GitHub
- ✅ Frontend deployed to Cloudflare Pages
- ✅ Scraper automation ready
- ✅ Site live and monitored

Your project is now **production-ready** and automatically:
- Deploys frontend on every push
- Runs scraper every 4 hours
- Serves from global Cloudflare edge network

---

## 📞 Need Help?

1. Check `IMPLEMENTATION_SUMMARY.md` for detailed explanation
2. Review `DEPLOYMENT.md` for complete walkthrough
3. See `GITHUB_ACTIONS_SECRETS.md` for secrets troubleshooting
4. Read `CLOUDFLARE_PAGES.md` for deployment issues

---

**Last Updated:** December 1, 2025
