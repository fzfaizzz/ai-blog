"""
Prime Media - 24/7 Cloud Social Browser Bot (Oracle Linux Server)
==================================================================
Runs headlessly 24/7 on Oracle Cloud (24GB RAM, Ubuntu Linux).
Monitors https://primemedia.site for fresh articles and automatically
posts them to X (Twitter) and Reddit using the synced browser session.
Zero API keys needed!
"""

import os
import sys
import time
import json
import random
import logging
import urllib.request
from datetime import datetime
from playwright.sync_api import sync_playwright

# Setup logging
LOG_FILE = "/home/ubuntu/social_bot/bot.log"
os.makedirs("/home/ubuntu/social_bot", exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)

AUTH_FILE = "/home/ubuntu/social_bot/social_auth.json"
HISTORY_FILE = "/home/ubuntu/social_bot/history.json"
API_POSTS_URL = "https://primemedia.site/api/posts"
BASE_SITE_URL = "https://primemedia.site"
CHROMIUM_EXEC = "/snap/bin/chromium"


def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logging.warning(f"Error loading history: {e}")
    return {"twitter_posted": [], "reddit_posted": [], "last_run": None}


def save_history(history):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error saving history: {e}")


def fetch_latest_posts():
    """Fetches published articles from Prime Media API"""
    try:
        req = urllib.request.Request(
            API_POSTS_URL,
            headers={"User-Agent": "PrimeMediaCloudBot/1.0 (+https://primemedia.site)"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success") and data.get("posts"):
                return data["posts"]
    except Exception as e:
        logging.error(f"Failed to fetch posts from live API: {e}")
    return []


def format_tweet_text(post):
    """Formats high-CTR, 280-char safe tweet with viral hashtags"""
    title = (post.get("title") or "").strip()
    slug = post.get("slug")
    url = f"{BASE_SITE_URL}/post/{slug}"
    cat = (post.get("category") or "").lower()

    if any(k in cat for k in ["movie", "cinema", "entertainment", "hollywood"]):
        hashtags = "#Movies #Cinema #Hollywood #Entertainment"
    elif any(k in cat for k in ["ai", "tech", "gadget", "software"]):
        hashtags = "#TechNews #ArtificialIntelligence #AINews"
    elif any(k in cat for k in ["business", "market", "economy", "stock"]):
        hashtags = "#StockMarket #Economy #Business"
    else:
        hashtags = "#BreakingNews #Trending #PrimeMedia"

    # URL is counted as 23 chars by Twitter (t.co)
    overhead = len("🚨 BREAKING: \n\n📖 Read 👇\n") + 23 + len("\n\n" + hashtags)
    avail_title_len = max(50, 260 - overhead)

    if len(title) > avail_title_len:
        title = title[: avail_title_len - 3] + "..."

    return f"🚨 BREAKING: {title}\n\n📖 Read full story 👇\n{url}\n\n{hashtags}"


def post_to_twitter(page, post):
    """Posts article directly to X (Twitter) using authenticated session"""
    title = post.get("title", "")
    logging.info(f"🐥 [Twitter Bot] Preparing to post: \"{title[:60]}...\"")
    tweet_text = format_tweet_text(post)

    try:
        page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=40000)
        time.sleep(random.uniform(4.0, 6.0))

        # Check login state
        if "login" in page.url or "i/flow/login" in page.url:
            logging.error("❌ Twitter is NOT logged in! Please sync session via SYNC_TO_ORACLE_SERVER.bat on your PC.")
            return False

        # Locate tweet compose box
        input_selectors = [
            'div[data-testid="tweetTextarea_0"]',
            'div[role="textbox"][contenteditable="true"]',
            'div[aria-label="Post text"]'
        ]
        tweet_box = None
        for sel in input_selectors:
            try:
                el = page.locator(sel).first
                if el.is_visible(timeout=5000):
                    tweet_box = el
                    break
            except Exception:
                pass

        if not tweet_box:
            logging.warning("⚠️ Could not find Twitter compose box. Trying navigation to x.com/home...")
            page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=30000)
            time.sleep(4)
            for sel in input_selectors:
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=5000):
                        tweet_box = el
                        break
                except Exception:
                    pass

        if not tweet_box:
            logging.error("❌ Failed to find Twitter input box.")
            return False

        tweet_box.click()
        time.sleep(1)
        # Type naturally with human-like keystroke delays
        page.keyboard.type(tweet_text, delay=random.randint(12, 28))
        time.sleep(random.uniform(2.0, 3.5))

        # Click post button
        post_btn_selectors = [
            'button[data-testid="tweetButton"]',
            'button[data-testid="tweetButtonInline"]',
            'button:has-text("Post")'
        ]
        post_btn = None
        for sel in post_btn_selectors:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=3000):
                    post_btn = btn
                    break
            except Exception:
                pass

        if not post_btn:
            logging.error("❌ Could not find Twitter 'Post' button.")
            return False

        post_btn.click()
        logging.info("🚀 Clicked 'Post' button on Twitter / X!")
        time.sleep(5)
        logging.info("✅ SUCCESS: Article published to Twitter / X!")
        return True

    except Exception as e:
        logging.error(f"❌ Twitter posting error: {e}")
        return False


def post_to_reddit(page, post):
    """Submits link directly to Reddit using authenticated session"""
    title = (post.get("title") or "").strip()
    slug = post.get("slug")
    url = f"{BASE_SITE_URL}/post/{slug}"
    logging.info(f"🔴 [Reddit Bot] Preparing to post: \"{title[:60]}...\"")

    if len(title) > 280:
        title = title[:277] + "..."

    try:
        # First try old.reddit.com/submit for highest reliability
        page.goto("https://old.reddit.com/submit", wait_until="domcontentloaded", timeout=35000)
        time.sleep(3)

        if page.locator('input[name="title"]').count() > 0:
            logging.info("📝 Submitting via Reddit classic interface...")
            try:
                url_tab = page.locator('a:has-text("link"), #url').first
                if url_tab.is_visible(timeout=2000):
                    url_tab.click()
                    time.sleep(1)
            except Exception:
                pass

            page.fill('input[name="title"]', title)
            time.sleep(1)
            page.fill('input[name="url"]', url)
            time.sleep(1)

            submit_btn = page.locator('button[name="submit"]').first
            if submit_btn.is_visible(timeout=3000):
                submit_btn.click()
                logging.info("🚀 Clicked Submit on Reddit!")
                time.sleep(5)
                logging.info("✅ SUCCESS: Link posted to Reddit!")
                return True

        # Fallback to modern www.reddit.com/submit
        page.goto("https://www.reddit.com/submit", wait_until="domcontentloaded", timeout=40000)
        time.sleep(4)

        if "login" in page.url:
            logging.error("❌ Reddit is NOT logged in! Please sync session via SYNC_TO_ORACLE_SERVER.bat on your PC.")
            return False

        # Click Link tab
        link_tab = page.locator('button:has-text("Link"), [data-testid="tab-link"]').first
        if link_tab.is_visible(timeout=3000):
            link_tab.click()
            time.sleep(1.5)

        title_box = page.locator('textarea[placeholder="Title"], input[placeholder="Title"], textarea[name="title"]').first
        if title_box.is_visible(timeout=4000):
            title_box.click()
            page.keyboard.type(title, delay=15)
            time.sleep(1)

        url_box = page.locator('textarea[placeholder="Url"], input[placeholder="Url"], textarea[name="url"]').first
        if url_box.is_visible(timeout=4000):
            url_box.click()
            page.keyboard.type(url, delay=10)
            time.sleep(1.5)

        post_btn = page.locator('button:has-text("Post")').first
        if post_btn.is_visible(timeout=3000):
            post_btn.click()
            logging.info("🚀 Clicked Post on Reddit!")
            time.sleep(5)
            logging.info("✅ SUCCESS: Link posted to Reddit!")
            return True

        logging.warning("⚠️ Could not complete Reddit submission form.")
        return False

    except Exception as e:
        logging.error(f"❌ Reddit posting error: {e}")
        return False


def run_cycle():
    """Runs a single check & publish cycle"""
    if not os.path.exists(AUTH_FILE):
        logging.warning(f"⚠️ Auth file '{AUTH_FILE}' not found yet. Waiting for PC session sync...")
        return

    history = load_history()
    posts = fetch_latest_posts()

    if not posts:
        logging.info("ℹ️ No published articles retrieved from API.")
        return

    twitter_posted = set(history.get("twitter_posted", []))
    reddit_posted = set(history.get("reddit_posted", []))

    target_for_twitter = None
    target_for_reddit = None

    for p in posts:
        slug = p.get("slug")
        if not slug:
            continue
        if not target_for_twitter and slug not in twitter_posted:
            target_for_twitter = p
        if not target_for_reddit and slug not in reddit_posted:
            target_for_reddit = p
        if target_for_twitter and target_for_reddit:
            break

    if not target_for_twitter and not target_for_reddit:
        logging.info("✅ All recent articles have already been posted to X and Reddit. Bot is up to date!")
        return

    logging.info("🚀 Starting Headless Browser Session for Syndication...")

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(
                executable_path=CHROMIUM_EXEC,
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-blink-features=AutomationControlled",
                    "--window-size=1920,1080"
                ]
            )

            context = browser.new_context(
                storage_state=AUTH_FILE,
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            )
            page = context.new_page()

            # 1. Post to Twitter
            if target_for_twitter:
                ok = post_to_twitter(page, target_for_twitter)
                if ok:
                    twitter_posted.add(target_for_twitter["slug"])
                    history["twitter_posted"] = list(twitter_posted)
                    save_history(history)
                time.sleep(random.uniform(10.0, 18.0))

            # 2. Post to Reddit
            if target_for_reddit:
                ok = post_to_reddit(page, target_for_reddit)
                if ok:
                    reddit_posted.add(target_for_reddit["slug"])
                    history["reddit_posted"] = list(reddit_posted)
                    save_history(history)

            history["last_run"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            save_history(history)

            context.close()
            browser.close()
            logging.info("✨ Syndication cycle completed successfully!")

        except Exception as err:
            logging.error(f"❌ Browser cycle error: {err}")


def main():
    logging.info("=" * 65)
    logging.info("🤖 PRIME MEDIA - 24/7 AUTONOMOUS CLOUD SOCIAL BOT (ORACLE)")
    logging.info("=" * 65)
    logging.info(f"Target Site: {BASE_SITE_URL}")
    logging.info(f"Chromium: {CHROMIUM_EXEC}")
    logging.info(f"Auth file: {AUTH_FILE}")

    while True:
        try:
            run_cycle()
        except Exception as e:
            logging.error(f"Unexpected top-level error: {e}")

        # Sleep 25-30 minutes between cycles
        sleep_secs = random.randint(1500, 1800)
        logging.info(f"⏰ Sleeping for {sleep_secs // 60} minutes until next check...")
        time.sleep(sleep_secs)


if __name__ == "__main__":
    main()
