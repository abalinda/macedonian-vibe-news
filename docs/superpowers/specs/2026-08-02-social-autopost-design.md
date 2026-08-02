# Social auto-posting (Facebook + Instagram) — design

**Date:** 2026-08-02
**Status:** approved design, pre-implementation

## Goal

Automatically propagate vibes.mk hero stories to Facebook and Instagram, with copy
that makes clear the content leads to another portal (the source outlet), branded
as «brought by Vibes.mk». Zero manual work after the one-time account setup.

## What gets posted

- **Selection:** hero slot stories only. Whenever a post occupies any of the 6
  `featured_slots` (via scraper rotation or admin override), it becomes eligible.
- **Dedup:** each post id is published at most once per platform, ever, tracked in
  a new `social_posts` table. Slot re-entry does not repost.
- **Volume ceiling:** bounded by hero rotation (6 slots, 60-min rotation) — in
  practice a handful of posts per day, well inside IG's ~100 posts/24h API limit.

## Caption format (Macedonian)

> «<headline>» — прочитај повеќе на <source> 👉 <link>. Ти го носи Vibes.mk 💛

- **Facebook:** the `<link>` is inline: `https://vibes.mk/go/<id>` (existing edge
  redirect → click tracking → 307 to the source article). FB renders the preview
  card from the article's own OG tags — no image handling on our side.
- **Instagram:** same caption but with «линк во стори» instead of an inline URL
  (IG captions are not clickable). The tappable link lives on the story's link
  sticker (`https://vibes.mk/go/<id>`); the account bio links to vibes.mk.

## Components

### 1. Card renderer — `web/app/api/card/[id]` (new route, Next.js `ImageResponse`)

Public, unauthenticated image endpoint used by the IG publishing API (which
requires a publicly hosted image URL). No storage — rendered on request on the
existing Cloudflare Worker.

- 1080×1080 card: post `image_url` as background, dark gradient overlay,
  headline in Playfair (white, max ~3 lines, ellipsized), source name in mono
  UPPERCASE, yellow «VIBES.MK» brand bar.
- Fallback: if the source photo fails to load or is absent, render on the plain
  paper-color background — the card must never 500 because of a bad image.
- Unknown post id → 404.
- The card is a new visual pattern: add it to `web/DESIGN_SYSTEM.md` in the same
  commit (design-system rule).

Accepted risk: the card uses the source outlet's photo as background. Visible
source attribution on the card softens but does not eliminate the copyright
question. Consciously accepted; revisit if an outlet objects.

### 2. Poster — `scraper/social_poster.py` (new module on the Hetzner box)

Called at the end of each `process_feeds()` cycle (every 15 min), wrapped so no
exception can take down the scrape loop.

Flow per cycle:
1. Read current `featured_slots` post ids from Turso.
2. Skip ids already in `social_posts` (per platform).
3. For each new post, in order:
   - **FB:** `POST /{page_id}/feed` — caption + `vibes.mk/go/<id>` link.
   - **IG feed:** create `media` container with `image_url =
     https://vibes.mk/api/card/<id>` + caption, then `media_publish`.
   - **IG story:** same card, `media_type=STORIES`, link sticker →
     `https://vibes.mk/go/<id>` (same tracked link as FB).
4. Record one `social_posts` row per successful platform publish (partial
   failure retries only the failed platform next cycle).

Error handling: log failures via the existing JSONL logger; after 3 consecutive
failed cycles for the same post+platform, record it with `status='failed'` and
move on. Missing env vars → poster is silently disabled (dev-safe).

### 3. `social_posts` table (Turso, runtime guard — no migrations tooling)

```
social_posts(
  post_id     TEXT,
  platform    TEXT,     -- 'fb' | 'ig_feed' | 'ig_story'
  remote_id   TEXT,     -- id returned by the platform API
  status      TEXT,     -- 'posted' | 'failed'
  attempts    INTEGER,
  posted_at   TEXT,
  PRIMARY KEY (post_id, platform)
)
```

Created by an idempotent `ensure_social_posts_table()` guard in the scraper,
matching the existing pattern (`ensure_featured_slots_table()` etc.).

### 4. Secrets (`/root/scraper/.env`, chmod 600, never in git)

- `FB_PAGE_ID`
- `IG_USER_ID` (the IG Business account id, not the handle)
- `META_ACCESS_TOKEN` (long-lived Page access token)

## One-time manual setup (prerequisite, all clicking, no code)

1. Finish creating the vibes.mk Facebook Page.
2. Link @vibes.mkd to the Page; confirm the IG account is **Business** type.
3. Create a Meta app (Business type) on developers.facebook.com.
4. Grant it `pages_manage_posts` and `instagram_content_publish` for the Page/IG
   account (own-page use; full app review not required for admin-owned assets).
5. Mint a long-lived Page access token; store per Secrets above.

## Testing

- **Card route:** visual check in dev against real posts, including one with a
  missing/broken `image_url` (fallback path) and a very long headline
  (ellipsis path).
- **Poster:** `--dry-run` flag prints exactly what would be posted (captions,
  URLs, card links) without calling Meta. One live smoke-post per platform
  (FB + IG feed + IG story) before wiring into the scraper cycle.

## Out of scope

- Post scheduling/queueing beyond the natural hero-rotation cadence
- Engagement/analytics ingestion from Meta
- Twitter/X, Telegram, Viber (Telegram/Viber are separate, cheaper follow-ups)
- Editing or deleting already-published posts
