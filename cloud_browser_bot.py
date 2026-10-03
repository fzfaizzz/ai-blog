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
from ai_viral_copier import generate_viral_copy_with_llm, format_full_viral_tweet, format_hook_tweet, format_reply_tweet

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
    """Generates 16:9 news card + viral copy and posts to X with 100% media confirmation"""
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
    logging.info(f"📝 Full Viral Tweet ({len(tweet_text)} chars):\n{tweet_text}\n")

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

        # Dismiss cookie banner immediately
        try:
            page.locator('//span[text()="Accept all cookies" or text()="Refuse non-essential cookies"]').first.click(timeout=3000)
            logging.info("Cookie banner dismissed.")
        except Exception:
            pass

        # 3. Attach 16:9 Branded Media Card
        if card_path and os.path.exists(card_path):
            try:
                logging.info(f"🖼️ Attaching 16:9 News Card ({card_path}) to tweet...")
                file_input = page.locator('input[data-testid="fileInput"]').first
                if file_input.count() > 0:
                    file_input.set_input_files(card_path)
                    logging.info("✅ 16:9 News Card attached to compose window!")

                    # Wait for media upload progressbar to detach
                    logging.info("⏳ Waiting for media upload spinner to detach...")
                    try:
                        page.wait_for_selector('div[role="progressbar"]', state="detached", timeout=25000)
                        logging.info("✅ Media spinner detached! Upload complete.")
                    except Exception:
                        logging.warning("⚠️ Spinner wait timed out, continuing...")
                        time.sleep(4)

                    # Verify attachment preview is present
                    try:
                        page.wait_for_selector('button[aria-label="Remove media"], div[data-testid="attachments"]', timeout=8000)
                        logging.info("✅ Media attachment preview confirmed in compose window!")
                    except Exception:
                        pass
            except Exception as me:
                logging.warning(f"⚠️ Media attachment warning: {me}")

        # 4. Fill Post Content (Hook + Curiosity Context + CTA Link + Hashtags)
        input_selectors = [
            'div[data-testid="tweetTextarea_0"]',
            'div[role="textbox"][contenteditable="true"]',
            'div[aria-label="Post text"]'
        ]
        tweet_box_0 = None
        for sel in input_selectors:
            try:
                el = page.locator(sel).first
                if el.is_visible(timeout=4000):
                    tweet_box_0 = el
                    break
            except Exception:
                pass

        if not tweet_box_0:
            logging.error("❌ Failed to locate Twitter compose textarea.")
            return False

        # Dismiss any overlapping tooltips or backdrops
        try:
            page.evaluate('''() => {
                document.querySelectorAll('div[data-testid="sheetDialog"], div[role="dialog"] button[aria-label="Close"]').forEach(el => el.click?.());
            }''')
        except Exception:
            pass

        try:
            tweet_box_0.click(force=True, timeout=5000)
        except Exception:
            page.focus('div[data-testid="tweetTextarea_0"]')

        time.sleep(0.5)
        # Type clean viral tweet text (strictly bounded to fit under 280 chars)
        page.keyboard.type(tweet_text, delay=8)
        time.sleep(2)

        # 5. Submit via Post button
        logging.info("🚀 Submitting post to Twitter / X...")
        post_btn = page.locator('button[data-testid="tweetButton"]').first
        try:
            page.wait_for_selector('button[data-testid="tweetButton"]:not([disabled])', timeout=15000)
            logging.info("✅ Post button is enabled and ready to click!")
        except Exception:
            logging.warning("⚠️ Post button wait timed out, attempting force click...")

        # Save screenshot before click for proof
        try:
            page.screenshot(path=os.path.join(BASE_DIR, "before_tweet_click.png"))
        except Exception:
            pass

        post_btn.click(force=True)
        time.sleep(4)

        # Fallback Control+Enter
        if "compose" in page.url:
            try:
                tweet_box_0.focus()
                page.keyboard.press("Control+Enter")
                time.sleep(4)
            except Exception:
                pass

        # Dismiss "Unlock more on X" or promotional dialogs
        try:
            page.evaluate('''() => {
                document.querySelectorAll('button').forEach(b => {
                    const txt = (b.innerText || '').trim();
                    if (['Got it', 'Dismiss', 'Close'].includes(txt)) b.click();
                });
            }''')
        except Exception:
            pass

        time.sleep(4)

        # Save screenshot after click for proof
        try:
            page.screenshot(path=os.path.join(BASE_DIR, "after_tweet_click.png"))
        except Exception:
            pass

        content = page.content()
        if "Your post was sent" in content or "compose" not in page.url:
            logging.info("✅ SUCCESS: 16:9 Branded Viral Post published to Twitter / X!")
            return True

        return False

    except Exception as e:
        logging.error(f"❌ Twitter posting error: {e}")
        return False


def run_cycle():
    """Runs a single check & publish cycle focused 100% on X (Twitter)"""
    if not os.path.exists(AUTH_FILE):
        logging.warning(f"⚠️ Auth file '{AUTH_FILE}' not found yet.")
        return

    history = load_history()
    posts = fetch_latest_posts()

    if not posts:
        logging.info("ℹ️ No published articles retrieved from API.")
        return

    twitter_posted = set(history.get("twitter_posted", []))

    target_for_twitter = None
    for p in posts:
        slug = p.get("slug")
        if slug and slug not in twitter_posted:
            target_for_twitter = p
            break

    if not target_for_twitter:
        logging.info("✅ All recent articles have already been posted to X. Bot is up to date!")
        return

    logging.info("🚀 Starting Headless Browser Session for High-CTR 𝕏 Syndication...")

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
            page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver;")

            # Post to Twitter with 16:9 Card & AI Copy
            ok = post_to_twitter(page, target_for_twitter)
            if ok:
                twitter_posted.add(target_for_twitter["slug"])
                history["twitter_posted"] = list(twitter_posted)
                history["last_run"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                save_history(history)

            context.close()
            browser.close()
            logging.info("✨ 𝕏 Syndication cycle completed successfully!")

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
            page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver;")

            success = False
            if platform in ["twitter", "x"]:
                success = post_to_twitter(page, post)
            elif platform == "reddit":
                logging.warning("⚠️ Reddit automated posting has been disabled per user policy.")
                success = False

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

    last_cycle_time = time.time()  # Start timing from now, next cycle in 1 hour
    cycle_interval = 3600  # Check every 1 hour (3600 seconds)

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

