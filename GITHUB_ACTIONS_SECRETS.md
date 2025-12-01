# GitHub Actions Secrets Setup Guide

This guide provides step-by-step instructions for configuring GitHub Actions secrets required for CI/CD automation.

## Why Secrets?

Secrets keep sensitive credentials (API keys, database URLs) out of your source code while allowing workflows to access them securely.

## Required Secrets for This Project

Your project has two CI/CD workflows:
1. **Frontend Linting & Build** - runs on every push to `web/` folder
2. **Scraper Automation** - runs every 4 hours automatically

### Complete Secret List

| Workflow | Secret Name | Required | Value Source | Type |
|----------|------------|----------|--------------|------|
| Scraper | `GEMINI_API_KEY` | ✅ Yes | Google AI Studio | API Key |
| Scraper | `SUPABASE_URL` | ✅ Yes | Supabase Dashboard | URL |
| Scraper | `SUPABASE_KEY` | ✅ Yes | Supabase Dashboard | API Key |
| Frontend CI | `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase Dashboard | URL |
| Frontend CI | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase Dashboard | API Key |

---

## Step-by-Step Setup

### 1. Go to Repository Settings

1. Navigate to: [github.com/abalinda/macedonian-vibe-news/settings](https://github.com/abalinda/macedonian-vibe-news/settings)
2. In the left sidebar, click **Secrets and variables** → **Actions**
3. You'll see existing secrets (if any) and option to create new ones

### 2. Gather All Secret Values

Before adding to GitHub, collect all required values:

#### From Supabase Dashboard

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API** (left sidebar)
4. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **Service role (SECRET)** key → `SUPABASE_KEY`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Important:** 
- Service role key is **SECRET** - never share or commit
- Anon key is **PUBLIC** - safe to expose (that's why it's `NEXT_PUBLIC_*`)

#### From Google AI Studio

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **API keys** in left menu
3. Click **"Create API key"**
4. Copy the generated key → `GEMINI_API_KEY`

**Note:** Keep this key private; Gemini charges based on usage

### 3. Add Secrets to GitHub

#### Add GEMINI_API_KEY

1. In **Secrets and variables → Actions**, click **New repository secret**
2. **Name:** `GEMINI_API_KEY`
3. **Secret:** Paste your Gemini API key
4. Click **Add secret**

#### Add SUPABASE_URL

1. Click **New repository secret**
2. **Name:** `SUPABASE_URL`
3. **Secret:** Paste your Supabase project URL (e.g., `https://xxxx.supabase.co`)
4. Click **Add secret**

#### Add SUPABASE_KEY

1. Click **New repository secret**
2. **Name:** `SUPABASE_KEY`
3. **Secret:** Paste your Supabase service role key
4. Click **Add secret**

#### Add NEXT_PUBLIC_SUPABASE_URL

1. Click **New repository secret**
2. **Name:** `NEXT_PUBLIC_SUPABASE_URL`
3. **Secret:** Paste your Supabase project URL (same as SUPABASE_URL)
4. Click **Add secret**

#### Add NEXT_PUBLIC_SUPABASE_ANON_KEY

1. Click **New repository secret**
2. **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Secret:** Paste your Supabase anon public key
4. Click **Add secret**

### 4. Verify Secrets Are Configured

After adding all secrets:

1. You should see all 5 secrets listed on the **Actions secrets** page
2. GitHub will show their update timestamps but never displays actual values (✅ secure)
3. Each secret shows: Name | Last updated

---

## How Secrets Are Used in Workflows

### Frontend Workflow (`.github/workflows/lint-build.yml`)

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

The workflow references secrets using `${{ secrets.SECRET_NAME }}` syntax. GitHub automatically injects values at runtime.

### Scraper Workflow (`.github/workflows/scraper.yml`)

```yaml
env:
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

Python script reads these from `os.environ`.

---

## Testing Secrets Are Working

### Trigger Frontend CI

1. Go to [github.com/abalinda/macedonian-vibe-news](https://github.com/abalinda/macedonian-vibe-news)
2. Make a small change to a file in `web/` folder (e.g., edit `README.md`)
3. Commit and push
4. Go to **Actions** tab
5. Watch **lint-build** workflow run
6. ✅ **Green checkmark** = secrets working correctly
7. ❌ **Red X** = check error logs (likely secret issue)

### Trigger Scraper

1. Go to **Actions** tab
2. Click **scraper** workflow
3. Click **"Run workflow"** dropdown → select `main` branch
4. Click **"Run workflow"**
5. Workflow starts immediately
6. ✅ Check logs for successful execution
7. ❌ If fails, verify secrets in error messages

---

## Secret Management Best Practices

### Security

- ✅ **Never** commit API keys or credentials to git
- ✅ Use `.gitignore` to prevent `.env` files (already configured)
- ✅ Treat `SUPABASE_KEY` (service role) as highly sensitive
- ✅ Rotate API keys quarterly
- ✅ Monitor API usage for unusual activity

### Maintenance

- 📝 Document which services each secret belongs to
- 🔄 Set calendar reminder to rotate keys every 3 months
- 🚨 If secret is accidentally exposed, regenerate immediately in source service
- 🧹 Clean up unused secrets to reduce clutter

### Multiple Environments

For future scaling (staging, production environments):

1. GitHub allows **Environment secrets** separate from **Repository secrets**
2. Use **Environments** in Settings to manage different secrets per deployment stage
3. Example: production uses different Supabase URL than staging

---

## Troubleshooting

### Secret Not Found Error

**Problem:** Workflow fails with `secret not found` error

**Solution:**
- Verify secret name exactly matches in workflow file (case-sensitive)
- Check secret is in correct scope (repository vs environment)
- Re-add secret if unsure

### Workflow Still Uses Old Key

**Problem:** Changed secret value but workflow still uses old key

**Solution:**
- GitHub doesn't refresh running jobs
- Re-run workflow from Actions tab
- Click **"Re-run all jobs"** to use updated secret

### Can't Find Secrets Page

**Problem:** Can't locate Secrets and variables section

**Solution:**
1. Go to repository main page
2. Click **Settings** tab (next to Code, Issues, Pull requests)
3. In left sidebar, expand **Secrets and variables** → click **Actions**

### Secret Works Locally but Fails in GitHub

**Problem:** Script runs fine with local `.env` but fails in workflow

**Solution:**
- Local: reads from `.env` file using `python-dotenv`
- GitHub: needs `env:` section in workflow YAML
- Verify workflow file correctly exports secrets to environment
- Check secret formatting (no extra spaces or quotes)

---

## Advanced: Rotating Secrets

When it's time to rotate keys (quarterly recommended):

### Rotate Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com) → API keys
2. Create new key
3. Copy new key
4. Go to GitHub → Settings → Secrets → Click **GEMINI_API_KEY**
5. Click **Update secret**
6. Paste new key
7. In Google AI Studio, delete old key
8. In GitHub, verify workflow still runs successfully

### Rotate Supabase Keys

1. Go to [Supabase Dashboard](https://app.supabase.com) → Settings → API
2. Click **Generate new key** next to service role key
3. Copy new key
4. Go to GitHub → Update `SUPABASE_KEY` secret with new value
5. In Supabase, disable old key
6. Monitor workflow logs to confirm success

---

## Security Audit

Run this checklist monthly:

- [ ] All 5 required secrets are configured
- [ ] Latest workflow runs show ✅ green status
- [ ] Scraper successfully runs every 4 hours
- [ ] Frontend builds without errors
- [ ] No credentials committed to git (check `git log --all --full-history --patch` for `.env`)
- [ ] Supabase RLS policies configured correctly
- [ ] No secrets exposed in GitHub Actions logs

---

## Questions?

For workflow troubleshooting:
1. Check workflow file: `.github/workflows/lint-build.yml` or `.github/workflows/scraper.yml`
2. View live logs: GitHub Actions tab → click failed workflow
3. Read error message carefully (usually indicates missing secret or wrong value)
4. Verify secret value hasn't expired (e.g., Gemini API key)
