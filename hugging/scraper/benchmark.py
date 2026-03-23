import time
import psutil
import os
import threading
from run_local import job as scraper_main

# Global flag to stop monitoring
keep_monitoring = True
peak_memory = 0
cpu_usage_log = []

def monitor_resources():
    global peak_memory, keep_monitoring
    process = psutil.Process(os.getpid())
    
    while keep_monitoring:
        # Get memory in MB
        mem = process.memory_info().rss / 1024 / 1024
        global peak_memory
        # Check if current memory is higher than the peak we've seen
        if mem > peak_memory:
            peak_memory = mem
        
        # Get CPU percentage (interval=None is non-blocking)
        cpu = process.cpu_percent(interval=None)
        cpu_usage_log.append(cpu)
        
        time.sleep(0.5)

if __name__ == "__main__":
    print("🚀 Starting Benchmark for Vibes.mk Scraper...")
    
    # Start monitoring in a background thread
    monitor_thread = threading.Thread(target=monitor_resources)
    monitor_thread.start()
    
    start_time = time.time()
    
    try:
        # Run your actual scraper
        scraper_main()
    except Exception as e:
        print(f"❌ Scraper crashed: {e}")
    finally:
        # Stop monitoring
        keep_monitoring = False
        monitor_thread.join()
        end_time = time.time()
        
        duration = end_time - start_time
        avg_cpu = sum(cpu_usage_log) / len(cpu_usage_log) if cpu_usage_log else 0
        
        print("\n" + "="*40)
        print("📊 RESOURCE REPORT")
        print("="*40)
        print(f"⏱️  Duration:     {duration:.2f} seconds ({duration/60:.2f} min)")
        print(f"wb  Peak RAM:     {peak_memory:.2f} MB")
        print(f"wm  Avg CPU:      {avg_cpu:.2f}% (Single Core)")
        print("="*40)


        print("✅ Benchmarking Complete.")



