from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    # Set dark mode via localStorage BEFORE page loads (next-themes reads this)
    page.add_init_script("""
        try {
            localStorage.setItem('theme', 'dark');
        } catch(e) {}
    """)
    
    page.goto("http://localhost:3000/marketplace", timeout=60000, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    
    # Check if html has 'dark' class
    has_dark = page.evaluate("document.documentElement.classList.contains('dark')")
    body_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    html_class = page.evaluate("document.documentElement.className")
    
    print(f"html class: '{html_class}'")
    print(f"has 'dark': {has_dark}")
    print(f"body bg: {body_bg}")
    
    # Check a product card's computed border in dark mode
    card_border = page.evaluate("""(() => {
        const cards = document.querySelectorAll('[class*="product-tap-nav"]');
        if (cards.length > 0) {
            return getComputedStyle(cards[0]).borderColor;
        }
        return 'no cards';
    })()""")
    print(f"first card border (dark): {card_border}")
    
    # Check FlashDeals section specifically
    flash_card_bg = page.evaluate("""(() => {
        const cards = document.querySelectorAll('a[class*="product-tap-nav"]');
        for (const c of cards) {
            const bg = getComputedStyle(c).backgroundColor;
            if (bg !== 'rgba(0, 0, 0, 0)') return bg;
        }
        return 'all transparent';
    })()""")
    print(f"flash card bg (dark): {flash_card_bg}")
    
    page.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/verify-dark.png", full_page=False)
    
    browser.close()
    print("Done!")
