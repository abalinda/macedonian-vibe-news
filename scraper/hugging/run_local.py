import time
import schedule
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from scraper_local import process_feeds

# --- Fake Web Server to Keep HF Space Awake ---
class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Vibes Scraper is Alive!")

    # Mute logs to keep console clean
    def log_message(self, format, *args):
        pass

def start_server():
    # Port 7860 is the default Hugging Face port
    server = HTTPServer(('0.0.0.0', 7860), SimpleHandler)
    print("🌍 Dummy web server started on port 7860")
    server.serve_forever()

def run_scraper_safe():
    print(f"\n⏰ Starting scheduled run at {datetime.now()}")
    try:
        process_feeds()
    except Exception as e:
        print(f"🔥 Critical Failure in run loop: {e}")
    print("💤 Sleeping until next cycle...")

# Configuration
MINUTES_BETWEEN_RUNS = 15

def run_daemon():
    print("🤖 Vibes.mk Local Daemon Started.")
    print(f"🔄 Schedule: Every {MINUTES_BETWEEN_RUNS} minutes.")

    # 1. Start the web server immediately (Main Priority)
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 2. Schedule the first run in 10 seconds (gives server time to bind)
    # Using a separate thread for the scraper ensures the web server never freezes
    first_run_thread = threading.Thread(target=run_scraper_safe, daemon=True)
    
    # We delay slightly to let the server start
    time.sleep(2) 
    first_run_thread.start()

    # 3. Schedule future runs
    schedule.every(MINUTES_BETWEEN_RUNS).minutes.do(run_scraper_safe)

    # 4. Keep main process alive
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    run_daemon()