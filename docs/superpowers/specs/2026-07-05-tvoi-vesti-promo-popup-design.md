# «Твои Вести» account-pitch popup + «За тебе» → «Твои Вести» rename — Design

**Date:** 2026-07-05
**Branch:** `feature/za-tebe` (worktree `.worktrees/feature-za-tebe`) — extends the open PR #18. **No new branch; the git branch name stays `feature/za-tebe`.**
**Status:** Approved (design), pending implementation plan.

## Goal

Drive account creation and habitual reading from the personalized feed by adding a
first-return-visit promo popup that pitches signing up, and rename the feature
from «За тебе» to «Твои Вести» everywhere (including the URL route). A small
UX correction: collapse the vibe preference chart by default on the feed page.

Nothing in this feature is live yet (PR #18 unmerged), so renaming the route and
the analytics feed identifier carries no production-data or live-URL risk.

---

## Part A — «Твои Вести» promo popup

### A1. Component

New client component `web/app/_components/tvoi-vesti-promo-modal.tsx`, modeled on
`web/app/_components/welcome-modal.tsx`. It reuses the same structural shell:

- Overlay: `fixed inset-0 z-[80] flex items-center justify-center px-4 md:px-0`.
- Backdrop: `absolute inset-0 bg-black/50 backdrop-blur-sm`, `onClick` = dismiss.
- Card: `relative max-w-[580px] w-full bg-paper border border-line rounded-2xl shadow-[14px_14px_0_var(--shadow)] overflow-hidden`, with the two decorative
  `blur-3xl` accent circles.
- While open: `document.body.style.overflow = "hidden"` and an `Escape` keydown
  listener that dismisses; both cleaned up on close/unmount (identical to
  `welcome-modal.tsx`).
- Returns `null` when closed (no SSR flash — decision is client-only, on mount).

### A2. Trigger logic (return-visit, signed-out only)

Both modals decide **on mount**. The key mechanic: the existing
`vibes_welcome_seen` flag flips to "set" only when the user **dismisses** the
welcome popup. So reading it on mount cleanly distinguishes first visit from a
later one — no timers, no timestamps.

**Flags:**
- `vibes_welcome_seen` — existing (cookie + localStorage), set on welcome dismiss.
- `vibes_tvoi_vesti_promo_seen` — **new** (cookie + localStorage), set on promo
  dismiss or signup-CTA click. Mirror `welcome-modal.tsx`'s `hasSeen*`/`remember*`
  helpers exactly: cookie `path=/; max-age=60*60*24*365`, localStorage write in a
  try/catch, presence = either source truthy.
- `vibes_welcome_shown_session` — **new** `sessionStorage` marker. One added line in
  `welcome-modal.tsx`: when the welcome modal opens (inside the existing mount
  `useEffect`, right after `setIsOpen(true)`), do
  `try { sessionStorage.setItem("vibes_welcome_shown_session", "1"); } catch {}`.
  This is the only change to `welcome-modal.tsx`.

**Signed-in detection:** `useUser()` from `@clerk/nextjs` (the pattern already used
across the app). Treat as signed-out when `isLoaded && !user`. Do not decide until
`isLoaded` is true.

**The promo opens iff ALL hold (evaluated in a mount `useEffect`):**
1. `isLoaded && !user` (signed-out; wait for Clerk to load first).
2. `hasSeenWelcome()` is **true** (they've been here before — the return-visit signal).
3. `hasSeenPromo()` is **false** (`vibes_tvoi_vesti_promo_seen` not set).
4. `sessionStorage.getItem("vibes_welcome_shown_session")` is **falsy** (the welcome
   popup did not open in this browser session — prevents same-session stacking even
   across client-side navigation).

Because Clerk load is async, gate on `isLoaded` inside the effect and re-run when
`isLoaded`/`user` change (effect deps `[isLoaded, user]`), then apply the checks.

**Resulting behavior:**
- **First visit (new browser):** welcome flag absent → welcome shows and sets the
  session marker; promo condition (2) fails → promo stays hidden. Dismissing the
  welcome sets `vibes_welcome_seen` but the promo already decided not to show; the
  session marker keeps it hidden if they navigate home again this session.
- **Return session:** welcome flag present, no session marker → welcome stays hidden,
  promo shows once.
- **Pre-existing visitors** who already have `vibes_welcome_seen` from before this
  ships: on their next visit the welcome never opens (no session marker), so the
  promo shows immediately — the intended warm-lead case.
- **Signed-in users:** never see the promo (condition 1). Dismiss sets the flag so it
  never returns.

### A3. Content (Cyrillic; DESIGN_SYSTEM voice — copy is a tweakable draft)

- Eyebrow (mono, uppercase, tracked): `ТВОИ ВЕСТИ`
- Headline (Playfair, `font-serif text-3xl md:text-4xl font-black text-ink`):
  **«Вести избрани спрема тебе.»**
- Subtext (`text-sm md:text-base text-neutral-700 font-sans`):
  «Направи бесплатен профил и добивај вести избрани според тоа што те интересира —
  сè на едно место.»
- **Primary CTA — «Направи профил»:** wrap the button in `<SignUpButton mode="modal">`
  (from `@clerk/nextjs`, same as `navigation.tsx`). Button styling = the welcome
  modal's primary button recipe (`bg-ink text-paper ... uppercase tracking-[0.25em]
  rounded-xl border border-line` + hover lift/shadow + focus ring). The button's
  `onClick` fires the signup-click analytics event, calls `rememberPromo()`, and
  closes our modal (Clerk's own modal then takes over).
- **Secondary CTA — «Можеби подоцна»:** the welcome modal's secondary button recipe;
  `onClick` = dismiss (`rememberPromo()` + close). No navigation.
- Reachable dismiss affordances: backdrop click + Escape (both = dismiss), matching
  the welcome modal. (No standalone X button, consistent with the current welcome
  modal where the X is commented out.)

### A4. Analytics (measure the account-conversion goal)

`import posthog from "posthog-js"` (direct-default import, as elsewhere), and capture:
- `tvoi_vesti_promo_shown` — once, when the modal actually opens.
- `tvoi_vesti_promo_signup_click` — on primary CTA click.
- `tvoi_vesti_promo_dismiss` — on secondary/backdrop/Escape dismiss.

Guard captures so they never throw if PostHog is unavailable.

### A5. Mount

Add `<TvoiVestiPromoModal />` in `web/app/page.tsx` alongside the existing
`<WelcomeModal />` (homepage only, matching the welcome modal's scope). Both mounted
unconditionally; their on-mount flag logic guarantees at most one shows.

---

## Part B — Rename «За тебе» → «Твои Вести» (including the URL route)

Target display name (Cyrillic, site voice): **«Твои Вести»** (uppercase-styled to
`ТВОИ ВЕСТИ` wherever the surrounding class already applies `uppercase`).
Target route: **`/tvoi-vesti`**.

### B1. Route move
- `git mv web/app/za-tebe web/app/tvoi-vesti` (moves `page.tsx` + `vibe-wizard.tsx`).

### B2. Path/href/identifier updates (`/za-tebe` → `/tvoi-vesti`)
- `web/app/_components/navigation.tsx` — `menuLinks` entry (`href: "/za-tebe"`) and
  `CategoryNav` categories entry (`href: "/za-tebe"`).
- `web/app/tvoi-vesti/vibe-wizard.tsx` — `router.push("/za-tebe")`.
- `web/app/_components/vibe-profile.tsx` — `href="/za-tebe?izberi=1"`.
- `web/app/actions/preferences.ts` — `revalidatePath("/za-tebe")`.

### B3. Display-text updates («За тебе» → «Твои Вести»)
- `web/app/tvoi-vesti/page.tsx` — `SignedOutPitch` `<h1>За тебе</h1>` and the page
  header `<h1>За тебе</h1>`.
- `web/app/_components/navigation.tsx` — `menuLinks` label `"За тебе"` and `CategoryNav`
  `name: "За тебе"`.

### B4. Feed identifier (analytics value; safe — nothing live)
- `web/app/_components/article-link.tsx` — `ArticleFeed` union member
  `"za-tebe"` → `"tvoi-vesti"`.
- `web/app/tvoi-vesti/page.tsx` — `<LatestFeed posts={ranked} feed="za-tebe" />` →
  `feed="tvoi-vesti"`.
- Grep for any other `"za-tebe"` string usages as a feed value and update them.

### B5. Comments / docs / strings
- `web/lib/personalization.ts` — the `/za-tebe` comment.
- `web/app/tvoi-vesti/page.tsx` — the `console.error("...for /za-tebe...")` string.
- `web/DESIGN_SYSTEM.md` — the «За тебе» wizard reference and the
  `app/za-tebe/vibe-wizard.tsx` path (→ `app/tvoi-vesti/vibe-wizard.tsx`). If a new
  design pattern is introduced (the collapsible chart, Part C), document it in the
  **same** commit per the design-system rule.
- Docs updated to reflect the product/route rename in narrative references:
  `docs/superpowers/plans/2026-07-04-personalized-feed.md` and
  `docs/superpowers/specs/2026-07-04-personalized-feed-design.md`.

### B6. Deliberately left unchanged
- `value: "ForYou"` internal `CategoryNav` identifier (English, not user-facing;
  changing it risks active-state matching for no user benefit).
- The git branch `feature/za-tebe`, past commit messages, and commit SHAs referenced
  in docs (historical facts; renaming the branch would orphan PR #18).
- No `/za-tebe → /tvoi-vesti` redirect is added (nothing live, no external links —
  YAGNI).

---

## Part C — Collapse the vibe preference chart by default

On the **tvoi-vesti feed page only**, the `VibeProfile` bar chart («Твојот вајб»)
should be **collapsed by default** and expand on click. `VibeProfile` also renders on
`/profil`, where it must stay **expanded** (unchanged) — so the collapse is opt-in via
a prop.

**Approach:** native `<details>`/`<summary>` disclosure — no `"use client"`, works
inside the current server-rendered component.

- Add a `defaultCollapsed = false` prop to `VibeProfile`
  (`web/app/_components/vibe-profile.tsx`). `/profil` keeps the default (expanded);
  `web/app/tvoi-vesti/page.tsx` passes `defaultCollapsed` (collapsed).
- Convert the outer `<section>` into a `<details open={!defaultCollapsed}>` styled as
  the existing neo-brutalist card
  (`border border-line bg-surface rounded-xl shadow-[6px_6px_0_var(--shadow)]`).
- `<summary>` = the header row: «Твојот вајб» heading + a chevron indicator that
  rotates when open (CSS `details[open] .chevron { rotate }`, or a `group-open:`
  utility). Add `cursor-pointer`, `list-none`/`marker:hidden` to drop the native
  triangle, and a focus-visible ring for keyboard users. Include a short affordance
  hint (e.g. mono caption «Отвори за детали») so the collapsed state reads as tappable.
- The revealed body contains the bars, the «Смени ги вибрациите» link, and the
  «★ = твој избор…» caption. Keep the change link **out of** `<summary>` (nested
  interactive elements inside a summary are invalid/awkward).
- Preserve current sort (shares descending) and all existing bar markup/percentages.
- Preserve the `showChangeButton` prop behavior. `/profil` calls `VibeProfile` with no
  `defaultCollapsed` → renders `<details open>` (expanded, visually unchanged).

Record the collapsible-card pattern in `DESIGN_SYSTEM.md` in the same commit.

---

## Part D — Local preview without Clerk login (dev-only auth fallback)

The tvoi-vesti page renders `SignedOutPitch` unless `auth()` returns a `userId`.
Clerk login is unavailable locally, so add an **opt-in, dev-only** fallback that lets
the signed-in feed render locally — with a double safety gate so it can never affect
production.

### D1. Helper
New `web/lib/dev-user.ts`:

```ts
import { auth } from "@clerk/nextjs/server";

// Stable fake user for local preview only. Its rows live under this id in Turso
// and never collide with real Clerk user ids.
export const DEV_PREVIEW_USER_ID = "dev-preview-user";

// Returns the real Clerk user id, or — ONLY in a non-production build with
// DEV_PREVIEW_AUTH=1 explicitly set in web/.env.local — a stable fake id so the
// personalized surface is viewable without Clerk login. Both gates must hold.
export async function resolveUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;
  if (process.env.NODE_ENV !== "production" && process.env.DEV_PREVIEW_AUTH === "1") {
    return DEV_PREVIEW_USER_ID;
  }
  return null;
}
```

Gate rationale: `NODE_ENV !== "production"` means a production build (which runs in
production mode) can never take the fallback even if the env var leaks; `DEV_PREVIEW_AUTH`
is off by default so normal local dev is unaffected until the developer opts in. The
var is server-only (no `NEXT_PUBLIC_` prefix) so it never enters the client bundle.

### D2. Call-site swaps (`const { userId } = await auth()` → `const userId = await resolveUserId()`)
- **Minimum to view the feed:** `web/app/tvoi-vesti/page.tsx`, and both functions in
  `web/app/actions/preferences.ts` (so the wizard → save → ranked-feed flow works).
- **For full interactivity:** `web/app/actions/bookmarks.ts` (all three), 
  `web/app/actions/read-tracking.ts`, and `web/app/go/[id]/route.ts` (click learning).

Only swap the personalization/auth-gated reads listed above. Do **not** touch the
`currentUser()` admin/blog sites (`admin/page.tsx`, `blog/new/page.tsx`,
`api/blog/create`, `api/featured-slots`) — those are unrelated to this preview.

### D3. Client note
The promo popup uses client-side `useUser()`, which still reports signed-out locally
(Clerk client isn't authenticated). That's fine and useful: with `DEV_PREVIEW_AUTH=1`
the **server** renders the signed-in `/tvoi-vesti` feed while the **homepage** can still
show the promo — so both are previewable. This split only exists in dev-preview mode.

### D4. How the user previews it
1. Add `DEV_PREVIEW_AUTH=1` to `web/.env.local` (documented in the spec; not committed).
2. `cd web && npm run dev`, open `http://localhost:3000/tvoi-vesti`.
3. First load shows the vibe wizard (dev user has no jars yet); pick categories → the
   ranked feed renders with «Твојот вајб» collapsed by default.
4. Dev-user rows are written to the shared Turso DB under `dev-preview-user`
   (harmless; isolated by id). Remove the env var to return to normal signed-out behavior.

## Verification

- `grep -ri "за тебе" web/` and `grep -rn "za-tebe" web/` (excluding `node_modules`,
  `.next`) return **no** product/route references — only the intentional git-branch
  name in docs remains.
- `web/app/tvoi-vesti/` exists; `web/app/za-tebe/` is gone.
- From `web/`: `npx tsc --noEmit` clean and `npx eslint .` clean.
- Dev smoke test (`npm run dev`): homepage nav shows «Твои Вести» → routes to
  `/tvoi-vesti`; wizard redirect and vibe-profile «Смени» link go to `/tvoi-vesti`;
  the «Твојот вајб» card is collapsed and expands on click/Enter.
- Popup manual test (signed-out):
  1. Clear all site storage → first load shows **welcome only**.
  2. Dismiss welcome, then open the homepage in a **new session/tab** → **promo shows**.
  3. Click «Направи профил» → Clerk sign-up modal opens; reload → promo does not
     return (flag set).
  4. Signed-in → promo never appears.
- All work committed to `feature/za-tebe`, pushed to update PR #18 (do not merge;
  report to the user for the merge decision).

## Out of scope

- Changing the personalization algorithm, DB schema, or jar behavior.
- A/B testing the popup copy or timing (single deterministic trigger for now).
- Renaming the git branch or rewriting commit history.
