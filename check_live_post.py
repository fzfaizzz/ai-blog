import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True, args=['--disable-blink-features=AutomationControlled'])
    context = browser.new_context(
        storage_state='social_auth.json',
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    )
    page = context.new_page()
    page.add_init_script("delete Object.getPrototypeOf(navigator).webdriver;")
    page.goto('https://www.reddit.com/user/r_bluehost/submitted/', timeout=30000)
    page.wait_for_timeout(3000)
    content = page.content()
    print('URL:', page.url)
    print('Is quantum post in submitted?:', 'Quantum Computing' in content)
    print('Has Removed by Reddit in submitted?:', 'Removed by Reddit' in content)
    
    # Print all post links or titles on page
    links = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('a[href*="/comments/"]')).map(a => ({
            text: a.innerText.trim(),
            href: a.href
        })).filter(x => x.text);
    }""")
    print('Submitted links:', links)
    browser.close()
