import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_FILE = LOG_DIR / "scraper_log.jsonl"

def log_event(event_type: str, data: Dict[str, Any]) -> None:
    """Append a structured JSON log entry to scraper/logs/scraper_log.jsonl."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event": event_type,
            "data": data,
        }
        with LOG_FILE.open("a", encoding="utf-8") as logfile:
            logfile.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception as err:
        # Swallow logging errors so scraping never aborts due to disk hiccups
        print(f"⚠️ Logging failure ({event_type}): {err}")
