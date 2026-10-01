"""
02_AI_Blogging_System - Autonomous Social Browser Bot (Playwright Edition)
==========================================================================
Zero-API-Key Browser Automation for X (Twitter) and Reddit!
Uses the exact same persistent Google Chrome profile from your other AI studio projects.
Automatically monitors Prime Media, picks fresh articles, and posts to Twitter & Reddit!
"""

import os
import sys
import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
HISTORY_FILE = os.path.join(DATA_DIR, "browser_bot_history.json")

# Persistent Chrome Profile directory (reuses the same trusted profile from VOX / Universal Studio)
VOX_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "..", "01_VOX_Documentary_Engine", "chrome_automation_profile"))
LOCAL_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "chrome_social_profile"))
CHROME_PROFILE_DIR = VOX_PROFILE if os.path.exists(VOX_PROFILE) else LOCAL_PROFILE

API_POSTS_URL = "https://primemedia.site/api/posts"
BASE_SITE_URL = "https://primemedia.site"

os.makedirs(DATA_DIR, exist_ok=True)


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
        print(f"⚠️ Error saving history: {e}")


def fetch_latest_posts():
    """Fetches published articles from live site API, or falls back to local data/posts.json"""
    try:
        req = urllib.request.Request(
            API_POSTS_URL,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrimeMediaBot/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success") and data.get("posts"):
                return data["posts"]
    except Exception as e:
        print(f"⚠️ Live API fetch failed ({e}), checking local posts.json...")

    local_posts_file = os.path.join(DATA_DIR, "posts.json")
    if os.path.exists(local_posts_file):
        try:
            with open(local_posts_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def format_tweet_text(post):
    """Formats high-CTR, 280-char safe tweet with viral hashtags"""
    title = (post.get("title") or "").strip()
    slug = post.get("slug")
    url = f"{BASE_SITE_URL}/post/{slug}"
    cat = (post.get("category") or "").lower()

    if any(k in cat for k in ["movie", "cinema", "entertainment"]):
        hashtags = "#Movies #Cinema #BreakingNews"
    elif any(k in cat for k in ["ai", "tech", "gadget", "software"]):
        hashtags = "#TechNews #ArtificialIntelligence #AINews"
    elif any(k in cat for k in ["business", "market", "economy", "crypto"]):
        hashtags = "#StockMarket #Economy #Business"
    else:
        hashtags = "#BreakingNews #Trending #PrimeMedia"

    # URL is counted as 23 chars by Twitter (t.co)
    # Target total length <= 260
    overhead = len("🚨 BREAKING: \n\n📖 Read 👇\n") + 23 + len("\n\n" + hashtags)
    avail_title_len = max(50, 260 - overhead)

    if len(title) > avail_title_len:
        title = title[: avail_title_len - 3] + "..."

    return f"🚨 BREAKING: {title}\n\n📖 Read full story 👇\n{url}\n\n{hashtags}"


def post_to_twitter(page, post):
    """Opens x.com and posts tweet directly through real Chrome UI"""
    print(f"\n🐥 [Twitter / X Bot] Preparing to tweet: \"{post.get('title')[:60]}...\"")
    tweet_text = format_tweet_text(post)

    try:
        page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)

        # Check if redirected to login
        if "login" in page.url or "i/flow/login" in page.url:
            print("❌ Twitter is NOT logged in in this Chrome profile! Please run LOGIN_SOCIAL_BROWSER.bat once to log in.")
            return False

        # Find tweet input box
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
            print("⚠️ Could not find Twitter compose box. Trying navigation to x.com/home...")
            page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=25000)
            time.sleep(3)
            for sel in input_selectors:
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=3000):
                        tweet_box = el
                        break
                except Exception:
                    pass

        if not tweet_box:
            print("❌ Failed to locate Twitter compose textarea.")
            return False

        tweet_box.click()
        time.sleep(0.5)
        # Type tweet text naturally
        page.keyboard.type(tweet_text, delay=15)
        time.sleep(1.5)

        # Find Post Button
        post_btn_selectors = [
            'button[data-testid="tweetButton"]',
            'button[data-testid="tweetButtonInline"]',
            'button:has-text("Post")'
        ]
        post_btn = None
        for sel in post_btn_selectors:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=2000):
                    post_btn = btn
                    break
            except Exception:
                pass

        if not post_btn:
            print("❌ Could not find 'Post' button on Twitter.")
            return False

        post_btn.click()
        print("🚀 Clicked 'Post' button on Twitter / X!")
        time.sleep(4)
        print("✅ SUCCESS: Article tweeted to Twitter / X!")
        return True

    except Exception as e:
        print(f"❌ Twitter posting error: {e}")
        return False


def post_to_reddit(page, post):
    """Submits link directly to Reddit via real Chrome UI (zero API key)"""
    print(f"\n🔴 [Reddit Bot] Preparing to post to Reddit: \"{post.get('title')[:60]}...\"")
    title = (post.get("title") or "").strip()
    slug = post.get("slug")
    url = f"{BASE_SITE_URL}/post/{slug}"

    if len(title) > 280:
        title = title[:277] + "..."

    try:
        # Use old.reddit.com/submit for lightning-fast, 100% reliable standard form
        page.goto("https://old.reddit.com/submit", wait_until="domcontentloaded", timeout=25000)
        time.sleep(2)

        # Check if logged in on old reddit, else try new reddit
        if page.locator('input[name="title"]').count() > 0:
            print("📝 Submitting via Reddit classic interface...")
            # Click URL tab if not selected
            try:
                url_tab = page.locator('a:has-text("link"), #url').first
                if url_tab.is_visible(timeout=1000):
                    url_tab.click()
                    time.sleep(0.5)
            except Exception:
                pass

            page.fill('input[name="title"]', title)
            time.sleep(0.5)
            page.fill('input[name="url"]', url)
            time.sleep(0.5)

            # Leave sr or pick profile
            submit_btn = page.locator('button[name="submit"]').first
            if submit_btn.is_visible(timeout=2000):
                submit_btn.click()
                print("🚀 Clicked Submit on Reddit!")
                time.sleep(4)
                print("✅ SUCCESS: Link posted to Reddit!")
                return True

        # Fallback to modern www.reddit.com/submit
        page.goto("https://www.reddit.com/submit", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)

        if "login" in page.url:
            print("❌ Reddit is NOT logged in in this Chrome profile! Please run LOGIN_SOCIAL_BROWSER.bat once to log in.")
            return False

        # Click Link tab
        link_tab = page.locator('button:has-text("Link"), [data-testid="tab-link"]').first
        if link_tab.is_visible(timeout=2000):
            link_tab.click()
            time.sleep(1)

        # Fill title and url
        title_box = page.locator('textarea[placeholder="Title"], input[placeholder="Title"], textarea[name="title"]').first
        if title_box.is_visible(timeout=3000):
            title_box.click()
            page.keyboard.type(title, delay=15)
            time.sleep(0.5)

        url_box = page.locator('textarea[placeholder="Url"], input[placeholder="Url"], textarea[name="url"]').first
        if url_box.is_visible(timeout=3000):
            url_box.click()
            page.keyboard.type(url, delay=10)
            time.sleep(1)

        # Click Post
        post_btn = page.locator('button:has-text("Post")').first
        if post_btn.is_visible(timeout=3000):
            post_btn.click()
            print("🚀 Clicked Post on Reddit!")
            time.sleep(4)
            print("✅ SUCCESS: Link posted to Reddit!")
            return True

        print("⚠️ Could not complete Reddit post form.")
        return False

    except Exception as e:
        print(f"❌ Reddit posting error: {e}")
        return False


def run_single_syndication_cycle(headless=False):
    """Checks for newly published articles and syndicates them using persistent Chrome context"""
    history = load_history()
    posts = fetch_latest_posts()

    if not posts:
        print("ℹ️ No published articles found.")
        return

    twitter_posted = set(history.get("twitter_posted", []))
    reddit_posted = set(history.get("reddit_posted", []))

    # Find articles that need posting
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
        print("✅ All recent articles have already been posted to X and Reddit. Up to date!")
        return

    print("===============================================================")
    print("🌐 Launching Real Google Chrome (Persistent Automation Profile)...")
    print(f"📁 Chrome Profile: {CHROME_PROFILE_DIR}")
    print("===============================================================")

    with sync_playwright() as p:
        try:
            ctx = p.chromium.launch_persistent_context(
                CHROME_PROFILE_DIR,
                channel="chrome",
                headless=headless,
                viewport={"width": 1400, "height": 900},
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--start-maximized"
                ]
            )
            page = ctx.pages[0] if ctx.pages else ctx.new_page()

            # 1. Post to Twitter / X
            if target_for_twitter:
                success = post_to_twitter(page, target_for_twitter)
                if success:
                    twitter_posted.add(target_for_twitter["slug"])
                    history["twitter_posted"] = list(twitter_posted)
                    save_history(history)
                time.sleep(3)

            # 2. Post to Reddit
            if target_for_reddit:
                success = post_to_reddit(page, target_for_reddit)
                if success:
                    reddit_posted.add(target_for_reddit["slug"])
                    history["reddit_posted"] = list(reddit_posted)
                    save_history(history)
                time.sleep(3)

            history["last_run"] = time.strftime("%Y-%m-%d %H:%M:%S")
            save_history(history)
            ctx.close()
            print("\n🎉 Social browser syndication cycle complete!")

        except Exception as e:
            print(f"❌ Playwright execution error: {e}")


def main():
    print("===============================================================")
    print("🤖 PRIME MEDIA - 24/7 AUTONOMOUS SOCIAL BROWSER BOT (ZERO API)")
    print("===============================================================")
    print("Checking articles and running initial syndication...")
    run_single_syndication_cycle(headless=False)

    print("\n⏰ Entering 24/7 Autopilot Loop (Checks every 30 minutes)...")
    print("Press Ctrl + C to stop at any time.\n")

    while True:
        try:
            time.sleep(30 * 60)  # Wait 30 minutes
            print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] ⏰ Waking up to check fresh articles...")
            run_single_syndication_cycle(headless=False)
        except KeyboardInterrupt:
            print("\n👋 Bot stopped by user.")
            break
        except Exception as err:
            print(f"⚠️ Loop error: {err}")
            time.sleep(60)


if __name__ == "__main__":
    main()
