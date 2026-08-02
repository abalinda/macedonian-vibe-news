#!/usr/bin/env python3
"""Telegram command bot + health observer for the scraper container. Stdlib only.

Commands (only honoured from ALLOWED_CHAT): /status /logs /restart /check
Observer: checks every 5 min, messages the group ONLY on problems
(one alert, then 60-min cooldown while it persists, one ✅ on recovery).
Run `scraper-bot.py --check` to print check results without Telegram.
"""
import json
import os
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request

TOKEN = os.environ.get("BOT_TOKEN", "")
ALLOWED_CHAT = int(os.environ.get("ALLOWED_CHAT", "0"))
API = f"https://api.telegram.org/bot{TOKEN}"

CHECK_INTERVAL_S = 300
ALERT_COOLDOWN_S = 3600
ERROR_BURST_LIMIT = 20      # ⚠️/error lines in the last 15 min
FD_PCT_LIMIT = 80
DISK_PCT_LIMIT = 90
MEM_AVAILABLE_MIN_KB = 300 * 1024


def api(method, **params):
    data = urllib.parse.urlencode(params).encode()
    with urllib.request.urlopen(f"{API}/{method}", data, timeout=70) as r:
        return json.load(r)


def send(text):
    api("sendMessage", chat_id=ALLOWED_CHAT, text=text[:4000])


def sh(cmd):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    return (p.stdout + p.stderr).strip() or "(no output)"


# --- health checks: each returns a problem string, or None if fine ---

def check_container():
    status = sh("docker ps --filter name=scraper --format '{{.Status}}'")
    if "Up" not in status:
        return f"scraper container is NOT running ({status})"
    if "unhealthy" in status:
        return f"scraper container is unhealthy ({status})"
    return None


def check_error_burst():
    logs = sh("docker logs --since 15m scraper 2>&1")
    bad = [l for l in logs.splitlines()
           if "⚠️" in l or "Errno" in l or "Traceback" in l or "🔥" in l]
    if len(bad) > ERROR_BURST_LIMIT:
        return f"error burst: {len(bad)} error lines in 15 min. Last: {bad[-1][:200]}"
    return None


def check_fds():
    pid = sh("docker inspect -f '{{.State.Pid}}' scraper")
    if not pid.isdigit() or pid == "0":
        return None  # container down; check_container covers it
    try:
        used = len(os.listdir(f"/proc/{pid}/fd"))
        with open(f"/proc/{pid}/limits") as f:
            soft = next(int(l.split()[3]) for l in f if l.startswith("Max open files"))
    except (OSError, StopIteration):
        return None
    pct = used * 100 // soft
    if pct > FD_PCT_LIMIT:
        return f"scraper file descriptors at {pct}% ({used}/{soft}) — leak?"
    return None


def check_disk():
    pct = sh("df --output=pcent / | tail -1").strip().rstrip("%")
    if pct.isdigit() and int(pct) > DISK_PCT_LIMIT:
        return f"root disk {pct}% full"
    return None


def check_memory():
    with open("/proc/meminfo") as f:
        meminfo = dict(l.split(":") for l in f)
    avail_kb = int(meminfo["MemAvailable"].split()[0])
    if avail_kb < MEM_AVAILABLE_MIN_KB:
        return f"box low on memory: {avail_kb // 1024} MB available"
    return None


CHECKS = {
    "container": check_container,
    "errors": check_error_burst,
    "fds": check_fds,
    "disk": check_disk,
    "memory": check_memory,
}


def run_checks():
    results = {}
    for name, fn in CHECKS.items():
        try:
            results[name] = fn()
        except Exception as e:
            results[name] = f"check '{name}' itself failed: {e}"
    return results


def monitor():
    alerted = {}  # check name -> last alert time
    while True:
        time.sleep(CHECK_INTERVAL_S)
        try:
            for name, problem in run_checks().items():
                if problem:
                    if time.time() - alerted.get(name, 0) > ALERT_COOLDOWN_S:
                        send(f"🚨 {problem}")
                        alerted[name] = time.time()
                elif name in alerted:
                    del alerted[name]
                    send(f"✅ recovered: {name}")
        except Exception:
            pass  # ponytail: never let the observer kill the bot; next tick retries


def handle(cmd):
    if cmd == "/status":
        send(sh("docker ps --filter name=scraper --format 'scraper: {{.Status}}' && "
                "docker stats --no-stream --format '{{.Name}}: CPU {{.CPUPerc}} MEM {{.MemUsage}}' scraper"))
    elif cmd == "/logs":
        send(sh("docker logs --tail 30 scraper 2>&1"))
    elif cmd == "/restart":
        send("Restarting scraper...")
        send(sh("docker restart scraper && echo OK"))
    elif cmd == "/check":
        results = run_checks()
        send("\n".join(f"{'🚨' if p else '✅'} {n}: {p or 'ok'}" for n, p in results.items()))


def main():
    if "--check" in sys.argv:
        for name, problem in run_checks().items():
            print(f"{'PROBLEM' if problem else 'ok':7} {name}: {problem or ''}")
        return
    threading.Thread(target=monitor, daemon=True).start()
    offset = 0
    send("scraper bot online. Commands: /status /logs /restart /check")
    while True:
        try:
            resp = api("getUpdates", offset=offset, timeout=50)
            for u in resp.get("result", []):
                offset = u["update_id"] + 1
                msg = u.get("message") or {}
                if msg.get("chat", {}).get("id") != ALLOWED_CHAT:
                    continue
                cmd = (msg.get("text") or "").split("@")[0].strip()
                if cmd in ("/status", "/logs", "/restart", "/check"):
                    handle(cmd)
        except Exception:
            time.sleep(5)  # ponytail: blanket retry; systemd restarts us if truly wedged


if __name__ == "__main__":
    main()
