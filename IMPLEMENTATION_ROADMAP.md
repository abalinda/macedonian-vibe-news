# 🗺️ Vibes.mk Implementation Roadmap

Quick reference guide for implementing the upgrade plan.

## 📅 12-Week Implementation Timeline

### Weeks 1-2: Backend Migration 🔧
**Goal:** Migrate from Gemini to Groq, reduce API costs

- [ ] Day 1-2: Groq account setup, API key configuration
- [ ] Day 3-5: Update `curator_2.py` with Groq client
- [ ] Day 6-8: A/B testing Groq vs Gemini quality
- [ ] Day 9-10: Production deployment with monitoring
- [ ] Day 11-14: Enhanced AI prompts for politics/neutrality

**Files to modify:**
- `scraper/curator_2.py` - Add Groq integration
- `.github/workflows/scraper.yml` - Add GROQ_API_KEY secret
- `scraper/requirements.txt` - Add `groq` package

---

### Weeks 3-4: Vibes News Category 📰
**Goal:** Launch new original content category

- [ ] Day 1-3: Backend setup (category, feeds, slots)
- [ ] Day 4-7: Frontend navigation & pages
- [ ] Day 8-10: Enhanced blog composer (rich text)
- [ ] Day 11-12: Testing & content seeding
- [ ] Day 13-14: Soft launch with 5-10 initial posts

**Files to modify:**
- `scraper/scraper_2.py` - Add VibesNews feeds & slot
- `web/app/_components/navigation.tsx` - Add nav item
- `web/app/page.tsx` - Add category mapping
- `web/app/vibes-news/page.tsx` - Create new page
- `web/app/blog/new/composer.tsx` - Enhance editor

---

### Weeks 5-6: Homepage Redesign 🎨
**Goal:** Multi-section homepage inspired by Ground.news

- [ ] Day 1-3: Design mockups & component planning
- [ ] Day 4-7: Trending section (API + UI)
- [ ] Day 8-10: Category grid layout
- [ ] Day 11-12: Editor's picks section
- [ ] Day 13-14: Performance optimization & mobile

**Files to modify:**
- `web/app/page.tsx` - Redesign homepage layout
- `web/app/api/trending/route.ts` - NEW: Trending API
- `web/app/_components/category-grid.tsx` - NEW: Grid component
- `web/app/globals.css` - Update styles

---

### Weeks 7-8: Politics Coverage 🗳️
**Goal:** Balanced political news with neutrality

- [ ] Day 1-3: Research & select diverse sources
- [ ] Day 4-7: Update scraper with political feeds
- [ ] Day 8-10: AI neutrality scoring system
- [ ] Day 11-12: Frontend politics badge & UI
- [ ] Day 13-14: Testing & content moderation setup

**Files to modify:**
- `scraper/scraper_2.py` - Add political RSS feeds
- `scraper/curator_2.py` - Update prompt for neutrality
- `web/app/page.tsx` - Politics category display
- Database schema - Add `neutrality_score` column

---

### Weeks 9-10: CI/CD Setup 🔄
**Goal:** Automated testing & deployment

- [ ] Day 1-3: CI workflow for frontend (lint, build, type-check)
- [ ] Day 4-6: CI workflow for backend (lint, tests)
- [ ] Day 7-9: Staging environment on Cloudflare
- [ ] Day 10-12: Error monitoring (Sentry integration)
- [ ] Day 13-14: Documentation & team training

**Files to create:**
- `.github/workflows/ci.yml` - NEW: CI pipeline
- `.github/workflows/deploy-staging.yml` - NEW: Staging deploy
- `web/instrumentation.ts` - Update with Sentry
- `CONTRIBUTING.md` - NEW: Development guide

---

### Weeks 11-12: UX Enhancements ✨
**Goal:** Better reading & personalization

- [ ] Day 1-3: Reading time estimates
- [ ] Day 4-6: Dark mode toggle
- [ ] Day 7-9: Save for later functionality
- [ ] Day 10-12: User preferences UI
- [ ] Day 13-14: Polish & bug fixes

**Files to modify:**
- `web/app/globals.css` - Dark mode styles
- Database schema - Add `saved_posts` table
- `web/app/_components/save-button.tsx` - NEW
- `web/app/settings/page.tsx` - NEW: User preferences

---

## 🎯 Quick Start Commands

### Development Setup
```bash
# Clone and setup
git clone https://github.com/abalinda/macedonian-vibe-news.git
cd macedonian-vibe-news

# Frontend setup
cd web
npm install
cp .env.example .env.local  # Add your keys
npm run dev  # Runs on localhost:3000

# Backend setup
cd scraper
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Add your keys
python scraper_local.py  # Test run
```

### Feature Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/groq-migration

# 2. Make changes
# ... edit files ...

# 3. Test locally
cd web && npm run lint && npm run build
cd scraper && pylint *.py

# 4. Commit & push
git add .
git commit -m "feat: integrate Groq API"
git push -u origin feature/groq-migration

# 5. Create PR on GitHub
# 6. Review, test, merge
```

### Deployment
```bash
# Frontend (Cloudflare Pages auto-deploys on push to main)
git checkout main
git merge develop
git push origin main

# Backend (GitHub Actions runs automatically every 3h)
# Manual trigger: Go to Actions tab → Vibes Scraper → Run workflow
```

---

## 📋 Acceptance Criteria per Phase

### Phase 1: Groq Migration ✅
- [ ] Scraper successfully runs with Groq API
- [ ] API costs reduced by >30%
- [ ] Content quality maintained (manual review of 50 posts)
- [ ] Fallback to Gemini working if Groq fails
- [ ] No increase in scraper failures

### Phase 2: Vibes News ✅
- [ ] New "Vibes Vesti" category in navigation
- [ ] At least 5 RSS sources configured
- [ ] Rich text editor supports bold, italic, images
- [ ] Category appears on homepage grid
- [ ] Featured slot rotates Vibes News content

### Phase 3: Homepage Redesign ✅
- [ ] Trending section shows top 3 posts from last 24h
- [ ] Category grid displays 2 posts per category
- [ ] Mobile responsive (tested on iPhone & Android)
- [ ] Page load time <2 seconds
- [ ] Lighthouse score >90

### Phase 4: Politics Coverage ✅
- [ ] At least 3 diverse political sources added
- [ ] AI neutrality scoring functional (0-10 scale)
- [ ] Only articles with score ≥6 published
- [ ] Politics badge displayed on UI
- [ ] Admin review dashboard for flagged content

### Phase 5: CI/CD ✅
- [ ] CI runs on every PR
- [ ] Build fails block merging
- [ ] Staging environment accessible
- [ ] Error tracking captures exceptions
- [ ] Deployment takes <10 minutes

### Phase 6: UX Enhancements ✅
- [ ] Reading time shown on all articles
- [ ] Dark mode toggle works system-wide
- [ ] Saved posts persist in database
- [ ] User can set category preferences
- [ ] Settings sync across devices

---

## 🔧 Configuration Files Needed

### Environment Variables

**Frontend (`.env.local`):**
```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Database
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Optional: Monitoring
SENTRY_DSN=https://...
```

**Backend (`scraper/.env`):**
```env
# Database
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# AI APIs
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...  # Fallback
```

**GitHub Secrets:**
```
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
GROQ_API_KEY
GEMINI_API_KEY
CLOUDFLARE_API_TOKEN  # For manual deploys
SENTRY_AUTH_TOKEN     # For error tracking
```

---

## 📊 Testing Checklist

### Before Each Deployment
- [ ] Run linters: `npm run lint` (frontend), `pylint *.py` (backend)
- [ ] Type check: `npx tsc --noEmit` (frontend)
- [ ] Build succeeds: `npm run build` (frontend)
- [ ] Manual smoke test on staging
- [ ] Check error monitoring for recent issues
- [ ] Review Cloudflare analytics for anomalies

### After Deployment
- [ ] Homepage loads correctly
- [ ] All category pages accessible
- [ ] Search works
- [ ] New posts appear within 3 hours
- [ ] No console errors
- [ ] Mobile rendering correct

---

## 🚨 Rollback Procedures

### Frontend Rollback (Cloudflare Pages)
1. Go to Cloudflare Pages dashboard
2. Navigate to Deployments
3. Find previous working deployment
4. Click "Rollback to this deployment"
5. Confirm rollback
6. Verify site works

### Backend Rollback (Scraper)
1. Find previous working commit: `git log --oneline`
2. Revert to it: `git revert <commit-hash>`
3. Push: `git push origin main`
4. Manually trigger scraper workflow
5. Monitor logs for success

### Database Rollback
```sql
-- If you added a column you need to remove
ALTER TABLE posts DROP COLUMN new_column;

-- If you need to restore data, use Turso dashboard's backup feature
-- OR: Restore from daily backup snapshot
```

---

## 📞 Support & Resources

### Team Communication
- **Daily standups:** Review progress, blockers
- **Weekly demos:** Show completed features
- **Retrospectives:** What went well, what to improve

### Key Contacts
- **Tech Lead:** [Your contact]
- **Design:** [Designer contact]
- **Content:** [Editor contact]

### External Resources
- Cloudflare Dashboard: https://dash.cloudflare.com
- Turso Console: https://turso.tech/app
- Clerk Dashboard: https://dashboard.clerk.com
- GitHub Actions: https://github.com/abalinda/macedonian-vibe-news/actions

---

## 🎉 Launch Checklist

### Pre-Launch (Day Before)
- [ ] All features tested on staging
- [ ] Content team briefed on new features
- [ ] Social media posts prepared
- [ ] Monitoring alerts configured
- [ ] Team on standby for launch

### Launch Day
- [ ] Merge to main in off-peak hours (2-4 AM CET)
- [ ] Monitor Cloudflare analytics for traffic spikes
- [ ] Check error rates in Sentry
- [ ] Test critical user journeys
- [ ] Announce on social media

### Post-Launch (First Week)
- [ ] Daily metrics review
- [ ] User feedback collection
- [ ] Bug triage & fixes
- [ ] Performance optimization
- [ ] Celebrate success! 🎊

---

**Ready to build?** Start with Phase 1 (Groq Migration) and work your way through!

Questions? Open an issue on GitHub or contact the team.
