import json
import os
import socket
import threading
from datetime import datetime, timezone
from typing import Any, Dict

_HOSTNAME = socket.gethostname()
_PID = os.getpid()


def _safe_context() -> Dict[str, Any]:
    return {
        "host": _HOSTNAME,
        "pid": _PID,
        "thread": threading.current_thread().name,
        "cwd": os.getcwd(),
    }


def log_event(event_type: str, data: Dict[str, Any]) -> None:
    """Print structured JSON logs to stdout with enriched debug context."""
    try:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event_type,
            "context": _safe_context(),
            "data": data,
        }
        print(json.dumps(payload, ensure_ascii=False))
    except Exception as err:
        # Swallow logging errors so scraping never aborts due to log formatting issues
        print(f"⚠️ Logging failure ({event_type}): {err}")
