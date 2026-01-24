# 🚀 Vibes.mk Comprehensive Upgrade Plan & Software Lifecycle Guide

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Upgrade Roadmap](#upgrade-roadmap)
4. [CI/CD Implementation Guide](#cicd-implementation-guide)
5. [Software Development Lifecycle (SDLC)](#software-development-lifecycle)
6. [Implementation Priorities](#implementation-priorities)
7. [Risk Assessment](#risk-assessment)

---

## 📊 Executive Summary

This document outlines a comprehensive upgrade plan for Vibes.mk, Macedonia's AI-curated news aggregator. The plan addresses immediate technical needs (Groq API migration), strategic enhancements (homepage redesign, politics coverage), and foundational improvements (CI/CD pipeline, testing infrastructure).

**Timeline:** 8-12 weeks for core features, ongoing for enhancements
**Risk Level:** Medium (requires careful migration of AI services)
**Expected Impact:** High (improved UX, better content, reduced API costs)

---

## 🔍 Current State Analysis

### Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                             │
│  Next.js 16 + React 19 (Cloudflare Workers/Pages)      │
│  - App Router with ISR (60s revalidation)              │
│  - Clerk Authentication (Edge middleware)               │
│  - Categories: Tech, Culture, Lifestyle, Business,      │
│    Sports, Blog                                         │
│  - PWA support with service worker                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────────┐
│                     DATABASE                             │
│  Turso (libSQL) - Edge-optimized SQLite                 │
│  Tables:                                                │
│  - posts: news articles, metadata, clicks               │
│  - featured_slots: hero rotation (8h locks)             │
└────────────────▲────────────────────────────────────────┘
                 │
                 │ Batch Insert (every 3h)
                 │
┌─────────────────────────────────────────────────────────┐
│                     BACKEND                              │
│  Python 3.11 Scraper (GitHub Actions Cron)             │
│  - 70+ RSS feeds (cloudscraper + feedparser)            │
│  - Gemini/Gemma AI curation (hitting rate limits!)      │
│  - Hero scoring & feature slot rotation                 │
│  - Structured logging to JSONL                          │
└─────────────────────────────────────────────────────────┘
```

### Strengths
✅ Modern tech stack (Next.js 16, React 19, Cloudflare edge)
✅ AI-powered curation with quality filtering
✅ Clean, fast UI with good UX principles
✅ Edge-deployed for low latency across Europe
✅ PWA support for offline access
✅ Admin dashboard for content control

### Pain Points
❌ **Gemini API hitting rate limits** → Need Groq migration
❌ Limited category diversity → Need politics + Vibes News
❌ Simple homepage layout → Need multi-section redesign
❌ No automated testing → Need CI/CD
❌ No staging environment → Risky deployments
❌ Basic blog editor → Need rich content features

---

## 🗺️ Upgrade Roadmap

### Phase 1: Backend Infrastructure & AI Migration ⚡ (Weeks 1-2)

#### 1.1 Groq API Integration
**Why:** Gemini is hitting rate limits, Groq offers faster inference and better rate limits
**How:** 
1. Create Groq account, obtain API key
2. Update `curator_2.py`:
   ```python
   # Add Groq client
   from groq import Groq
   
   # Model priority becomes:
   MODEL_PRIORITY = [
       "mixtral-8x7b-32768",      # Groq - Fast & cheap
       "llama-3.3-70b-versatile", # Groq - High quality
       "gemini-2.5-flash-lite",   # Gemini fallback
   ]
   ```
3. Implement provider abstraction for multi-provider support
4. Update GitHub Actions secrets to include `GROQ_API_KEY`
5. Test with small batch, monitor latency and quality

**Expected Benefits:**
- 🎯 Reduced API costs (Groq is cheaper)
- ⚡ Faster inference (50-100ms vs 200-500ms)
- 📊 Higher rate limits (avoid scraper failures)
- 🔄 Better fallback strategy

**Deliverables:**
- [ ] Updated `curator_2.py` with Groq integration
- [ ] Environment variable documentation
- [ ] Performance comparison report
- [ ] Rollback plan if quality degrades

---

#### 1.2 Enhanced AI Curation Logic
**Why:** Politics coverage needs balanced, neutral AI analysis
**How:**
1. Update AI prompt to detect political content:
   ```python
   SYSTEM_PROMPT = """
   You are a neutral news curator for Vibes.mk, a Macedonian news platform.
   
   Guidelines:
   1. Detect political content (government, elections, parties, policy)
   2. Assess neutrality: favor balanced, multi-perspective articles
   3. Score "good vibes" factor (0-10): avoid excessive negativity
   4. For politics: flag if one-sided or inflammatory
   
   Return JSON: {
     "category": "Tech|Culture|Lifestyle|Business|Sports|Politics|VibesNews",
     "is_hero": true/false,
     "hero_score": 0-100,
     "neutrality_score": 0-10,  // NEW
     "vibes_score": 0-10,        // NEW
     "summary": "..."
   }
   """
   ```

2. Add politics detection logic to scraper
3. Implement source diversity tracking
4. Create neutrality scoring mechanism

**Expected Benefits:**
- 🎯 Better political content curation
- ⚖️ Balanced coverage across viewpoints
- 😊 Maintain "good vibes" philosophy
- 📈 Improved content quality metrics

---

### Phase 2: New "Vibes News" Category 📰 (Weeks 2-3)

#### Why This Matters
Vibes News is **original content** that differentiates you from aggregators. It's where your editorial voice shines.

#### 2.1 Backend Setup
```sql
-- No schema changes needed! Category is already a TEXT field
-- Just add the category to the enum in code
```

**RSS Feeds to Add:**
```python
# In scraper_2.py TARGET_FEEDS
{
    "url": "https://meta.mk/feed/",
    "source": "Meta.mk",
    "category": "VibesNews",
    "curate": True  # Let AI verify it's original content
},
# Add 5-10 sources for original Macedonian journalism
```

**Featured Slot:**
```python
FEATURE_SLOTS = {
    # ... existing slots ...
    "vibesnews": {
        "category": "VibesNews",
        "label": "Vibes Vesti"
    }
}
```

#### 2.2 Frontend Integration
1. Add to navigation (`web/app/_components/navigation.tsx`):
   ```typescript
   const categories = [
     // ... existing ...
     { name: "Vibes Vesti", value: "VibesNews" },
   ];
   ```

2. Update `CATEGORY_SLOT_MAP` in `page.tsx`:
   ```typescript
   const CATEGORY_LABELS = {
     // ... existing ...
     VibesNews: "Vibes Вести",
   };
   ```

3. Create dedicated page: `web/app/vibes-news/page.tsx`

#### 2.3 Enhanced Writing Experience
**For Authors (Admin Dashboard):**

Current: Basic textarea
Upgrade to:
1. **Rich Text Editor** (Tiptap or similar)
   - Bold, italic, headers
   - Bullet lists, numbered lists
   - Block quotes, code blocks
   - Image embedding with drag-drop

2. **Image Management**
   - Upload to Cloudflare R2 or similar
   - Automatic WebP conversion
   - Image cropping/resizing UI
   - Alt text for accessibility

3. **Draft Management**
   - Save drafts (new DB column `status: draft|published`)
   - Preview before publish
   - Schedule publishing

**For Readers:**
1. Better typography (larger fonts, better spacing)
2. Reading time estimate
3. Author bio cards
4. Related articles section
5. Share buttons (Twitter, Facebook, WhatsApp)

---

### Phase 3: Homepage Overhaul 🎨 (Weeks 3-5)

#### Inspiration: Ground.news
Ground.news shows **multiple perspectives** on the same story. For Vibes.mk, we adapt this to **multiple content types** showcasing your diversity.

#### 3.1 New Homepage Sections

```
┌───────────────────────────────────────────────────────┐
│  HERO SECTION                                          │
│  [Large featured story with image]                     │
│  Category badge | Source | Time                        │
└───────────────────────────────────────────────────────┘
│  TRENDING NOW (last 24h, by clicks)                   │
│  [3 horizontal cards] ───────────────────────────────  │
└───────────────────────────────────────────────────────┘
│  BY CATEGORY                                           │
│  ┌─Tech────┐ ┌─Culture──┐ ┌─Lifestyle┐ ┌─Vibes News┐ │
│  │ [image] │ │ [image]  │ │ [image]  │ │  [image]  │ │
│  │ Story 1 │ │ Story 1  │ │ Story 1  │ │  Story 1  │ │
│  │ Story 2 │ │ Story 2  │ │ Story 2  │ │  Story 2  │ │
│  └─────────┘ └──────────┘ └──────────┘ └───────────┘ │
└───────────────────────────────────────────────────────┘
│  EDITOR'S PICKS                                        │
│  [Manually curated stories - admin override]           │
└───────────────────────────────────────────────────────┘
│  LATEST UPDATES (infinite scroll)                      │
│  [Timeline of newest articles]                         │
└───────────────────────────────────────────────────────┘
```

#### 3.2 Implementation Details

**Trending Section:**
```typescript
// New API route: /api/trending
export async function GET() {
  const rs = await turso.execute({
    sql: `
      SELECT * FROM posts 
      WHERE scraped_at > datetime('now', '-24 hours')
      ORDER BY clicks DESC 
      LIMIT 3
    `,
  });
  return Response.json(rs.rows);
}
```

**Category Grid:**
```typescript
// Fetch top 2 posts per category
const categoryPreviews = await Promise.all(
  ['Tech', 'Culture', 'Lifestyle', 'Business', 'Sports', 'VibesNews'].map(
    async (cat) => {
      const rs = await turso.execute({
        sql: 'SELECT * FROM posts WHERE category = ? ORDER BY scraped_at DESC LIMIT 2',
        args: [cat]
      });
      return { category: cat, posts: rs.rows };
    }
  )
);
```

**Design System:**
- Card-based layout (inspired by Bento grid)
- Yellow (#FFD300) accent color for CTAs
- Black borders for definition
- Neubrutalism shadows (4px offset)
- Serif headers, Sans body text

---

### Phase 4: Politics Coverage 🗳️ (Weeks 4-5)

#### Strategy: Neutral but Informed
Vibes.mk isn't a political outlet, but politics affects everyone. The goal: **balanced coverage that informs without polarizing**.

#### 4.1 Content Sources
Add **diverse** political sources to scraper:
```python
# Left-leaning sources
{"url": "...", "source": "SourceA", "category": "Politics"},
# Center sources  
{"url": "...", "source": "SourceB", "category": "Politics"},
# Right-leaning sources
{"url": "...", "source": "SourceC", "category": "Politics"},
# Fact-checking
{"url": "...", "source": "Provereno", "category": "Politics"},
```

#### 4.2 AI Neutrality Filter
Update AI prompt:
```python
"""
For political content, follow these rules:
1. Reject articles with inflammatory language
2. Favor articles presenting multiple viewpoints
3. Flag opinion pieces vs news reporting
4. Detect fact-based vs speculation
5. Score neutrality (0-10)

Only accept political content with neutrality_score >= 6
"""
```

#### 4.3 UI Presentation
- **Badge:** "Politics" in neutral gray (not yellow/red)
- **Source diversity:** Show multiple sources on same topic
- **Fact-check links:** If Provereno.mk covered it, link to fact-check
- **Context:** Short explainer for international politics

#### 4.4 Content Moderation
- **Admin review:** Flag political posts for manual review
- **Community feedback:** "Report biased coverage" button
- **Weekly audit:** Review AI's political curation quality

---

### Phase 5: CI/CD Pipeline 🔄 (Weeks 5-7)

#### What is CI/CD? (Software Lifecycle Basics)

##### Software Development Lifecycle (SDLC)
```
Planning → Design → Development → Testing → Deployment → Maintenance
   ↑                                                            ↓
   └────────────────────────────────────────────────────────────┘
                        (Iterate & Improve)
```

##### Continuous Integration (CI)
**Definition:** Automatically test code every time a developer pushes changes.

**Without CI:**
```
Developer writes code → Pushes to GitHub → Weeks later, discovers it broke something → Panic 😰
```

**With CI:**
```
Developer writes code → Pushes to GitHub → GitHub Actions runs tests → 
If tests fail → Developer fixes immediately ✅
If tests pass → Code merges → Everyone happy 😊
```

##### Continuous Deployment (CD)
**Definition:** Automatically deploy code to production when tests pass.

**Without CD:**
```
Code is ready → Developer manually SSHs to server → Runs deployment script → 
Forgets a step → Site breaks → Manual rollback → 2 hours wasted 😫
```

**With CD:**
```
Code merges to main → GitHub Actions builds & tests → Deploys to Cloudflare → 
Monitors for errors → Auto-rollback if issues → 5 minutes total ⚡
```

#### 5.1 CI Pipeline (Testing & Validation)

**Create `.github/workflows/ci.yml`:**
```yaml
name: Continuous Integration

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  # Frontend tests
  frontend-ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: TypeScript check
        run: npx tsc --noEmit
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      # Future: Add unit tests
      # - name: Test
      #   run: npm test

  # Backend tests
  backend-ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./scraper
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt
          pip install pylint pytest
      
      - name: Lint
        run: pylint *.py --disable=C0111,R0913
      
      # Future: Add unit tests
      # - name: Test
      #   run: pytest tests/
```

**What this does:**
1. Runs on every PR and push to main/develop
2. Checks TypeScript for errors
3. Lints code (catches common bugs)
4. Ensures build doesn't fail
5. (Future) Runs automated tests

**Benefits:**
- 🐛 Catch bugs before they reach production
- 📝 Enforce code quality standards
- 🤝 Safer collaboration (can't merge broken code)
- 📊 Build confidence in changes

#### 5.2 CD Pipeline (Deployment)

**Option 1: Cloudflare Pages (Automatic - Recommended)**
Already set up! Cloudflare auto-deploys on push to main.

**Option 2: Manual Control with GitHub Actions**
```yaml
name: Deploy to Production

on:
  workflow_dispatch:  # Manual trigger
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      - # ... build steps ...
      - name: Deploy to Cloudflare
        run: npx opennextjs-cloudflare deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

#### 5.3 Staging Environment

**Why?** Test changes in production-like environment before going live.

**Setup:**
1. Create Cloudflare Pages project: `vibes-staging.pages.dev`
2. Connect to `develop` branch
3. Use separate Turso database for staging
4. Test new features here before merging to main

**Workflow:**
```
Feature branch → PR to develop → Deploy to staging → QA test → 
PR to main → Deploy to production
```

#### 5.4 Monitoring

**Add Error Tracking (Sentry):**
```typescript
// web/instrumentation.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

**Scraper Health Monitoring:**
```python
# scraper_2.py - Send metrics to monitoring service
import requests

def send_metrics(successful_items: int, failed_items: int):
    requests.post(
        "https://api.betteruptime.com/...",
        json={
            "scraper_run": {
                "success": successful_items,
                "failures": failed_items,
                "timestamp": datetime.now().isoformat()
            }
        }
    )
```

---

### Phase 6: UX Enhancements 🎨 (Weeks 6-8)

#### 6.1 Reading Experience Improvements

**Reading Time Estimate:**
```typescript
function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  const wpm = 200; // Average reading speed
  return Math.ceil(words / wpm);
}

// Display: "5 min read"
```

**Dark Mode:**
```css
/* globals.css */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #f0f0f0;
    --accent: #FFD300;
  }
}
```

**Save for Later:**
```typescript
// New table: saved_posts
// user_id, post_id, saved_at

// Component
<button onClick={() => savePost(post.id)}>
  🔖 Save
</button>
```

#### 6.2 Personalization

**User Preferences:**
```typescript
// Store in Clerk user metadata
await user.update({
  unsafeMetadata: {
    preferredCategories: ['Tech', 'Culture'],
    emailDigest: 'weekly',
  }
});
```

**"For You" Feed:**
```sql
-- Weight posts by user's preferred categories and past clicks
SELECT p.* 
FROM posts p
LEFT JOIN user_clicks uc ON p.id = uc.post_id AND uc.user_id = ?
WHERE p.category IN (?, ?, ?)  -- User's preferred categories
ORDER BY 
  CASE WHEN uc.id IS NOT NULL THEN 0 ELSE 1 END,  -- Prioritize unread
  p.scraped_at DESC
LIMIT 20
```

---

## 🎯 Implementation Priorities

### Must Have (Weeks 1-4)
1. ✅ Groq API Migration (solve rate limit issue)
2. ✅ Vibes News category (new content type)
3. ✅ Homepage redesign (better UX)
4. ✅ Basic CI pipeline (code quality)

### Should Have (Weeks 5-8)
5. ⚠️ Politics coverage (expand content)
6. ⚠️ Enhanced blog editor (better authoring)
7. ⚠️ Staging environment (safer deploys)
8. ⚠️ Error monitoring (production stability)

### Nice to Have (Weeks 9-12)
9. 💡 Dark mode
10. 💡 Save for later
11. 💡 Personalized feed
12. 💡 Email newsletter

---

## ⚠️ Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Groq API quality lower than Gemini | Medium | High | A/B test, keep Gemini fallback |
| Homepage redesign affects SEO | Low | Medium | Maintain URL structure, add structured data |
| Scraper breaks during migration | Medium | High | Thorough testing, gradual rollout |
| Politics content alienates users | Medium | Medium | Strong neutrality filters, user feedback |
| CI/CD delays development | Low | Low | Start simple, iterate |

---

## 📈 Success Metrics

### Technical KPIs
- ⚡ Scraper success rate: >95%
- ⚡ API cost reduction: >40% (Groq vs Gemini)
- ⚡ Build time: <5 minutes
- ⚡ Deployment frequency: 2-3x per week

### User KPIs
- 📊 Daily active users: +30%
- 📊 Average session duration: +50%
- 📊 Bounce rate: <40%
- 📊 Mobile users: >60%

### Content KPIs
- 📰 Vibes News articles: 5-10 per week
- 📰 Category diversity: balanced distribution
- 📰 Source diversity: >50 active sources
- 📰 User engagement: CTR >5%

---

## 🚀 Getting Started

### Week 1 Actions
1. **Today:** Review this plan, prioritize phases
2. **Day 2:** Set up Groq account, get API key
3. **Day 3:** Create `develop` branch, set up staging
4. **Day 4:** Implement Groq integration in local environment
5. **Day 5:** Test Groq vs Gemini quality comparison
6. **Weekend:** Deploy Groq to production if quality is good

### Commands You'll Run
```bash
# Set up staging branch
git checkout -b develop
git push -u origin develop

# Install local development dependencies
cd web && npm install
cd scraper && pip install -r requirements.txt

# Run frontend locally
cd web && npm run dev

# Run scraper locally
cd scraper && python scraper_local.py

# Create feature branch
git checkout -b feature/groq-migration

# Run CI checks locally before pushing
cd web && npm run lint && npx tsc --noEmit
cd scraper && pylint *.py
```

---

## 📚 Resources

### Learning CI/CD
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Continuous Integration/Continuous Delivery (YouTube)](https://www.youtube.com/watch?v=scEDHsr3APg)
- [Next.js Deployment Best Practices](https://nextjs.org/docs/deployment)

### Groq API
- [Groq Documentation](https://console.groq.com/docs)
- [Model Comparison](https://console.groq.com/docs/models)
- [Rate Limits](https://console.groq.com/docs/rate-limits)

### Design Inspiration
- [Ground.news](https://ground.news)
- [The Browser](https://thebrowser.com)
- [Dense Discovery](https://www.densediscovery.com)

---

## 🤝 Your Role as PM

As the Product Manager coordinating AI agents:

1. **Prioritize:** Choose which phases to tackle first based on business needs
2. **Define Success:** Set clear criteria for each feature ("done when...")
3. **Review Work:** Check AI agent outputs, provide feedback
4. **Make Decisions:** Choose between options (e.g., Groq vs other providers)
5. **Communicate:** Keep stakeholders updated on progress

**Example PM Commands to AI Agents:**
- "Implement Phase 1.1 (Groq integration) first, focusing on backward compatibility"
- "Create the Vibes News category, but don't deploy until we have 5 RSS sources ready"
- "Set up CI pipeline for frontend only, backend can wait"

---

## ✅ Next Steps

After reviewing this plan:
1. **Approve Priorities:** Confirm Phases 1-3 as highest priority
2. **Set Timeline:** Allocate developer time (AI agents + your review time)
3. **Start Small:** Begin with Groq migration (highest immediate value)
4. **Iterate:** Review weekly, adjust plan based on learnings

**Questions to Consider:**
- Do you want to launch Vibes News publicly or build it out first?
- Should politics be a separate category or integrated into existing ones?
- What's your risk tolerance for AI quality (Groq vs Gemini)?
- When do you want to launch the new homepage (all at once vs incremental)?

---

**Made with ❤️ for Vibes.mk**
*Last Updated: January 2025*
