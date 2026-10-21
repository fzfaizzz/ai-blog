import sys
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/snap/bin/chromium',
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
    )
    context = browser.new_context(storage_state='/home/ubuntu/social_bot/social_auth.json')
    page = context.new_page()
    page.goto('https://x.com/PrimeMediaSite', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3000)
    tweets = page.locator('article').all()
    print('Total tweet articles found:', len(tweets))
    for i, t in enumerate(tweets[:3]):
        text = t.locator('div[lang]').first.inner_text().replace('\n', ' ') if t.locator('div[lang]').count() > 0 else 'No text'
        photo_count = t.locator('[data-testid="tweetPhoto"], img[src*="media"]').count()
        print(f"Tweet {i}: Photos={photo_count} | Text={text[:80]}...")
    browser.close()
