# Claude curation — Space setup

The scraper curates with **Claude**, authenticated through a **Claude Max subscription** (not an
API key), running as a HuggingFace Space that writes to the **production** Turso DB.

Claude is the only curation engine (`curator_claude.py`). There is **no** pre-LLM keyword filter:
every fetched article is sent to Claude, and the editorial prompt alone decides signal vs. noise.

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
| Space name | e.g. `scraper` |
| SDK | **Docker → Blank** |
| Hardware | **CPU basic (free)** |
| Visibility | **Private** |

Make sure the Space's `README.md` frontmatter declares the Docker port (run_local.py binds 7860):

```yaml
---
title: Macedonian Vibes News Scraper
emoji: 🗞️
colorFrom: blue
colorTo: purple
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

**Variables** (plain, optional — these are the defaults baked into the code):
| Name | Value | Meaning |
|---|---|---|
| `CLAUDE_MODEL` | `sonnet` | Model alias; `sonnet` → latest Sonnet. Use `haiku` to save quota, `opus` for max quality |
| `CLAUDE_TIMEOUT_S` | `180` | Per-call CLI timeout |
| `CLAUDE_MAX_CONSECUTIVE_FAILURES` | `3` | After this many consecutive CLI failures, stop curating for the run |
| `MAX_AI_ARTICLES_PER_RUN` | `100` | Per-run budget; excess (lowest-priority) articles defer to a later run. Higher = more curated, more Max quota + longer runs |
| `CURATION_BATCH_SIZE` | `12` | Headlines sent to Claude per call (batched across feeds). Bigger = fewer calls + more token-efficient |
| `ENTRIES_PER_FEED` | `4` | How many entries to pull per feed each run |
| `MIN_CURATION_INTERVAL_MINUTES` | `10` | Min minutes between curation passes. **All feeds now curate**, so keep this below the 15-min run cadence or a cooldown blocks every save. Raise it to throttle Max quota |
| `MIN_HERO_SCORE` | `60` | Min hero_score for a story to take a homepage hero slot |

---

## Editorial policy: signal vs. noise, then two tiers

The prompt lives in `curator_claude.py` (`_build_prompt`). It works in two steps:

1. **Signal vs. noise.** Claude **rejects** noise — clickbait, gossip, tabloid crime blotter,
   horoscopes/betting, PR puff, and **daily political theatre** ("X official said / promised /
   accused Y", party point-scoring, procedural back-and-forth). It **accepts** substantive news
   even when serious or not cheerful — including politics/policy that actually matters (laws,
   budgets, infrastructure, international agreements) and weighty stories like the death of a
   notable person or a major event of real consequence. Rejected stories are **not saved**.

2. **Two quality tiers** for accepted stories:
   - **`good_vibes = true`** → homepage-eligible. High-quality, substantive, broadly interesting —
     front-of-house favours achievements/breakthroughs/wins, but a genuinely significant serious
     story can also earn the homepage.
   - **`good_vibes = false`** → still saved, but appears **only** in *most recent* (najnovo) and
     *archive* (all) — never on the homepage.

This is stored in a `posts.good_vibes` column (auto-created by the scraper on startup,
`DEFAULT 1` so legacy posts stay visible). The homepage (`web/app/page.tsx`) filters
`good_vibes = 1`; najnovo/archive/search are unchanged.

**All feeds route through Claude** (PHASE 2 batched curation): the fetch sweep accumulates fresh
articles, then they're curated in batches of `CURATION_BATCH_SIZE` — broad General/Local feeds
first (so they're never starved by the budget), topic feeds keep their category. Watch the
`🧠 PHASE 2: Batched curation of N article(s)` log line.

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
