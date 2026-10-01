"""
Autonomous X (Twitter) Profile Branding Script
==============================================
Automatically updates:
- Display Name: Prime Media | AI, Cinema & Tech ⚡
- Bio: ⚡ Real-time updates & deep dives on AI, Cinema, Tech & Global News...
- Location: Worldwide
- Website: https://primemedia.site
- Profile Picture & Header Banner
- Posts introductory Welcome / Pinned Tweet
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "X_BRANDING_ASSETS")
AVATAR_PATH = os.path.abspath(os.path.join(ASSETS_DIR, "01_PRIME_MEDIA_PROFILE_PICTURE.jpg"))
BANNER_PATH = os.path.abspath(os.path.join(ASSETS_DIR, "02_PRIME_MEDIA_HEADER_BANNER.jpg"))

VOX_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "..", "01_VOX_Documentary_Engine", "chrome_automation_profile"))
LOCAL_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "chrome_social_profile"))
CHROME_PROFILE_DIR = VOX_PROFILE if os.path.exists(VOX_PROFILE) else LOCAL_PROFILE

DISPLAY_NAME = "Prime Media | AI, Cinema & Tech ⚡"
BIO_TEXT = "⚡ Real-time updates & deep dives on AI, Cinema, Tech & Global News. Curated daily intelligence for thinkers.\n📖 Read full coverage ↓"
LOCATION_TEXT = "Worldwide"
WEBSITE_URL = "https://primemedia.site"

PINNED_TWEET_TEXT = (
    "Welcome to Prime Media ⚡\n\n"
    "We bring you real-time breaking news, in-depth breakdowns, and daily intelligence on:\n"
    "🤖 Artificial Intelligence & Tech Breakthroughs\n"
    "🎬 Cinema, Hollywood & Box Office Highlights\n"
    "📈 Global Markets & Emerging Trends\n\n"
    "👉 Explore all stories & live coverage:\n"
    "https://primemedia.site\n\n"
    "#TechNews #BreakingNews #AINews #Cinema"
)


def apply_branding():
    print("=" * 65)
    print("🎨 STARTING AUTOMATIC X (TWITTER) BRANDING")
    print("=" * 65)
    print(f"📁 Chrome Profile: {CHROME_PROFILE_DIR}")
    print(f"🖼️ Avatar:         {AVATAR_PATH}")
    print(f"🖼️ Banner:         {BANNER_PATH}")
    print("=" * 65)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            CHROME_PROFILE_DIR,
            channel="chrome",
            headless=False,
            viewport={"width": 1400, "height": 900},
            args=[
                "--disable-blink-features=AutomationControlled",
                "--start-maximized"
            ]
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        # Step 1: Open X Home
        print("🌐 Opening X.com...")
        page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=45000)
        time.sleep(4)

        # Check if logged in
        if "login" in page.url or "i/flow/login" in page.url:
            print("❌ Error: Twitter is not logged in!")
            ctx.close()
            return False

        # Step 2: Navigate to Profile
        print("👤 Navigating to your Profile page...")
        profile_link = page.locator('a[data-testid="AppTabBar_Profile_Link"]').first
        if profile_link.is_visible(timeout=5000):
            profile_link.click()
            time.sleep(3)
        else:
            page.goto("https://x.com/settings/profile", wait_until="domcontentloaded")
            time.sleep(3)

        # Step 3: Click "Edit profile" if not already on modal
        print("✏️ Opening 'Edit profile' dialog...")
        edit_btn = page.locator('a[href$="/header_photo"], [data-testid="editProfileButton"], button:has-text("Edit profile")').first
        if edit_btn.is_visible(timeout=5000):
            edit_btn.click()
            time.sleep(2.5)

        # Step 4: Fill Name, Bio, Location, Website
        print("📝 Updating Display Name...")
        name_input = page.locator('input[name="displayName"], input[autocomplete="name"]').first
        if name_input.is_visible(timeout=3000):
            name_input.click()
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            name_input.fill(DISPLAY_NAME)
            time.sleep(0.5)

        print("📝 Updating Bio...")
        bio_input = page.locator('textarea[name="description"]').first
        if bio_input.is_visible(timeout=3000):
            bio_input.click()
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            bio_input.fill(BIO_TEXT)
            time.sleep(0.5)

        print("📝 Updating Location...")
        loc_input = page.locator('input[name="location"]').first
        if loc_input.is_visible(timeout=3000):
            loc_input.click()
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            loc_input.fill(LOCATION_TEXT)
            time.sleep(0.5)

        print("📝 Updating Website...")
        web_input = page.locator('input[name="url"]').first
        if web_input.is_visible(timeout=3000):
            web_input.click()
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            web_input.fill(WEBSITE_URL)
            time.sleep(0.5)

        # Step 5: Upload Header Banner
        if os.path.exists(BANNER_PATH):
            print("🖼️ Uploading Twitter Header Banner...")
            try:
                banner_file_input = page.locator('input[type="file"][accept*="image"]').first
                if banner_file_input.count() > 0:
                    banner_file_input.set_input_files(BANNER_PATH)
                    time.sleep(2)
                    # Click Apply on crop modal if it appears
                    apply_btn = page.locator('button[data-testid="applyButton"], div[role="button"]:has-text("Apply")').first
                    if apply_btn.is_visible(timeout=4000):
                        apply_btn.click()
                        time.sleep(2)
                        print("✅ Header banner applied!")
            except Exception as e:
                print(f"⚠️ Banner upload notice: {e}")

        # Step 6: Upload Profile Picture (Avatar)
        if os.path.exists(AVATAR_PATH):
            print("🖼️ Uploading Profile Picture (Avatar)...")
            try:
                # Avatar input is usually the second file input or specific to avatar
                avatar_inputs = page.locator('input[type="file"][accept*="image"]')
                target_avatar = None
                if avatar_inputs.count() > 1:
                    target_avatar = avatar_inputs.nth(1)
                else:
                    target_avatar = avatar_inputs.first

                if target_avatar:
                    target_avatar.set_input_files(AVATAR_PATH)
                    time.sleep(2)
                    apply_btn = page.locator('button[data-testid="applyButton"], div[role="button"]:has-text("Apply")').first
                    if apply_btn.is_visible(timeout=4000):
                        apply_btn.click()
                        time.sleep(2)
                        print("✅ Profile picture applied!")
            except Exception as e:
                print(f"⚠️ Avatar upload notice: {e}")

        # Step 7: Click Save
        print("💾 Saving Profile updates...")
        save_btn = page.locator('[data-testid="Profile_Save_Button"], button:has-text("Save")').first
        if save_btn.is_visible(timeout=4000):
            save_btn.click()
            time.sleep(4)
            print("🎉 Profile branding saved successfully!")

        # Step 8: Post Welcome / Pinned Tweet
        try:
            print("\n🚀 Posting Welcome Tweet...")
            page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=25000)
            time.sleep(3)

            tweet_box = page.locator('div[data-testid="tweetTextarea_0"], div[role="textbox"][contenteditable="true"]').first
            if tweet_box.is_visible(timeout=5000):
                tweet_box.click()
                time.sleep(1)
                page.keyboard.insert_text(PINNED_TWEET_TEXT)
                time.sleep(2)

                post_btn = page.locator('button[data-testid="tweetButton"]').first
                if post_btn.is_visible(timeout=5000):
                    if post_btn.is_enabled():
                        post_btn.click()
                        print("✅ Welcome tweet published!")
                        time.sleep(3)
                    else:
                        print("ℹ️ Post button not ready, tweet will be published by autonomous bot.")
        except Exception as te:
            print(f"ℹ️ Welcome tweet note: {te}")

        print("=" * 65)
        print("✨ COMPLETE! Your X page branding has been fully applied!")
        print("=" * 65)
        time.sleep(4)
        ctx.close()
        return True


if __name__ == "__main__":
    apply_branding()
