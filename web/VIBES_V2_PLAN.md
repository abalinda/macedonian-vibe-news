# Vibes v2 — UX/UI Improvement Plan

> A research-grounded plan to **evolve** vibes.mk's editorial neo-brutalism (same DNA, pushed harder), focused on three areas you chose: **reading & content**, **homepage & hero / curation**, and **navigation, search & IA**. Engagement/retention mechanics (push, paywalls, accounts) are deliberately out of scope.
>
> This plan is a companion to `DESIGN_SYSTEM.md` — it does **not** replace it. Anything adopted here must be folded back into `DESIGN_SYSTEM.md` in the same commit (per `CLAUDE.md`).

---

## 0. How to read this

Every recommendation is tagged with an **evidence tier** so you know what it rests on:

- ✅ **Verified** — an adversarially-verified research claim (3-vote refutation panel; vote shown). High confidence.
- ○ **Sourced** — fetched from a named source this run but not in the formally-verified top-25. Medium confidence.
- ◑ **UX authority** — established guidance from Baymard / NN/g / interface-pattern literature; standard practice, not freshly re-verified this run.
- 🔧 **Codebase fact** — observed directly in the repo (file:line). Ground truth for "what exists today."

### Research provenance & honest caveats

The deep-research run decomposed the question into 5 angles → 24 sources → 115 extracted claims → 25 sent to a 3-vote adversarial verifier → **19 confirmed, 6 killed**. **It hit a session/token limit at the very end**, so (a) the automatic synthesis step was aborted and (b) 7 verification votes for nav/IA and a couple of AI-summary claims never ran. Consequence: the **verified spine skews toward typography and the Guardian's May-2025 redesign** (those got fully checked), while the **nav/search/IA** recommendations lean on ◑ UX-authority sources that were fetched but under-verified. I've tagged accordingly — treat ✅ as load-bearing and ◑/○ as strong-but-confirm-before-betting-big.

**Killed claims** (do not act on): a strict 3-role type system at Rest of World (refuted 0-3); Axios "exactly two paragraphs" as a hard rule (1-2); the 2017 NYT block redesign as current (0-3, out of window); "Semafor Yellow" as a named brand color (0-2). Notably the last one means **our yellow is genuinely our own** — no major outlet owns it.

---

## 1. The north star for v2

The research keeps validating the same thing: **the strongest editorial brands win on a small, opinionated type-and-label system, not on chrome.** vibes already has the right *bones* — a three-voice type stack (Alegreya display / Inter UI / Geist Mono labels), a one-yellow palette, hard offset shadows, the ray-burst. v2 is about **sharpening and systematizing** those, plus closing the one glaring gap: **vibes is "AI-curated" but the interface never shows it.**

Three sentences to steer every decision:

1. **Make the type do more of the work** — push Alegreya's expressiveness, lock the mono "label voice," differentiate density by story importance.
2. **Make the curation visible and scannable** — turn the AI from a hidden backend into a labeled, transparent, skimmable feature (this is also brand law: *"Доверба и транспарентност"* + *"everything is hand/AI-curated"*, `DESIGN_SYSTEM.md:18-19`).
3. **Keep the neo-brutalist DNA** — every new element is paper, hairline borders, zero-blur offset shadows, one yellow, the ray-burst. Evolve, don't dilute.

---

## 2. The five themes

### THEME A — Sharpen the three-voice type system

**What the research says**

- ✅ The Guardian's identity is a single **purpose-built editorial superfamily** built for complex hierarchy — the named practice is "commission/curate one expressive family, not off-the-shelf fonts." *(2-1 — showcase.commercialtype.com/guardian)*
- ✅ The Guardian chose a **low-contrast slab-serif (Egyptian) for headlines specifically to differentiate** and create a distinctive, opinionated voice. *(3-0 — same)*
- ✅ It runs **optically-distinct Headline vs Text cuts**; the Text cut uses **large x-height + low contrast + simplified detailing** to stay legible at small sizes and on low-res screens — a directly transferable body-readability recipe. *(3-0 — same)*
- ✅ Rest of World deploys **monospace small, UPPERCASE, letter-spaced `.08em`** for buttons/kickers/captions/credits/data — mono is the **"system/label voice," distinct from editorial type.** *(3-0 — restofworld.org/style-guide)*
- ○ FT commissioned a bespoke serif (**Financier**) briefed to scale broadsheet→mobile on a wide measure; The Economist runs custom **Econ Sans Bold + Milo Serif Bold** for print+digital; Bloomberg Businessweek pairs **Neue Haas Grotesk display + Publico body**. The pattern across all three: **a deliberate display/body/UI role split.**

**What vibes does today** 🔧

- Three families already loaded (`layout.tsx:45-59`): **Alegreya** (`.font-serif`, display), **Inter** (`.font-sans`, UI/body), **Geist Mono** (`font-mono`, labels). All with `cyrillic` subsets.
- Mono label voice already exists but is **under-used**: `TEASER_CLASS = "font-mono uppercase tracking-[0.12em] leading-relaxed text-muted"` (`lib/teaser.ts:29`), tracking capped at `.12em` for Cyrillic.
- Hero headline is `font-serif text-4xl md:text-5xl lg:text-6xl font-black leading-[0.9]` (`page.tsx:164`).

**What v2 does** — you already have the *exact* structure the best outlets use. Push it:

1. **Formalize the mono as the system "label voice"** (✅ RoW pattern). Today it's only the teaser. Promote it to a documented, reusable **`Kicker` / `Label` recipe** used for: source badges, the hero eyebrow, section headers, card category chips, freshness pills, and the new AI labels (Theme C). One voice, everywhere chrome speaks.
2. **Make Alegreya more expressive on the hero** (✅ "opinionated voice" pattern). Alegreya has a gorgeous italic and a wide weight range that vibes doesn't exploit. Introduce an **editorial italic standfirst/deck** under the hero headline and lean into the highest display weights — this is the cheapest way to read as "high-craft editorial" rather than "feed."
3. **Tune the body "Text cut" for Cyrillic at small sizes** (✅ Guardian Text-cut recipe). Audit teaser/card body sizes for x-height and measure; the principle "large x-height, low contrast, simplified detail" is exactly what keeps Cyrillic legible in dense cards.
4. **Lock a formal type scale** in `globals.css` as tokens (display / headline / card-title / deck / body / label) so the five card renderers stop hand-rolling sizes (`page.tsx`, `latest-feed.tsx`, `stories-list.tsx` each declare their own).

**Implementation steps**

| Step | File(s) | Change |
|---|---|---|
| A1 | `app/globals.css` | Add `--text-*` scale tokens + a `.kicker` / `.deck` utility class (mono-uppercase label; serif-italic deck). |
| A2 | `lib/teaser.ts` | Export a named `KICKER_CLASS` alongside `TEASER_CLASS`; both reference the same recipe so chrome is consistent. |
| A3 | `app/page.tsx` `HeroStory` (`:124-177`) | Add an optional serif-italic deck line under the headline; bump the eyebrow to the shared kicker recipe. |
| A4 | The 5 card renderers | Replace per-card hand-rolled sizes with the new scale tokens. |
| A5 | `DESIGN_SYSTEM.md §5` | Document the type scale + the "label voice" rule (mono = all chrome). |

---

### THEME B — A small, bold, labeled story format (scannability)

**What the research says**

- ✅ Axios uses **"Axioms"** — ~50 recurring **bold signpost labels** ("why it matters", "the big picture", "the bottom line", "go deeper", "the other side") to break content into scannable chunks. *(3-0 — innovation.media; journalism.co.uk)*
- ✅ Axios's Smart Brevity "atomic unit" = **headline + image + short copy anchored by a bold "why it matters" label.** *(3-0 — journalism.co.uk)*
- ✅ Semafor's **"Semaform"** splits each story into named, capitalized-subhead sections (**The News / Reporter's View / Room for Disagreement / The View From / Notable**) — fact visibly separated from analysis. *(3-0 — cjr.org; niemanlab.org)*

**What vibes does today** 🔧 — every card shows exactly **one** teaser line (`getTeaserText`, `teaser.ts:14-20`). No signposting, no "why it matters," nothing to scan past the headline. The hero does have one nice editorial touch already: the **"Избор на денот"** eyebrow with a ray-burst (`page.tsx:151-152`).

**What v2 does** — vibes aggregates rather than reports, so don't copy Semaform's full multi-section article. Copy the **scannability mechanic**: a tiny fixed vocabulary of **bold mono labels** that front the curated text. The natural Macedonian set:

- **ЗОШТО Е ВАЖНО** (why it matters) — the one-line hook.
- **НАКРАТКО** (in brief) — 2–3 bullet key points (Theme C).
- **КОНТЕКСТ** (context) — optional background line.

Render the label in the **signature yellow** (or coral for the "важно/breaking" variant — Theme E), mono-uppercase, as the card's scannability anchor. This is pure design-system evolution: it's just the existing kicker recipe applied to richer content.

> **Data dependency:** real "why it matters" / bullets require the **scraper/curator** (`curator_groq.py`) to emit them and a **new posts column** (added via an idempotent guard like `ensureAdminChoiceColumn()`, per the repo's no-migrations convention). Frontend-only fallback for P0: derive a single bold label + the existing teaser, no new data needed.

**Implementation steps**

| Step | File(s) | Change |
|---|---|---|
| B1 (FE-only) | `lib/teaser.ts` + all cards | Add a `<Kicker>` label slot above the teaser; default label "ЗОШТО Е ВАЖНО" gated to only show when copy exists. |
| B2 (data) | `scraper/curator_groq.py` | Extend the classification prompt to return `why_it_matters` (≤1 line) + `key_points` (2–3 bullets). |
| B3 (schema) | scraper persist + `web/lib` | Idempotent `ALTER TABLE posts ADD COLUMN why_it_matters / key_points` guard; read in the post query. |
| B4 | `DESIGN_SYSTEM.md §7` | Add the "signpost label" component recipe + the fixed Macedonian label vocabulary. |

---

### THEME C — Make the AI visible (labeled summary + disclosure) ⭐ highest-leverage

**What the research says**

- ✅ The dominant AI-summary UX is a **bullet list at the top of the article**, named "Takeaways / Summaries / Key Points / Key Takeaways." *(3-0 — niemanlab.org)*
- ✅ WSJ shows **exactly 3 bullets labeled "Key Points"** plus a prominent **"What's this?" disclosure** explaining it was AI-generated and editor-checked. *(2-1 — niemanlab.org)*
- ○ A Jan-2026 controlled study (arXiv 2601.11072) found **plain-text AI disclosures were the *least* effective**; timeline/visual disclosures communicated the human-AI process better — argues against a single flat "AI-curated" label. AI labels read best **at the byline**.

**What vibes does today** 🔧 — **nothing surfaces the AI at all.** vibes is literally an "AI-curated" product (brand law, `DESIGN_SYSTEM.md:18`) yet there is **no AI label, no summary block, no disclosure** anywhere in the UI. The hero's "Избор на денот" is the closest thing, and it doesn't say *who/what* chose it.

**What v2 does** — this is the biggest win in the whole plan because it **improves scannability *and* converts the core product promise into a visible feature *and* satisfies the brand's own transparency value** — all at once.

1. **Add a labeled "НАКРАТКО" (Key Points) block** — 2–3 bullets — on the hero and (condensed) on cards. Mirrors the verified WSJ/Nieman pattern in Macedonian.
2. **Add a quiet disclosure affordance** — a small "Што е ова?" / ⚡ ray-burst chip near the curation eyebrow that, on tap, explains: *"Ова резиме е подготвено со вештачка интелигенција и проверено уредувачки."* (Matches WSJ's "What's this?" almost verbatim.)
3. **Label the curation, don't hide it** — evolve the hero eyebrow from "Избор на денот" to also carry a subtle **"ВИ-избор"/ray-burst** mark, establishing the ray-burst as *the* "AI-curated" glyph site-wide (◑ + the study's "don't rely on flat text" finding → use the glyph + label, not just words).

**Implementation steps**

| Step | File(s) | Change |
|---|---|---|
| C1 | `app/_components/` (new `KeyPoints.tsx`) | Bullet block: ray-burst bullet markers, mono "НАКРАТКО" label, serif/Inter bullets. Uses `key_points` from B3. |
| C2 | `app/page.tsx` `HeroStory` | Render `<KeyPoints>` under the deck; condensed 2-bullet variant in `SecondaryHeroStory`. |
| C3 | new `app/_components/ai-disclosure.tsx` | Small "Што е ова?" popover (reuse the welcome-modal/popover styling, `z` ladder per `DESIGN_SYSTEM.md`). |
| C4 | `DESIGN_SYSTEM.md` | New "AI curation & disclosure" section — ray-burst = the AI-curation mark; disclosure copy; placement rules. |

> P0 ships C3 + the eyebrow label (frontend-only, no data). C1/C2 follow once B2/B3 land the `key_points` data.

---

### THEME D — Modular front page: density tiers + art-directed hero

**What the research says** (all from the Guardian's **May 7 2025** redesign — its first major one in ~10 years, the most current benchmark we have)

- ✅ It combines **mobile-first UX with print-inspired art direction.** *(3-0 — designweek.co.uk)*
- ✅ **Differentiated section layouts + typographic weights** signal story type and aid scanning — a "layering" system replacing a uniform, "staid" index-like hierarchy. *(3-0 — same)*
- ✅ Explicit **primary vs secondary** section hierarchy: **primary = big display** for the best journalism; **secondary = higher information density.** *(3-0 — creativebloq.com)*
- ✅ **Editor art-direction per story:** images in multiple formats, **articles allowed with no image**, creative/vertical video; image size driven by **image quality, not the layout slot.** *(3-0 — designweek.co.uk)*
- ✅ A **masthead "highlights bar" placed *above* the titlepiece** shows the breadth of (non-news) journalism at a glance while keeping the news splash right under the logo — solves the mobile "looks news-only" problem. *(3-0 — creativebloq.com)*
- ✅ A **masthead carousel** at the top surfaces eclectic alternatives to the main news. *(3-0 — designweek.co.uk)*
- ✅ NYT's guiding principle: **algorithmic curation must never overwhelm the editorial core** — *"the center still needed to be news."* *(3-0 — fastcompany.com)*

**What vibes does today** 🔧 — a fixed **3/6/3 `lg:grid-cols-12`** grid (`page.tsx:422`): left sidebar = 4 `SideStory`, center = `HeroStory` + 2 desktop-only `SecondaryHeroStory`, right = 5 `SideStory`. Hero is driven by `featured_slots` (`page.tsx:344-373`), homepage shows only the `good_vibes=1` tier. The layout is good but **uniform** — every non-hero story gets near-identical treatment, and the hero **forces `aspect-video`** regardless of the image.

**What v2 does**

1. **Introduce explicit density tiers** (✅ Guardian primary/secondary). Today the hero is "primary" and everything else is one flat tier. Add a middle tier: a couple of **art-directed secondary leads** that are visually bigger than the sidebar `SideStory` list, then a **dense scan list** below. Differentiate by *type weight and size*, not new colors.
2. **Art-direct the hero** (✅ "image quality, not slot"). Let the hero adapt: portrait/landscape/no-image variants instead of a forced `aspect-video` crop. A strong headline with **no image** should be allowed to be the hero (very on-brand for editorial neo-brutalism — big type, paper, no filler image).
3. **Add a "highlights bar"/category shelf above the fold** (✅ Guardian above-titlepiece bar + masthead carousel). vibes has a `CategoryNav` chip row but no *visual* breadth shelf. A compact horizontally-scrollable strip of one pick per category — under the wordmark — shows the site's range at a glance (and finally gives the 6 `featured_slots` category heroes a home on the homepage, which today only the hero slot uses).
4. **Hold the curation balance** (✅ NYT). Keep human/admin override (`featured_slots` admin lock) prominent relative to pure auto-rotation — "the center stays news," and the admin's choice visibly wins.

**Implementation steps**

| Step | File(s) | Change |
|---|---|---|
| D1 | `app/page.tsx` | Add a `density`/`tier` prop to story components; introduce a secondary-lead tier between hero and sidebar list. |
| D2 | `app/page.tsx` `HeroStory` | Support `no-image` and portrait variants; choose layout from image presence/aspect, not a fixed `aspect-video`. |
| D3 | new `app/_components/highlights-bar.tsx` | Horizontal one-per-category shelf fed by the 6 category `featured_slots`; sits under the wordmark. |
| D4 | `DESIGN_SYSTEM.md §grid` | Document the primary/secondary density tiers + the no-image hero variant. |

---

### THEME E — Navigation, search & IA polish

> Lowest verification coverage (the session limit cut the nav/IA votes). These rest on ◑ UX authorities + 🔧 what's already in the repo. Confirm before large bets, but they're standard, low-risk craft.

**What the research / authorities say**

- ◑ **Search autocomplete** (Baymard): suggest after the first character, **highlight the matched substring**, keep suggestions keyboard-navigable, visually distinguish suggestion *types* (e.g. category vs story), don't show "no results" prematurely.
- ◑ **Search scope** (Baymard): users miss scoped search; an explicit "search within {category}" scope helps in a categorized archive.
- ◑ **Mobile nav** (NN/g): hidden hamburger nav lowers discoverability; **visible nav (tab/chip bars) wins** — and vibes *already* exposes a visible `CategoryNav` chip row (good; keep leaning visible).
- ◑ **Sticky/condensing headers**: sticky headers aid wayfinding; condense-on-scroll preserves context without eating viewport.
- ✅ (from Theme D) Guardian put a **breadth bar above the titlepiece** — an IA pattern, not just layout.

**What vibes does today** 🔧 — genuinely strong already:

- Sticky `NavBar` (`navigation.tsx:366`) + horizontal-scroll `CategoryNav` (visible chips, ✅ matches NN/g).
- Live **debounced (300ms) search dropdown**, min 2 chars, `limit 6`, "Сите резултати во архивата →" escape hatch (`navigation.tsx:37-292`) — already close to autocomplete best practice.
- **Transliteration-aware Latin↔Cyrillic search** with weighted relevance (`title:100, teaser:20, source:5, summary:1`) — `lib/transliterate.ts` + `actions/search.ts`. This is a genuine differentiator; keep and showcase it.
- `/all` archive with date-range + category filter (`all/date-filter.tsx`); `/najnovo` latest.

**What v2 does** — polish, don't rebuild:

1. **Highlight the matched substring** in the search dropdown (◑ Baymard) — small change, big perceived-quality bump, and it pairs beautifully with the transliteration engine (show *why* a Cyrillic result matched a Latin query).
2. **Distinguish suggestion types & add keyboard nav** (◑ Baymard) — arrow-key + Enter through results; tag category vs story.
3. **Scoped search** (◑ Baymard) — when viewing a category, offer "барај во {Категорија}"; the search action already accepts a `category` filter (`actions/search.ts`), so this is mostly UI.
4. **Date presets on `/all`** (◑) — "Денес / Неделава / Месецов" quick chips next to the native date inputs.
5. **Condense the sticky header on scroll** (◑) — shrink the wordmark / collapse the category row on downward scroll; the nav is already sticky so this is incremental.
6. **Promote the breadth bar** (✅ Guardian) — the Theme-D highlights shelf doubles as IA wayfinding.

**Implementation steps**

| Step | File(s) | Change |
|---|---|---|
| E1 | `app/_components/navigation.tsx` `NavSearch` | Wrap matched substrings in `<mark>` (yellow); add `aria-activedescendant` keyboard nav. |
| E2 | `actions/search.ts` (read) + `NavSearch` | Tag result type; pass active `category` to scope search from category pages. |
| E3 | `app/all/date-filter.tsx` | Add preset chips that compute `from`/`to` and push to `/all?...`. |
| E4 | `navigation.tsx` | Scroll-direction hook → condensed header class. |
| E5 | `DESIGN_SYSTEM.md` | Document search-result highlighting + condensed-header states. |

---

## 3. Cross-cutting moves (pure neo-brutalist evolution)

- **Finally wire the reserved coral `#f26d6d` / `--alert`** 🔧 (defined, *unused today*, `globals.css` + `DESIGN_SYSTEM.md:55`). Give it exactly one job: the **"ВАЖНО / Тренд"** signpost label (Theme B variant) and a breaking-story hero treatment. This adds urgency vocabulary *without* introducing a new color — it's already in the system, just dormant.
- **Promote the ray-burst to the "AI-curation" glyph** (Theme C) — one motif, one meaning, used wherever curation/AI is surfaced. Strengthens brand recall.
- **Push the offset-shadow elevation harder on primary tier** — primary/hero cards can carry the bigger `shadow-[10px_10px_0]` at rest (currently a hover-only state), making the density hierarchy physical, not just typographic. Keep zero-blur — that's the DNA.
- **Motion**: extend the existing `vibe-reveal` stagger (`globals.css:92-107`, already `prefers-reduced-motion`-gated) to the new highlights bar and key-points block. No new motion language.

---

## 4. Phased roadmap

| Phase | Items | Why first | Touches data/scraper? | Effort |
|---|---|---|---|---|
| **P0 — Frontend-only, ship this week** | A1-A3 (type sharpening, deck, label voice), C3 + curation eyebrow label + disclosure, E1 (search highlight), wire coral as "ВАЖНО" label | Pure design-system evolution; no schema/scraper changes; immediately makes vibes look more crafted and finally *names* the AI | No | **Low** |
| **P1 — The AI-as-feature core** | B2-B3 (curator emits `why_it_matters` + `key_points` + column guard), C1-C2 (`KeyPoints` block on hero/cards), B1 signpost labels | Delivers the highest-leverage win (visible, scannable, transparent AI) once data exists | **Yes** (curator + 1 column) | **Medium** |
| **P2 — Front-page & IA depth** | D1-D3 (density tiers, art-directed hero, highlights bar), E2-E4 (scoped search, presets, condensing header) | Bigger layout work; benefits from P0/P1 components existing | Partly (uses category `featured_slots`) | **Medium-High** |
| **Always** | Update `DESIGN_SYSTEM.md` in the *same commit* as each change (CLAUDE.md mandate); run `npx eslint .` + `tsc` (build ignores errors) | Keeps the system whole; green build ≠ clean | — | — |

---

## 5. `DESIGN_SYSTEM.md` updates this plan requires

Per `CLAUDE.md`, design changes are a bug unless reflected in `DESIGN_SYSTEM.md` the same commit. New/updated sections needed:

1. **§Typography** — formal type scale tokens; the "mono = system label voice" rule.
2. **§Components** — signpost-label recipe + fixed Macedonian vocabulary (ЗОШТО Е ВАЖНО / НАКРАТКО / КОНТЕКСТ / ВАЖНО); the `KeyPoints` block.
3. **New §AI curation & disclosure** — ray-burst as the AI-curation glyph; disclosure copy; placement (at the curation eyebrow / byline, per the arXiv finding).
4. **§Color** — promote coral from "reserved" to "the urgency/важно label," with strict usage rules.
5. **§Grid** — primary/secondary density tiers; no-image hero variant; the highlights bar.
6. **§Search** — matched-substring highlighting; scoped search; condensed-header states.

---

## 6. Open decisions for you

1. **Curator scope (P1):** OK to extend `curator_groq.py` + add `why_it_matters` / `key_points` columns? This unlocks the marquee AI-summary feature but means a scraper + schema change (idempotent guard, no migration). Frontend-only fallback exists if you'd rather defer.
2. **Disclosure copy:** confirm the Macedonian wording for the "Што е ова?" AI disclosure (proposed: *"Ова резиме е подготвено со вештачка интелигенција и проверено уредувачки."*).
3. **Coral activation:** comfortable giving `#f26d6d` its one job as the "ВАЖНО/Тренд" label, or keep it fully reserved?
4. **Start point:** I'd recommend kicking off with **P0** (zero-risk, frontend-only, and it finally makes the AI visible via the disclosure + eyebrow label). Want me to begin implementing P0?

---

### Appendix — verified-claim sources

- The Guardian type superfamily / Egyptian / Headline-Text cuts — `showcase.commercialtype.com/guardian`
- Rest of World mono label system — `restofworld.org/style-guide`
- Axios "Axioms" / Smart Brevity — `innovation.media/insights/new-formats-to-reinvigorate-news`, `journalism.co.uk/how-axios-is-reinventing-text-journalism-with-smart-brevity`
- Semafor "Semaform" — `cjr.org/the_media_today/semafor_launch_review.php`, `niemanlab.org` (2022 launch)
- AI summaries (Takeaways/Key Points; WSJ "What's this?") — `niemanlab.org/2025/06/lets-get-to-the-point-three-newsrooms-on-generating-ai-summaries-for-news`
- Guardian May-2025 redesign (layering, primary/secondary, art direction, masthead carousel, highlights-bar-above-titlepiece) — `designweek.co.uk/the-guardian-unveils-redesigned-app-and-homepage`, `creativebloq.com/.../how-the-guardian-approached-its-biggest-redesign-in-a-decade`
- NYT curation balance — `fastcompany.com/91388881/new-york-times-innovation-by-design-2025`
- AI-summary UX patterns — `shapeof.ai/patterns/summary`; AI-disclosure study — `arxiv.org/html/2601.11072v1`
- Nav/search authorities — `baymard.com/blog/autocomplete-design`, `baymard.com/blog/search-scope`, `nngroup.com/articles/mobile-navigation-patterns`, `smart-interface-design-patterns.com/articles/sticky-menus`
