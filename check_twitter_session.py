import sys
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
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        viewport={'width': 1920, 'height': 1080}
    )
    page = context.new_page()
    page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver;")
    
    # 1. Test X.com home
    page.goto('https://x.com/home', wait_until='domcontentloaded', timeout=30000)
    time.sleep(3)
    print('X Home URL:', page.url)
    print('X Title:', page.title())
    content = page.content()
    is_login = 'login' in page.url or 'Log in to X' in content
    print('Is redirected to login?:', is_login)

    # 2. Test X.com compose
    page.goto('https://x.com/compose/post', wait_until='domcontentloaded', timeout=30000)
    time.sleep(3)
    print('Compose URL:', page.url)
    
    # Check post button
    post_btns = page.locator('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"], button:has-text("Post")')
    print('Post button count:', post_btns.count())
    for i in range(post_btns.count()):
        btn = post_btns.nth(i)
        print(f"Button {i}: text={btn.inner_text().strip()}, testid={btn.get_attribute('data-testid')}, disabled={btn.is_disabled()}")

    browser.close()
