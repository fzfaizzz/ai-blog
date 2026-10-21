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
        viewport={"width": 1920, "height": 1080}
    )
    page = context.new_page()
    page.goto('https://x.com/PrimeMediaSite', wait_until='domcontentloaded', timeout=30000)
    time.sleep(5)
    page.screenshot(path='/home/ubuntu/social_bot/latest_profile_proof.png')
    print('URL:', page.url, 'Title:', page.title())
    browser.close()
