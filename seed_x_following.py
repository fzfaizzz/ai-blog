"""
Seeds following graph for @PrimeMediaSite on X:
Follows 10 top official tech & news authorities so X's algorithm indexes Prime Media into the global news cluster.
"""
import time
from playwright.sync_api import sync_playwright

AUTH_FILE = "/home/ubuntu/social_bot/social_auth.json"
TARGET_ACCOUNTS = [
    "OpenAI",
    "TechCrunch",
    "TheVerge",
    "Reuters",
    "Bloomberg",
    "sama",
    "WIRED",
    "WSJ",
    "DiscussingFilm",
    "CultureCrave",
    "nvidia",
    "GoogleDeepMind"
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path="/snap/bin/chromium",
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    context = browser.new_context(
        storage_state=AUTH_FILE,
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
    page = context.new_page()

    for acc in TARGET_ACCOUNTS:
        try:
            print(f"Opening https://x.com/{acc} ...")
            page.goto(f"https://x.com/{acc}", wait_until="domcontentloaded", timeout=25000)
            time.sleep(3)

            # Dismiss cookie banner
            try:
                page.locator('//span[text()="Accept all cookies" or text()="Refuse non-essential cookies"]').first.click(timeout=2000)
            except Exception:
                pass

            # Find follow button
            follow_btn = page.locator(f'button[aria-label="Follow @{acc}"], div[data-testid*="-follow"]').first
            if follow_btn.is_visible(timeout=3000):
                txt = follow_btn.inner_text().strip()
                if "Follow" in txt and "Following" not in txt:
                    follow_btn.click()
                    print(f"✅ Followed @{acc} successfully!")
                    time.sleep(2)
                else:
                    print(f"ℹ️ Already following @{acc} ({txt})")
            else:
                print(f"Follow button not found for @{acc}")
        except Exception as e:
            print(f"Error following @{acc}: {e}")

    browser.close()
    print("Graph seeding complete!")
