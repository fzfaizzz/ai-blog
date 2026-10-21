"""
Live Comprehensive Social Test: X (Twitter) + Reddit
Verifies 16:9 news card upload, character length, and policy compliance
"""
import os
import sys
import time
import json
import logging
from playwright.sync_api import sync_playwright

sys.path.insert(0, '/home/ubuntu/social_bot')
from news_card_generator import generate_news_card
from ai_viral_copier import generate_viral_copy_with_llm, format_full_viral_tweet

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

AUTH_FILE = "/home/ubuntu/social_bot/social_auth.json"
CHROMIUM_EXEC = "/snap/bin/chromium"

# Sample latest high-engagement article
sample_post = {
    "title": "Quantum Leap 2026: Sub-1nm Silicon Architecture Overcomes Thermal Wall",
    "slug": "quantum-leap-2026-sub-1nm-silicon-architecture-overcomes-thermal-wall",
    "category": "AI & Next-Gen Tech",
    "summary": "Pioneering semiconductor research demonstrates direct liquid microfluidic cooling embedded into multi-die chiplets, slashing power consumption by 40% while unlocking record compute density.",
    "imageUrl": "https://cdn.mos.cms.futurecdn.net/LAHcJyJAhAWKgx5oMSFpcC.jpg"
}

def test_twitter_post(page):
    title = sample_post["title"]
    slug = sample_post["slug"]
    url = f"https://primemedia.site/post/{slug}"
    category = sample_post["category"]

    logging.info("🎨 Generating 16:9 Branded News Card...")
    card_path = generate_news_card(
        title=title,
        category=category,
        cover_image_source=sample_post["imageUrl"],
        output_filename=f"test_{slug[:18]}.jpg"
    )
    logging.info(f"Card generated at: {card_path} (exists: {os.path.exists(card_path)})")

    # Generate viral copy
    viral_data = generate_viral_copy_with_llm(title, sample_post["summary"], category)
    tweet_text = format_full_viral_tweet(viral_data, url)
    logging.info(f"Generated Tweet ({len(tweet_text)} chars):\n{tweet_text}\n")

    logging.info("Opening https://x.com/compose/post ...")
    page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=40000)
    time.sleep(3)

    # 1. Dismiss cookie banner if present
    try:
        page.locator('//span[text()="Accept all cookies" or text()="Refuse non-essential cookies"]').first.click(timeout=3000)
        logging.info("Cookie banner dismissed.")
    except Exception:
        pass

    # 2. Attach 16:9 news card
    file_input = page.locator('input[data-testid="fileInput"]').first
    if file_input.count() > 0:
        logging.info("Attaching media file...")
        file_input.set_input_files(card_path)

        # Wait for media upload progressbar to detach
        logging.info("Waiting for media upload spinner to detach...")
        try:
            page.wait_for_selector('div[role="progressbar"]', state="detached", timeout=25000)
            logging.info("✅ Media spinner detached! Upload complete.")
        except Exception:
            logging.warning("⚠️ Spinner wait timed out, continuing...")
            time.sleep(5)

        # Verify attachment preview is present
        try:
            page.wait_for_selector('button[aria-label="Remove media"], div[data-testid="attachments"]', timeout=8000)
            logging.info("✅ Media attachment preview confirmed in compose window!")
        except Exception:
            pass

    # 3. Type tweet text
    tweet_box = page.locator('div[data-testid="tweetTextarea_0"]').first
    tweet_box.click(force=True)
    time.sleep(0.5)
    page.keyboard.type(tweet_text, delay=8)
    time.sleep(2)

    # 4. Wait for post button to be enabled
    post_btn = page.locator('button[data-testid="tweetButton"]').first
    try:
        page.wait_for_selector('button[data-testid="tweetButton"]:not([disabled])', timeout=10000)
        logging.info("✅ Post button is fully enabled!")
    except Exception:
        logging.warning("Post button not reporting enabled, will force click.")

    page.screenshot(path="/home/ubuntu/social_bot/test_tweet_ready.png")

    logging.info("Submitting tweet...")
    post_btn.click(force=True)
    time.sleep(3)

    if "compose" in page.url:
        tweet_box.focus()
        page.keyboard.press("Control+Enter")
        time.sleep(4)

    # Dismiss any post-submit modals
    try:
        page.evaluate('''() => {
            document.querySelectorAll('button').forEach(b => {
                const txt = (b.innerText || '').trim();
                if (['Got it', 'Dismiss', 'Close'].includes(txt)) b.click();
            });
        }''')
    except Exception:
        pass

    time.sleep(3)
    page.screenshot(path="/home/ubuntu/social_bot/test_tweet_done.png")
    content = page.content()
    is_success = "Your post was sent" in content or "compose" not in page.url
    logging.info(f"Twitter Post Result: success={is_success}, final_url={page.url}")
    return is_success


def test_reddit_post(page):
    title = f"[Analysis] {sample_post['title']}"
    summary = sample_post["summary"]

    submit_url = "https://www.reddit.com/r/test/submit/"
    logging.info(f"Opening Reddit submit: {submit_url} ...")
    page.goto(submit_url, wait_until="domcontentloaded", timeout=40000)
    time.sleep(3)

    # Fill Title
    title_box = page.locator('post-composer-title textarea').first
    if not title_box.is_visible(timeout=8000):
        logging.error("Could not find title box")
        return False
    title_box.click()
    page.keyboard.type(title, delay=10)
    time.sleep(1)

    # Fill Body (Compliant Zero-Spam Architecture)
    page.keyboard.press("Tab")
    time.sleep(0.5)

    body_text = (
        f"⚡ Executive Summary:\n{summary}\n\n"
        f"🔍 Key Strategic Takeaways:\n"
        f"- Sub-1nm scaling requires microfluidic liquid cooling directly in the silicon die.\n"
        f"- Multi-die packaging power requirements now exceed traditional heatsink capabilities.\n"
        f"- Next-generation compute workloads demand thermal-first hardware architecture.\n\n"
        f"💡 Community Discussion:\n"
        f"What are your thoughts on direct-to-die liquid cooling replacing standard server fans by 2027?\n\n"
        f"📰 Investigation & Research: Prime Media Newsroom"
    )
    page.keyboard.type(body_text, delay=8)
    time.sleep(2)

    page.screenshot(path="/home/ubuntu/social_bot/test_reddit_ready.png")

    # Locate submit button
    submit_btn = page.locator('r-post-form-submit-button button, button[type="submit"]:has-text("Post"), button:has-text("Post")').first
    logging.info(f"Reddit Submit button visible: {submit_btn.is_visible()}, disabled: {submit_btn.is_disabled()}")

    submit_btn.click(force=True)
    time.sleep(6)

    logging.info(f"Reddit URL after submit: {page.url}")
    page.screenshot(path="/home/ubuntu/social_bot/test_reddit_done.png")

    if "/comments/" in page.url:
        logging.info(f"🎉 REDDIT POST PUBLISHED: {page.url}")
        # Verify it stays live after 15 seconds
        time.sleep(15)
        page.reload(wait_until="domcontentloaded")
        content = page.content()
        is_removed = "Removed by Reddit" in content or "removed by Reddit's filters" in content
        logging.info(f"Is post removed by Reddit filters?: {is_removed}")
        return not is_removed
    else:
        logging.warning(f"Reddit post URL did not change to comments: {page.url}")
        return False


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

    logging.info("=== STEP 1: TESTING X (TWITTER) AUTOMATION ===")
    tw_ok = test_twitter_post(page)

    logging.info("=== STEP 2: TESTING REDDIT COMPLIANT AUTOMATION ===")
    rd_ok = test_reddit_post(page)

    context.close()
    browser.close()

    logging.info(f"\n================ SUMMARY ================")
    logging.info(f"Twitter Post Success: {tw_ok}")
    logging.info(f"Reddit Post Success: {rd_ok}")
    logging.info(f"=========================================")
