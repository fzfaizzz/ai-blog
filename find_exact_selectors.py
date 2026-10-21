import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/snap/bin/chromium',
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
    )
    context = browser.new_context(
        storage_state='/home/ubuntu/social_bot/social_auth.json',
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    )
    page = context.new_page()
    page.goto('https://www.reddit.com/r/test/submit/', wait_until='domcontentloaded', timeout=30000)
    time.sleep(3)

    loc1 = page.locator('r-post-form-submit-button')
    print("r-post-form-submit-button count:", loc1.count())
    if loc1.count() > 0:
        print("loc1 text:", loc1.first.inner_text())

    loc2 = page.locator('r-post-form-submit-button button')
    print("r-post-form-submit-button button count:", loc2.count())
    if loc2.count() > 0:
        print("loc2 text:", loc2.first.inner_text(), "visible:", loc2.first.is_visible(), "disabled:", loc2.first.is_disabled())

    loc3 = page.locator('button:has-text("Post")')
    print("button:has-text('Post') count:", loc3.count())

    browser.close()
