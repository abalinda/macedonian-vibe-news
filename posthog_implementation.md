# PostHog Implementation Analysis - Vibes.mk

## Current Implementation

### 1. SDK & Initialization

- **Package**: `posthog-js` v1.305.0 (client-side only, no `posthog-node`)
- **Init location**: `web/instrumentation-client.ts` — uses Next.js instrumentation hook for early loading
- **API host**: Proxied through `https://t.vibes.mk` (good — avoids ad blockers)
- **UI host**: `https://eu.posthog.com` (EU region)
- **Config**:
  - `defaults: '2026-01-30'` — uses the PostHog defaults bundle
  - `opt_in_site_apps: true` — site apps enabled (toolbars, surveys, etc.)
  - `person_profiles: 'identified_only'` — anonymous users don't create person profiles (cost-efficient)

### 2. Provider Setup

- `web/app/providers.tsx` wraps children in `PostHogProvider` using the singleton `posthog` client
- Mounted in `web/app/layout.tsx` around the entire app body — all pages are covered

### 3. User Identification (Clerk Integration)

Single `PostHogClerkSync` component in `web/app/PostHogClerkSync.tsx`, mounted in the root layout.

- **Distinct ID**: Clerk `user.id` (stable, unique)
- **Person properties**: `email` and `name` sent on identify
- **Sign-out**: calls `posthog.reset()` to clear the session

Previously there was a duplicate inline `PostHogClerkSync` inside `navigation.tsx` that identified by a different key — this was removed to prevent split person profiles.

### 4. Feature Flags

- `useFeatureFlagEnabled('title-change-flag')` is used in `NavBar` to conditionally change the site title to "FLAG-ENABLED"
- This appears to be a test/debug flag, not a production feature flag

### 5. Autocapture & Pageviews

- With the default config, PostHog autocapture is enabled. This means:
  - All clicks, form submissions, and page changes are captured automatically
  - Pageview events fire on route changes
- One manual `posthog.capture('contact_email_clicked')` event fires when a user clicks the contact email link on `/about`

### 6. Session Replay

- Not explicitly disabled, and defaults bundle likely enables it. Session replays are probably being recorded.

---

## What's NOT Being Used

The following PostHog features have zero implementation in the codebase:

| Feature | Description |
|---|---|
| **Custom Events** (`posthog.capture()`) | One event implemented (`contact_email_clicked` on `/about`). Most user actions still rely on autocapture only. |
| **Server-side tracking** (`posthog-node`) | No backend analytics. The `/go/[id]` redirect route tracks clicks in the DB but doesn't send events to PostHog. |
| **Group Analytics** | No `posthog.group()` calls. Could be used to group by news source, category, etc. |
| **Surveys** | Active on the Blog category page (`/?category=Blog`), configured via the PostHog dashboard. |
| **A/B Testing (Experiments)** | Only one test flag exists (`title-change-flag`), and it's used for a debug label, not a real experiment. |
| **Person Properties** | Only `name` is set during identify. No category preferences, visit frequency, or user tier properties. |
| **Super Properties** (`posthog.register()`) | Not used. Could attach persistent context (e.g., PWA vs. browser, preferred category). |
| **Revenue / Conversion Tracking** | No conversion funnels defined via custom events. |
| **Error Tracking** | PostHog can capture frontend exceptions. Not configured. |
| **Web Analytics Dashboard** | Likely working passively via autocapture, but no custom dashboards mentioned. |

---

## Improvement Ideas

### Priority 1 — Fix Existing Issues (DONE)

#### 1.1 Remove duplicate `PostHogClerkSync` in navigation.tsx
The inline `PostHogClerkSync` component inside `navigation.tsx` was removed. The standalone `PostHogClerkSync.tsx` now identifies by Clerk `user.id` with email as a person property — no more split profiles.

#### 1.2 Clean up unused import
`useFeatureFlagVariantKey` import was removed from `navigation.tsx`.

---

### Priority 2 — Custom Event Tracking

These are high-value events that autocapture can't provide with meaningful context:

#### 2.1 Article Click Tracking
When a user clicks on a story (hero, side story, search result), capture it with context:

```ts
posthog.capture('article_clicked', {
  article_id: post.id,
  article_title: post.title,
  source: post.source,
  category: post.category,
  position: 'hero' | 'secondary_hero' | 'left_sidebar' | 'right_sidebar',
  is_blog: post.category === 'Blog',
})
```

#### 2.2 Search Tracking
Capture search queries and whether they produced results:

```ts
posthog.capture('search_performed', {
  query: trimmedQuery,
  results_count: results.length,
  had_results: results.length > 0,
})
```

#### 2.3 Category Navigation
Track which categories users browse:

```ts
posthog.capture('category_viewed', {
  category: selectedCategory,
})
```

#### 2.4 Outbound Link Clicks (Server-Side)
The `/go/[id]` route already tracks clicks in the DB. Add `posthog-node` to also capture these server-side:

```ts
posthogNode.capture({
  distinctId: 'anonymous', // or extract from cookie
  event: 'outbound_link_clicked',
  properties: { post_id: postId, target_url: targetUrl },
})
```

#### 2.5 Welcome Modal Interactions
Track whether users engage with the welcome modal:

```ts
posthog.capture('welcome_modal_shown')
posthog.capture('welcome_modal_dismissed', { action: 'najnovo' | 'about' })
```

---

### Priority 3 — Enrich Person Profiles

#### 3.1 Set Person Properties on Identify
Add more useful properties when identifying users:

```ts
posthog.identify(user.id, {
  email: email,
  name: user.fullName,
  signup_method: user.externalAccounts?.[0]?.provider || 'email',
  created_at: user.createdAt,
})
```

#### 3.2 Super Properties (Persistent Context)
Register properties that attach to every event:

```ts
posthog.register({
  is_pwa: window.matchMedia('(display-mode: standalone)').matches,
  preferred_category: lastViewedCategory,
  is_admin: isAdminEmail(email),
})
```

This lets you segment all analytics by PWA vs. browser users, power users vs. casual, etc.

---

### Priority 4 — Feature Flags & Experiments

#### 4.1 Real A/B Tests
Use feature flags for actual experiments instead of debug labels:

- **Layout experiment**: Test whether a 2-column vs. 3-column layout on mobile affects engagement
- **Hero size experiment**: Test whether a larger/smaller hero image affects click-through rate
- **Category order experiment**: Test whether reordering the category nav affects category discovery
- **Welcome modal copy**: Test different CTA text in the welcome modal

#### 4.2 Feature Rollouts
Use flags to gradually roll out new features:

- Dark mode
- Personalized feed ordering
- Push notifications (PWA)
- Bookmarking/saving articles

---

### Priority 5 — Surveys (Partially Done)

Surveys are already active on the Blog category page (`/?category=Blog`), configured via the PostHog dashboard. Ideas for expanding:

- **NPS survey**: "How likely are you to recommend Vibes to a friend?" — target after 5+ visits
- **Category feedback**: "What category would you like us to add?" — target on the /all page
- **Content quality**: "Was this article useful?" — target on individual blog post pages (`/blog/[id]`)
- **Feature request**: "What feature would improve Vibes for you?" — target signed-in users

---

### Priority 6 — Server-Side Analytics with `posthog-node`

Install `posthog-node` for backend event tracking:

- Track scraper activity (new articles ingested, sources scraped)
- Track admin actions (hero overrides, post management)
- Track API-level metrics (search queries from server actions, redirect counts)
- Enable server-side feature flag evaluation for SSR pages

---

### Priority 7 — Funnels & Dashboards

Define conversion funnels in PostHog once custom events are in place:

- **Reader engagement funnel**: Homepage visit -> Category click -> Article click -> Outbound link click
- **Search funnel**: Search initiated -> Results viewed -> Result clicked
- **Auth funnel**: Welcome modal seen -> Sign up clicked -> Account created -> First article clicked
- **Retention cohort**: Users who visit 3+ days per week vs. those who drop off

---

### Priority 8 — Error Tracking

PostHog can capture frontend JavaScript exceptions. Enable it to catch:

- Failed search queries
- Broken image loads
- Service worker registration failures
- Clerk auth errors

This overlaps with tools like Sentry but keeps everything in one dashboard.

---

## Summary

| Area | Status | Effort to Improve |
|---|---|---|
| SDK setup & proxy | Done well | - |
| User identification | Fixed — single identify by Clerk user.id | Done |
| Autocapture / Pageviews | Working passively | - |
| Custom event tracking | Started (contact email click) | Medium — add article, search, category events |
| Person properties | email + name on identify | Low — add signup method, created_at |
| Feature flags | Only debug flag | Low-Medium |
| Surveys | Active on Blog category page | Low — expand to more pages |
| Server-side tracking | Not implemented | Medium |
| Funnels & dashboards | Not set up | Low (dashboard-only, after events exist) |
| Error tracking | Not implemented | Low |

The next big wins are adding more custom events (article click, search, category view, welcome modal) and enriching person properties. Everything else builds on top of that foundation.
