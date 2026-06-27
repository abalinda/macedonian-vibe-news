# Claude curation — trial Space setup

This is a **trial** that swaps the AI curator from Groq/Llama to **Claude**, authenticated
through your **Claude Max subscription** (not an API key), running as a separate HuggingFace
Space that writes to the **production** Turso DB.

The same `scraper/` codebase powers both Spaces — the engine is chosen at runtime by the
`CURATOR` env var (`groq` default, `claude` for the trial). No code changes needed to switch.

---

## ⚠️ Before you start: pause the production scraper

The trial writes to the **live** Turso DB. If the existing Groq scraper Space and this trial
Space both run at once, they will both insert posts **and** both rotate `featured_slots` —
racing over the homepage hero slots.

**Pause the existing Groq Space** (its Settings → *Pause this Space*) for the duration of the
trial. Then it's a clean A/B on vibes.mk: same pipeline, same DB, Claude swapped in for Groq.
Unpause it (and pause/delete the trial) to revert.

---

## 1. Mint a Max OAuth token (one-time, local)

On your machine, logged into Claude Code with your Max plan:

```
claude setup-token
```

This prints a **1-year OAuth token**. Copy it — you'll paste it into a Space secret below.
(If it ever expires or you rotate it, re-run this and update the secret.)

---

## 2. Create the Space

huggingface.co → **New Space**:

| Setting | Value |
|---|---|
| Owner | `vibesmk` |
| Space name | e.g. `scraper-claude-test` |
| SDK | **Docker → Blank** |
| Hardware | **CPU basic (free)** |
| Visibility | **Private** |

Make sure the Space's `README.md` frontmatter declares the Docker port (run_local.py binds 7860):

```yaml
---
title: Scraper Claude Test
emoji: 🗞️
colorFrom: yellow
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---
```

---

## 3. Populate it

Push the contents of this `scraper/` directory to the Space's git repo (the Dockerfile here
already installs Node + the `claude` CLI on top of Python). Nothing else to change in the code.

---

## 4. Set Space secrets & variables

Settings → **Variables and secrets**:

**Secrets** (encrypted):
| Name | Value |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | the token from step 1 |
| `TURSO_DATABASE_URL` | **production** Turso URL |
| `TURSO_AUTH_TOKEN` | **production** Turso token |
| `GROQ_API_KEY` | *(only if you enable the Groq fallback below)* |

**Variables** (plain, optional — these are the defaults baked into the code):
| Name | Value | Meaning |
|---|---|---|
| `CURATOR` | `claude` | **Required** — selects the Claude engine (default is `groq`) |
| `CLAUDE_MODEL` | `sonnet` | Model alias; `sonnet` → latest Sonnet 4.6. Use `haiku` to save quota, `opus` for max quality |
| `CURATOR_FALLBACK` | *(unset)* | Set to `groq` to fall back to Groq when a Claude call fails. Leave **unset** for an honest trial |
| `CLAUDE_TIMEOUT_S` | `180` | Per-call CLI timeout |
| `CLAUDE_MAX_CONSECUTIVE_FAILURES` | `3` | After this many consecutive CLI failures, stop curating for the run |
| `MAX_AI_ARTICLES_PER_RUN` | `100` | Global cap on articles sent to Claude per run. Higher = more curated, more Max quota + longer runs |
| `ENTRIES_PER_FEED` | `4` | How many entries to pull per feed each run |
| `MIN_CURATION_INTERVAL_MINUTES` | `30` | Min minutes between curation passes (lower = curate more often) |
| `MIN_HERO_SCORE` | `60` | Min hero_score for a story to take a homepage hero slot |
| `BATCH_SIZE` | `8` | (Largely vestigial in the current per-feed flow; kept tunable) |

---

## Two-tier curation (good vibes → homepage)

The Claude curator now sorts accepted stories into two tiers:

- **`good_vibes = true`** → homepage-eligible. The strict "high-quality & positive-leaning"
  tier (achievements, culture, science, sport wins, human interest, constructive tech/business).
- **`good_vibes = false`** → still saved, but appears **only** in *most recent* (najnovo) and
  *archive* (all) — never on the homepage.
- Everything tabloid/yellow-press/junk is **rejected** and not saved at all.

This is stored in a new `posts.good_vibes` column (auto-created by the scraper on startup,
`DEFAULT 1` so legacy posts stay visible). The homepage (`web/app/page.tsx`) filters
`good_vibes = 1`; najnovo/archive/search are unchanged.

> ⚠️ **The homepage filter is a `web/` change that must be deployed to Cloudflare separately**
> (`cd web && npm run deploy`). The scraper change (this Space) creates the column and tags
> posts; the homepage only *shows* the split after the web deploy. The web query falls back to
> unfiltered if the column doesn't exist yet, so deploy order doesn't break anything.

## 5. Run & watch

The Space builds, starts `run_local.py` (health server on 7860), and curates every 15 min.
Watch the Space **Logs** tab — the structured JSONL events tell you exactly what Claude did:

- `curator_batch_received` / `curator_input` — what went in
- `curator_article_model` — per-article accept/reject (with `engine: claude`)
- `curator_output_final` — approved/rejected counts + the teasers/summaries Claude wrote
- `curator_claude_call_failed` — a CLI failure with the stderr reason (check here first if nothing curates)

If the first calls fail, the logged `stderr` will say why (most likely auth: a missing/expired
`CLAUDE_CODE_OAUTH_TOKEN`, or a CLI flag the installed `claude` version doesn't accept).

---

## Reverting

- Trial done → **pause or delete** the trial Space and **unpause** the production Groq Space.
- To flip the *trial* Space back to Groq without deleting it: set `CURATOR=groq` (needs `GROQ_API_KEY`).

> Note: this `scraper/` Dockerfile now installs Node + the `claude` CLI. That's harmless for the
> production Groq Space (unused weight), but it does make the prod image larger the next time you
> redeploy prod from this directory. If you'd rather keep prod's image lean, keep a Node-free
> Dockerfile on the prod Space's branch.
