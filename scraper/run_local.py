import time
import schedule
import threading
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from scraper_local import process_feeds

# Force unbuffered output so HuggingFace sees logs immediately
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Configuration
MINUTES_BETWEEN_RUNS = 15


# --- Minimal web server so the HF Space has something on port 7860 ---
# HuggingFace Docker Spaces mark the Space as RUNTIME_ERROR unless the app
# listens on app_port (7860). This server keeps the Space healthy while the
# scraper runs on a schedule in the background.
class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        response = f"""
        <html>
        <body>
        <h1>🗞️ Vibes.mk Scraper</h1>
        <p>Status: <strong>Running</strong></p>
        <p>Last check: {datetime.now().isoformat()}</p>
        <p>Runs every {MINUTES_BETWEEN_RUNS} minutes</p>
        </body>
        </html>
        """
        self.wfile.write(response.encode())

    # Mute access logs to keep the console clean
    def log_message(self, format, *args):
        pass


def start_server():
    try:
        server = HTTPServer(('0.0.0.0', 7860), SimpleHandler)
        print("✅ Web server started on port 7860", flush=True)
        print("🌍 HuggingFace Space is now RUNNING", flush=True)
        server.serve_forever()
    except Exception as e:
        print(f"❌ Failed to start web server: {e}", flush=True)


def job():
    print(f"\n⏰ Starting scheduled run at {datetime.now()}", flush=True)
    try:
        process_feeds()
        print(f"✅ Scraper run completed at {datetime.now()}", flush=True)
    except Exception as e:
        print(f"🔥 Critical Failure in run loop: {e}", flush=True)
        import traceback
        traceback.print_exc()
    print("💤 Sleeping until next cycle...\n", flush=True)


def run_daemon():
    print("=" * 60, flush=True)
    print("🤖 Vibes.mk Scraper Daemon Starting...", flush=True)
    print(f"🔄 Schedule: Every {MINUTES_BETWEEN_RUNS} minutes", flush=True)
    print("=" * 60, flush=True)

    # 1. Start the web server FIRST (HF requires port 7860 to respond)
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(3)

    # 2. Run scraper immediately on startup
    job()

    # 3. Schedule future runs
    schedule.every(MINUTES_BETWEEN_RUNS).minutes.do(job)
    print(f"📅 Scheduled to run every {MINUTES_BETWEEN_RUNS} minutes", flush=True)

    # 4. Keep the main process alive
    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    run_daemon()
