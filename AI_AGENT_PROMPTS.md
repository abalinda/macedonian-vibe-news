# 🤖 AI Agent Prompts - Ready-to-Use Implementation Templates

Concrete example prompts for AI coding agents for each implementation phase of the Vibes.mk upgrade.

---

## 📋 How to Use These Prompts

1. **Copy the entire prompt** for the phase you want to implement
2. **Paste it to your AI coding agent** (GitHub Copilot, Claude, etc.)
3. **Review the agent's work** using the acceptance criteria provided
4. **Iterate** if needed based on the review checklist

**Note:** Phase 1 (Groq Migration) is already complete, so we start with Phase 2.

---

## Phase 2: Vibes News Category Implementation

### 🎯 Phase 2.1: Backend Setup

```
TASK: Implement the new "Vibes News" (Vibes Vesti) category in the scraper backend

CONTEXT:
I'm working on a Macedonian news aggregator (Vibes.mk) that uses Python to scrape RSS feeds and curate articles with AI. We currently have 5 categories: Tech, Culture, Lifestyle, Business, Sports, and Blog. I need to add a new category called "Vibes News" (Vibes Vesti) for original Macedonian journalism.

REQUIREMENTS:

1. UPDATE scraper/scraper_2.py:
   - Add a new featured slot called "vibesnews" to the FEATURE_SLOTS dictionary:
     ```python
     "vibesnews": {"category": "VibesNews", "label": "Vibes Vesti"}
     ```
   - Add 5-7 RSS feeds for original Macedonian journalism sources to TARGET_FEEDS
   - Suggested sources (verify URLs first):
     * Meta.mk - https://meta.mk/feed/
     * Plusinfo.mk - https://plusinfo.mk/feed/
     * Sloboden Pechat - https://www.slobodenpecat.mk/feed/
     * NovaTV - https://novatv.mk/feed/
     * SDK.mk - https://sdk.mk/feed/
   - Set category to "VibesNews" for these feeds
   - Set curate: True (they should go through AI curation)

2. VERIFY:
   - Featured slots now include "vibesnews"
   - RSS feeds are valid and accessible (test fetch)
   - Category is properly configured

TESTING:
After implementation:
1. Run the scraper locally: `python scraper_2.py --dry-run` (if dry-run exists) or test mode
2. Verify that articles are being categorized as "VibesNews"
3. Check that the featured slot is created in the database
4. Ensure no breaking changes to existing categories

ACCEPTANCE CRITERIA:
✅ FEATURE_SLOTS includes "vibesnews" entry
✅ At least 5 RSS feeds added with category "VibesNews"
✅ All feed URLs are valid and return content
✅ Scraper runs without errors
✅ Articles are correctly categorized

DELIVERABLES:
- Modified scraper/scraper_2.py
- List of RSS feeds added with their sources
- Test results showing successful categorization

CONSTRAINTS:
- Do NOT modify existing categories or feeds
- Do NOT change the scraper's core logic
- Keep the same code style and patterns used in the file
```

**Review Checklist After Agent Completes:**
- [ ] Check `git diff scraper/scraper_2.py` - should only add new entries
- [ ] Verify RSS feed URLs work (curl or browser check)
- [ ] Run scraper locally to test
- [ ] Check logs for "VibesNews" entries

---

### 🎯 Phase 2.2: Frontend Integration

```
TASK: Add "Vibes Vesti" category to the Vibes.mk frontend navigation and routing

CONTEXT:
I have a Next.js 16 app (web/) for Vibes.mk news aggregator. The backend now supports a new category called "VibesNews" (display as "Vibes Vesti" in Macedonian). I need to add this category to the frontend navigation, routing, and homepage.

CURRENT SETUP:
- Navigation: web/app/_components/navigation.tsx
- Homepage: web/app/page.tsx
- Categories exist: Tech, Culture, Lifestyle, Business, Sports, Blog

REQUIREMENTS:

1. UPDATE web/app/_components/navigation.tsx:
   - In the NavBar component, find the menuLinks array
   - Add "Vibes Vesti" after "Блог" entry:
     ```typescript
     { label: "Vibes Vesti", href: "/?category=VibesNews" },
     ```
   - In the CategoryNav component, find the categories array
   - Add between "Блог" and the end:
     ```typescript
     { name: "Vibes Vesti", value: "VibesNews" },
     ```

2. UPDATE web/app/page.tsx:
   - Find CATEGORY_SLOT_MAP constant
   - Add: `VibesNews: "vibesnews",`
   - Find CATEGORY_LABELS constant
   - Add: `VibesNews: "Vibes Вести",`

3. CREATE web/app/vibes-news/page.tsx:
   - Create a new dedicated page for Vibes News category
   - Use the same structure as other category pages
   - Filter posts where category = "VibesNews"
   - Include proper metadata (title, description in Macedonian)
   - Use ISR revalidation (60 seconds like homepage)

DESIGN GUIDELINES:
- Follow existing styling patterns
- Use serif fonts for headlines (font-serif class)
- Yellow accent color (#FFD300) for CTAs
- Black borders (border-black)
- Maintain responsive design (mobile-first)

TESTING:
After implementation:
1. Run dev server: `npm run dev` in web/
2. Navigate to homepage, check navigation has "Vibes Vesti"
3. Click "Vibes Vesti" - should show filtered articles
4. Navigate to /vibes-news - should show dedicated page
5. Test on mobile (Chrome DevTools device emulation)
6. Run build: `npm run build` - ensure no TypeScript errors

ACCEPTANCE CRITERIA:
✅ "Vibes Vesti" appears in main navigation menu
✅ "Vibes Vesti" appears in category nav bar
✅ Clicking category filters to VibesNews articles
✅ /vibes-news page exists and renders correctly
✅ No TypeScript errors
✅ No console errors in browser
✅ Mobile responsive
✅ Maintains existing styling

DELIVERABLES:
- Modified web/app/_components/navigation.tsx
- Modified web/app/page.tsx
- New file web/app/vibes-news/page.tsx
- Screenshots of the working feature (desktop + mobile)

CONSTRAINTS:
- Do NOT modify other navigation items
- Do NOT change existing page layouts
- Keep same code style and component patterns
- Ensure accessibility (proper ARIA labels if needed)
```

**Review Checklist After Agent Completes:**
- [ ] Run `npm run build` - should succeed
- [ ] Check navigation visually - new item appears
- [ ] Click through all category links
- [ ] Test mobile view (responsive)
- [ ] No TypeScript errors: `npx tsc --noEmit`

---

### 🎯 Phase 2.3: Enhanced Blog Composer

```
TASK: Enhance the blog composer with rich text editing capabilities for Vibes News authors

CONTEXT:
Vibes.mk has a blog composer at web/app/blog/new/composer.tsx. Currently it uses a basic textarea. I need to upgrade it to a rich text editor (Tiptap) to allow authors to create better formatted Vibes News articles.

CURRENT STATE:
- Basic textarea in web/app/blog/new/composer.tsx
- Limited formatting options
- No image upload

REQUIREMENTS:

1. INSTALL DEPENDENCIES:
   ```bash
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
   ```

2. UPDATE web/app/blog/new/composer.tsx:
   - Replace textarea with Tiptap editor
   - Add toolbar with buttons for:
     * Bold, Italic, Underline
     * Headings (H2, H3)
     * Bullet list, Numbered list
     * Blockquote
     * Link insertion
     * Image URL insertion (for now, local upload can be Phase 2.4)
   - Style the editor to match Vibes.mk aesthetic:
     * Serif font for content
     * Black borders
     * Yellow accent for focused state
     * Clean, minimal toolbar
   - Add character counter (display current/max characters)
   - Maintain existing save functionality

3. EDITOR CONFIGURATION:
   ```typescript
   const editor = useEditor({
     extensions: [
       StarterKit,
       Image,
       Link.configure({
         openOnClick: false,
       }),
     ],
     content: initialContent,
     editorProps: {
       attributes: {
         class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
       },
     },
   })
   ```

4. TOOLBAR DESIGN:
   - Sticky toolbar that stays visible while scrolling
   - Icon buttons for each formatting option
   - Active state highlighting (show which formats are active)
   - Tooltips on hover explaining each button

STYLING REQUIREMENTS:
- Editor container: white background, black border
- Toolbar: light gray background (#F5F5F5)
- Active buttons: yellow background (#FFD300)
- Focus ring: yellow (#FFD300)
- Font: font-serif for content area
- Maintain mobile responsiveness

TESTING:
After implementation:
1. Navigate to /blog/new
2. Test each formatting button
3. Type content, apply formatting, verify it persists
4. Test image insertion (paste URL)
5. Test link insertion
6. Check mobile view (toolbar should adapt)
7. Verify save still works
8. Check that saved content displays correctly on blog post view

ACCEPTANCE CRITERIA:
✅ Tiptap editor replaces textarea
✅ Toolbar has all required formatting buttons
✅ Bold, italic, headings, lists work correctly
✅ Image insertion from URL works
✅ Link insertion works
✅ Character counter displays
✅ Mobile responsive toolbar
✅ No styling regressions
✅ Existing save functionality works
✅ TypeScript compiles without errors

DELIVERABLES:
- Updated web/app/blog/new/composer.tsx
- Updated package.json with new dependencies
- Screenshots showing:
  1. The new editor with toolbar
  2. Formatted content example
  3. Mobile view of editor

CONSTRAINTS:
- Do NOT break existing blog posts
- Do NOT change the API route for saving
- Keep backward compatibility (old posts should still display)
- Follow Next.js 16 and React 19 best practices
- Use TypeScript properly (no 'any' types)

OPTIONAL ENHANCEMENTS (if time permits):
- Keyboard shortcuts (Cmd+B for bold, etc.)
- Markdown shortcuts (typing ## for H2)
- Undo/redo buttons
```

**Review Checklist After Agent Completes:**
- [ ] Install deps: `npm install` succeeds
- [ ] Build: `npm run build` succeeds
- [ ] Test editor: all buttons work
- [ ] Test mobile: responsive layout
- [ ] Create test blog post with formatting
- [ ] Verify saved post displays correctly

---

## Phase 3: Homepage Redesign

### 🎯 Phase 3.1: Trending Section API

```
TASK: Create API endpoint for trending articles (top 3 by clicks in last 24 hours)

CONTEXT:
Building a redesigned homepage for Vibes.mk. First step is to create an API endpoint that returns the top 3 trending articles based on clicks in the last 24 hours.

DATABASE INFO:
- Table: posts
- Relevant columns: id, title, link, source, category, image_url, clicks, scraped_at
- Database client: Turso (libSQL) imported from @/lib/turso

REQUIREMENTS:

1. CREATE web/app/api/trending/route.ts:
   - Export async GET function
   - Query Turso database for top 3 articles:
     * WHERE scraped_at > 24 hours ago
     * ORDER BY clicks DESC
     * LIMIT 3
   - Return JSON response
   - Handle errors gracefully (return empty array if query fails)
   - Add proper CORS headers if needed

2. SQL QUERY:
   ```sql
   SELECT id, title, link, source, category, image_url, clicks, scraped_at
   FROM posts
   WHERE scraped_at > datetime('now', '-24 hours')
   ORDER BY clicks DESC
   LIMIT 3
   ```

3. RESPONSE FORMAT:
   ```typescript
   {
     posts: [
       {
         id: number,
         title: string,
         link: string,
         source: string,
         category: string,
         image_url: string | null,
         clicks: number,
         scraped_at: string
       },
       // ... 2 more
     ]
   }
   ```

4. ERROR HANDLING:
   - Catch database errors
   - Return 200 with empty array on error (don't expose DB errors)
   - Log errors for debugging

TESTING:
After implementation:
1. Run dev server: `npm run dev`
2. Visit http://localhost:3000/api/trending
3. Should see JSON with 3 articles (or fewer if less available)
4. Verify articles are from last 24 hours
5. Verify sorted by clicks (highest first)
6. Test error handling (temporarily break DB connection)

ACCEPTANCE CRITERIA:
✅ /api/trending endpoint exists
✅ Returns valid JSON
✅ Returns max 3 articles
✅ Articles are from last 24 hours
✅ Sorted by clicks descending
✅ Handles errors gracefully
✅ No TypeScript errors
✅ Response time < 500ms

DELIVERABLES:
- New file: web/app/api/trending/route.ts
- Test results (screenshot of JSON response in browser)
- Performance test (response time)

CONSTRAINTS:
- Do NOT modify existing API routes
- Use existing Turso client from @/lib/turso
- Follow Next.js 16 App Router API patterns
- Use TypeScript with proper types
```

**Review Checklist After Agent Completes:**
- [ ] File created: `web/app/api/trending/route.ts`
- [ ] Test in browser: http://localhost:3000/api/trending
- [ ] Verify JSON structure matches spec
- [ ] Check response time (should be fast)
- [ ] Run build: `npm run build`

---

### 🎯 Phase 3.2: Homepage Multi-Section Layout

```
TASK: Redesign the homepage with multi-section layout including hero, trending, category grid, and latest updates

CONTEXT:
Vibes.mk homepage currently has a simple layout. I want to redesign it with multiple sections inspired by ground.news to increase engagement. The /api/trending endpoint is already created and working.

CURRENT STATE:
- File: web/app/page.tsx
- Has: Hero section, side stories
- Revalidation: 60 seconds (ISR)

TARGET LAYOUT:
```
┌─────────────────────────────────────────┐
│ HERO SECTION (keep existing)           │
│ [Large featured story with image]      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔥 TRENDING NOW (NEW)                   │
│ [Article 1] [Article 2] [Article 3]    │
│ (horizontal cards on desktop)           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ BY CATEGORY GRID (NEW)                  │
│ ┌─Tech──┐┌Culture┐┌Lifestyle┐          │
│ │[img]  ││[img]  ││[img]    ││          │
│ │Story1 ││Story1 ││Story1   ││ ...      │
│ │Story2 ││Story2 ││Story2   ││          │
│ └──────┘└───────┘└─────────┘           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ LATEST UPDATES (keep existing sidebar) │
└─────────────────────────────────────────┘
```

REQUIREMENTS:

1. KEEP EXISTING:
   - Hero section (featured story)
   - Side stories
   - ISR revalidation (60s)
   - Category filtering logic

2. ADD TRENDING SECTION (after hero):
   - Fetch data from /api/trending
   - Display 3 articles in horizontal cards
   - Each card shows: image, title, source, clicks
   - Desktop: 3 columns side-by-side
   - Mobile: vertical stack
   - "🔥 TRENDING NOW" heading
   - Clicking card goes to article

3. ADD CATEGORY GRID:
   - Show 6 categories: Tech, Culture, Lifestyle, Business, Sports, VibesNews
   - For each category, fetch top 2 recent posts
   - Grid layout: 3 columns on desktop, 1 on mobile
   - Each category card:
     * Category name header (colored)
     * 2 article previews with images
     * "View all" link to category page
   - Color coding per category (use existing brand colors)

4. STYLING:
   - Maintain Vibes.mk design system:
     * Serif fonts for headlines
     * Sans fonts for body
     * Yellow accent (#FFD300)
     * Black borders (border-black)
     * Neubrutalism shadows (4px offset)
   - Mobile-first responsive design
   - Smooth transitions and hover states

5. PERFORMANCE:
   - Use React Server Components where possible
   - Implement proper loading states
   - Optimize images (lazy loading)
   - Keep ISR at 60 seconds

DATA FETCHING:
```typescript
// Trending
const trendingRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/trending`, {
  next: { revalidate: 60 }
})
const { posts: trendingPosts } = await trendingRes.json()

// Category previews
const categoryPreviews = await Promise.all(
  ['Tech', 'Culture', 'Lifestyle', 'Business', 'Sports', 'VibesNews'].map(
    async (cat) => {
      const rs = await turso.execute({
        sql: 'SELECT * FROM posts WHERE category = ? ORDER BY scraped_at DESC LIMIT 2',
        args: [cat]
      })
      return { category: cat, posts: rs.rows }
    }
  )
)
```

TESTING:
After implementation:
1. Build and run: `npm run build && npm start`
2. Visit homepage
3. Verify all sections render correctly
4. Test responsive design (desktop, tablet, mobile)
5. Check Lighthouse score (should be >90)
6. Verify ISR revalidation (content updates every 60s)
7. Test all links work correctly

ACCEPTANCE CRITERIA:
✅ Trending section displays with 3 articles
✅ Category grid shows 6 categories with 2 posts each
✅ Mobile responsive (tested on 375px width)
✅ All links functional
✅ No layout shift (CLS < 0.1)
✅ Page load time < 2 seconds
✅ Lighthouse score > 90
✅ No TypeScript errors
✅ No console errors

DELIVERABLES:
- Updated web/app/page.tsx
- Screenshots showing:
  1. Full homepage desktop view
  2. Mobile view
  3. Lighthouse score
- Performance metrics

CONSTRAINTS:
- Do NOT break existing homepage functionality
- Keep ISR revalidation at 60 seconds
- Maintain SEO metadata
- Don't remove existing sections, only add new ones
- Follow Next.js 16 best practices
```

**Review Checklist After Agent Completes:**
- [ ] Build succeeds: `npm run build`
- [ ] Homepage renders all sections
- [ ] Test mobile responsive
- [ ] Check Lighthouse score
- [ ] Verify all links work
- [ ] Test ISR revalidation

---

## Phase 4: Politics Coverage

### 🎯 Phase 4.1: Add Political RSS Feeds with Balanced Sources

```
TASK: Add diverse political news sources to scraper with balanced perspective coverage

CONTEXT:
Vibes.mk wants to add responsible political coverage while maintaining neutrality and "good vibes" philosophy. I need to add RSS feeds from diverse Macedonian political sources that represent different perspectives.

CURRENT STATE:
- File: scraper/scraper_2.py
- Existing categories: Tech, Culture, Lifestyle, Business, Sports, VibesNews, Blog
- Need to add: Politics (or integrate into existing categories)

REQUIREMENTS:

1. RESEARCH & SELECT SOURCES:
   - Find 5-7 Macedonian news sources covering politics
   - Ensure diversity of perspectives:
     * At least 2 center/neutral sources
     * Include fact-checking sources (e.g., Provereno.mk)
     * Mix of traditional media and digital-native
   - Verify RSS feed URLs are valid and active

2. ADD TO scraper/scraper_2.py TARGET_FEEDS:
   Example structure (replace with actual researched sources):
   ```python
   # Politics - Balanced Coverage
   {"url": "https://source1.mk/politics/feed/", "source": "Source 1", "category": "Politics", "curate": True},
   {"url": "https://source2.mk/politics/feed/", "source": "Source 2", "category": "Politics", "curate": True},
   {"url": "https://provereno.mk/category/политика/feed/", "source": "Проверено", "category": "Politics", "curate": True},
   # ... more sources
   ```

3. ADD FEATURED SLOT (optional):
   ```python
   "politics": {"category": "Politics", "label": "Политика"}
   ```

4. CONFIGURATION:
   - Set `curate: True` for all political sources (AI filtering needed)
   - Category: "Politics"
   - Ensure sources are from different ownership/editorial perspectives

5. DOCUMENTATION:
   - In comments, note the editorial perspective of each source
   - Document the selection rationale (why these sources)

RESEARCH GUIDELINES:
- Look for established Macedonian news outlets
- Check their RSS feed quality (recent updates, proper formatting)
- Avoid highly partisan or extremist sources
- Prefer sources with professional editorial standards
- Include at least one fact-checking source

TESTING:
After implementation:
1. Run scraper in test mode
2. Verify all feeds are accessible
3. Check that articles are being fetched
4. Ensure AI curation is triggered (curate: True)
5. Review sample articles for quality

ACCEPTANCE CRITERIA:
✅ 5-7 political RSS feeds added
✅ Sources represent diverse perspectives
✅ All feed URLs are valid and return content
✅ Includes fact-checking source(s)
✅ Each feed has curate: True
✅ Selection is documented in code comments
✅ Scraper runs without errors

DELIVERABLES:
- Updated scraper/scraper_2.py with new feeds
- Documentation of sources (in comments or separate doc)
- List of sources with their perspectives/descriptions
- Test results showing successful feed fetching

CONSTRAINTS:
- Do NOT add overtly biased or extremist sources
- Ensure editorial diversity
- Only add sources with active, working RSS feeds
- Follow existing code style
```

**Review Checklist After Agent Completes:**
- [ ] Review source list - diverse perspectives?
- [ ] Test feed URLs - all working?
- [ ] Check feed content quality
- [ ] Verify curate: True is set
- [ ] Run scraper test mode

---

### 🎯 Phase 4.2: AI Neutrality Scoring

```
TASK: Enhance AI curator to score political content for neutrality and filter biased articles

CONTEXT:
Vibes.mk now has political RSS feeds. I need to update the AI curator (curator_2.py) to score political articles for neutrality and only publish balanced, factual content that aligns with "good vibes" philosophy.

CURRENT STATE:
- File: scraper/curator_2.py
- Uses Groq API (primary) and Gemini (fallback)
- Returns: category, is_hero, hero_score, summary

REQUIREMENTS:

1. UPDATE AI PROMPT in curator_2.py:
   Add neutrality detection and scoring:
   ```python
   SYSTEM_PROMPT = """
   You are a neutral news curator for Vibes.mk, a Macedonian news platform focused on quality, balanced journalism.
   
   For POLITICAL content, you must:
   1. Detect political articles (government, elections, parties, policy, legislation)
   2. Assess NEUTRALITY (0-10 scale):
      - 10 = Completely neutral, fact-based, multiple perspectives
      - 7-9 = Mostly neutral with minor bias
      - 4-6 = Some bias present but includes counterpoints
      - 1-3 = Heavily one-sided, inflammatory, or opinion disguised as news
      - 0 = Propaganda or extreme bias
   3. Assess VIBES score (0-10):
      - 10 = Informative, constructive, solution-focused
      - 5-9 = Factual but may include concerning topics
      - 1-4 = Negative, fear-inducing, divisive
      - 0 = Extremely negative or hateful
   
   REJECTION CRITERIA for political content:
   - Neutrality score < 6 (reject biased content)
   - Vibes score < 4 (reject overly negative)
   - Opinion pieces without clear labeling
   - Inflammatory language or personal attacks
   - Unverified claims or speculation presented as fact
   
   Return JSON:
   {
     "category": "Politics" | "Tech" | "Culture" | etc.,
     "is_hero": boolean,
     "hero_score": 0-100,
     "neutrality_score": 0-10,  // NEW
     "vibes_score": 0-10,        // NEW
     "bias_detected": boolean,   // NEW
     "summary": "...",
     "rejection_reason": "..." | null  // NEW - explain if scores are low
   }
   """
   ```

2. UPDATE generate_with_fallback() or curation logic:
   - Parse new fields from AI response
   - Implement rejection logic:
     ```python
     if article_category == "Politics":
         if neutrality_score < 6 or vibes_score < 4:
             log_rejection(article, neutrality_score, vibes_score, rejection_reason)
             return None  # Don't publish
     ```
   - Log rejected articles for review

3. ADD LOGGING:
   - Log neutrality and vibes scores for all political content
   - Track rejection rate
   - Keep examples of rejected articles for quality monitoring

4. UPDATE DATABASE (optional future):
   - Add columns: neutrality_score, vibes_score (can be done later)
   - For now, just log the scores

TESTING:
Create test cases:
1. Neutral political article → should be accepted
2. Biased political article → should be rejected
3. Fact-check article → should be accepted (high neutrality)
4. Opinion piece → should be rejected (unless clearly labeled)
5. Non-political article → should ignore neutrality scoring

After implementation:
1. Run scraper with political feeds
2. Review logs for neutrality/vibes scores
3. Check that biased articles are rejected
4. Verify neutral articles are published
5. Monitor rejection rate (should be 30-50% of political content)

ACCEPTANCE CRITERIA:
✅ AI prompt includes neutrality and vibes scoring
✅ Rejection logic implemented (neutrality < 6 or vibes < 4)
✅ Rejected articles are logged with reasons
✅ Neutral articles pass through successfully
✅ Non-political content unaffected
✅ Logging captures all scores
✅ Rejection rate is reasonable (not rejecting everything)

DELIVERABLES:
- Updated scraper/curator_2.py
- Test results with sample articles
- Log output showing scoring in action
- Statistics: acceptance rate for political content

CONSTRAINTS:
- Do NOT make neutrality scoring too strict (some subjectivity is OK)
- Balance between filtering bias and providing coverage
- Don't apply political scoring to non-political categories
- Maintain existing AI curation quality for other categories
```

**Review Checklist After Agent Completes:**
- [ ] Review AI prompt - clear instructions?
- [ ] Test with sample political articles
- [ ] Check rejection logic works
- [ ] Review logs - scoring makes sense?
- [ ] Verify non-political content unaffected

---

## Phase 5: CI/CD Setup

### 🎯 Phase 5.1: Frontend CI Pipeline

```
TASK: Create GitHub Actions workflow for automated frontend testing and validation

CONTEXT:
Vibes.mk currently has no automated testing. I need to set up a CI pipeline that runs on every pull request to catch errors before they reach production.

CURRENT STATE:
- Frontend: web/ (Next.js 16, TypeScript)
- No existing CI for frontend
- Has existing scraper workflow: .github/workflows/scraper.yml

REQUIREMENTS:

1. CREATE .github/workflows/frontend-ci.yml:
   ```yaml
   name: Frontend CI

   on:
     pull_request:
       branches: [main, develop]
       paths:
         - 'web/**'
         - '.github/workflows/frontend-ci.yml'
     push:
       branches: [main, develop]
       paths:
         - 'web/**'

   jobs:
     frontend-checks:
       name: Lint, Type-Check & Build
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: ./web

       steps:
         - name: 📥 Checkout code
           uses: actions/checkout@v4

         - name: 📦 Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
             cache-dependency-path: web/package-lock.json

         - name: 📦 Install dependencies
           run: npm ci

         - name: 🔍 Lint code
           run: npm run lint

         - name: 🔎 Type check
           run: npx tsc --noEmit

         - name: 🏗️ Build
           run: npm run build
           env:
             # Add any required env vars for build
             SKIP_ENV_VALIDATION: true
   ```

2. ENSURE package.json has lint script:
   - Should already exist: `"lint": "next lint"`
   - If not, add it

3. CONFIGURE TypeScript strict mode (web/tsconfig.json):
   - Verify strict: true is set
   - Fix any type errors that appear

4. ADD .github/workflows/backend-ci.yml (optional but recommended):
   ```yaml
   name: Backend CI

   on:
     pull_request:
       branches: [main, develop]
       paths:
         - 'scraper/**'
         - '.github/workflows/backend-ci.yml'
     push:
       branches: [main, develop]
       paths:
         - 'scraper/**'

   jobs:
     backend-checks:
       name: Lint Python Code
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: ./scraper

       steps:
         - name: 📥 Checkout code
           uses: actions/checkout@v4

         - name: 🐍 Setup Python 3.11
           uses: actions/setup-python@v5
           with:
             python-version: '3.11'
             cache: 'pip'

         - name: 📦 Install dependencies
           run: |
             python -m pip install --upgrade pip
             pip install -r requirements.txt
             pip install pylint

         - name: 🔍 Lint with pylint
           run: |
             pylint *.py --disable=C0111,R0913,R0914,R0915 || true
             # Allow warnings, only fail on errors
   ```

TESTING:
After implementation:
1. Create a test PR with a small change to web/
2. Verify GitHub Actions workflow triggers
3. Check that all steps pass (lint, type-check, build)
4. Introduce a TypeScript error intentionally
5. Verify the workflow fails and blocks merge
6. Fix the error and verify workflow passes

ACCEPTANCE CRITERIA:
✅ .github/workflows/frontend-ci.yml created
✅ Workflow runs on PRs and pushes to main/develop
✅ Only runs when web/ files change (performance)
✅ Linting step passes
✅ Type-checking step passes
✅ Build step passes
✅ Workflow completes in <5 minutes
✅ Failed checks block PR merge (when branch protection enabled)

DELIVERABLES:
- New file: .github/workflows/frontend-ci.yml
- Optional: .github/workflows/backend-ci.yml
- Screenshot of successful workflow run
- Screenshot of failed workflow (intentional error)

CONSTRAINTS:
- Do NOT break existing scraper workflow
- Keep workflows fast (<5 min)
- Use latest GitHub Actions versions
- Follow GitHub Actions best practices
```

**Review Checklist After Agent Completes:**
- [ ] Workflow file created and committed
- [ ] Create test PR - workflow runs?
- [ ] All steps pass successfully?
- [ ] Test failure case - does it block?
- [ ] Check workflow run time

---

### 🎯 Phase 5.2: Staging Environment Setup

```
TASK: Set up staging environment on Cloudflare Pages with develop branch deployment

CONTEXT:
Vibes.mk needs a staging environment to test changes before production. Currently only production exists (vibes.mk). I need to set up automatic deployment of the develop branch to a staging URL.

CURRENT STATE:
- Production: vibes.mk (deploys from main branch)
- No staging environment
- Using Cloudflare Pages for hosting

REQUIREMENTS:

1. CREATE develop BRANCH:
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

2. CLOUDFLARE PAGES SETUP (Manual - Document Steps):
   Since I can't access Cloudflare dashboard, provide detailed instructions:

   **Instructions to Execute Manually:**
   
   a. Go to Cloudflare Dashboard → Pages
   
   b. Find your existing project (vibes-mk or similar)
   
   c. Go to Settings → Builds & deployments → Branch deployments
   
   d. Add production branch: `main`
   
   e. Add preview branch pattern: `develop`
   
   f. Configure build settings for develop:
      - Build command: `npm run build`
      - Build output directory: `.vercel/output/static`
      - Root directory: `web`
   
   g. Environment variables for staging:
      - Add all production env vars
      - Add: `NEXT_PUBLIC_ENVIRONMENT=staging`
   
   h. Save settings

   Staging URL will be: `develop.vibes-mk.pages.dev` or similar

3. CREATE .github/workflows/deploy-staging.yml:
   ```yaml
   name: Deploy to Staging

   on:
     push:
       branches: [develop]
     workflow_dispatch:

   jobs:
     deploy-notification:
       name: Staging Deployment Notice
       runs-on: ubuntu-latest
       steps:
         - name: 📢 Notify
           run: |
             echo "🚀 Cloudflare Pages will auto-deploy develop branch"
             echo "📍 Staging URL: https://develop.vibes-mk.pages.dev"
             echo "✅ Check deployment status in Cloudflare dashboard"
   ```

4. UPDATE README.md:
   Add deployment section:
   ```markdown
   ## Deployment

   ### Production
   - Branch: `main`
   - URL: https://vibes.mk
   - Auto-deploys via Cloudflare Pages

   ### Staging
   - Branch: `develop`
   - URL: https://develop.vibes-mk.pages.dev
   - Auto-deploys via Cloudflare Pages
   - Test all changes here before merging to main

   ### Workflow
   ```
   feature branch → PR to develop → Deploy to staging → Test → PR to main → Production
   ```
   ```

5. CREATE CONTRIBUTING.md:
   ```markdown
   # Contributing to Vibes.mk

   ## Development Workflow

   1. Create feature branch from `develop`:
      ```bash
      git checkout develop
      git pull
      git checkout -b feature/your-feature-name
      ```

   2. Make changes and test locally:
      ```bash
      cd web
      npm run dev
      ```

   3. Create PR to `develop` branch
   4. CI checks must pass
   5. Review and merge to `develop`
   6. Test on staging: https://develop.vibes-mk.pages.dev
   7. If all good, create PR from `develop` to `main`
   8. Merge to production

   ## Environments

   - **Local**: http://localhost:3000
   - **Staging**: https://develop.vibes-mk.pages.dev
   - **Production**: https://vibes.mk
   ```

TESTING:
After setup (manual steps):
1. Create develop branch
2. Configure Cloudflare (manual)
3. Push a small change to develop
4. Wait for Cloudflare deployment (~2 min)
5. Visit staging URL
6. Verify change is live on staging
7. Verify production is unaffected

ACCEPTANCE CRITERIA:
✅ develop branch created
✅ Cloudflare configured for develop deploys
✅ Staging URL accessible
✅ Push to develop triggers staging deploy
✅ Push to main triggers production deploy
✅ README updated with deployment info
✅ CONTRIBUTING.md created

DELIVERABLES:
- develop branch created
- .github/workflows/deploy-staging.yml
- Updated README.md
- New CONTRIBUTING.md
- Documentation of Cloudflare setup steps
- Screenshot of staging URL working

CONSTRAINTS:
- Do NOT affect production deployments
- Staging should use same build config as production
- Keep staging and production env vars separate
```

**Review Checklist After Agent Completes:**
- [ ] develop branch exists
- [ ] Follow manual Cloudflare setup steps
- [ ] Test staging deployment
- [ ] Verify production unaffected
- [ ] Check documentation is clear

---

## Phase 6: UX Enhancements

### 🎯 Phase 6.1: Dark Mode Implementation

```
TASK: Implement dark mode toggle for Vibes.mk with system preference detection

CONTEXT:
Users want a dark mode option for better reading at night. I need to implement a dark mode that respects system preferences and allows manual toggle.

CURRENT STATE:
- File: web/app/globals.css
- Current theme: Light only (#FDFBF7 background)
- No dark mode support

REQUIREMENTS:

1. UPDATE web/app/globals.css:
   Add dark mode CSS variables and styles:
   ```css
   @layer base {
     :root {
       --background: #FDFBF7;
       --foreground: #0a0a0a;
       --accent: #FFD300;
       --border: #000000;
       --card: #ffffff;
       --card-foreground: #0a0a0a;
     }

     @media (prefers-color-scheme: dark) {
       :root {
         --background: #0a0a0a;
         --foreground: #fafafa;
         --accent: #FFD300;
         --border: #333333;
         --card: #1a1a1a;
         --card-foreground: #fafafa;
       }
     }

     [data-theme="dark"] {
       --background: #0a0a0a;
       --foreground: #fafafa;
       --accent: #FFD300;
       --border: #333333;
       --card: #1a1a1a;
       --card-foreground: #fafafa;
     }

     [data-theme="light"] {
       --background: #FDFBF7;
       --foreground: #0a0a0a;
       --accent: #FFD300;
       --border: #000000;
       --card: #ffffff;
       --card-foreground: #0a0a0a;
     }
   }
   ```

2. CREATE web/app/_components/theme-toggle.tsx:
   ```typescript
   'use client'
   
   import { useEffect, useState } from 'react'
   
   export function ThemeToggle() {
     const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
     
     useEffect(() => {
       const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
       if (stored) {
         setTheme(stored)
         applyTheme(stored)
       }
     }, [])
     
     const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
       const root = document.documentElement
       
       if (newTheme === 'system') {
         root.removeAttribute('data-theme')
       } else {
         root.setAttribute('data-theme', newTheme)
       }
       
       localStorage.setItem('theme', newTheme)
     }
     
     const toggleTheme = () => {
       const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
       const currentIndex = themes.indexOf(theme)
       const nextTheme = themes[(currentIndex + 1) % themes.length]
       setTheme(nextTheme)
       applyTheme(nextTheme)
     }
     
     return (
       <button
         onClick={toggleTheme}
         className="rounded-full border border-black dark:border-white p-2 hover:bg-accent transition-colors"
         aria-label="Toggle theme"
       >
         {theme === 'light' && '☀️'}
         {theme === 'dark' && '🌙'}
         {theme === 'system' && '💻'}
       </button>
     )
   }
   ```

3. ADD TO NAVIGATION:
   Update web/app/_components/navigation.tsx:
   - Import ThemeToggle
   - Add to NavBar component (top-right area)

4. UPDATE COMPONENT STYLES:
   Review all components and update hardcoded colors to use CSS variables:
   - Replace `bg-[#FDFBF7]` with `bg-background`
   - Replace `text-neutral-900` with `text-foreground`
   - Replace `bg-white` with `bg-card`
   - Keep accent color #FFD300 (works in both modes)

TESTING:
After implementation:
1. Toggle theme button - cycles through light/dark/system
2. Test in light mode - looks correct
3. Test in dark mode - readable, good contrast
4. Change OS theme preference - system mode follows it
5. Refresh page - theme persists (localStorage)
6. Test all pages (homepage, blog, category pages)
7. Check accessibility (WCAG AA contrast ratios)

ACCEPTANCE CRITERIA:
✅ Dark mode CSS variables defined
✅ Theme toggle button in navigation
✅ Three modes: light, dark, system
✅ Theme persists across page reloads
✅ System mode respects OS preference
✅ All pages support dark mode
✅ Good contrast ratios (WCAG AA)
✅ No flickering on page load
✅ Smooth transitions between themes

DELIVERABLES:
- Updated web/app/globals.css
- New web/app/_components/theme-toggle.tsx
- Updated web/app/_components/navigation.tsx
- Screenshots:
  1. Light mode
  2. Dark mode
  3. Theme toggle button

CONSTRAINTS:
- Do NOT break existing light mode
- Maintain brand colors (yellow #FFD300)
- Keep good readability in both modes
- Ensure accessibility standards met
```

**Review Checklist After Agent Completes:**
- [ ] Toggle works - cycles through modes
- [ ] Dark mode looks good (test visually)
- [ ] Light mode unchanged
- [ ] Test all pages in both modes
- [ ] Check contrast with accessibility tools

---

### 🎯 Phase 6.2: Save Articles Feature

```
TASK: Implement "save for later" functionality for authenticated users

CONTEXT:
Users want to bookmark articles to read later. I need to add a save button on articles that stores saved articles in Clerk user metadata.

CURRENT STATE:
- Auth: Clerk (@clerk/nextjs)
- No save functionality
- Users can sign in via Clerk

REQUIREMENTS:

1. CREATE web/app/_components/save-button.tsx:
   ```typescript
   'use client'
   
   import { useUser } from '@clerk/nextjs'
   import { useState, useEffect } from 'react'
   
   interface SaveButtonProps {
     postId: number
     postTitle: string
   }
   
   export function SaveButton({ postId, postTitle }: SaveButtonProps) {
     const { user, isLoaded } = useUser()
     const [isSaved, setIsSaved] = useState(false)
     const [isLoading, setIsLoading] = useState(false)
     
     useEffect(() => {
       if (user?.unsafeMetadata?.savedPosts) {
         const saved = (user.unsafeMetadata.savedPosts as number[]) || []
         setIsSaved(saved.includes(postId))
       }
     }, [user, postId])
     
     const toggleSave = async () => {
       if (!user) return
       
       setIsLoading(true)
       try {
         const saved = (user.unsafeMetadata.savedPosts as number[]) || []
         const newSaved = isSaved
           ? saved.filter(id => id !== postId)
           : [...saved, postId]
         
         await user.update({
           unsafeMetadata: {
             ...user.unsafeMetadata,
             savedPosts: newSaved
           }
         })
         
         setIsSaved(!isSaved)
       } catch (error) {
         console.error('Failed to save:', error)
       } finally {
         setIsLoading(false)
       }
     }
     
     if (!isLoaded) return null
     
     return (
       <button
         onClick={toggleSave}
         disabled={isLoading || !user}
         className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black hover:bg-accent transition-colors disabled:opacity-50"
         aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
       >
         {isSaved ? '🔖 Saved' : '🔖 Save'}
       </button>
     )
   }
   ```

2. ADD TO ARTICLE CARDS:
   Update components that display articles:
   - web/app/page.tsx (side stories)
   - web/app/najnovo/latest-feed.tsx
   - web/app/all/stories-list.tsx
   - Add <SaveButton postId={post.id} postTitle={post.title} />

3. CREATE SAVED ARTICLES PAGE:
   web/app/saved/page.tsx:
   ```typescript
   import { currentUser } from '@clerk/nextjs/server'
   import { redirect } from 'next/navigation'
   import { turso } from '@/lib/turso'
   
   export default async function SavedPage() {
     const user = await currentUser()
     
     if (!user) {
       redirect('/sign-in')
     }
     
     const savedPostIds = (user.unsafeMetadata.savedPosts as number[]) || []
     
     if (savedPostIds.length === 0) {
       return (
         <div className="max-w-4xl mx-auto px-4 py-20 text-center">
           <h1 className="text-4xl font-serif font-bold mb-4">Saved Articles</h1>
           <p className="text-neutral-600">You haven't saved any articles yet.</p>
         </div>
       )
     }
     
     const rs = await turso.execute({
       sql: `SELECT * FROM posts WHERE id IN (${savedPostIds.join(',')}) ORDER BY scraped_at DESC`,
     })
     
     return (
       <div className="max-w-4xl mx-auto px-4 py-12">
         <h1 className="text-4xl font-serif font-bold mb-8">Saved Articles</h1>
         {/* Render saved posts */}
       </div>
     )
   }
   ```

4. ADD TO NAVIGATION:
   Update web/app/_components/navigation.tsx:
   - Add "Saved" link in signed-in user menu

TESTING:
After implementation:
1. Sign in to the app
2. Find an article, click "Save"
3. Button should change to "Saved"
4. Navigate to /saved
5. See saved article
6. Click save again to remove
7. Article disappears from saved page
8. Sign out and sign back in - saves persist

ACCEPTANCE CRITERIA:
✅ Save button appears on articles
✅ Saves article to Clerk user metadata
✅ Button shows correct state (saved/unsaved)
✅ /saved page lists all saved articles
✅ Only works for authenticated users
✅ Saves persist across sessions
✅ Can unsave articles
✅ No TypeScript errors

DELIVERABLES:
- New web/app/_components/save-button.tsx
- New web/app/saved/page.tsx
- Updated article components with save button
- Updated navigation with saved link
- Screenshots:
  1. Save button on article
  2. Saved articles page

CONSTRAINTS:
- Use Clerk unsafeMetadata (don't create new DB table yet)
- Only show save button to authenticated users
- Handle loading states gracefully
- Maintain existing component styling
```

**Review Checklist After Agent Completes:**
- [ ] Sign in and test save functionality
- [ ] Verify saves persist after refresh
- [ ] Test unsave functionality
- [ ] Check /saved page displays correctly
- [ ] Ensure no errors when signed out

---

## General Notes for All Phases

### Before Starting Any Phase:
1. Read the prompt completely
2. Understand the context and constraints
3. Review existing code in mentioned files
4. Plan your approach

### During Implementation:
1. Make changes incrementally
2. Test frequently
3. Follow existing code patterns
4. Use TypeScript properly (no `any` types)
5. Write clear commit messages

### After Completion:
1. Run all acceptance criteria checks
2. Test manually in browser
3. Take screenshots for visual changes
4. Document any deviations from plan
5. Note any issues encountered

### Communication:
- If requirements are unclear, ask for clarification
- If you encounter blockers, report them
- If you suggest improvements, explain reasoning
- Always provide test results and screenshots

---

Made with ❤️ for Vibes.mk  
*AI Agent Implementation Prompts*  
*January 2025*
