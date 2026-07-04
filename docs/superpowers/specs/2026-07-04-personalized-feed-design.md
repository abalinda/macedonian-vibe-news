# Personalized Feed («За тебе») — Design Spec

**Date:** 2026-07-04
**Status:** Approved by user (2026-07-04), including the added §9 profile page scope.
**Audience:** the implementing AI agent *and* a non-expert product owner. Every algorithmic choice is explained in plain language; every constant is named and lives in one file.

---

## 1. What we're building (plain language)

A new page on vibes.mk, **«За тебе»** ("For You"), that shows signed-in users a news feed ordered by *their* interests instead of pure newest-first.

Two inputs shape the order:

1. **Explicit picks** — a one-time (re-triggerable) wizard where the user selects their favorite categories.
2. **Learned behavior** — a simple, fully-explainable algorithm that watches which articles the user clicks and gradually shifts the feed toward what they actually read.

The user can always **see** what the algorithm thinks of them (the «Твојот вајб» profile bars) and **restart** it (re-running the wizard resets the learning).

### Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Who gets it | Signed-in (Clerk) users only; anonymous visitors see a pitch + sign-in prompt |
| What users pick | Categories only (Tech, Culture, Lifestyle, Business, Sports, Blog) |
| Where it lives | New dedicated page `/za-tebe`; homepage and Најново stay untouched |
| Ranking behavior | **Boost, don't hide** — preferred categories float up, nothing is filtered out |
| Transparency | Learned profile is visible (bars) and resettable |
| Algorithm | "Points-jar" (exponentially-decayed category interest profile) in Turso; no external services |
| Profile page (added) | `/profil`, signed-in only: Clerk account management + «Твојот вајб» + reading history + saved articles (bookmarking) — see §9 |

### Non-goals (v1)

- No source-level or keyword/topic preferences.
- No public profiles — `/profil` is private, only ever shows the signed-in user their own data.
- No personalization of the homepage or Најново.
- No PostHog dependency at feed-render time (PostHog stays analytics-only).
- No Claude/LLM per-user scoring (possible v2 layer).
- No anonymous/localStorage personalization.
- No cross-user collaborative filtering ("people like you also read…").

---

## 2. The algorithm, explained like I'm five (and precisely)

**Mental model: six jars with a slow leak.** Each user has one jar per category. Points go in when they show interest; all jars slowly leak over time so old interests fade.

### 2.1 Rules

| Event | Effect |
|---|---|
| Wizard: category **picked** | Jar seeded to **5.0** points |
| Wizard: category **not picked** | Jar seeded to **1.0** point (never zero → nothing is ever hidden) |
| User clicks an article | **+1.0** point to that article's category jar (same article max once per 24h) |
| Time passes | Every jar decays with a **14-day half-life**: `weight × 0.5^(days_elapsed / 14)` |
| Wizard re-run («Смени ги вибрациите») | All six jars re-seeded fresh to 5.0 / 1.0 — this **is** the reset; there is no separate reset button |

Decay is **lazy**: there is no cron job. Whenever a jar is read or written we first apply the decay owed since its `updated_at`, then proceed. The math catches up whenever the user shows up.

### 2.2 Scoring a post

```
score = recency × boost × vibes_bonus

recency     = 0.5 ^ (hours_since_published / 36)        // 36h half-life
boost       = min(3.0, user_jar[post.category] / avg(all 6 jars))
              // missing jar rows count as 1.0
vibes_bonus = post.good_vibes ? 1.2 : 1.0
```

Feed = latest 150 posts, scored, sorted descending.

### 2.3 Worked example (MUST hold true in the implementation — used as the sanity test)

User picked **Tech + Sports**. Jars: Tech 5, Sports 5, Culture 1, Lifestyle 1, Business 1, Blog 1. Average = 14/6 ≈ 2.333.

- Tech boost = 5 / 2.333 ≈ **2.143**
- Culture boost = 1 / 2.333 ≈ **0.429**

A 20-hour-old Tech story (not good_vibes): `0.5^(20/36) × 2.143 × 1.0 ≈ 0.680 × 2.143 ≈ 1.457`
A 2-hour-old Culture story (not good_vibes): `0.5^(2/36) × 0.429 × 1.0 ≈ 0.962 × 0.429 ≈ 0.413`

→ The Tech story ranks higher, but the Culture story is still present in the feed. If the Culture story were `good_vibes` its score becomes ≈ 0.496 — surfacing big stories regardless of taste.

A user with **no wizard picks and no clicks** has no jar rows → every boost = 1.0 → the feed degrades gracefully to newest-first (+ good_vibes bonus).

### 2.4 Profile bars («Твојот вајб»)

`share_c = jar_c / Σ jars`, shown as percentages. The bars are computed from the same jars that drive ranking, so they can never disagree with the actual feed order.

### 2.5 Properties worth knowing (for the product owner)

- Steady state: ~1 click/day in one category settles its jar around 21 points (`1 / (1 − 0.952)`); the 3.0 boost cap prevents any single obsession from monopolizing the feed.
- Abandoned interests halve every 2 weeks and are effectively gone in ~6 weeks.
- Because unpicked jars floor at 1.0 seed and missing rows read as 1.0, the algorithm can always observe clicks outside your picks — that's how it discovers taste changes.

---

## 3. Data model (Turso)

No migration files — idempotent runtime guards, same pattern as `ensureAdminChoiceColumn()`. Guard function `ensurePersonalizationTables()` lives in `web/lib/personalization-db.ts` and is called by every server entry point that touches these tables.

```sql
CREATE TABLE IF NOT EXISTS user_category_prefs (
  user_id    TEXT NOT NULL,          -- Clerk user id
  category   TEXT NOT NULL,          -- 'Tech' | 'Culture' | 'Lifestyle' | 'Business' | 'Sports' | 'Blog'
  picked     INTEGER NOT NULL DEFAULT 0,  -- 1 if chosen in the wizard
  weight     REAL NOT NULL DEFAULT 1.0,   -- the jar
  updated_at TEXT NOT NULL,          -- ISO timestamp; anchor for lazy decay
  PRIMARY KEY (user_id, category)
);

CREATE TABLE IF NOT EXISTS user_clicks (
  user_id    TEXT NOT NULL,
  post_id    INTEGER NOT NULL,
  category   TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, post_id, clicked_at)
);
CREATE INDEX IF NOT EXISTS idx_user_clicks_user_time ON user_clicks (user_id, clicked_at);
```

- `user_clicks` is the audit trail: it explains the jars, allows recomputing weights if the formula ever changes, and is **pruned lazily** — on each click write, also `DELETE FROM user_clicks WHERE user_id = ? AND clicked_at < datetime('now', '-90 days')` (privacy + size hygiene).
- Wizard existence check: user has completed the wizard ⇔ they have ≥1 row in `user_category_prefs`.
- Clerk account deletion is out of scope for v1 (orphaned rows are harmless); noted as future cleanup.

---

## 4. Components & code layout

### 4.1 New files

| File | Purpose |
|---|---|
| `web/lib/categories.ts` | **Single source of truth** for the 6 categories: enum values, slot ids, Macedonian labels. New code imports from here; existing 6+ copy-pasted maps migrate opportunistically (not a blocker for this feature). |
| `web/lib/personalization.ts` | **Pure functions only, no I/O** — the entire algorithm: `decayWeight()`, `applyClick()`, `seedJars()`, `scorePost()`, `rankPosts()`, `profileShares()`, plus all named constants (`SEED_PICKED = 5`, `SEED_UNPICKED = 1`, `CLICK_POINTS = 1`, `DECAY_HALF_LIFE_DAYS = 14`, `RECENCY_HALF_LIFE_HOURS = 36`, `BOOST_CAP = 3`, `GOOD_VIBES_BONUS = 1.2`, `FEED_FETCH_LIMIT = 150`, `CLICK_DEDUPE_HOURS = 24`, `CLICK_RETENTION_DAYS = 90`). Retuning the algorithm = editing this one file. |
| `web/lib/personalization-db.ts` | I/O layer: `ensurePersonalizationTables()`, `getJars(userId)`, `recordClick(userId, postId, category)` (decay → dedupe check → +1 upsert → click log → lazy prune, all via one `client.batch()`), `reseedJars(userId, picked[])`. |
| `web/app/actions/preferences.ts` | Server actions (mirror `app/actions/search.ts` style): `getPreferences()`, `savePreferences(picked: string[])` (validates against `categories.ts`, requires ≥1 pick, reseeds jars). Both no-op/return null when signed out. |
| `web/app/za-tebe/page.tsx` | Server component. Signed out → pitch + `SignInButton`. Signed in, no pref rows → wizard. Otherwise → profile header + personalized feed. Dynamic rendering (Clerk makes it dynamic anyway); **no ISR**. |
| `web/app/za-tebe/vibe-wizard.tsx` | Client component: 6 category cards (multi-select, min 1), «Зачувај» calls `savePreferences`, then refresh. Also rendered when re-triggered via «Смени ги вибрациите» (with copy warning that saving restarts the learning). |
| `web/app/za-tebe/vibe-profile.tsx` | Client component: «Твојот вајб» bars (percent shares) + «Смени ги вибрациите» button that reopens the wizard. |
| `web/app/za-tebe/personal-feed.tsx` | Client list component, modeled on `najnovo/latest-feed.tsx`: initial 18 posts, «Уште» load-more (+18), uses shared `ArticleLink` with `feed="za-tebe"`. |

### 4.2 Modified files

| File | Change |
|---|---|
| `web/app/go/[id]/route.ts` | Extend the `SELECT` to also fetch `category`; after the existing global `clicks` bump, if `currentUser()` exists call `recordClick()`. Wrapped in try/catch — **click learning must never block or break the redirect**. Signed-out behavior unchanged. |
| `web/app/blog/[id]/page.tsx` | Blog posts never pass through `/go`; on server render, if signed in, `recordClick()` for the Blog category (fire-safe, try/catch). Note: router prefetch could trigger a render without a real read — acceptable because the 24h dedupe caps it at +1/post/day; if it proves noisy, switch to a tiny client-side server-action call on mount. |
| `web/app/_components/navigation.tsx` | Add «За тебе» to `menuLinks` and the `CategoryNav` array (visible to everyone; the page itself handles the signed-out pitch). |
| `web/app/_components/article-link.tsx` | Extend the `feed` prop union with `'za-tebe'` for PostHog `article_click`. |
| `web/DESIGN_SYSTEM.md` | Add the new "vibe bars" pattern (and wizard card selected-state if it's a new recipe) in the **same commit** that introduces them — per repo rule. |

### 4.3 What talks to what

```
wizard (client) ──savePreferences──▶ actions/preferences.ts ──▶ personalization-db.reseedJars ──▶ Turso
article click ──▶ /go/[id] route ──▶ personalization-db.recordClick ──▶ Turso
/za-tebe (server) ──▶ getJars + SELECT latest 150 posts ──▶ personalization.rankPosts (pure) ──▶ rendered feed
profile bars ◀── personalization.profileShares (same jars)
```

PostHog keeps receiving `article_click` exactly as today (now also with `feed: 'za-tebe'`) — analytics and the ranking algorithm are deliberately independent systems.

---

## 5. UX & copy (Macedonian, per DESIGN_SYSTEM.md voice)

**`web/DESIGN_SYSTEM.md` is mandatory reading before building any of this UI.** Neo-brutalist: hard borders, offset zero-blur shadows, `#FFD300` selected states, Playfair headlines, mono UPPERCASE labels.

- Page title: **«За тебе»**; nav label «ЗА ТЕБЕ».
- Wizard: headline «Избери ги твоите вибрации», sub «Одбери барем една категорија — остатокот го учиме од тебе.», CTA «Зачувај». Re-run variant adds: «Зачувувањето ги ресетира научените вибрации.»
- Profile: «Твојот вајб» + bars; button «Смени ги вибрациите».
- Signed-out pitch: reuse the promise already in the nav drawer («…персонализирани вибрации») + `SignInButton`.
- Empty/new state (picks saved, no clicks yet): feed renders immediately (seeded picks are enough to rank) — no special empty state needed.

---

## 6. Error handling & edge cases

| Case | Behavior |
|---|---|
| Any Turso error while ranking | Catch → fall back to plain newest-first list (the Најново query). The page must never 500 because of personalization. |
| `recordClick` fails in `/go` | Swallowed (logged to console); redirect always proceeds. Global `clicks` bump unchanged. |
| User clicks but never did the wizard | Missing jar rows read as 1.0; the click upserts just that category's row. Feed personalizes gently even pre-wizard. |
| User picks all 6 categories | Allowed — boosts start uniform; learning differentiates over time. |
| `savePreferences` with 0 picks / invalid category | Rejected server-side (validated against `categories.ts`). |
| Signed out on `/za-tebe` | Pitch + sign-in; no DB reads. |
| Repeated clicking same article | +1 at most once per 24h per post (dedupe against `user_clicks`). |
| Table doesn't exist yet | `ensurePersonalizationTables()` guard at every entry point (same pattern as existing guards). |
| Post with unknown/legacy category (e.g. removed `iran`) | Boost treated as 1.0; never crashes. |

---

## 7. Testing & verification (repo has no test infra — this is the plan)

1. **Algorithm sanity script** — `web/scripts/personalization-check.ts`, run with `npx tsx`: asserts the worked example from §2.3 (seeds → boosts → the two scores → ordering), the decay half-life (weight halves after exactly 14 days), the boost cap, and the graceful no-prefs case. Pure functions in `personalization.ts` make this trivial. **The implementing agent must run it and show passing output.**
2. **Manual E2E checklist** (local `npm run dev` against real Turso):
   - Signed out → `/za-tebe` shows pitch; nav link visible.
   - Sign in → wizard appears; save Tech+Sports → feed renders, Tech/Sports on top; verify jar rows in DB (`weight 5/1, picked 1/0`).
   - Click 3 Culture articles via the feed → redirect works, `user_clicks` rows appear, Culture jar ≈ 4.0, Culture stories climb on reload; same-article re-click within 24h does **not** add points.
   - «Смени ги вибрациите» → re-pick → jars reseeded (learned Culture points gone).
   - Bars match jar shares; `/go` still fast + correct when signed out.
3. **Static checks**: `npx eslint .` and `npx tsc --noEmit` from `web/` (the build ignores errors, so run these explicitly).
4. **Preview deploy**: push the feature branch → `<branch>.macedonian-vibe-news.balinda-centar.workers.dev` → re-run checklist against production Turso before merging.

---

## 9. User profile page — `/profil` (added scope, approved 2026-07-04)

Signed-in only (signed out → same pitch-and-sign-in pattern as `/za-tebe`). Private — a user only ever sees their own data. Four stacked sections, all per DESIGN_SYSTEM.md:

1. **Сметка (account)** — Clerk's embedded `<UserProfile routing="hash" />` (name, email, avatar, security, delete account), wrapped in a brand-styled card via Clerk's `appearance` prop. We build no account CRUD ourselves.
2. **Твојот вајб** — reuses the exact `vibe-profile.tsx` component from `/za-tebe` (bars + «Смени ги вибрациите», which links to `/za-tebe` with the wizard open).
3. **Прочитано (reading history)** — last 20 clicked articles: `user_clicks` JOIN `posts`, newest first, rendered with the standard card recipe + `ArticleLink` (`feed: 'profile'`). Row limit keeps it one query, no pagination in v1.
4. **Зачувано (saved articles)** — the bookmark list, with unsave buttons.

### 9.1 Bookmarking («сочувај написи»)

New table (same runtime-guard pattern, added to `ensurePersonalizationTables()`):

```sql
CREATE TABLE IF NOT EXISTS user_saved_posts (
  user_id  TEXT NOT NULL,
  post_id  INTEGER NOT NULL,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (user_id, post_id)
);
```

- **`web/app/actions/bookmarks.ts`** — server actions mirroring `actions/search.ts` style: `toggleBookmark(postId)` (upsert/delete, returns new state), `getSavedPosts()` (JOIN posts, newest-saved first, LIMIT 100), `getSavedIds(postIds[])` (for rendering initial button states on feed pages).
- **`web/app/_components/save-button.tsx`** — client component: small bookmark icon button (hand-rolled inline SVG, per repo convention) rendered on article cards. Signed out → hidden (`SignedIn` wrapper). Optimistic toggle → `toggleBookmark`. Must `stopPropagation`/`preventDefault` so it never triggers the surrounding `ArticleLink` navigation. Saved state = `#FFD300` fill.
- **Placement (v1):** cards on `/za-tebe`, `/najnovo`, and `/profil`'s saved/history lists. Homepage and `/all` are skipped in v1 (home is a shared ISR page — per-user saved-state would break its caching; `/all` can follow later using the same component).
- **Signal coupling:** saving an article also adds **+1.0** to that category's jar via the same `applyClick` path (saving is at least as strong a signal as clicking). Unsaving does *not* subtract — keeps the mechanism one-directional and simple.
- PostHog: fire `article_save` event (`post_id, category, source, feed, saved: true|false`) from the button, consistent with existing `article_click` instrumentation.

### 9.2 Additional files/changes for §9

| File | Purpose |
|---|---|
| `web/app/profil/page.tsx` | Server component assembling the four sections; fetches jars, history, saved list in parallel (`Promise.all`). |
| `web/app/_components/save-button.tsx` | Shared bookmark toggle (above). |
| `web/app/actions/bookmarks.ts` | Bookmark server actions (above). |
| `web/app/_components/navigation.tsx` | Signed-in drawer area gets a «Профил» link (next to the existing `UserButton`). |
| `web/app/_components/article-link.tsx` | `feed` union also gains `'profile'`. |

### 9.3 §9 additions to error handling & testing

- History/saved sections that fail to load render an inline Macedonian error card; the rest of `/profil` still works.
- Deleted posts referenced by saves/clicks: JOIN naturally drops them; no cleanup needed.
- Manual checklist additions: save/unsave from `/za-tebe` and `/najnovo` (button doesn't navigate!), state survives reload and appears on `/profil`; saving bumps the jar (verify in DB); reading history shows the 3 Culture clicks from the earlier checklist step; Clerk account panel loads styled.

---

## 10. Rollout & future ideas (explicitly out of scope)

Ship dark on a feature branch → preview → merge to main → announce via the existing welcome-modal slot if desired. No feature flag needed: the pages are additive and signed-in-gated.

Parked for v2: Claude-written taste summaries («Твојот вајб, напишан од АИ»), source preferences, digest emails, homepage hero nudging by aggregate jar data, save buttons on the homepage/`/all`, public profiles.
