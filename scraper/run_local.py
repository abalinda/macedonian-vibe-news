import time
import schedule
from datetime import datetime
from scraper_local import process_feeds

def job():
    print(f"\n⏰ Starting scheduled run at {datetime.now()}")
    try:
        process_feeds()
    except Exception as e:
        print(f"🔥 Critical Failure in run loop: {e}")
    print("💤 Sleeping until next cycle...")
        
# Configuration
MINUTES_BETWEEN_RUNS = 15

print(f"🤖 Vibes.mk Local Daemon Started.")
print(f"🔄 Schedule: Every {MINUTES_BETWEEN_RUNS} minutes.")

# Run once immediately on start
job()

# Schedule future runs
schedule.every(MINUTES_BETWEEN_RUNS).minutes.do(job)

while True:
    schedule.run_pending()
    time.sleep(1)