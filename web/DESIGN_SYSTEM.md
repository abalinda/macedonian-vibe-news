# Vibes — Brand & Design System

> The single source of truth for how **vibes.mk** looks, feels, and speaks.
> **Every new feature, component, and commit to `web/` must follow this document.** When you add UI, match these tokens and recipes instead of inventing new ones. If a genuinely new pattern is needed, add it here in the same PR so the system stays whole.

This system is **extracted from the live codebase** (`app/globals.css`, `app/layout.tsx`, `app/_components/*`, `app/page.tsx`, `app/najnovo/latest-feed.tsx`). It is descriptive of what exists *and* prescriptive for what comes next.

---

## 1. Brand essence

**Vibes is an AI-curated Macedonian news aggregator with an editorial, print-magazine soul.** It looks like a confident independent newspaper, not a generic content feed.

**Personality:** youthful but not childish, editorial but not stuffy, warm but credible. "Професионално, но не здодевно."

**Editorial stance (from the About page — treat as brand law):**
- **Позитивност, но реалност** — positive framing, but we don't dodge important topics.
- **Квалитет** — everything is hand/AI-curated; nothing dumped.
- **Доверба и транспарентност** — no sensationalism, **no clickbait, ever.**
- **Младешки дух и свеж пристап** — fresh, energetic, modern.
- **Заедница** — built *for and with* readers.

**Design north star:** _editorial neo-brutalism_ — a clean off-white "paper" canvas, hard black hairline borders, crisp offset (zero-blur) shadows, big Playfair headlines, and one electric yellow that does all the shouting.

---

## 2. Logo & wordmark

- **Wordmark:** `VIBES.` — always **uppercase, with the trailing period.** The period is part of the mark; don't drop it.
- **Type treatment:** Playfair Display, `font-black`, `tracking-tighter`. Responsive size `text-3xl md:text-5xl`.
- **App/icon logo:** `public/logo_homepage.png`. In the navbar the hamburger icon (`public/hamburger-menu.svg`) cross-fades to the logo on hover.
- **Voice in metadata:** "Vibes — Твои вести, секој ден."

```tsx
<h1 className="font-serif text-3xl md:text-5xl font-black tracking-tighter">VIBES.</h1>
```

**Don't:** lowercase it, remove the period, set it in Inter/mono, add gradients or drop-shadows, or letter-space it loosely.

---

## 3. Color system

The palette is deliberately tiny: **paper + ink + one yellow**, with electric blue for interaction and coral reserved for "Иран"/alerts. Everything else is neutral gray.

### Core tokens

| Token | Hex | Role |
|---|---|---|
| **Paper** | `#FDFBF7` | The universal background ("paper" feel). Also the PWA `theme-color`. Page bg, nav, drawers, modals. |
| **Paper (alt)** | `#F8F6F0` | Rare slightly-deeper paper for subtle layering. |
| **Ink** | `#000000` / `neutral-900` | Borders, text, the "invert" hover fill. Body text is `text-neutral-900`. |
| **Signature Yellow** | `#FFD300` | **The brand accent.** CTAs, the "Најново" pill, hover accents, "read more" underline, admin badge, active highlights. Use it sparingly and on purpose — it's the loudest thing on the page. |
| **Electric Blue** | `#002CFF` | Interactive/source accent: source labels, link hover (`group-hover:text-[#002CFF]`), blog-body links. |
| **Iran / Alert Coral** | `#f26d6d` | Reserved for the **Иран** category pill and breaking/alert contexts. Pairs with a red-tinted shadow `#ff000012`. Do not use coral for generic decoration. |

### Soft yellow fills (warm gradients / glows)

Used for inviting panels (sign-in/up card, welcome modal glow). Always low-key, never as primary fills.

| Hex | Use |
|---|---|
| `#FFE86A` | Radial glow highlight |
| `#FFF8D8` | Gradient panel start |
| `#FFFBEE` | Popover/card tint (e.g. Clerk `UserButton` popover) |

### Neutrals

Grayscale ladder via Tailwind `neutral-*`. Common: `neutral-200` (hairlines/dividers), `neutral-300` (column rules), `neutral-400` (placeholder/disabled), `neutral-500`/`neutral-600` (muted labels), `neutral-700`/`neutral-800` (secondary text). Blog body uses `#1F2937` (text), `#4B5563` (quote), `#E5E7EB` (rules).

### Shadow tints (the neo-brutalist signature)

Shadows are **hard, offset, zero-blur**, in near-transparent black. This is a defining trait — never use soft blurred Material shadows.

| Tint | Approx | Use |
|---|---|---|
| `#0000000a` | ~4% | Lightest (subtle inputs) |
| `#00000010` | ~6% | **Default** card/button shadow |
| `#00000012` | ~7% | **Default** elevated/hover shadow |
| `#00000015` | ~8% | Strong hover/modal |
| `#e5e5e5` | solid | Opaque variant on white surfaces |
| `#ff000012` | ~7% red | Iran/alert pill only |

> Rule of thumb: resting elements use the `00000010`/`00000012` tints; the **offset grows on hover** to imply lift (see §6 Elevation).

**Color don'ts:** no new brand hues without adding them here; never introduce a second accent that competes with `#FFD300`; never use pure blurred shadows; keep coral exclusive to Iran/alerts.

### Dark mode (semantic tokens)

Dark mode is **class-based**: `<html>` gets `.dark` from a no-flash inline script in `app/layout.tsx` (defaults to OS preference; the nav toggle persists a choice to `localStorage['vibes-theme']`). Colors are driven by **semantic CSS-variable tokens** defined in `app/globals.css` and exposed as Tailwind utilities through `@theme inline`.

**Use these token utilities for all new UI** — they flip automatically, so you never hand-author a second set of dark colors:

| Utility | Light | Dark | Use |
|---|---|---|---|
| `bg-paper` / `text-ink` | `#FDFBF7` / `#171717` | `#141210` / `#ECE8DF` | Page canvas + primary text |
| `bg-surface` | `#ffffff` | `#1D1A15` | Cards, nav, inputs, modals |
| `bg-surface-2` | `#FAF8F2` | `#26221B` | Hover/inset surfaces, image placeholders |
| `text-muted` | `#525252` | `#A8A097` | Secondary / metadata text |
| `border-line` | `#000000` | `rgba(255,255,255,.16)` | Editorial hairline border |
| `border-line-soft` | `#E5E5E5` | `rgba(255,255,255,.10)` | Dividers, soft borders |
| `text-link` | `#002CFF` | `#8AA0FF` | Interaction/source accent (blue lightens in dark) |
| `bg-accent` | `#FFD300` | `#FFD300` | Signature yellow (unchanged — pops on both) |
| `var(--shadow)` | `rgba(0,0,0,.07)` | `rgba(0,0,0,.55)` | Offset-shadow tint, e.g. `shadow-[6px_6px_0_var(--shadow)]` |

**How existing literals map (use these substitutions when converting a surface):**
- `bg-[#FDFBF7]`→`bg-paper` · `text-neutral-900`→`text-ink` · `border-black`→`border-line` · `bg-white`→`bg-surface` · `border-neutral-200`→`border-line-soft` · `text-[#002CFF]`/`text-blue-600`→`text-link`.
- **Invert fills** (`bg-black text-white`, `hover:bg-black hover:text-white`) → `bg-ink text-paper` / `hover:bg-ink hover:text-paper`. These invert correctly in *both* themes (dark-on-light becomes light-on-dark) — the preferred pattern for primary buttons and hover-invert badges.
- **Always-yellow / always-coral surfaces keep DARK text** (`text-black` / `text-neutral-900`) — never switch their text to `text-ink` (it would go light on a yellow chip). Likewise, overlay **scrims stay dark** in both themes (`bg-black/20`–`/50`).
- Brand hues that read on both themes (`#FFD300`, `#f26d6d`) stay as literals.

**Dark don'ts:** don't add parallel `dark:` hex values when a token exists; don't flip text on always-accent surfaces; don't let an offset shadow vanish on dark — use `var(--shadow)`.

---

## 4. Typography

Three families, each with a fixed job. They are wired in `app/layout.tsx` and mapped to classes in `app/globals.css`.

| Family | CSS var | Class | Job |
|---|---|---|---|
| **Playfair Display** | `--font-playfair` | `.font-serif` | **Headlines & editorial.** Logo, hero/H2/H3 titles, big statements. Almost always `font-black` or `font-bold`, tight tracking, tight leading. |
| **Inter** | `--font-inter` | `.font-sans` | **UI & body.** Section labels, buttons, paragraphs, navigation, modal copy. |
| **Geist Mono** | `--font-geist-mono` | `.font-geist-mono` (also Tailwind `font-mono`) | **Metadata & teasers.** Dates, counters, source/category micro-labels, and the signature UPPERCASE teaser line. |

### The headline recipe
Playfair, heavy, tight. Hero scales big; cards stay calmer.
```tsx
// Hero
<h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black leading-[0.9] break-words">…</h2>
// Card / secondary
<h3 className="font-serif text-xl md:text-2xl font-bold leading-tight">…</h3>
```

### The teaser/metadata recipe (very distinctive — keep it consistent)
**UPPERCASE, monospace, wide letter-spacing, small, muted.** Teaser text is force-uppercased in code (`getTeaserText`).
```tsx
<p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-600 line-clamp-3 leading-relaxed">…</p>
```
Tracking scale for mono labels: `tracking-widest` (≈0.1em) for short labels → `tracking-[0.2em]`/`tracking-[0.3em]` for teasers and counters.

### Section headers
Sans, black weight, uppercase, with a **thick black underline** (`border-b-4 border-black`) — a core editorial signature.
```tsx
<h4 className="font-sans text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Последни новости</h4>
```

### Long-form (blog reader)
Use the `.blog-body` class (defined in `globals.css`): serif, `line-height: 1.8`, links in `#002cff`, images `border-radius: 12px`.

**Type don'ts:** no Playfair for body paragraphs or small UI; no sentence-case teasers (they're UPPERCASE mono); don't mix a fourth typeface.

---

## 5. Borders, shape & surfaces

- **Hairline borders are everywhere:** `border border-black` is the default frame for editorial elements (hero image, source badges, icon buttons, drawers). Hairlines between list items use `border-neutral-200`; column rules use `border-neutral-300`.
- **Corners — two registers:**
  - **Editorial / images:** **square corners** with a hard black border (`border border-black`, no radius). Hero, side-story thumbs, source badges.
  - **Soft UI / chips:** rounded. `rounded-full` (pills, icon buttons, search input — **33 uses, the dominant chip shape**), `rounded-xl`/`rounded-2xl` (cards, panels, modals), `rounded-md`/`rounded-sm` (dropdowns, small buttons).
- **Two card treatments** (both valid; pick by context):
  1. **Editorial story** (homepage sidebars): no card container — image in a hard `border border-black` box + text, separated by `border-b border-neutral-200`.
  2. **Feed card** (`/najnovo`): self-contained `rounded-xl border border-neutral-200 bg-white` with an offset shadow.

```tsx
// Feed card shell (canonical)
<article className="rounded-xl border border-neutral-200 bg-white shadow-[6px_6px_0_#00000010]
                    transition-transform duration-200 hover:-translate-y-[3px] hover:shadow-[10px_10px_0_#00000012]">
```

---

## 6. Elevation & motion

**Elevation = offset, not blur.** Resting shadow is a small hard offset; on hover the element **lifts** (`-translate-y`) and the **offset grows**. This "sticker peeling off the page" motion is the brand's signature interaction.

| State | Pattern |
|---|---|
| Rest | `shadow-[4px_4px_0_#00000010]` (small) … `shadow-[10px_10px_0_#00000012]` (panels) |
| Hover (lift) | add `hover:-translate-y-0.5` (or `-translate-y-[3px]`) **and** bump offset, e.g. `hover:shadow-[10px_10px_0_#00000012]` |
| Hover (invert) | `hover:bg-black hover:text-white` — or the premium variant `hover:bg-black hover:text-[#FFD300]` |
| Hover (yellow swap) | `hover:bg-[#FFD300] hover:text-black` (black buttons → yellow on hover) |

**Motion tokens:**
- **Easing:** `cubic-bezier(0.22,1,0.36,1)` (expo-out, the default) and `cubic-bezier(0.33,1,0.68,1)`.
- **Duration:** `200–400ms`. Micro-interactions 200ms; layout/expansion 300–400ms.
- **Accent flourishes:** `md:animate-pulse` on the live "Најново"/"Иран" pills; image `group-hover:scale-105` (700ms) on hero, `scale-[1.02]` on cards.
- **Headline hover:** `group-hover:underline decoration-2 underline-offset-4`.
- **"Read more" hover:** a yellow underline grows in — `border-b-2 border-transparent group-hover:border-[#FFD300]`.

Respect `prefers-reduced-motion` for new large/looping animations.

---

## 7. Component recipes

Copy these. They are the canonical building blocks — extend them, don't replace them.

### Buttons

```tsx
// PRIMARY (ink) — default action
<button className="px-5 py-3 rounded-xl border border-black bg-black text-white
  text-xs font-bold uppercase tracking-[0.25em]
  transition-all duration-200 ease-out
  hover:-translate-y-0.5 hover:bg-neutral-900 hover:shadow-[10px_12px_0_#00000015]
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
  Најново денес
</button>

// YELLOW CTA — high-intent (sign up, key conversion)
<button className="flex items-center justify-between border border-black bg-[#FFD300] text-black
  px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em]
  shadow-[6px_6px_0_#00000012] transition-all hover:-translate-y-0.5 hover:shadow-[10px_10px_0_#00000012]">
  <span>Креирај профил</span><span className="font-mono">+</span>
</button>

// GHOST — secondary, inverts to yellow
<button className="px-5 py-3 rounded-xl border border-black/50 bg-white text-neutral-800
  text-xs font-bold uppercase tracking-[0.25em] transition-all
  hover:border-black hover:bg-[#FFD300] hover:text-black hover:-translate-y-0.5 hover:shadow-[8px_10px_0_#00000012]">
  За нас
</button>
```

### Pills & chips

```tsx
// Live category pill — "Најново" (yellow) / "Иран" (coral)
<span className="px-3 py-1 rounded-full border border-black bg-[#FFD300] text-black
  text-sm font-bold uppercase tracking-widest shadow-[3px_3px_0_#00000012] md:animate-pulse">Најново</span>
<span className="px-3 py-1 rounded-full border border-black bg-[#f26d6d] text-black
  text-sm font-bold uppercase tracking-widest shadow-[3px_3px_0_#ff000012] md:animate-pulse">Иран</span>

// Source badge (editorial) — inverts on hover
<span className="inline-block border border-black px-2 py-0.5 text-xs font-bold uppercase tracking-widest
  hover:bg-black hover:text-white transition-colors">{source}</span>

// Freshness badge — "Тазе" (yellow) vs time (ink)
<span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1
  bg-[#FFD300] text-black">Тазе</span>  // else: bg-black text-white → "пред 12 минути"
```

### Icon buttons (circular, hard border)

```tsx
<a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black bg-white text-black
  transition-all hover:bg-[#FFD300] hover:shadow-[4px_4px_0_#00000012]">{/* inline SVG */}</a>
```

### Search input

```tsx
<input className="h-11 w-full rounded-full border border-black/20 bg-white px-12 text-sm font-sans
  placeholder:text-neutral-500 shadow-[3px_3px_0_#0000000a]
  focus:border-black focus:outline-none focus:ring-2 focus:ring-[#FFD300]/60 transition-all" />
```
> **Focus ring is yellow** (`focus:ring-[#FFD300]/60`). Use this for all focusable inputs.

### Share

`<ShareButton url={…} title={…} />` (`app/_components/share-button.tsx`) uses the **Web Share API** on mobile and falls back to a brand-styled menu (Copy link, WhatsApp, Viber, Facebook, Telegram, X, LinkedIn, Email). Variants: `icon` (compact circle for cards/overlays) and `pill` (icon + "Сподели" for article headers). It captures a PostHog `share_clicked` event with the method.
- **`url`** is a path (`/blog/12`) or an absolute source URL — `toAbsoluteUrl` (`lib/share.ts`) resolves it. Share the **canonical vibes URL for our own content** (blog) and the **source link for external stories** (best social preview).
- Story cards are wrapped in anchors, so render `ShareButton` as a **sibling overlay** (`absolute right-3 top-3 z-20`) of the card link — never nested inside it (keeps valid HTML; the button also calls `preventDefault`/`stopPropagation`). The host's outer wrapper must **not** be `overflow-hidden`, or the menu clips.
- The reading view (`app/blog/[id]`) pairs the pill share with a `ReadingProgress` bar (`app/_components/reading-progress.tsx`) — a thin `#FFD300` top bar that fills on scroll.

### Modals, drawers & panels

- **Overlay:** `bg-black/20` (drawer) to `bg-black/50` (modal) + `backdrop-blur-sm`.
- **Surface:** `bg-[#FDFBF7] border border-black` + a big offset shadow (`shadow-[14px_14px_0_#00000010]`), `rounded-2xl` for modals, square-edged for the slide-in drawer.
- **Invite panels:** add a soft yellow radial/linear glow (see §3 soft fills).
- **Z-index ladder (keep consistent):** content `z-20` → sticky nav `z-50` → drawer `z-[60]` → search dropdown `z-[70]` → welcome modal `z-[80]`.

### "Read more" affordance
```tsx
<span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest
  border-b-2 border-transparent group-hover:border-[#FFD300]">Прочитај повеќе →</span>
```

---

## 8. Layout & grid

- **Container widths:** content `max-w-[1500px]`, category bar `max-w-[1400px]`, navbar `max-w-[1350px]`, all centered `mx-auto`.
- **Page padding:** `px-4 md:px-8` (nav) / `px-5 md:px-10` (content). Always give mobile breathing room.
- **The editorial grid (homepage):** 12-col on `lg`, split **3 / 6 / 3** — left "Последни новости" sidebar, center hero + 2 secondary heroes, right "Останати приказни" sidebar. Columns separated by `border-neutral-300` rules. Stacks to one column on mobile with explicit `order-*` (hero first).
- **Feed grid (`/najnovo`):** `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`.
- **Sticky nav:** `sticky top-0 z-50 border-b border-black bg-[#FDFBF7]`.

---

## 9. Imagery

- **Aspect ratios by context:** hero `aspect-video`, secondary hero `aspect-[4/3]`, feed card `aspect-[16/9]`, side-story thumb `aspect-[16/10]` (`w-32`). Always `object-cover`.
- **Frame:** editorial images sit in a hard `border border-black` box; feed images use `border-neutral-200`.
- **Always set** `loading` (eager for hero, lazy below the fold), `decoding="async"`, and **`referrerPolicy="no-referrer"`** (sources block hotlinking otherwise).
- **Missing-image placeholder:** centered `Vibes.mk` / `VIBES` watermark in `font-mono uppercase tracking-[0.3em] text-neutral-400` on `bg-neutral-100`. Never show a broken image.
- Hover: subtle zoom (`group-hover:scale-105`).

---

## 10. Voice, tone & microcopy

**Language:** Macedonian, **Cyrillic**. Address the reader informally ("ти/твои"). Warm, energetic, confident; never sensational. **No clickbait headlines.**

**Established lexicon — reuse these exact strings for consistency:**

| Context | Copy |
|---|---|
| Brand tagline | "Твои вести, секој ден" |
| Fresh (<15 min) | **Тазе** |
| Relative time | "пред {n} минути / часа / дена" |
| Read article (editorial) | "Прочитај повеќе →" |
| Open article (feed) | "Отвори →" |
| Load more | "Уште вести →" / "Вчитуваме уште вести…" |
| Counter | "Прикажани {n} / {total}" |
| Sign-in invite | "Вклучи се", "Управувај со твоите вести, сочувај написи и добиј персонализирани вибрации." |
| Empty state | "Нема пронајдени приказни" |
| Welcome | "Еј, добредојде на Vibes!" |
| Sections | "Последни новости", "Останати приказни", "Архива", "Најново" |

Buttons/labels are **UPPERCASE**; headlines are sentence-case Playfair; teasers are UPPERCASE mono.

---

## 11. Accessibility

- Every icon-only control needs an `aria-label` (and `sr-only` text where used today).
- **Focus:** visible focus on all interactive elements — yellow ring for inputs (`focus:ring-[#FFD300]/60`), `focus-visible:outline-black` for buttons. Never remove focus styling.
- **Contrast:** ink-on-paper and black-on-yellow are AA-strong — keep them. Be careful with `text-neutral-400/500` on `#FDFBF7` for anything essential (it's for de-emphasis only).
- **Modals/drawers:** trap `Escape` to close and lock body scroll (`overflow: hidden`) — match existing patterns.
- Respect `prefers-reduced-motion` for new looping/large animations.

---

## 12. Tech notes for implementers

- **Tailwind v4, no config file.** Tokens live in `app/globals.css` (`@import "tailwindcss"` + custom font classes). Brand colors are applied as **arbitrary values** (`bg-[#FFD300]`, `shadow-[6px_6px_0_#00000012]`). Match that convention.
- **No component/icon library** — icons are hand-rolled inline SVG (`viewBox="0 0 24 24"`, `strokeWidth={1.5}` for line icons, `fill="currentColor"` for brand glyphs). Keep new icons inline and consistent.
- **No CSS-in-JS, no styled-components.** Utility classes only; shared snippets via small components in `app/_components/`.
- If a value will repeat 3+ times (a new accent, a new shadow), promote it to a token in `globals.css` and document it here rather than copy-pasting arbitrary values.

---

## 13. Definition of done — design checklist (run before every UI PR)

- [ ] Background is `#FDFBF7`; text is ink/neutral, not pure gray-on-gray.
- [ ] Borders are hard hairlines (`border-black` editorial / `border-neutral-200` soft); **no blurred shadows** — offset-zero-blur only.
- [ ] The **one** accent is `#FFD300`; blue `#002CFF` only for interaction; coral `#f26d6d` only for Иран/alerts.
- [ ] Headlines = Playfair (`font-serif`) heavy; teasers/metadata = UPPERCASE mono wide-tracking; body/UI = Inter.
- [ ] Hover states lift (`-translate-y`) + grow the offset shadow, or invert to black/yellow.
- [ ] Interactive elements have visible focus (yellow ring / black outline) and `aria-label`s on icon buttons.
- [ ] Images: correct aspect ratio, `object-cover`, `referrerPolicy="no-referrer"`, and a `Vibes.mk` placeholder fallback.
- [ ] Copy is Macedonian Cyrillic, informal, reuses the established lexicon (§10); zero clickbait.
- [ ] **Works in both themes:** built with semantic tokens (`bg-paper`/`bg-surface`/`text-ink`/`text-muted`/`border-line`/`var(--shadow)`), not hardcoded canvas colors; text on always-yellow/coral surfaces stays dark; verified by flipping the theme toggle.
- [ ] Reused an existing recipe (§7) or added the new pattern to this doc in the same PR.

---

_Keep this document alive: when the design evolves, update `DESIGN_SYSTEM.md` in the same commit. A design change that isn't reflected here is a bug._
