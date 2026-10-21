import sys, time
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
    page.goto('https://www.reddit.com/r/test/submit/', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3000)

    # Let's inspect form state before typing
    form_status = page.evaluate("""() => {
        const form = document.querySelector('r-post-composer-form');
        const errors = Array.from(document.querySelectorAll('r-form-validation-message, [aria-invalid="true"], [faceplate-validity="invalid"]')).map(el => ({
            tag: el.tagName,
            name: el.getAttribute('name'),
            id: el.id,
            validity: el.getAttribute('faceplate-validity'),
            text: el.innerText ? el.innerText.trim() : ''
        }));
        const flairs = document.querySelector('r-post-flairs-modal')?.getAttribute('flairs-required');
        return {
            errors: errors,
            flairsRequired: flairs,
            formAction: form?.getAttribute('action')
        };
    }""")
    print('Form Status before typing:', form_status)

    browser.close()
