import os
import time
import feedparser
from datetime import datetime, timezone
from time import mktime
from urllib.parse import urljoin
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from curator import analyze_news_batch
from logger import log_event
import cloudscraper
import libsql_client
import libsql
# Load environment variables
load_dotenv()

# ---- Turso Setup ----
url: str = os.getenv("TURSO_DATABASE_URL") or ""
key: str = os.getenv("TURSO_AUTH_TOKEN") or ""
client = libsql_client.create_client_sync(url, auth_token=key)

conn = libsql.connect("hello.db", sync_url=url, auth_token=key) # pyright: ignore[reportAttributeAccessIssue]
conn.sync()
print(conn.execute("select * from posts").fetchall())