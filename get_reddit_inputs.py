from playwright.sync_api import sync_playwright
import time

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

    elements = page.evaluate('''() => {
        const res = [];
        document.querySelectorAll('div[contenteditable], [role="textbox"], textarea, p[data-placeholder]').forEach(el => {
            res.push({
                tag: el.tagName,
                role: el.getAttribute('role'),
                contenteditable: el.getAttribute('contenteditable'),
                placeholder: el.getAttribute('data-placeholder') || el.getAttribute('placeholder'),
                text: el.innerText ? el.innerText.substring(0, 30) : ''
            });
        });
        return res;
    }''')
    print('Found input elements:', elements)
    browser.close()
