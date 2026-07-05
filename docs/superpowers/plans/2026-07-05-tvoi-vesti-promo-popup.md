# «Твои Вести» Promo Popup + Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a return-visit, signed-out promo popup pitching account creation for the personalized feed; rename «За тебе» → «Твои Вести» everywhere (including the `/tvoi-vesti` route); collapse the vibe chart by default on the feed page; and add a dev-only auth fallback so the feed is previewable locally without Clerk login.

**Architecture:** All work extends the existing `feature/za-tebe` branch (worktree `.worktrees/feature-za-tebe`, open PR #18). The popup is a client component cloned from `web/app/_components/welcome-modal.tsx`, coordinating with the welcome modal through storage flags evaluated on mount. The rename is a `git mv` plus reference updates. The collapse uses a native `<details>` disclosure (no new client component). The preview is a single opt-in server helper double-gated on `NODE_ENV` + an env var.

**Tech Stack:** Next.js 16 (App Router, React 19), Clerk (`@clerk/nextjs`), Turso (libSQL), PostHog (`posthog-js`), Tailwind v4 (semantic tokens, no config file).

## Global Constraints

- **Branch/PR:** All commits land on `feature/za-tebe` (worktree `.worktrees/feature-za-tebe`); they update open PR #18. **Do NOT merge.** **Do NOT rename the git branch** — it stays `feature/za-tebe`.
- **Run all `web/` commands from the `web/` directory** (`.../.worktrees/feature-za-tebe/web`).
- **No automated test runner exists** in this repo. Verification = `npx tsc --noEmit`, `npx eslint .`, `grep` checks, and manual dev smoke. TDD does not apply to these UI/config changes; do **not** invent assertion-free tests.
- **`next.config.ts` ignores TS + ESLint errors during build** — a green build proves nothing. Always run `npx tsc --noEmit` and `npx eslint .` explicitly.
- **Design system is mandatory:** all UI conforms to `web/DESIGN_SYSTEM.md`. Any new pattern is documented there in the **same commit**.
- **Product name:** «Твои Вести» (Cyrillic). **Route:** `/tvoi-vesti`. **Feed identifier:** `"tvoi-vesti"`.
- **Leave unchanged:** the `value: "ForYou"` internal `CategoryNav` identifier; the git branch name; past commit messages/SHAs.
- **Commit message footer** (every commit in this plan):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- **Preview env var** is server-only: `DEV_PREVIEW_AUTH` (no `NEXT_PUBLIC_` prefix). Never commit `web/.env.local`.

---

### Task 1: Rename «За тебе» → «Твои Вести» (route + all references)

Renames the route folder and updates every source reference, the design-system doc, and the two historical planning docs. Leaves the codebase grep-clean of the old name (except the intentional git-branch string).

**Files:**
- Move: `web/app/za-tebe/` → `web/app/tvoi-vesti/` (folder: `page.tsx` + `vibe-wizard.tsx`)
- Modify: `web/app/tvoi-vesti/page.tsx`, `web/app/tvoi-vesti/vibe-wizard.tsx`, `web/app/_components/navigation.tsx`, `web/app/_components/vibe-profile.tsx`, `web/app/_components/article-link.tsx`, `web/app/actions/preferences.ts`, `web/app/profil/page.tsx`, `web/lib/personalization.ts`, `web/DESIGN_SYSTEM.md`
- Modify (docs): `docs/superpowers/plans/2026-07-04-personalized-feed.md`, `docs/superpowers/specs/2026-07-04-personalized-feed-design.md`

**Interfaces:**
- Produces: route `/tvoi-vesti` (page at `web/app/tvoi-vesti/page.tsx`); `ArticleFeed` union member `"tvoi-vesti"`. Later tasks reference these.
- Note: the moved folder stays one level under `app/`, so its relative imports (`../_components/...`, `../najnovo/...`, `./vibe-wizard`) resolve unchanged — do not edit import paths.

- [ ] **Step 1: Move the route folder with git**

```bash
cd .../.worktrees/feature-za-tebe   # repo/worktree root
git mv web/app/za-tebe web/app/tvoi-vesti
```

- [ ] **Step 2: Update `web/app/tvoi-vesti/page.tsx`** (4 edits)

`<h1 ...>За тебе</h1>` in `SignedOutPitch` (was line 24):
```
    <h1 className="font-serif text-3xl md:text-4xl font-black text-ink mb-3">За тебе</h1>
```
→
```
    <h1 className="font-serif text-3xl md:text-4xl font-black text-ink mb-3">Твои Вести</h1>
```

`console.error` string (was line 70):
```
        console.error("Failed to fetch posts for /za-tebe:", err);
```
→
```
        console.error("Failed to fetch posts for /tvoi-vesti:", err);
```

`LatestFeed` feed prop (was line 90):
```
            <LatestFeed posts={ranked} feed="za-tebe" />
```
→
```
            <LatestFeed posts={ranked} feed="tvoi-vesti" />
```

Page header heading (was line 106):
```
            За тебе
```
→
```
            Твои Вести
```

- [ ] **Step 3: Update `web/app/tvoi-vesti/vibe-wizard.tsx`** (was line 35)

```
      router.push("/za-tebe");
```
→
```
      router.push("/tvoi-vesti");
```

- [ ] **Step 4: Update `web/app/_components/navigation.tsx`** (2 edits)

`menuLinks` entry (was line 382):
```
    { label: "За тебе", href: "/za-tebe" },
```
→
```
    { label: "Твои Вести", href: "/tvoi-vesti" },
```

`CategoryNav` categories entry (was line 599) — **keep `value: "ForYou"`**:
```
    { name: "За тебе", value: "ForYou", href: "/za-tebe" },
```
→
```
    { name: "Твои Вести", value: "ForYou", href: "/tvoi-vesti" },
```

- [ ] **Step 5: Update `web/app/_components/vibe-profile.tsx`** (was line 22)

```
            href="/za-tebe?izberi=1"
```
→
```
            href="/tvoi-vesti?izberi=1"
```

- [ ] **Step 6: Update `web/app/_components/article-link.tsx`** (was line 9)

```
export type ArticleFeed = "home" | "latest" | "archive" | "search" | "za-tebe" | "profile";
```
→
```
export type ArticleFeed = "home" | "latest" | "archive" | "search" | "tvoi-vesti" | "profile";
```

- [ ] **Step 7: Update `web/app/actions/preferences.ts`** (was line 34)

```
    revalidatePath("/za-tebe");
```
→
```
    revalidatePath("/tvoi-vesti");
```

- [ ] **Step 8: Update `web/app/profil/page.tsx`** (was line 98)

```
              Уште ги немаш избрано вибрациите — почни на страницата «За тебе».
```
→
```
              Уште ги немаш избрано вибрациите — почни на страницата «Твои Вести».
```

- [ ] **Step 9: Update `web/lib/personalization.ts`** (was line 24)

```
// How many recent posts the /za-tebe page fetches before ranking.
```
→
```
// How many recent posts the /tvoi-vesti page fetches before ranking.
```

- [ ] **Step 10: Update `web/DESIGN_SYSTEM.md`** (was line 346)

```
Toggle card used in the «За тебе» wizard (`app/za-tebe/vibe-wizard.tsx`).
```
→
```
Toggle card used in the «Твои Вести» wizard (`app/tvoi-vesti/vibe-wizard.tsx`).
```

- [ ] **Step 11: Update the two historical docs (blanket replace, then restore the branch name)**

Run from the worktree root. Replace the product name and **every** `za-tebe` form (route, id, path, code excerpts) in both historical docs, then restore the git-branch / worktree strings that must stay (`feature/za-tebe` and `feature-za-tebe`):

```bash
sed -i '' \
  -e 's#За тебе#Твои Вести#g' \
  -e 's#za-tebe#tvoi-vesti#g' \
  docs/superpowers/plans/2026-07-04-personalized-feed.md \
  docs/superpowers/specs/2026-07-04-personalized-feed-design.md

# Restore branch (slash) and worktree/preview (hyphen) names the blanket pass changed:
sed -i '' \
  -e 's#feature/tvoi-vesti#feature/za-tebe#g' \
  -e 's#feature-tvoi-vesti#feature-za-tebe#g' \
  docs/superpowers/plans/2026-07-04-personalized-feed.md \
  docs/superpowers/specs/2026-07-04-personalized-feed-design.md
```

`s#За тебе#...#` catches both bare and «guillemet» forms. Note: `sed -i ''` is the macOS/BSD form (empty backup-suffix arg); on Linux use `sed -i` with no `''`.

- [ ] **Step 12: Verify no stale references remain in `web/` source**

```bash
# Gate on app source only. Do NOT grep docs/: the 2026-07-05 spec + plan
# legitimately mention «За тебе» while describing the rename, and the
# historical 2026-07-04 docs are a best-effort consistency pass (Step 11),
# not a hard gate.
grep -rn "За тебе" web --include="*.tsx" --include="*.ts" --include="*.md"
grep -rn "za-tebe" web --include="*.tsx" --include="*.ts" --include="*.md" | grep -vE "feature[-/]za-tebe"
```
Expected: **no output** from either command. If `web/app/za-tebe/` still appears, the `git mv` failed — investigate.

- [ ] **Step 13: Typecheck + lint (clear stale build cache first)**

```bash
cd web
rm -rf .next        # stale generated route types reference the old folder
npx tsc --noEmit
npx eslint .
```
Expected: both exit 0, no errors. (`rm -rf .next` is safe — it is gitignored build output.)

- [ ] **Step 14: Commit**

```bash
cd ..                # worktree root
git add -A
git commit -m "$(cat <<'EOF'
refactor(web): rename «За тебе» → «Твои Вести» incl. /tvoi-vesti route

Route folder, all hrefs/router pushes/revalidatePath, display headings,
the ArticleFeed "tvoi-vesti" identifier, code comments, DESIGN_SYSTEM,
and the historical plan/design docs. Branch name and «ForYou» internal
id intentionally unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Dev-only auth fallback for local preview

Adds `resolveUserId()` and swaps it in at the personalization auth-gated reads so `/tvoi-vesti` renders the signed-in feed locally when `DEV_PREVIEW_AUTH=1` (dev only).

**Files:**
- Create: `web/lib/dev-user.ts`
- Modify: `web/app/tvoi-vesti/page.tsx`, `web/app/actions/preferences.ts`, `web/app/actions/bookmarks.ts`, `web/app/actions/read-tracking.ts`, `web/app/go/[id]/route.ts`

**Interfaces:**
- Produces: `resolveUserId(): Promise<string | null>` and `DEV_PREVIEW_USER_ID` from `@/lib/dev-user`.
- Consumes: `web/app/tvoi-vesti/page.tsx` from Task 1 (route already renamed).

- [ ] **Step 1: Create `web/lib/dev-user.ts`**

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

- [ ] **Step 2: Swap the auth-gated reads (identical transformation in each file)**

In every file below, apply the same three edits:
1. Add `import { resolveUserId } from "@/lib/dev-user";`.
2. Replace each `const { userId } = await auth();` with `const userId = await resolveUserId();`.
3. Remove the now-unused `import { auth } from "@clerk/nextjs/server";` (each of these files uses `auth` **only** for that call; Step 3's eslint run confirms no unused import).

Apply to:
- `web/app/tvoi-vesti/page.tsx` — 1 occurrence (keep the `SignInButton` import; only the `auth` import is removed).
- `web/app/actions/preferences.ts` — 2 occurrences (`getPreferences`, `savePreferences`).
- `web/app/actions/bookmarks.ts` — 3 occurrences (`toggleBookmark`, `getSavedIds`, `getSavedPosts`).
- `web/app/actions/read-tracking.ts` — 1 occurrence (`recordBlogRead`).
- `web/app/go/[id]/route.ts` — 1 occurrence (inside the `try` at ~line 37); keep the rest of the route unchanged.

- [ ] **Step 3: Typecheck + lint**

```bash
cd web
npx tsc --noEmit
npx eslint .
```
Expected: both exit 0. An "unused `auth`" error means a file still imports `auth` after the swap — remove it.

- [ ] **Step 4: Verify the preview renders (dev smoke)**

```bash
# In web/.env.local add:  DEV_PREVIEW_AUTH=1   (do NOT commit this file)
npm run dev
# In another shell:
curl -s http://localhost:3000/tvoi-vesti | grep -c "Најави се за да ги избереш"
```
Expected: `0` — the `SignedOutPitch` copy is absent, i.e. the page rendered the wizard/feed for the dev user instead of the signed-out pitch. (Then stop the dev server.) If it prints `1`, the fallback did not engage — confirm `DEV_PREVIEW_AUTH=1` is set and `NODE_ENV` is development.

- [ ] **Step 5: Commit**

```bash
cd ..
git add web/lib/dev-user.ts web/app/tvoi-vesti/page.tsx web/app/actions/preferences.ts web/app/actions/bookmarks.ts web/app/actions/read-tracking.ts "web/app/go/[id]/route.ts"
git commit -m "$(cat <<'EOF'
feat(web): dev-only resolveUserId fallback for local /tvoi-vesti preview

Double-gated (NODE_ENV !== production AND DEV_PREVIEW_AUTH=1) so the
personalized surface renders without Clerk login in local dev. No effect
on production builds. Swapped in at the tvoi-vesti page, preferences,
bookmarks, read-tracking, and the /go click-learning route.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Collapse the vibe chart by default on the feed page

Rewrites `VibeProfile` to a native `<details>` disclosure with a `defaultCollapsed` prop. The tvoi-vesti page passes it (collapsed); `/profil` keeps the default (expanded).

**Files:**
- Modify (full rewrite): `web/app/_components/vibe-profile.tsx`
- Modify: `web/app/tvoi-vesti/page.tsx` (pass `defaultCollapsed`)
- Modify: `web/DESIGN_SYSTEM.md` (document the collapsible-card pattern)

**Interfaces:**
- Consumes: `profileShares()` output (`VibeShare[]`), unchanged; the `/tvoi-vesti?izberi=1` href from Task 1.
- Produces: `VibeProfile({ shares, showChangeButton?, defaultCollapsed? })`. `/profil` calls it with no `defaultCollapsed` (expanded, unchanged).

- [ ] **Step 1: Replace the full contents of `web/app/_components/vibe-profile.tsx`**

```tsx
import Link from "next/link";

export type VibeShare = { category: string; label: string; share: number; picked: boolean };

// «Твојот вајб»: the user's live category weights as bars. The percentages
// are computed by profileShares() from the SAME jars that rank the feed, so
// what this shows is exactly why the feed looks the way it does.
// defaultCollapsed renders the card as a closed <details> disclosure (used on
// the tvoi-vesti feed page); /profil leaves it expanded.
export function VibeProfile({
  shares,
  showChangeButton = true,
  defaultCollapsed = false,
}: {
  shares: VibeShare[];
  showChangeButton?: boolean;
  defaultCollapsed?: boolean;
}) {
  const sorted = [...shares].sort((a, b) => b.share - a.share);
  return (
    <details
      open={!defaultCollapsed}
      className="group border border-line bg-surface rounded-xl shadow-[6px_6px_0_var(--shadow)] p-5 md:p-6"
    >
      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl font-black text-ink">Твојот вајб</h2>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted group-open:hidden">
            Отвори
          </span>
        </div>
        <svg
          className="h-5 w-5 shrink-0 text-ink transition-transform group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="mt-4">
        {showChangeButton && (
          <div className="flex justify-end mb-4">
            <Link
              href="/tvoi-vesti?izberi=1"
              className="inline-flex items-center gap-2 border border-line bg-accent text-black px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-[4px_4px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)]"
            >
              Смени ги вибрациите
            </Link>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {sorted.map((item) => {
            const percent = Math.round(item.share * 100);
            return (
              <div key={item.category} className="flex items-center gap-3">
                <span className="w-28 md:w-36 shrink-0 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-600">
                  {item.label}
                  {item.picked ? <span aria-hidden> ★</span> : null}
                </span>
                <div className="flex-1 h-4 border border-line bg-surface-2 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-accent border-r border-line"
                    style={{ width: `${Math.max(percent, 2)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] font-mono text-neutral-600">
                  {percent}%
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] font-mono uppercase tracking-[0.2em] text-muted">
          ★ = твој избор · остатокот го учиме од твоите кликови
        </p>
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Pass `defaultCollapsed` on the feed page**

In `web/app/tvoi-vesti/page.tsx`, the feed branch renders `<VibeProfile shares={profileShares(jars, nowIso)} />` (was line 84). Change to:
```
          <VibeProfile shares={profileShares(jars, nowIso)} defaultCollapsed />
```
Do **not** change the `/profil` call site — it stays expanded.

- [ ] **Step 3: Document the pattern in `web/DESIGN_SYSTEM.md`**

Immediately after the vibe-bars paragraph (the block that ends `... Never animate the fill.`), add:
```markdown

**Collapsible variant:** on the «Твои Вести» feed page the card is a native
`<details defaultCollapsed>` disclosure — closed by default, `<summary>` holds
the «Твојот вајб» heading + an «Отвори» mono hint (hidden when open) and a
chevron that rotates via `group-open:rotate-180`. Drop the native marker with
`list-none [&::-webkit-details-marker]:hidden` and keep a `focus-visible`
outline for keyboard users. On `/profil` the card stays expanded.
```

- [ ] **Step 4: Typecheck + lint**

```bash
cd web
npx tsc --noEmit
npx eslint .
```
Expected: both exit 0.

- [ ] **Step 5: Verify collapse behavior (dev smoke, needs `DEV_PREVIEW_AUTH=1`)**

```bash
npm run dev
# tvoi-vesti feed card is collapsed by default (no `open` attribute):
curl -s "http://localhost:3000/tvoi-vesti" | grep -o "<details[^>]*>" | head -1
# profil card stays expanded (has `open`):
curl -s "http://localhost:3000/profil" | grep -o "<details[^>]*>" | head -1
```
Expected: the `/tvoi-vesti` `<details>` tag has **no** `open` attribute; the `/profil` one **does** (`<details open ...>`). (Requires the dev user to already have jars — go through the wizard once in the browser first. Then stop the server.)

- [ ] **Step 6: Commit**

```bash
cd ..
git add web/app/_components/vibe-profile.tsx web/app/tvoi-vesti/page.tsx web/DESIGN_SYSTEM.md
git commit -m "$(cat <<'EOF'
feat(web): collapse «Твојот вајб» chart by default on the feed page

VibeProfile gains a defaultCollapsed prop rendering a native <details>
disclosure; the tvoi-vesti feed passes it, /profil stays expanded.
Documented the collapsible variant in DESIGN_SYSTEM.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: «Твои Вести» account-pitch promo popup

New client modal cloned from the welcome modal, plus a one-line session marker in the welcome modal, mounted on the homepage.

**Files:**
- Create: `web/app/_components/tvoi-vesti-promo-modal.tsx`
- Modify: `web/app/_components/welcome-modal.tsx` (one added line)
- Modify: `web/app/page.tsx` (import + mount)

**Interfaces:**
- Consumes: Clerk `useUser()`, `SignUpButton`; `posthog` from `posthog-js`.
- Produces: `<TvoiVestiPromoModal />` (default-less named export), mounted on the homepage next to `<WelcomeModal />`.

- [ ] **Step 1: Add the session marker to `web/app/_components/welcome-modal.tsx`**

In the mount `useEffect` (the one that calls `setIsOpen(true)`), add the `sessionStorage` write right after it:
```tsx
  useEffect(() => {
    if (!hasSeenWelcome()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
      try {
        sessionStorage.setItem("vibes_welcome_shown_session", "1");
      } catch {
        // Non-blocking: storage could be disabled
      }
    }
  }, []);
```
This is the **only** change to `welcome-modal.tsx`.

- [ ] **Step 2: Create `web/app/_components/tvoi-vesti-promo-modal.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { SignUpButton, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";

const STORAGE_KEY = "vibes_tvoi_vesti_promo_seen";
const WELCOME_KEY = "vibes_welcome_seen";
const WELCOME_SESSION_KEY = "vibes_welcome_shown_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Presence check across cookie OR localStorage (mirror of welcome-modal).
const readFlag = (key: string) => {
  if (typeof document === "undefined") return false;
  const fromCookie = document.cookie
    .split(";")
    .some((entry) => entry.trim().startsWith(`${key}=`));
  const fromStorage = (() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(key);
    } catch {
      return null;
    }
  })();
  return Boolean(fromCookie || fromStorage);
};

const rememberPromo = () => {
  if (typeof document !== "undefined") {
    document.cookie = `${STORAGE_KEY}=1; path=/; max-age=${COOKIE_MAX_AGE}`;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  } catch {
    // Non-blocking: storage could be disabled
  }
};

const welcomeShownThisSession = () => {
  try {
    return (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(WELCOME_SESSION_KEY) === "1"
    );
  } catch {
    return false;
  }
};

const capture = (event: string) => {
  try {
    posthog.capture(event);
  } catch {
    // Analytics must never break the UI.
  }
};

export const TvoiVestiPromoModal = () => {
  const { isLoaded, user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const dismiss = useCallback(() => {
    rememberPromo();
    capture("tvoi_vesti_promo_dismiss");
    setIsOpen(false);
  }, []);

  const onSignupClick = useCallback(() => {
    rememberPromo();
    capture("tvoi_vesti_promo_signup_click");
    setIsOpen(false);
  }, []);

  // Return-visit, signed-out gate — evaluated once Clerk has loaded.
  useEffect(() => {
    if (!isLoaded) return; // wait for Clerk
    if (user) return; // signed-in users never get an account pitch
    if (readFlag(STORAGE_KEY)) return; // already saw the promo
    if (!readFlag(WELCOME_KEY)) return; // first visit: welcome owns the moment
    if (welcomeShownThisSession()) return; // don't stack in the same session
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(true);
    capture("tvoi_vesti_promo_shown");
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 md:px-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      <div className="relative max-w-[580px] w-full bg-paper border border-line rounded-2xl shadow-[14px_14px_0_var(--shadow)] overflow-hidden">
        <div className="absolute -left-10 -top-10 h-28 w-28 bg-accent rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -right-12 bottom-0 h-28 w-28 bg-neutral-200 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative p-6 md:p-8 space-y-5">
          <div className="space-y-2 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-600">
              Твои Вести
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-black leading-[1.05] text-ink">
              Вести избрани спрема тебе.
            </h2>
            <p className="text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans max-w-xl mx-auto">
              Направи бесплатен профил и добивај вести избрани според тоа што те
              интересира — сè на едно место.
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3 items-center justify-center text-center">
            <SignUpButton mode="modal">
              <button
                onClick={onSignupClick}
                className="w-full md:w-auto px-5 py-3 bg-ink text-paper font-bold text-xs uppercase tracking-[0.25em] rounded-xl border border-line transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[10px_12px_0_var(--shadow)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]"
              >
                Направи профил
              </button>
            </SignUpButton>
            <button
              onClick={dismiss}
              className="w-full md:w-auto px-5 py-3 bg-surface text-ink font-bold text-xs uppercase tracking-[0.25em] rounded-xl border border-line/50 transition-all duration-200 ease-out hover:border-line hover:bg-accent hover:text-black hover:-translate-y-0.5 hover:shadow-[8px_10px_0_var(--shadow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]"
            >
              Можеби подоцна
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Mount on the homepage in `web/app/page.tsx`**

Add the import alongside the existing `WelcomeModal` import:
```tsx
import { TvoiVestiPromoModal } from "./_components/tvoi-vesti-promo-modal";
```
And render it immediately after `<WelcomeModal />` (near the end of the page JSX):
```tsx
      <WelcomeModal />
      <TvoiVestiPromoModal />
```

- [ ] **Step 4: Typecheck + lint**

```bash
cd web
npx tsc --noEmit
npx eslint .
```
Expected: both exit 0.

- [ ] **Step 5: Verify popup gating (dev smoke, signed-out)**

With the dev server running (`npm run dev`) and the browser signed out:
1. Clear site storage (DevTools → Application → Clear storage) → reload `/` → **welcome modal only**; promo does not appear (welcome flag absent).
2. Dismiss the welcome modal, then open `/` in a **new tab** (fresh session) → **promo appears** («Вести избрани спрема тебе.»).
3. Click «Направи профил» → Clerk sign-up modal opens; reload `/` → promo does **not** reappear (flag set).
4. In PostHog live events, confirm `tvoi_vesti_promo_shown` and one of `_signup_click` / `_dismiss` fired.

Record the observed results in the task report (this gate is manual — there is no automated harness for it).

- [ ] **Step 6: Commit**

```bash
cd ..
git add web/app/_components/tvoi-vesti-promo-modal.tsx web/app/_components/welcome-modal.tsx web/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): «Твои Вести» account-pitch popup for returning signed-out visitors

Return-visit, signed-out modal cloned from the welcome modal: shows once
(own cookie+localStorage flag) only after the welcome popup was already
seen, never stacking in one session (sessionStorage marker). «Направи
профил» wires Clerk SignUpButton; PostHog shown/signup_click/dismiss.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Full verification sweep + push to PR #18 (no merge)

Final whole-feature verification and push. **Do not merge.**

**Files:** none created/modified (verification + push only).

- [ ] **Step 1: Grep sweep (`web/` source clean of the old name)**

```bash
cd .../.worktrees/feature-za-tebe
grep -rn "За тебе" web --include="*.tsx" --include="*.ts" --include="*.md"
grep -rn "za-tebe" web --include="*.tsx" --include="*.ts" --include="*.md" | grep -vE "feature[-/]za-tebe"
```
Expected: both commands → no output. (Docs are intentionally not gated — see Task 1 Step 12.)

- [ ] **Step 2: Typecheck + lint across the app**

```bash
cd web
rm -rf .next
npx tsc --noEmit
npx eslint .
```
Expected: both exit 0.

- [ ] **Step 3: Manual dev smoke of all four parts** (with `DEV_PREVIEW_AUTH=1` in `web/.env.local`, `npm run dev`):
  - Nav «Твои Вести» routes to `/tvoi-vesti`; wizard redirect + «Смени ги вибрациите» go to `/tvoi-vesti`.
  - `/tvoi-vesti` renders the feed (dev fallback); «Твојот вајб» card is **collapsed**, expands on click/Enter.
  - `/profil` «Твојот вајб» card is **expanded**.
  - Popup: welcome-only on first visit; promo on a return session (signed-out); never when the client is signed in.

- [ ] **Step 4: Push to update PR #18 (do NOT merge)**

```bash
cd ..
git status               # confirm clean working tree, all task commits present
git push                 # updates origin/feature/za-tebe → PR #18
```
Preview deploy publishes to `feature-za-tebe.macedonian-vibe-news.balinda-centar.workers.dev`. **Stop here and report to the user for the merge decision — do not merge.**

---

## Notes for the executor

- Remove `DEV_PREVIEW_AUTH=1` from `web/.env.local` when done previewing to restore normal signed-out behavior. Never commit `web/.env.local`.
- The dev-preview user writes rows to the shared Turso DB under `dev-preview-user` — harmless and isolated by id.
- If `npx tsc --noEmit` reports errors inside `.next/types/...` referencing the old `za-tebe` folder, you have a stale build cache: `rm -rf web/.next` and re-run.
