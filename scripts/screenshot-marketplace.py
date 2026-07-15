from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # Desktop viewport
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:3000/marketplace", timeout=60000, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)
    
    # Full page screenshot
    page.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-desktop-full.png", full_page=True)
    
    # Above-the-fold
    page.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-desktop-hero.png")
    
    # Scroll to product cards
    page.evaluate("window.scrollTo(0, 600)")
    page.wait_for_timeout(500)
    page.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-desktop-cards.png")
    
    # Scroll to more products
    page.evaluate("window.scrollTo(0, 1200)")
    page.wait_for_timeout(500)
    page.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-desktop-products.png")
    
    # Hover over a product card
    cards = page.locator("article, [class*='product-card'], [class*='group relative']").all()
    if len(cards) > 0:
        cards[0].hover()
        page.wait_for_timeout(300)
        page.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-desktop-card-hover.png")
    
    # Mobile viewport
    mobile = browser.new_page(viewport={"width": 375, "height": 812})
    mobile.goto("http://localhost:3000/marketplace", timeout=60000, wait_until="domcontentloaded")
    mobile.wait_for_timeout(5000)
    
    mobile.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-mobile-full.png", full_page=True)
    mobile.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-mobile-hero.png")
    
    # Scroll mobile to cards
    mobile.evaluate("window.scrollTo(0, 500)")
    mobile.wait_for_timeout(500)
    mobile.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-mobile-cards.png")
    
    # Dark mode
    dark = browser.new_page(viewport={"width": 1440, "height": 900})
    dark.goto("http://localhost:3000/marketplace", timeout=60000, wait_until="domcontentloaded")
    dark.wait_for_timeout(4000)
    dark.evaluate("document.documentElement.classList.add('dark')")
    dark.wait_for_timeout(500)
    dark.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-dark-hero.png")
    dark.evaluate("window.scrollTo(0, 600)")
    dark.wait_for_timeout(500)
    dark.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-dark-cards.png")
    dark.evaluate("window.scrollTo(0, 1200)")
    dark.wait_for_timeout(500)
    dark.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-dark-products.png")
    
    # Full dark page
    dark.screenshot(path="C:/Users/Isaac/Documents/webdev/jimvio/screenshots/marketplace-dark-full.png", full_page=True)
    
    browser.close()
    print("Screenshots captured successfully!")
