from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/snap/bin/chromium',
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    context = browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0')
    page = context.new_page()
    page.goto('https://www.reddit.com/user/PrimeMediaNews/', wait_until='domcontentloaded', timeout=30000)
    print('Incognito Page Title:', page.title())
    content = page.content()
    is_shadowbanned = 'nobody on Reddit goes by that name' in content or 'page not found' in content.lower()
    print('Is Account Shadowbanned by Reddit?:', is_shadowbanned)
    page.screenshot(path='/home/ubuntu/social_bot/shadowban_check.png')
    browser.close()
