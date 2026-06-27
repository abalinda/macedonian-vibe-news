"""
Curator selector.

Chooses the AI curation engine at runtime via the CURATOR env var, so the same
codebase powers both Spaces without code changes:

  CURATOR=groq    (default)  -> curator_groq   (Llama via Groq REST)
  CURATOR=claude             -> curator_claude (Claude Code CLI, Max subscription)

Both modules expose the identical seam: analyze_news_batch(articles)
and ModelExhaustedError. Defaulting to groq keeps production behaviour unchanged.
"""

import os

_engine = os.getenv("CURATOR", "groq").strip().lower()

if _engine == "claude":
    from curator_claude import ModelExhaustedError, analyze_news_batch
    print("🤖 Curator engine: CLAUDE (claude-code CLI)")
else:
    from curator_groq import ModelExhaustedError, analyze_news_batch
    print("🤖 Curator engine: GROQ (default)")

__all__ = ["analyze_news_batch", "ModelExhaustedError"]
