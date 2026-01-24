# 🎯 PM Quick Start Guide - How to Command AI Agents

A practical guide for coordinating AI coding agents to implement the Vibes.mk upgrade plan.

## 👋 Your Role as Product Manager

You're the **orchestra conductor** - you don't code every line, but you coordinate AI agents to build features efficiently and correctly.

**Your Responsibilities:**
- ✅ Define what to build (requirements)
- ✅ Prioritize features (what's next?)
- ✅ Review agent work (is it correct?)
- ✅ Make decisions (choose between options)
- ✅ Keep stakeholders informed (report progress)

**What AI Agents Do:**
- 🤖 Write code based on your requirements
- 🤖 Run tests and fix bugs
- 🤖 Create documentation
- 🤖 Implement features end-to-end

---

## 📋 How to Work with AI Agents

### Step 1: Choose a Feature to Build

**Example:** "Implement Phase 1.1 - Groq API Migration"

Open the checklist in IMPLEMENTATION_ROADMAP.md:
```
### Weeks 1-2: Backend Migration
- [ ] Day 1-2: Groq account setup, API key configuration
- [ ] Day 3-5: Update curator_2.py with Groq client
- [ ] Day 6-8: A/B testing Groq vs Gemini quality
```

---

### Step 2: Write Clear Instructions for the AI Agent

**❌ BAD (too vague):**
```
"Add Groq to the scraper"
```

**✅ GOOD (specific & actionable):**
```
Implement Groq API integration in the scraper with these requirements:

1. Install the groq Python package
2. Update scraper/curator_2.py:
   - Add Groq client initialization
   - Update MODEL_PRIORITY to include Groq models first:
     * mixtral-8x7b-32768 (primary)
     * llama-3.3-70b-versatile (secondary)
     * gemini-2.5-flash-lite (fallback)
   - Modify generate_with_fallback() to try Groq first, then Gemini
3. Update requirements.txt to include groq package
4. Test with a small batch (5 articles) before full deployment
5. Document the API key setup in README.md

Acceptance criteria:
- Scraper successfully processes articles using Groq
- Falls back to Gemini if Groq fails
- Logs which model was used for each article
- No breaking changes to existing functionality
```

---

### Step 3: Review the Agent's Work

**What to Check:**

✅ **Does it match requirements?**
```bash
# Read the code changes
git diff

# Look for:
- Were all requirements addressed?
- Did the agent add tests?
- Is documentation updated?
```

✅ **Does it work?**
```bash
# Run locally
cd scraper
python scraper_2.py --dry-run

# Check logs
tail -f logs/scraper_log.jsonl
```

✅ **Is it safe?**
```bash
# Check for secrets committed
git diff | grep -i "api_key\|password\|secret"

# Should return nothing!
```

---

### Step 4: Provide Feedback

**If work is good:**
```
"Great work! The Groq integration looks solid. I tested it locally 
and it processed 10 articles successfully. Merge this PR."
```

**If changes needed:**
```
"Good start, but I found two issues:
1. The fallback isn't working - when Groq fails, the scraper crashes 
   instead of trying Gemini. Please add proper error handling.
2. The logs don't show which model was used. Please add a log entry 
   like: 'Curated article XYZ using model: mixtral-8x7b-32768'

Please fix these and I'll review again."
```

---

## 🎨 Real-World Examples

### Example 1: Implementing Vibes News Category

**Your Instructions:**
```
Implement the new "Vibes News" category (Phase 2):

BACKEND (scraper):
1. Add to scraper/scraper_2.py:
   - Add "vibesnews" to FEATURE_SLOTS dictionary
   - Add 5 RSS feeds for original Macedonian journalism in TARGET_FEEDS
     (suggest sources like Meta.mk, Plusinfo, etc.)
   - Category should be "VibesNews"

FRONTEND (web):
2. Update web/app/_components/navigation.tsx:
   - Add "Vibes Vesti" to categories array
   - Position it after "Блог" in the menu

3. Update web/app/page.tsx:
   - Add VibesNews to CATEGORY_SLOT_MAP
   - Add "Vibes Вести" to CATEGORY_LABELS

4. Create new page: web/app/vibes-news/page.tsx
   - Similar structure to other category pages
   - Filter posts where category = "VibesNews"

TEST IT:
- Run scraper and verify articles are categorized as VibesNews
- Navigate to /?category=VibesNews and see articles
- Click "Vibes Vesti" in nav and see the page

DOCUMENT:
- Update README.md to mention the new category
```

**Agent Response:**
```
✅ I've implemented the Vibes News category. Here's what I did:

FILES CHANGED:
- scraper/scraper_2.py: Added vibesnews slot + 5 RSS feeds
- web/app/_components/navigation.tsx: Added nav item
- web/app/page.tsx: Added category mapping
- web/app/vibes-news/page.tsx: Created new page (88 lines)
- README.md: Updated category list

TESTING:
- Ran scraper locally: 3 articles categorized as VibesNews ✅
- Built frontend: No TypeScript errors ✅
- Navigated to /vibes-news: Page renders correctly ✅

Ready for your review!
```

**Your Review:**
```bash
# Check the code
git diff scraper/scraper_2.py
# ✅ Looks good, 5 feeds added

# Test locally
cd web && npm run dev
# Navigate to http://localhost:3000/vibes-news
# ✅ Works!

# Approve
"Excellent work! All requirements met. Merging this."
```

---

### Example 2: Homepage Redesign (Complex Task)

**Your Instructions:**
```
Redesign the homepage with a multi-section layout (Phase 3.1):

REQUIREMENTS:
1. Keep existing hero section but improve styling
2. Add "Trending Now" section:
   - Show top 3 articles by clicks in last 24 hours
   - Horizontal card layout on desktop, vertical on mobile
   - Create API route: /api/trending
   
3. Add "By Category" grid:
   - 6 columns on desktop (Tech, Culture, Lifestyle, Business, Sports, VibesNews)
   - 2 columns on mobile
   - Show 2 articles per category
   - Each category has a colored header
   
4. Keep existing side stories

DESIGN GUIDELINES:
- Use existing color scheme (#FFD300 yellow, black borders)
- Maintain serif fonts for headlines
- Add subtle shadows (4px offset) for depth
- Ensure mobile responsive

PHASES:
- Phase 1: Create /api/trending route
- Phase 2: Update homepage layout
- Phase 3: Style and polish

Do Phase 1 first, then I'll review before moving to Phase 2.
```

**Agent Response (Phase 1):**
```
✅ Created /api/trending route

FILE: web/app/api/trending/route.ts
- Fetches posts from last 24 hours
- Orders by clicks DESC
- Returns top 3
- Includes proper error handling

TESTED:
- http://localhost:3000/api/trending returns JSON ✅
- Sample response:
  [
    {"id": 123, "title": "...", "clicks": 45},
    {"id": 456, "title": "...", "clicks": 32},
    {"id": 789, "title": "...", "clicks": 28}
  ]

Ready for Phase 2?
```

**Your Feedback:**
```
"Perfect! The API route works well. Proceed to Phase 2 - update 
the homepage layout to use this API and add the trending section."
```

---

## 🎓 Teaching AI Agents

### How to Get Better Results

**1. Be Specific About Tech Stack**
```
❌ "Add a rich text editor"
✅ "Add Tiptap rich text editor to the blog composer. Use these features:
   - Bold, italic, underline
   - H2, H3 headings
   - Bullet/numbered lists
   - Image upload
   - Character count
   Install: npm install @tiptap/react @tiptap/starter-kit"
```

**2. Provide Examples**
```
"Style the trending section like this:

Desktop:
┌─────────────┬─────────────┬─────────────┐
│  Article 1  │  Article 2  │  Article 3  │
│  [image]    │  [image]    │  [image]    │
│  Title      │  Title      │  Title      │
│  45 clicks  │  32 clicks  │  28 clicks  │
└─────────────┴─────────────┴─────────────┘

Mobile (stack vertically):
┌─────────────┐
│  Article 1  │
│  [image]    │
└─────────────┘
┌─────────────┐
│  Article 2  │
└─────────────┘
...
```

**3. Reference Existing Code**
```
"Follow the same pattern as the side stories in web/app/page.tsx:
- Same card structure
- Same hover effects
- Same typography (font-serif for title)
Just adapt it for the trending section."
```

**4. Set Acceptance Criteria**
```
"This feature is done when:
✅ Trending section appears on homepage below hero
✅ Shows exactly 3 articles
✅ Updates every 60 seconds (ISR revalidation)
✅ Mobile responsive (tested on iPhone SE size)
✅ No TypeScript errors
✅ Lighthouse performance score > 90"
```

---

## ⚠️ Common Pitfalls & How to Avoid

### Pitfall 1: Agent Changes Too Much

**Problem:**
```
You ask: "Add a button to save articles"
Agent returns: "I redesigned the entire homepage, changed the database 
schema, added user accounts, and rewrote the scraper"
```

**Solution:**
```
Be explicit about scope:
"Add ONLY a save button next to article titles. Do not change:
- Database schema (we'll add that later)
- Homepage layout
- Any other components
Just add the UI button for now, it can be non-functional."
```

### Pitfall 2: Agent Doesn't Test

**Problem:**
```
Agent: "I added the feature!"
You: "Does it work?"
Agent: "I didn't test it"
*You test, it's broken* 😫
```

**Solution:**
```
Always require testing in your instructions:
"After implementing, you MUST:
1. Run the dev server and manually test the feature
2. Run npm run build to ensure no build errors
3. Test on mobile (use Chrome DevTools device emulation)
4. Provide screenshots of the working feature"
```

### Pitfall 3: Breaking Changes

**Problem:**
```
Agent adds a feature, but breaks existing functionality
```

**Solution:**
```
"Before making changes:
1. Run the app and verify everything works
2. Take note of what works
3. After changes, verify all previous functionality still works
4. If anything breaks, fix it before submitting"
```

---

## 📊 Progress Tracking

### Daily Standups (With Yourself)

**Ask these questions:**
1. What did AI agents complete yesterday?
2. What are they working on today?
3. Any blockers?

**Example:**
```
Day 5 Standup:
✅ Completed: Groq API integration
🔄 In Progress: Testing Groq quality vs Gemini
🚧 Blocked: Need to decide on quality threshold (what's acceptable?)

Action: Test 50 articles with Groq, review summaries, set threshold
```

### Weekly Reviews

**Every Friday:**
1. Review all merged PRs
2. Update the checklist in PR description
3. Celebrate wins 🎉
4. Plan next week

---

## 🎯 Sample Week Plan

### Monday: Planning
```
Morning:
- Review IMPLEMENTATION_ROADMAP.md
- Choose this week's features
- Write detailed instructions for AI agent

Afternoon:
- Start agent on Task 1
- Review initial code
```

### Tuesday-Thursday: Building
```
Morning:
- Review agent's overnight work
- Test features locally
- Provide feedback

Afternoon:
- Agent addresses feedback
- You review and approve
- Merge to develop (staging)
```

### Friday: Testing & Deployment
```
Morning:
- Test all week's features on staging
- Write changelog

Afternoon:
- Merge to main (production)
- Monitor for errors
- Update stakeholders
```

---

## 🚀 Your First Week

### Day 1: Setup
```
Tasks:
✅ Review all three planning docs (UPGRADE_PLAN.md, etc.)
✅ Set up Groq account, get API key
✅ Add GROQ_API_KEY to GitHub Secrets
✅ Create develop branch for staging
```

**Instructions to AI Agent:**
```
"Create a develop branch and update the GitHub workflow to 
auto-deploy it to a staging environment. Document the process 
in CONTRIBUTING.md."
```

### Day 2-3: Groq Migration
```
**Instructions to AI Agent:**
"Implement Groq API integration per Phase 1.1 in 
IMPLEMENTATION_ROADMAP.md. Focus on backward compatibility 
and proper error handling."
```

### Day 4-5: Testing & Refinement
```
**Your Tasks:**
- Run scraper with Groq locally
- Compare 20 article summaries (Groq vs Gemini)
- Make decision: is quality acceptable?

**If yes:**
"Deploy to production"

**If no:**
"Tune the AI prompt to improve quality"
```

---

## 💡 Pro Tips

### 1. Start Small
```
Don't ask for: "Redesign the entire homepage"
Ask for: "Add a trending section to the homepage"
Then: "Add category grid"
Then: "Polish styling"

Small increments = easier to review = less bugs
```

### 2. Keep Context
```
Reference previous work:
"Build on the Groq integration we did last week. Now add..."
```

### 3. Screenshot Everything
```
Always ask agents to provide screenshots:
"After implementing, provide screenshots showing:
1. Desktop view (1920x1080)
2. Mobile view (375x667)
3. The feature in action"
```

### 4. Document Decisions
```
When you make a choice, document why:
"We chose Groq over OpenAI because:
- Better rate limits
- Lower cost
- Good enough quality for our use case
(Documented in UPGRADE_PLAN.md)"
```

---

## 📞 Getting Help

### When Agent Is Stuck
```
Agent: "I can't figure out how to implement X"

Your options:
1. Break it down further (smaller steps)
2. Provide an example from the codebase
3. Point to documentation
4. Ask a human developer for advice
```

### When You're Unsure
```
Ask the agent for options:
"What are 3 different ways we could implement dark mode?
List pros/cons of each."

Then pick the best option.
```

---

## ✅ Checklist Before Each Feature

Before asking an agent to build something:

- [ ] I've clearly defined what needs to be built
- [ ] I've specified acceptance criteria
- [ ] I've identified which files need changes
- [ ] I've set a scope (what NOT to change)
- [ ] I've required testing
- [ ] I know how I'll verify it works

---

## 🎉 Celebrate Wins!

**After each successful feature:**
```
🎊 Groq migration complete!
   - 50% cost reduction
   - No quality loss
   - Zero downtime

🎊 Vibes News launched!
   - 5 new sources
   - Beautiful new page
   - First 10 articles published
```

Track your wins. You're building something great! 💪

---

**You've got this!** 

Start with Phase 1 (Groq migration), take it step by step, and before you know it, Vibes.mk will be transformed! 🚀

---

Made with ❤️ for Vibes.mk PMs
*Last Updated: January 2025*
