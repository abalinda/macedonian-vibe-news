# 🎓 CI/CD Learning Guide for Vibes.mk

A practical guide to Continuous Integration and Continuous Deployment, tailored for your news platform.

## 📚 Table of Contents
1. [What is CI/CD?](#what-is-cicd)
2. [Why You Need It](#why-you-need-it)
3. [CI/CD for Vibes.mk](#cicd-for-vibesmk)
4. [Hands-On Tutorial](#hands-on-tutorial)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## 🤔 What is CI/CD?

### The Traditional Way (Before CI/CD)
```
Developer 1: "I added a feature!" 
→ Pushes code to GitHub
→ Weeks pass...
→ Developer 2: "I'll deploy everything together"
→ Manually copies files to server
→ Site breaks 💥
→ 4 hours debugging
→ Finally fixes it
→ Users were seeing errors this whole time 😫
```

### The CI/CD Way
```
Developer 1: "I added a feature!"
→ Pushes code to GitHub
→ 🤖 GitHub Actions automatically:
   ✓ Checks for syntax errors
   ✓ Runs tests
   ✓ Builds the app
   ✓ Deploys to staging
→ Developer reviews on staging
→ Merges to main
→ 🤖 Automatically deploys to production
→ 🎉 Done in 5 minutes, no manual work!
```

---

## 🔍 Breaking Down CI/CD

### Continuous Integration (CI)
**What:** Automatically test and validate code changes
**When:** Every time someone pushes code or opens a Pull Request
**Why:** Catch bugs early, before they reach users

**Example for Vibes.mk:**
```yaml
# When someone opens a PR to add a feature...
1. 🤖 Check TypeScript for errors
2. 🤖 Run ESLint (catches common bugs)
3. 🤖 Ensure code builds successfully
4. 🤖 Run automated tests (if you have them)
5. ✅ If all pass → Allow merge
6. ❌ If any fail → Block merge, ask developer to fix
```

### Continuous Deployment (CD)
**What:** Automatically deploy code to servers
**When:** After code passes all CI checks and merges
**Why:** Fast, reliable deployments without manual work

**Example for Vibes.mk:**
```yaml
# When PR merges to main...
1. 🤖 Build the Next.js app
2. 🤖 Upload to Cloudflare Workers
3. 🤖 Test that site loads
4. ✅ New features are live!
```

---

## ❓ Why You Need It

### Problems CI/CD Solves

**Problem 1: "It works on my machine!"**
```
Developer: "The feature works fine for me!"
Production: *breaks* 💥

With CI/CD:
→ Tests run in same environment as production
→ If it passes CI, it works in production
```

**Problem 2: Manual deployment is error-prone**
```
Manual deployment checklist:
- [ ] Build the app
- [ ] Upload files
- [ ] Update environment variables
- [ ] Restart services
- [ ] Clear cache
- [ ] Pray nothing broke 🙏

Oops, forgot to clear cache → Users see old version for hours

With CI/CD:
→ Automated checklist runs every time
→ Never forget a step
```

**Problem 3: Slow feedback on bugs**
```
Without CI:
Bug introduced Monday → Discovered Friday → 5 days of bad code in production

With CI:
Bug introduced Monday 9 AM → CI fails Monday 9:05 AM → Fixed by 10 AM
```

---

## 🏗️ CI/CD for Vibes.mk

### Current State
✅ **You already have some automation!**
- Cloudflare Pages auto-deploys frontend on push to main
- GitHub Actions runs scraper every 3 hours

❌ **What's missing:**
- No automated tests
- No code quality checks (linting)
- No staging environment
- No deployment safety nets

### Target State
```
┌─────────────────────────────────────────────────────────┐
│  Developer pushes code to feature branch                │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  CI PIPELINE (GitHub Actions)                           │
│  1. Lint code (ESLint, Pylint)                          │
│  2. Type check (TypeScript)                             │
│  3. Run tests (Jest, Pytest)                            │
│  4. Build app (Next.js)                                 │
│  5. Security scan (npm audit, Dependabot)               │
└────────────────┬────────────────────────────────────────┘
                 ↓
         ✅ All checks pass?
                 ↓
┌─────────────────────────────────────────────────────────┐
│  Create Pull Request                                    │
│  → Team reviews code                                    │
│  → Merge to main                                        │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  CD PIPELINE                                            │
│  1. Build for production                                │
│  2. Deploy to Cloudflare Pages                          │
│  3. Smoke test (is site up?)                            │
│  4. Notify team on Slack/Discord                        │
└────────────────┬────────────────────────────────────────┘
                 ↓
         ✅ Deployment successful!
         🎉 New features live on vibes.mk
```

---

## 🛠️ Hands-On Tutorial

### Tutorial 1: Setting Up Your First CI Pipeline

**Goal:** Automatically lint and build on every PR

**Step 1: Create workflow file**
```bash
# In your project root
mkdir -p .github/workflows
```

**Step 2: Create `.github/workflows/ci.yml`**
```yaml
name: CI Pipeline

# Run on Pull Requests and pushes to main
on:
  pull_request:
  push:
    branches: [main]

jobs:
  frontend-ci:
    name: Frontend Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./web
    
    steps:
      # 1. Get the code
      - name: Checkout code
        uses: actions/checkout@v4
      
      # 2. Set up Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      # 3. Install dependencies
      - name: Install dependencies
        run: npm ci
      
      # 4. Lint the code
      - name: Lint
        run: npm run lint
      
      # 5. Check types
      - name: TypeScript check
        run: npx tsc --noEmit
      
      # 6. Build the app
      - name: Build
        run: npm run build
```

**Step 3: Commit and push**
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add frontend CI pipeline"
git push
```

**Step 4: Watch it run!**
1. Go to GitHub → Your repo → "Actions" tab
2. You'll see your workflow running
3. Click on it to see detailed logs

**What happens now:**
- Every PR will run these checks
- If checks fail, GitHub shows a ❌ next to the PR
- If checks pass, GitHub shows a ✅
- You can configure branch protection to require passing checks before merge

---

### Tutorial 2: Adding a Staging Environment

**Goal:** Test changes before they go live

**Step 1: Create `develop` branch**
```bash
git checkout -b develop
git push -u origin develop
```

**Step 2: Set up Cloudflare Pages for staging**
1. Go to Cloudflare Dashboard → Pages
2. Create new project: "vibes-staging"
3. Connect to your GitHub repo
4. Set branch: `develop`
5. Build command: `npm run build`
6. Output directory: `.vercel/output/static`
7. Environment variable: `NEXT_PUBLIC_ENVIRONMENT=staging`

**Step 3: Update workflow for staging deployment**
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... build steps ...
      - name: Deploy
        run: echo "Cloudflare auto-deploys from develop branch"
      
      - name: Notify team
        run: |
          echo "✅ Staging deployed: https://vibes-staging.pages.dev"
```

**Your new workflow:**
```
Feature branch → PR → Merge to develop → Auto-deploy to staging
→ Test on staging → PR to main → Auto-deploy to production
```

---

### Tutorial 3: Monitoring Deployments

**Goal:** Know immediately if something breaks

**Option 1: Simple health check**
```yaml
# Add to deployment workflow
- name: Health check
  run: |
    sleep 10  # Wait for deployment to propagate
    curl --fail https://vibes.mk || exit 1
```

**Option 2: Sentry integration**
```bash
cd web
npm install @sentry/nextjs
```

```typescript
// web/instrumentation.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

Now errors will be automatically reported to Sentry dashboard!

---

## 📖 Real-World Examples

### Example 1: Catching a Bug Before Production

**Scenario:** Developer adds a feature but forgets to handle null values

```typescript
// Bug: This will crash if user is null
function getUserName(user) {
  return user.name.toUpperCase();
}
```

**Without CI:**
```
Developer pushes → Merges to main → Deploys → 
Site crashes for logged-out users → 😫 Emergency fix
```

**With CI:**
```
Developer pushes → CI runs TypeScript check → 
Error: "Object is possibly 'null'" → 
PR blocked → Developer fixes before merge → 
Never reaches production ✅
```

---

### Example 2: Safe Scraper Updates

**Scenario:** You update the scraper to use Groq instead of Gemini

**Without CI:**
```
Update scraper → Push to main → Wait 3 hours for next run →
Scraper fails → No new articles → Users notice →
Rollback manually
```

**With CI:**
```
Update scraper → CI runs scraper in test mode →
Tests with Groq API → Verifies output quality →
✅ Passes → Merges → Deploys safely
```

**Add to scraper workflow:**
```yaml
# .github/workflows/scraper-ci.yml
name: Scraper CI

on:
  pull_request:
    paths:
      - 'scraper/**'

jobs:
  test-scraper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd scraper
          pip install -r requirements.txt
          pip install pytest
      
      - name: Lint
        run: cd scraper && pylint *.py
      
      - name: Test run (dry mode)
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: |
          cd scraper
          python scraper_2.py --dry-run  # Process 5 items, don't write to DB
```

---

## ✅ Best Practices

### 1. Keep CI Fast
```
❌ BAD: CI takes 30 minutes
   → Developers ignore it
   → Defeats the purpose

✅ GOOD: CI takes <5 minutes
   → Fast feedback
   → Developers actually use it
```

**How to keep it fast:**
- Cache dependencies (`cache: 'npm'` in workflow)
- Run tests in parallel
- Only run affected tests
- Use lightweight runners

### 2. Fail Fast
```
# Run linting before expensive builds
steps:
  - name: Lint (fast, catches most issues)
    run: npm run lint
  
  - name: Build (slow, only if lint passes)
    run: npm run build
```

### 3. Meaningful Commit Messages
```
❌ BAD: "fix stuff"
✅ GOOD: "fix: handle null user in navigation component"

❌ BAD: "updates"
✅ GOOD: "feat: add Groq API integration with fallback to Gemini"

Format: <type>: <description>
Types: feat, fix, docs, style, refactor, test, chore
```

### 4. Use Branch Protection
```
GitHub repo → Settings → Branches → Add rule

✅ Require pull request reviews
✅ Require status checks to pass (CI must pass)
✅ Require branches to be up to date
✅ Include administrators (even you must follow rules!)
```

### 5. Monitor Your CI
```
Weekly review:
- How many PRs are we merging?
- How often does CI fail?
- What are common failure reasons?
- Is CI catching real bugs?

Adjust as needed!
```

---

## 🐛 Troubleshooting

### Problem: CI is always failing

**Cause:** Outdated dependencies
```bash
# Solution: Update lock files
npm install  # Regenerates package-lock.json
git add package-lock.json
git commit -m "chore: update dependencies"
```

**Cause:** Environment variables missing
```yaml
# Solution: Add secrets to GitHub
# Go to: Repo → Settings → Secrets → New repository secret
env:
  TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
```

---

### Problem: Deployment succeeded but site is broken

**Cause:** Environment variables differ between local and production
```bash
# Solution: Use .env.example to document all required variables
# Copy it:
cp .env.local .env.example

# Remove actual values, leave placeholders:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_your_key_here
TURSO_DATABASE_URL=libsql://your_db_url
```

**Cause:** Build worked locally but fails in CI
```bash
# Solution: Test the exact same way CI does
npm ci  # Use ci instead of install (strict about lock file)
npm run build
```

---

### Problem: Scraper fails in production

**Debug steps:**
```bash
# 1. Check GitHub Actions logs
# Go to: Repo → Actions → Latest scraper run → View logs

# 2. Look for errors in structured logs
# Download scraper/logs/scraper_log.jsonl

# 3. Test locally with production config
cd scraper
python scraper_2.py

# 4. Check API rate limits
# Groq: https://console.groq.com/usage
# Turso: https://turso.tech/app
```

---

## 🎓 Learning Resources

### Video Tutorials
- [GitHub Actions Tutorial](https://www.youtube.com/watch?v=R8_veQiYBjI) - 20 min intro
- [CI/CD Explained](https://www.youtube.com/watch?v=scEDHsr3APg) - Concepts
- [DevOps Roadmap](https://roadmap.sh/devops) - Full learning path

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)

### Practice
1. Fork a simple repo
2. Add a GitHub Action to run tests
3. Try to break the build intentionally
4. Fix it and see CI pass

---

## 🎯 Your Next Steps

**Week 1: Learn**
- [ ] Read this guide
- [ ] Watch 1-2 videos on CI/CD
- [ ] Review existing GitHub Actions workflows

**Week 2: Implement Basic CI**
- [ ] Create `.github/workflows/ci.yml`
- [ ] Add linting for frontend
- [ ] Add linting for backend
- [ ] Test by opening a PR

**Week 3: Add Staging**
- [ ] Create `develop` branch
- [ ] Set up Cloudflare Pages for staging
- [ ] Deploy a test change to staging

**Week 4: Monitoring**
- [ ] Add Sentry for error tracking
- [ ] Set up health checks
- [ ] Create deployment notifications

**Month 2+: Advanced**
- [ ] Add automated tests
- [ ] Set up performance monitoring
- [ ] Implement feature flags
- [ ] Add A/B testing

---

## 🙋 FAQ

**Q: Isn't CI/CD overkill for a small project?**
A: No! Even solo developers benefit from automated checks. You'll spend less time debugging and more time building features.

**Q: What if I break production?**
A: That's why you have staging! Test there first. Plus, Cloudflare Pages keeps old deployments so you can rollback instantly.

**Q: How much does CI/CD cost?**
A: GitHub Actions is free for public repos (2,000 minutes/month for private). Cloudflare Pages is free for most use cases.

**Q: Do I need to be a DevOps expert?**
A: No! Start simple (linting + building), then gradually add more. You learn as you go.

---

**Ready to level up your development workflow?** 

Start with Tutorial 1 and you'll have your first CI pipeline running in 30 minutes! 🚀

---

Made with ❤️ for Vibes.mk
*Last Updated: January 2025*
