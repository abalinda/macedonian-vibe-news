# Vibes — Brand & Design System

> The single source of truth for how **vibes.mk** looks, feels, and speaks.
> **Every new feature, component, and commit to `web/` must follow this document.** When you add UI, match these tokens and recipes instead of inventing new ones. If a genuinely new pattern is needed, add it here in the same PR so the system stays whole.

This system is **extracted from the live codebase** (`app/globals.css`, `app/layout.tsx`, `app/_components/*`, `app/page.tsx`, `app/najnovo/latest-feed.tsx`, `lib/teaser.ts`). It is descriptive of what exists *and* prescriptive for what comes next.

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

**Design north star:** _editorial neo-brutalism_ — a clean off-white "paper" canvas, hard black hairline borders, crisp offset (zero-blur) shadows, big Alegreya headlines, one electric yellow that does all the shouting, and a single signature **ray-burst** mark (§6) — an abstract Macedonian sun.

---

## 2. Logo & wordmark

- **Wordmark:** `VIBES.` — always **uppercase, with the trailing period.** The period is part of the mark; don't drop it.
- **Type treatment:** Alegreya (the `.font-serif` display face), `font-black`, `tracking-tighter`. Responsive size `text-3xl md:text-5xl`.
- **App/icon logo:** `public/logo_homepage.png`. In the navbar the hamburger icon (`public/hamburger-menu.svg`) cross-fades to the logo on hover.
- **Voice in metadata:** "Vibes — Твои вести, секој ден."

```tsx
<h1 className="font-serif text-3xl md:text-5xl font-black tracking-tighter">VIBES.</h1>
```

**Don't:** lowercase it, remove the period, set it in Inter/mono, add gradients or drop-shadows, or letter-space it loosely.

---

## 3. Color system

The palette is deliberately tiny: **paper + ink + one yellow**, with electric blue for interaction and coral reserved for a breaking/alert semantic. Everything else is neutral gray. **Apply brand colors through their token utilities — `bg-accent`, `text-link` — never raw hex.**

### Core tokens

| Token | Hex | Role |
|---|---|---|
| **Paper** | `#FDFBF7` | The universal background ("paper" feel). Also the PWA `theme-color`. Page bg, nav, drawers, modals. |
| **Paper (alt)** | `#F8F6F0` | Rare slightly-deeper paper for subtle layering. |
| **Ink** | `#000000` / `neutral-900` | Borders, text, the "invert" hover fill. Body text is `text-neutral-900`. |
| **Signature Yellow** | `#FFD300` → `bg-accent` | **The brand accent.** CTAs, the "Најново" pill, hover accents, "read more" underline, the **ray-burst** mark (§6), active highlights. Use it sparingly and on purpose — it's the loudest thing on the page. Apply via `bg-accent`/`text-accent`/`border-accent`. |
| **Electric Blue** | `#002CFF` → `text-link` | Interactive/source accent: source labels, link hover (`group-hover:text-link`), blog-body links. |
| **Alert** | `#f26d6d` → `bg-alert` | The **ВАЖНО / Тренд** urgency semantic — the *one* sanctioned use of coral, as the alert variant of the signpost label (§7). Recipe is defined and documented; it goes live only when the curator emits an urgency flag. Never use coral for generic decoration. |

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

Shadows are **hard, offset, zero-blur**, in near-transparent black. This is a defining trait — never use soft blurred Material shadows. **The tint is a token; the offset geometry stays inline** — e.g. `shadow-[6px_6px_0_var(--shadow)]`. Tokens flip for dark mode, so an offset shadow never vanishes on the dark canvas (the old raw `#000000xx` literals did).

| Token | Light | Dark | Use |
|---|---|---|---|
| `var(--shadow)` | `rgba(0,0,0,.07)` | `rgba(0,0,0,.55)` | **Default** card / button / panel offset |
| `var(--shadow-strong)` | `rgba(0,0,0,.10)` | `rgba(0,0,0,.65)` | Strong hover / modal / heavy CTA |
| `var(--shadow-alert)` | `rgba(255,0,0,.07)` | `rgba(255,90,90,.22)` | Reserved red-tinted offset, pairs with `bg-alert` |

> Rule of thumb: resting elements carry `var(--shadow)`; the **offset grows on hover** to imply lift (see §6 Elevation). `#e5e5e5` (token `border-line-soft`) remains an opaque hairline variant on light surfaces.

**Color don'ts:** no new brand hues without adding them here; never introduce a second accent that competes with `#FFD300`; never use pure blurred shadows; **apply brand colors/shadows through their token utilities, not raw hex**; keep coral to the reserved alert semantic.

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
| `var(--shadow-strong)` | `rgba(0,0,0,.10)` | `rgba(0,0,0,.65)` | Stronger offset (modals, heavy CTAs) |

**How existing literals map (use these substitutions when converting a surface):**
- `bg-[#FDFBF7]`→`bg-paper` · `text-neutral-900`→`text-ink` · `border-black`→`border-line` · `bg-white`→`bg-surface` · `border-neutral-200`→`border-line-soft` · `text-[#002CFF]`/`text-blue-600`→`text-link` · `bg-[#FFD300]`→`bg-accent` · `shadow-[…_#000000xx]`→`shadow-[…_var(--shadow)]`.
- **Invert fills** (`bg-black text-white`, `hover:bg-black hover:text-white`) → `bg-ink text-paper` / `hover:bg-ink hover:text-paper`. These invert correctly in *both* themes (dark-on-light becomes light-on-dark) — the preferred pattern for primary buttons and hover-invert badges.
- **Always-yellow surfaces keep DARK text** (`text-black` / `text-neutral-900`) — never switch their text to `text-ink` (it would go light on a yellow chip). Likewise, overlay **scrims stay dark** in both themes (`bg-black/20`–`/50`).
- Brand hues that read on both themes use their **always-on token** (`bg-accent` for `#FFD300`) — identical in both themes, but kept as a token so there's one source of truth.

**Dark don'ts:** don't add parallel `dark:` hex values when a token exists; don't flip text on always-accent surfaces; don't let an offset shadow vanish on dark — use `var(--shadow)`.

---

## 4. Typography

Three families, each with a fixed job. They are wired in `app/layout.tsx` and mapped to classes in `app/globals.css`. **Every font is loaded with the `cyrillic` subset** (`subsets: ['latin', 'cyrillic']`) — the product is Macedonian Cyrillic, and a latin-only subset silently falls back to system fonts for all real content.

| Family | CSS var | Class | Job |
|---|---|---|---|
| **Alegreya** | `--font-display` | `.font-serif` | **Headlines & editorial.** Logo, hero/H2/H3 titles, big statements. A distinctive editorial serif with a real Macedonian-Cyrillic cut (incl. localized italics) and weights to 900. Almost always `font-black`/`font-bold`, tight tracking, tight leading. |
| **Inter** | `--font-inter` | `.font-sans` | **UI & body.** Section labels, buttons, paragraphs, navigation, modal copy. |
| **Geist Mono** | `--font-geist-mono` | `.font-geist-mono` (also Tailwind `font-mono`) | **Metadata, teasers & the label voice.** Dates, counters, source/category micro-labels, the signature UPPERCASE teaser line, and **all chrome labels/kickers** (the one "label voice" — see the kicker recipe below). |

### The headline recipe
Alegreya, heavy, tight. Hero scales big; cards stay calmer.
```tsx
// Hero
<h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black leading-[0.9] break-words">…</h2>
// Card / secondary
<h3 className="font-serif text-xl md:text-2xl font-bold leading-tight">…</h3>
```

### The teaser/metadata recipe (very distinctive — keep it consistent)
**UPPERCASE, monospace, muted.** The teaser text helper *and* its type recipe live in **`lib/teaser.ts`** — import them, don't re-roll them:
```tsx
import { getTeaserText, TEASER_CLASS } from "@/lib/teaser";
// TEASER_CLASS = "font-mono uppercase tracking-[0.12em] leading-relaxed text-muted"
<p className={`${TEASER_CLASS} text-xs md:text-sm line-clamp-3`}>{getTeaserText(post)}</p>
```
Tracking is **capped at `0.12em`** — Cyrillic loses legibility past that at small sizes (it used to range 0.15–0.3em). Color is `text-muted` (theme-aware), so teasers no longer use fixed dark neutrals that vanished in dark mode. Short mono *labels* (dates, counters) may still use `tracking-widest`/`tracking-[0.2em]`.

### The label voice — kickers & chrome
The mono UPPERCASE "label voice" is the **single recipe for all chrome labels**: hero/section eyebrows, signpost labels, source micro-labels. It lives in `lib/teaser.ts` so chrome stays consistent:
```tsx
import { KICKER_CLASS } from "@/lib/teaser";
// KICKER_CLASS = "font-mono uppercase text-muted"   (tracking set per context)
<span className={`${KICKER_CLASS} text-[10px] tracking-[0.3em]`}>Избор на денот</span>
```
Tracking is deliberately **not** baked in: short labels can take `0.2–0.3em`, denser Cyrillic stays at `0.12em`. Set it per use so the `tracking-*` utilities never collide.

### The standfirst / deck — PRIMARY tier only
The hero's lead line is a **serif italic standfirst in natural case** (not the mono teaser). It reads as a magazine deck and visually marks the hero as the *primary* story, distinct from the mono-teaser cards (density tiers, §8). **Cards keep the mono teaser.**
```tsx
import { getStandfirstText, DECK_CLASS } from "@/lib/teaser";
// DECK_CLASS = "font-serif italic leading-snug text-ink/85"
<p className={`${DECK_CLASS} text-base md:text-lg max-w-2xl mx-auto`}>{getStandfirstText(post)}</p>
```

### Section headers
Sans, black weight, uppercase, with a **thick underline** (`border-b-4 border-line`) and a small **ray-burst tick** (§6) — a core editorial signature.
```tsx
<h4 className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-widest border-b-4 border-line pb-2 mb-4">
  <RayBurst className="h-3.5 w-3.5 text-accent shrink-0" /> Последни новости
</h4>
```

### Long-form (blog reader)
Use the `.blog-body` class (defined in `globals.css`): serif, `line-height: 1.8`, links in `#002cff`, images `border-radius: 12px`.

**Type don'ts:** no Alegreya (`.font-serif`) for body paragraphs or small UI; no sentence-case teasers (they're UPPERCASE mono); don't mix a fourth typeface; never load a font latin-only.

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
<article className="rounded-xl border border-line-soft bg-surface shadow-[6px_6px_0_var(--shadow)]
                    transition-transform duration-200 hover:-translate-y-[3px] hover:shadow-[10px_10px_0_var(--shadow)]">
```

---

## 6. The signature, elevation & motion

### The one signature — the ray-burst mark
Vibes has **one** identity mark: an abstract **ray-burst** (a "vibe" — a spark of rays around a solid core), an abstract Macedonian sun in the signature yellow. It is **not** the 16-ray Vergina sun (a politically contested symbol) — eight even rays, hard and geometric. Component: `app/_components/ray-burst.tsx`, drawn in `currentColor` so it picks up `text-accent`/ink and flips in dark mode.

- **Hero (the memorable use):** the curated eyebrow — `<RayBurst className="h-3.5 w-3.5 text-accent" /> ИЗБОР НА ДЕНОТ` — **crowns** the lead story, sitting *above* the hero image (lifted out of the story link so the disclosure stays interactive).
- **The AI-curation mark:** the ray-burst doubles as Vibes' "curated by AI" glyph. Wherever curation/AI is surfaced, pair the ray-burst with the one-tap disclosure (§7) — this is how the *"hand/AI-curated"* promise (§1) becomes visible. Reuse this one mark for that meaning; don't invent a second AI icon.
- **Supporting:** a small tick on section headers (§4); the empty-state graphic (muted, `text-neutral-300 dark:text-neutral-600`).
- Keep it **intentional and rare** — it is the thing the page is remembered by. Don't sprinkle it as generic decoration.

The **offset-shadow lift** below is the brand's signature *interaction*; the ray-burst is the signature *mark*. Everything else stays quiet.

### Elevation = offset, not blur
Resting shadow is a small hard offset; on hover the element **lifts** (`-translate-y`) and the **offset grows** — the "sticker peeling off the page" feel. **Use the shadow tokens** (§3), never raw `#000000xx`.

| State | Pattern |
|---|---|
| Rest | `shadow-[4px_4px_0_var(--shadow)]` (small) … `shadow-[10px_10px_0_var(--shadow)]` (panels) |
| Hover (lift) | add `hover:-translate-y-0.5` (or `-translate-y-[3px]`) **and** bump offset, e.g. `hover:shadow-[10px_10px_0_var(--shadow)]` |
| Hover (invert) | `hover:bg-ink hover:text-paper` — or the premium variant `hover:bg-ink hover:text-accent` |
| Hover (yellow swap) | `hover:bg-accent hover:text-black` (ink buttons → yellow on hover) |

### Motion
- **Easing:** `cubic-bezier(0.22,1,0.36,1)` (expo-out, the default) and `cubic-bezier(0.33,1,0.68,1)`.
- **Duration:** `200–400ms`. Micro-interactions 200ms; layout/expansion 300–400ms.
- **Hero entrance (the orchestrated moment):** a staggered "rise" on load — `vibe-reveal` / `vibe-reveal-2` / `vibe-reveal-3` (eyebrow → headline → teaser), defined in `globals.css`. **Gated inside `@media (prefers-reduced-motion: no-preference)`** — reduced-motion users get the final state with no movement.
- **Live pills:** the "Најново" pulse is **`md:motion-safe:animate-pulse`** — always gate looping motion with `motion-safe:`.
- **Image hover:** `group-hover:scale-105` (700ms) on hero, `scale-[1.02]` on cards.
- **Headline hover:** `group-hover:underline decoration-2 underline-offset-4`.
- **"Read more" hover:** a yellow underline grows in — `border-b-2 border-transparent group-hover:border-accent`.

Respect `prefers-reduced-motion` for **all** looping/large animations — gate with the `motion-safe:` variant or a `no-preference` block.

---

## 7. Component recipes

Copy these. They are the canonical building blocks — extend them, don't replace them.

### Buttons

```tsx
// PRIMARY (ink) — default action
<button className="px-5 py-3 rounded-xl border border-line bg-ink text-paper
  text-xs font-bold uppercase tracking-[0.25em]
  transition-all duration-200 ease-out
  hover:-translate-y-0.5 hover:shadow-[10px_12px_0_var(--shadow-strong)]
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]">
  Најново денес
</button>

// YELLOW CTA — high-intent (sign up, key conversion)
<button className="flex items-center justify-between border border-line bg-accent text-black
  px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em]
  shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[10px_10px_0_var(--shadow)]">
  <span>Креирај профил</span><span className="font-mono">+</span>
</button>

// GHOST — secondary, inverts to yellow
<button className="px-5 py-3 rounded-xl border border-line/50 bg-surface text-ink
  text-xs font-bold uppercase tracking-[0.25em] transition-all
  hover:border-line hover:bg-accent hover:text-black hover:-translate-y-0.5 hover:shadow-[8px_10px_0_var(--shadow)]">
  За нас
</button>
```

### Pills & chips

```tsx
// Live category pill — "Најново" (yellow)
<span className="px-3 py-1 rounded-full border border-line bg-accent text-black
  text-sm font-bold uppercase tracking-widest shadow-[3px_3px_0_var(--shadow)] md:motion-safe:animate-pulse">Најново</span>

// Source badge (editorial) — inverts on hover
<span className="inline-block border border-line px-2 py-0.5 text-xs font-bold uppercase tracking-widest
  hover:bg-ink hover:text-paper transition-colors">{source}</span>

// Freshness badge — "Тазе" (yellow) vs time (ink)
<span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1
  bg-accent text-black">Тазе</span>  // else: bg-ink text-paper → "пред 12 минути"
```

### Icon buttons (circular, hard border)

```tsx
<a className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink
  transition-all hover:bg-accent hover:text-black hover:shadow-[4px_4px_0_var(--shadow)]">{/* inline SVG */}</a>
```

### Signature ray-burst (§6)

```tsx
import { RayBurst } from "./_components/ray-burst";
<RayBurst className="h-3.5 w-3.5 text-accent" />                        // section tick / hero eyebrow
<RayBurst className="h-8 w-8 text-neutral-300 dark:text-neutral-600" /> // empty-state graphic
```
> Inherits `currentColor`; size with `h-`/`w-`. One memorable use (the hero), small supporting ticks elsewhere — never decorative spam.

### AI-curation disclosure
Vibes is AI-curated — **say so, in one tap.** A small "?" beside a curation label opens a plain-language panel (`app/_components/ai-disclosure.tsx`). Render it as a **sibling** of the story link (like Share), never nested inside the anchor.
```tsx
import { AiDisclosure } from "./_components/ai-disclosure";
<AiDisclosure />   // lives in the hero eyebrow, beside ИЗБОР НА ДЕНОТ
```
Canonical copy — truthful: we *select & summarize* and always link the source; we do **not** claim per-article editor review:
> **Курирано со ВИ** · „Vibes користи вештачка интелигенција за да избере и резимира вести од македонски извори. Изворот е секогаш означен — допри „Прочитај повеќе“ за целата приказна.“

### Signpost label (incl. the ВАЖНО / alert variant)
A bold mono label that fronts curated copy to make it scannable (the Axios "why-it-matters" pattern). One shape; **tone via the left rule**, keeping the text ink (accessible). The **alert** rule is the one sanctioned use of coral (§3):
```tsx
// default — accent rule
<span className={`${KICKER_CLASS} text-[10px] tracking-[0.2em] text-ink border-l-2 border-accent pl-2`}>ЗОШТО Е ВАЖНО</span>
// alert / breaking — coral rule
<span className={`${KICKER_CLASS} text-[10px] tracking-[0.2em] text-ink border-l-2 border-alert pl-2`}>ВАЖНО</span>
```
> Vocabulary: **ЗОШТО Е ВАЖНО · НАКРАТКО · КОНТЕКСТ · ВАЖНО/ТРЕНД**. The label content (and the alert flag) comes from the curator — until that data lands, these stay defined-but-unused (never decorative). See `VIBES_V2_PLAN.md` Themes B/C.

### Search input

```tsx
<input className="h-11 w-full rounded-full border border-line/20 bg-surface px-12 text-sm font-sans
  placeholder:text-neutral-500 shadow-[3px_3px_0_var(--shadow)]
  focus:border-line focus:outline-none focus:ring-2 focus:ring-accent/60 transition-all" />
```
> **Focus ring is yellow** (`focus:ring-accent/60`). Use this for all focusable inputs.

### Share

`<ShareButton url={…} title={…} />` (`app/_components/share-button.tsx`) uses the **Web Share API** on mobile and falls back to a brand-styled menu (Copy link, WhatsApp, Viber, Facebook, Telegram, X, LinkedIn, Email). Variants: `icon` (compact circle for cards/overlays) and `pill` (icon + "Сподели" for article headers). It captures a PostHog `share_clicked` event with the method.
- **`url`** is a path (`/blog/12`) or an absolute source URL — `toAbsoluteUrl` (`lib/share.ts`) resolves it. Share the **canonical vibes URL for our own content** (blog) and the **source link for external stories** (best social preview).
- Story cards are wrapped in anchors, so render `ShareButton` as a **sibling overlay** (`absolute right-3 top-3 z-20`) of the card link — never nested inside it (keeps valid HTML; the button also calls `preventDefault`/`stopPropagation`). The host's outer wrapper must **not** be `overflow-hidden`, or the menu clips.
- The reading view (`app/blog/[id]`) pairs the pill share with a `ReadingProgress` bar (`app/_components/reading-progress.tsx`) — a thin `bg-accent` top bar that fills on scroll.

### Modals, drawers & panels

- **Overlay:** `bg-black/20` (drawer) to `bg-black/50` (modal) + `backdrop-blur-sm`.
- **Surface:** `bg-paper border border-line` + a big offset shadow (`shadow-[14px_14px_0_var(--shadow)]`), `rounded-2xl` for modals, square-edged for the slide-in drawer.
- **Invite panels:** add a soft yellow radial/linear glow (see §3 soft fills).
- **Z-index ladder (keep consistent):** content `z-20` → sticky nav `z-50` → drawer `z-[60]` → search dropdown `z-[70]` → welcome modal `z-[80]`.

### "Read more" affordance
```tsx
<span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest
  border-b-2 border-transparent group-hover:border-accent">Прочитај повеќе →</span>
```

### Vibe bars («Твојот вајб»)
Horizontal progress bars showing the user's live category weights (see
`app/_components/vibe-profile.tsx`). Track: `h-4 border border-line
bg-surface-2 rounded-sm`; fill: `bg-accent border-r border-line`, width =
percentage (min 2% so a bar is always visible). Label: mono UPPERCASE
`tracking-[0.2em]`; picked categories get a `★`. Never animate the fill.

### Selectable category card (wizard)
Toggle card used in the «За тебе» wizard (`app/za-tebe/vibe-wizard.tsx`).
Unselected: `bg-surface-2 border border-line`; selected: `bg-accent
text-black shadow-[6px_6px_0_var(--shadow)] -translate-y-0.5` with a mono
`✓ Избрано` micro-label. Always toggled via `<button aria-pressed>`.

---

## 8. Layout & grid

- **Container widths:** content `max-w-[1500px]`, category bar `max-w-[1400px]`, navbar `max-w-[1350px]`, all centered `mx-auto`.
- **Page padding:** `px-4 md:px-8` (nav) / `px-5 md:px-10` (content). Always give mobile breathing room.
- **The editorial grid (homepage):** 12-col on `lg`, split **3 / 6 / 3** — left "Последни новости" sidebar, center hero + 2 secondary heroes, right "Останати приказни" sidebar. Columns separated by `border-line-soft` rules. Stacks to one column on mobile with explicit `order-*` (hero first).
- **The hero is a thesis.** The lead story carries a curated eyebrow — the ray-burst mark + "Избор на денот" — and an orchestrated staggered reveal (§6), to dramatize that the story is *chosen*, not dumped. Keep the hero about curation, not just a big headline.
- **Feed grid (`/najnovo`):** `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`.
- **Sticky nav:** `sticky top-0 z-50 border-b border-line bg-paper`.

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
| Hero curated eyebrow | "Избор на денот" |

Buttons/labels are **UPPERCASE**; headlines are sentence-case Alegreya; teasers are UPPERCASE mono.

---

## 11. Accessibility

- Every icon-only control needs an `aria-label` (and `sr-only` text where used today).
- **Focus:** visible focus on all interactive elements — yellow ring for inputs (`focus:ring-accent/60`), `focus-visible:outline-[color:var(--ink)]` for buttons. Never remove focus styling.
- **Contrast:** ink-on-paper and black-on-yellow are AA-strong — keep them. Be careful with `text-neutral-400/500` on `#FDFBF7` for anything essential (it's for de-emphasis only).
- **Modals/drawers:** trap `Escape` to close and lock body scroll (`overflow: hidden`) — match existing patterns.
- Respect `prefers-reduced-motion` for **all** looping/large animations — gate with `motion-safe:` (e.g. `md:motion-safe:animate-pulse`) or a `no-preference` media query (the hero `vibe-reveal`). Teaser tracking is capped at `0.12em` for Cyrillic legibility (§4).

---

## 12. Tech notes for implementers

- **Tailwind v4, no config file.** Tokens live in `app/globals.css` — semantic colors via `@theme inline` (`--color-accent`, `--color-link`, `--color-alert`, plus paper/surface/ink/line/muted) and shadow tints as CSS vars (`--shadow`, `--shadow-strong`, `--shadow-alert`). **Apply brand colors through their token utilities** (`bg-accent`/`text-link`) and shadows as `shadow-[<offset>_var(--shadow)]` — **not** raw hex. (The only documented hex exceptions are the soft-yellow glow fills in §3, used inside one decorative gradient.)
- **No component/icon library** — icons are hand-rolled inline SVG (`viewBox="0 0 24 24"`, `strokeWidth={1.5}` for line icons, `fill="currentColor"` for brand glyphs). The signature **ray-burst** lives in `app/_components/ray-burst.tsx` (§6). Keep new icons inline and consistent.
- **No CSS-in-JS, no styled-components.** Utility classes only; shared snippets via small components in `app/_components/`.
- If a value will repeat 3+ times (a new accent, a new shadow), promote it to a token in `globals.css` and document it here rather than copy-pasting arbitrary values. Shared logic does the same — e.g. the teaser helper + recipe live in `lib/teaser.ts` (§4).

---

## 13. Definition of done — design checklist (run before every UI PR)

- [ ] Background is `#FDFBF7`; text is ink/neutral, not pure gray-on-gray.
- [ ] Borders are hard hairlines (`border-black` editorial / `border-neutral-200` soft); **no blurred shadows** — offset-zero-blur only.
- [ ] Brand colors via **tokens** (`bg-accent`/`text-link`), never raw hex. One accent (yellow); blue `text-link` only for interaction; coral `bg-alert` reserved for breaking (not yet used).
- [ ] Headlines = Alegreya (`font-serif`) heavy; teasers via `TEASER_CLASS` from `lib/teaser.ts` (mono, ≤0.12em, `text-muted`); body/UI = Inter. Fonts loaded with the `cyrillic` subset.
- [ ] Hover states lift (`-translate-y`) + grow the offset shadow, or invert to ink/yellow.
- [ ] Looping/large motion is gated for reduced-motion (`motion-safe:` or a `no-preference` block); the ray-burst signature is used intentionally (one memorable spot), not as decoration.
- [ ] Interactive elements have visible focus (yellow ring / black outline) and `aria-label`s on icon buttons.
- [ ] Images: correct aspect ratio, `object-cover`, `referrerPolicy="no-referrer"`, and a `Vibes.mk` placeholder fallback.
- [ ] Copy is Macedonian Cyrillic, informal, reuses the established lexicon (§10); zero clickbait.
- [ ] **Works in both themes:** built with semantic tokens (`bg-paper`/`bg-surface`/`text-ink`/`text-muted`/`border-line`/`bg-accent`/`var(--shadow)`), not hardcoded canvas colors or raw `#000000xx` shadows; text on always-yellow/coral surfaces stays dark; verified by flipping the theme toggle.
- [ ] Reused an existing recipe (§7) or added the new pattern to this doc in the same PR.

---

## 14. Visual references

Screenshots of the canonical states keep this doc honest — capture and drop them in `web/DESIGN_SYSTEM_assets/` and link them here:

- [ ] Homepage hero (light **and** dark) — curated eyebrow + ray-burst, headline, teaser.
- [ ] A feed card (`/najnovo`) at rest and on hover (the offset-shadow lift).
- [ ] The ray-burst mark at its three sizes (hero eyebrow, section tick, empty state).
- [ ] One **do vs. don't**: token utilities vs. raw-hex literals; teaser at `0.12em` vs. the old wide tracking.

> Until captured, the recipes above plus the live homepage are the reference. Regenerate these after any change to the hero, palette, or signature.

---

_Keep this document alive: when the design evolves, update `DESIGN_SYSTEM.md` in the same commit. A design change that isn't reflected here is a bug._
