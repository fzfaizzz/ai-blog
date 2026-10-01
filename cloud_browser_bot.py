"""
Prime Media - 24/7 Autonomous Cloud Social Bot (Oracle VM Edition)
===================================================================
1. Fetches latest published articles from https://primemedia.site/api/posts
2. Generates High-CTR viral copy using local Qwen 2.5 (Ollama)
3. Generates 1200x675 16:9 branded news cards with official logo2.png
4. Attaches media and publishes directly to X (Twitter) and Reddit via headless Chromium
5. Runs 24/7 as systemd background service on Oracle Cloud
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

from news_card_generator import generate_news_card
from ai_viral_copier import generate_viral_copy_with_llm, format_full_viral_tweet

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, "bot.log")
HISTORY_FILE = os.path.join(BASE_DIR, "history.json")
AUTH_FILE = os.path.join(BASE_DIR, "social_auth.json")

API_POSTS_URL = "https://primemedia.site/api/posts"
BASE_SITE_URL = "https://primemedia.site"
CHROMIUM_EXEC = "/snap/bin/chromium" if os.path.exists("/snap/bin/chromium") else "/usr/bin/chromium-browser"
MONGO_URI = os.getenv("MONGODB_URI", "mongodb+srv://akhtarfarhan251_db_user:HUEXPccjB9Wm1msH@cluster0.nfkigk7.mongodb.net/primemedia?retryWrites=true&w=majority&appName=Cluster0")

_mongo_client = None

def get_mongo_db():
    global _mongo_client
    if _mongo_client is not None:
        try:
            _mongo_client.admin.command('ping')
            return _mongo_client["primemedia"]
        except Exception:
            _mongo_client = None
    try:
        from pymongo import MongoClient
        _mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
        return _mongo_client["primemedia"]
    except Exception:
        return None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)


def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"twitter_posted": [], "reddit_posted": [], "last_run": None}


def save_history(history):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error saving history: {e}")


def fetch_latest_posts():
    try:
        req = urllib.request.Request(
            API_POSTS_URL,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrimeMediaCloudBot/2.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success") and data.get("posts"):
                return data["posts"]
    except Exception as e:
        logging.error(f"Live API fetch error: {e}")
    return []


def post_to_twitter(page, post):
    """Generates 16:9 news card + viral copy and posts to X directly via Playwright"""
    title = (post.get("title") or "").strip()
    slug = post.get("slug")
    url = f"{BASE_SITE_URL}/post/{slug}"
    category = post.get("category") or "TECH"
    logging.info(f"\n🐥 [Twitter / X Bot] Preparing viral wire for: \"{title[:60]}...\"")

    # 1. AI Viral Copywriting via Qwen 2.5 on Oracle VM
    logging.info("🧠 Generating high-CTR viral copy via Qwen 2.5 AI Brain...")
    viral_data = generate_viral_copy_with_llm(
        title=title,
        summary=post.get("summary") or post.get("content") or "",
        category=category
    )
    tweet_text = format_full_viral_tweet(viral_data, url)
    logging.info(f"📝 Viral Tweet Prepared:\n{tweet_text}\n")

    # 2. Dynamic 16:9 Branded News Card Generation
    card_path = None
    try:
        logging.info("🎨 Generating 16:9 Branded Newsroom Card with official logo2.png...")
        card_path = generate_news_card(
            title=title,
            category=category,
            cover_image_source=post.get("imageUrl") or post.get("coverImage") or post.get("image"),
            output_filename=f"post_{slug[:18]}.jpg"
        )
    except Exception as ge:
        logging.warning(f"⚠️ News card generation error ({ge}), continuing with text...")

    try:
        logging.info("🌐 Opening https://x.com/compose/post ...")
        page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=40000)
        time.sleep(3)

        if "login" in page.url or "i/flow/login" in page.url:
            logging.error("❌ Twitter is NOT logged in in this session! Please sync cookies from PC.")
            return False

        # 3. Attach 16:9 Branded Media Card
        if card_path and os.path.exists(card_path):
            try:
                logging.info(f"🖼️ Attaching 16:9 News Card ({card_path}) to tweet...")
                file_input = page.locator('input[data-testid="fileInput"]').first
                if file_input.count() > 0:
                    file_input.set_input_files(card_path)
                    logging.info("✅ 16:9 News Card attached to compose window!")
                    time.sleep(3)
            except Exception as me:
                logging.warning(f"⚠️ Media attachment warning: {me}")

        # 4. Fill Tweet Text
        input_selectors = [
            'div[data-testid="tweetTextarea_0"]',
            'div[role="textbox"][contenteditable="true"]',
            'div[aria-label="Post text"]'
        ]
        tweet_box = None
        for sel in input_selectors:
            try:
                el = page.locator(sel).first
                if el.is_visible(timeout=3000):
                    tweet_box = el
                    break
            except Exception:
                pass

        if not tweet_box:
            logging.error("❌ Failed to locate Twitter compose textarea.")
            return False

        tweet_box.click()
        time.sleep(0.5)

        # Fill text naturally
        page.keyboard.type(tweet_text, delay=10)
        time.sleep(2)

        # 5. Submit via direct DOM click (bypasses transparent overlay interceptions)
        logging.info("🚀 Submitting tweet via direct DOM click on tweetButton...")
        page.evaluate('() => document.querySelector("button[data-testid=\\"tweetButton\\"]")?.click()')
        time.sleep(6)

        if "compose" not in page.url:
            logging.info("✅ SUCCESS: Viral Article & 16:9 Card published to Twitter / X!")
            return True

        # Fallback Control+Enter
        page.keyboard.press("Control+Enter")
        time.sleep(4)

        if "compose" not in page.url:
            logging.info("✅ SUCCESS: Article published to Twitter / X!")
            return True

        return False

    except Exception as e:
        logging.error(f"❌ Twitter posting error: {e}")
        return False


def post_to_reddit(page, post):
    """Submits link directly to Reddit using authenticated session"""
    title = (post.get("title") or "").strip()
    slug = post.get("slug")
    url = f"{BASE_SITE_URL}/post/{slug}"
    logging.info(f"\n🔴 [Reddit Bot] Preparing to post: \"{title[:60]}...\"")

    if len(title) > 280:
        title = title[:277] + "..."

    try:
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
                time.sleep(5)
                logging.info("✅ SUCCESS: Link posted to Reddit!")
                return True

        # Modern reddit fallback
        page.goto("https://www.reddit.com/submit", wait_until="domcontentloaded", timeout=40000)
        time.sleep(4)

        if "login" in page.url:
            logging.error("❌ Reddit is NOT logged in in this session!")
            return False

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
            time.sleep(5)
            logging.info("✅ SUCCESS: Link posted to Reddit!")
            return True

        return False
    except Exception as e:
        logging.error(f"❌ Reddit posting error: {e}")
        return False


def run_cycle():
    """Runs a single check & publish cycle"""
    if not os.path.exists(AUTH_FILE):
        logging.warning(f"⚠️ Auth file '{AUTH_FILE}' not found yet.")
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

    logging.info("🚀 Starting Headless Browser Session for High-CTR Syndication...")

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

            # 1. Post to Twitter with 16:9 Card & AI Copy
            if target_for_twitter:
                ok = post_to_twitter(page, target_for_twitter)
                if ok:
                    twitter_posted.add(target_for_twitter["slug"])
                    history["twitter_posted"] = list(twitter_posted)
                    save_history(history)
                time.sleep(random.uniform(10.0, 18.0))

            # 2. Post to Reddit
            if target_for_reddit:
                try:
                    if page.is_closed():
                        page = context.new_page()
                except Exception:
                    page = context.new_page()

                ok = post_to_reddit(page, target_for_reddit)
                if ok:
                    reddit_posted.add(target_for_reddit["slug"])
                    history["reddit_posted"] = list(reddit_posted)
                    save_history(history)

            history["last_run"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            save_history(history)

            context.close()
            browser.close()
            logging.info("✨ High-CTR Syndication cycle completed successfully!")

        except Exception as err:
            logging.error(f"❌ Browser cycle error: {err}")


def process_pending_triggers():
    """Checks MongoDB for on-demand test posts triggered from the Web Admin Dashboard"""
    db = get_mongo_db()
    if db is None:
        return

    try:
        triggers_col = db["social_triggers"]
        trigger = triggers_col.find_one_and_update(
            {"status": "pending"},
            {"$set": {"status": "processing", "startedAt": datetime.now().isoformat()}}
        )
        if not trigger:
            return

        t_id = trigger.get("_id")
        logging.info(f"🎯 [Trigger Claimed] Manual test post received (ID: {t_id})")
        platform = trigger.get("platform", "twitter")
        post = trigger.get("article") or trigger.get("post")

        if not post:
            posts = fetch_latest_posts()
            if posts:
                post = posts[0]

        if not post:
            triggers_col.update_one(
                {"_id": t_id},
                {"$set": {"status": "failed", "error": "No article found to publish.", "completedAt": datetime.now().isoformat()}}
            )
            return

        logging.info(f"🚀 Executing manual 𝕏 Post Test for: \"{post.get('title', '')[:55]}...\"")
        with sync_playwright() as p:
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

            success = False
            if platform in ["twitter", "x"]:
                success = post_to_twitter(page, post)
            elif platform == "reddit":
                success = post_to_reddit(page, post)

            try:
                context.close()
                browser.close()
            except Exception:
                pass

            if success:
                triggers_col.update_one(
                    {"_id": t_id},
                    {"$set": {
                        "status": "completed",
                        "tweetUrl": "https://x.com/PrimeMediaSite",
                        "message": f"Successfully published \"{post.get('title', '')[:50]}\" to @PrimeMediaSite on 𝕏 with 16:9 news card!",
                        "completedAt": datetime.now().isoformat()
                    }}
                )
                logging.info(f"✅ Manual 𝕏 Post Test completed successfully (ID: {t_id})!")
            else:
                triggers_col.update_one(
                    {"_id": t_id},
                    {"$set": {
                        "status": "failed",
                        "error": "Failed to submit post to Twitter / X compose.",
                        "completedAt": datetime.now().isoformat()
                    }}
                )
                logging.error(f"❌ Manual 𝕏 Post Test failed (ID: {t_id}).")

    except Exception as e:
        logging.error(f"Error processing triggers: {e}")


def main():
    logging.info("=" * 65)
    logging.info("🤖 PRIME MEDIA - 24/7 AUTONOMOUS VIRAL NEWSROOM (ORACLE VM)")
    logging.info("=" * 65)
    logging.info(f"Target Site: {BASE_SITE_URL}")
    logging.info(f"Chromium: {CHROMIUM_EXEC}")
    logging.info(f"Auth file: {AUTH_FILE}")

    last_cycle_time = time.time()
    cycle_interval = 1800  # Run autonomous cycle every 30 minutes

    while True:
        try:
            # 1. Check for manual triggers from Admin Panel (instant response within 3 seconds)
            process_pending_triggers()

            # 2. Check if periodic autonomous syndication cycle is due
            now = time.time()
            if now - last_cycle_time > cycle_interval:
                run_cycle()
                last_cycle_time = time.time()

        except Exception as e:
            logging.error(f"Unexpected top-level error: {e}")

        # Non-blocking 3-second sleep between trigger checks
        time.sleep(3)


if __name__ == "__main__":
    main()

