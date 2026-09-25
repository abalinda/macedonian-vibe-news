# Blog admin: mobile editor, drafts, R2 images, on-demand Claude review

**Status:** approved 2026-09-25, implemented on `feature/blog-admin`.

## Goals
1. Admins write/edit blog posts comfortably on a phone.
2. Upload images (cover + inline) directly — no external URLs.
3. On demand, Claude (same Max/CLI session as the curator) proposes a formatted version; admin accepts or keeps theirs.
4. Edit and delete already-published posts.

## Decisions
- **Drafts in a separate `blog_drafts` table**, not a status column on `posts` — 9 files read `posts`; a missed filter would leak drafts into feeds. Publishing copies into `posts` (INSERT, or UPDATE in place for edit-drafts so id/link/clicks survive).
- **Images in Cloudflare R2** (`vibes-blog-images`, public at `img.vibes.mk`), not Turso blobs — no DB egress per image view. Client resizes to ≤2000px WebP/JPEG; server allows JPG/PNG/WebP/GIF ≤ 8 MB.
- **Review via Turso as a queue.** The VPS has no public port; the web sets `review_status='pending'`, `scraper/blog_reviewer.py` (own daemon thread, 30s poll) claims atomically with `UPDATE … RETURNING`, writes `review_json = {title, teaser, content_html, notes[]}`. Stale `running` rows (>15 min) → `failed`. Editor polls every 4s, gives up after 6 min with a retry.
- **Editor** stays on `contentEditable` + `execCommand` (no editor library). Paste is cleaned to the tags `.blog-body` styles; inline styles/spans are stripped on every sync (fixes dark mode).

## Schema
`blog_drafts(id, post_id UNIQUE NULLABLE, title, teaser, content_html, cover_url, author, review_status, review_json, review_error, review_requested_at, review_started_at, created_at, updated_at)`

## Routes
`GET/POST /api/blog/drafts` · `GET/PUT/DELETE /api/blog/drafts/[id]` · `POST …/[id]/review` · `POST …/[id]/publish` · `DELETE /api/blog/posts/[id]` · `POST /api/blog/upload`. All admin-gated (Clerk allow-list or localhost, as `/admin`).

## Out of scope
Scheduling, multiple authors editing the same draft concurrently, image deletion from R2 when a post is deleted.
