from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/snap/bin/chromium',
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    context = browser.new_context(
        storage_state='/home/ubuntu/social_bot/social_auth.json',
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    )
    page = context.new_page()
    page.goto('https://www.reddit.com/user/PrimeMediaNews/', wait_until='domcontentloaded', timeout=30000)
    time.sleep(3)
    print("Page Title:", page.title())
    page.screenshot(path='/home/ubuntu/social_bot/profile_inspect.png')
    browser.close()
