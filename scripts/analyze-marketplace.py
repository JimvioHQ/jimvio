from playwright.sync_api import sync_playwright

def get_computed_style(page, selector, properties):
    """Get computed styles for a selector"""
    return page.evaluate(
        """(args) => {
            const [sel, props] = args;
            const el = document.querySelector(sel);
            if (!el) return {error: 'not found: ' + sel};
            const cs = getComputedStyle(el);
            const result = {};
            props.forEach(p => result[p] = cs.getPropertyValue(p));
            return result;
        }""",
        [selector, properties],
    )

def find_cards(page):
    """Find product card elements"""
    return page.evaluate(
        """() => {
            const candidates = document.querySelectorAll('article, [class*="product-card"], [class*="group relative"]');
            const cards = [];
            candidates.forEach((el, i) => {
                if (i > 20) return;
                const rect = el.getBoundingClientRect();
                cards.push({
                    tag: el.tagName,
                    class: el.className.toString().slice(0, 100),
                    w: Math.round(rect.width),
                    h: Math.round(rect.height),
                });
            });
            return cards;
        }"""
    )

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    # Capture console errors
    errors = []
    page.on("console", lambda msg: errors.append(f"{msg.type}: {msg.text}") if msg.type in ["error", "warning"] else None)
    page.on("pageerror", lambda err: errors.append(f"pageerror: {err}"))
    
    page.goto("http://localhost:3000/marketplace", timeout=60000, wait_until="domcontentloaded")
    page.wait_for_timeout(5000)
    
    print("=" * 60)
    print("CONSOLE ERRORS/WARNINGS:")
    print("=" * 60)
    if errors:
        for e in errors[:20]:
            print(f"  {e}")
    else:
        print("  None")
    
    print("\n" + "=" * 60)
    print("PRODUCT CARDS DETECTED:")
    print("=" * 60)
    cards = find_cards(page)
    if cards:
        for i, c in enumerate(cards):
            print(f"  [{i}] {c['tag']} {c['w']}x{c['h']} | {c['class']}")
    else:
        print("  No cards found")
    
    print("\n" + "=" * 60)
    print("COMPUTED STYLES (Light Mode):")
    print("=" * 60)
    
    # Hero section
    hero_selectors = [
        "header", "nav", "[class*='hero']", "[class*='banner']",
        "h1", "h2", "[class*='title']", "[class*='heading']",
    ]
    for sel in hero_selectors:
        style = get_computed_style(page, sel, ["background-color", "color", "font-size", "font-weight", "border-radius"])
        if "error" not in style:
            print(f"  {sel}:")
            print(f"    bg={style['background-color']} color={style['color']} size={style['font-size']} weight={style['font-weight']} radius={style['border-radius']}")
    
    # Card-specific analysis
    print("\n" + "=" * 60)
    print("THEME TOKEN VERIFICATION (Light Mode):")
    print("=" * 60)
    
    # Check body background
    body_bg = get_computed_style(page, "body", ["background-color", "color"])
    print(f"  body: bg={body_bg['background-color']} color={body_bg['color']}")
    
    # Check first card
    if cards:
        first_card_sel = f"{cards[0]['tag'].lower()}" if cards[0]['tag'].lower() != 'div' else "[class*='group relative']"
        card_style = get_computed_style(page, first_card_sel, ["background-color", "border-color", "border-radius", "box-shadow"])
        if "error" not in card_style:
            print(f"  card ({first_card_sel}): bg={card_style['background-color']} border={card_style['border-color']} radius={card_style['border-radius']}")
    
    # Dark mode analysis
    print("\n" + "=" * 60)
    print("DARK MODE ANALYSIS:")
    print("=" * 60)
    page.evaluate("document.documentElement.classList.add('dark')")
    page.wait_for_timeout(1000)
    
    body_bg_dark = get_computed_style(page, "body", ["background-color", "color"])
    print(f"  body (dark): bg={body_bg_dark['background-color']} color={body_bg_dark['color']}")
    
    if cards:
        card_style_dark = get_computed_style(page, first_card_sel, ["background-color", "border-color"])
        if "error" not in card_style_dark:
            print(f"  card (dark): bg={card_style_dark['background-color']} border={card_style_dark['border-color']}")
    
    # Check for hardcoded colors still present
    print("\n" + "=" * 60)
    print("HARDCODED COLOR SCAN (inline styles):")
    print("=" * 60)
    hardcoded = page.evaluate(
        """() => {
            const els = document.querySelectorAll('*');
            const found = new Set();
            els.forEach(el => {
                const style = el.getAttribute('style');
                if (style) {
                    if (/#([0-9a-f]{3,6})/i.test(style) || /rgb\(/.test(style)) {
                        found.add(style.slice(0, 80));
                    }
                }
            });
            return Array.from(found).slice(0, 30);
        }"""
    )
    if hardcoded:
        for h in hardcoded:
            print(f"  {h}")
    else:
        print("  None found")
    
    browser.close()
    print("\nAnalysis complete!")
