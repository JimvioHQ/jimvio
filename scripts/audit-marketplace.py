from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.add_init_script("""try { localStorage.setItem('theme', 'light'); } catch(e) {}""")
    page.goto("http://localhost:3000/marketplace", timeout=60000, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    
    print("=" * 70)
    print("MARKETPLACE UI/UX AUDIT - LIGHT MODE")
    print("=" * 70)
    
    # Get all section headers
    headers = page.evaluate("""() => {
        const els = document.querySelectorAll('h1, h2, h3');
        return Array.from(els).map(e => ({
            text: e.textContent.trim().slice(0, 50),
            size: getComputedStyle(e).fontSize,
            weight: getComputedStyle(e).fontWeight,
            color: getComputedStyle(e).color
        })).slice(0, 25);
    }""")
    
    print("\nSECTION HEADERS:")
    for i, h in enumerate(headers):
        print(f"  [{i}] ({h['size']} wt{h['weight']}) {h['text']}")
    
    # Get all buttons
    buttons = page.evaluate("""() => {
        const els = document.querySelectorAll('button, a[role="button"], [class*="rounded"]');
        const seen = new Set();
        const result = [];
        els.forEach(e => {
            const txt = e.textContent.trim().slice(0, 30);
            const cls = e.className.toString();
            if (cls.includes('rounded') || e.tagName === 'BUTTON') {
                const key = txt + cls.slice(0, 30);
                if (seen.has(key)) return;
                seen.add(key);
                result.push({
                    tag: e.tagName,
                    text: txt || '(icon)',
                    radius: getComputedStyle(e).borderRadius,
                    bg: getComputedStyle(e).backgroundColor,
                });
            }
        });
        return result.slice(0, 30);
    }""")
    
    print("\nBUTTONS / ROUNDED ELEMENTS (radius consistency):")
    radii = {}
    for b in buttons:
        radii[b['radius']] = radii.get(b['radius'], 0) + 1
    print(f"  Radius distribution: {radii}")
    for i, b in enumerate(buttons[:15]):
        print(f"  [{i}] {b['tag']:7} r={b['radius']:6} '{b['text']}'")
    
    # Check spacing consistency
    print("\n" + "=" * 70)
    print("CONSISTENCY CHECKS:")
    print("=" * 70)
    
    # Count different card types
    card_analysis = page.evaluate("""() => {
        const cards = document.querySelectorAll('[class*="product-tap-nav"], [class*="group relative"]');
        const types = {};
        cards.forEach(c => {
            const cls = c.className.toString();
            let type = 'other';
            if (cls.includes('rounded-xl')) type = 'rounded-xl (modern)';
            else if (cls.includes('rounded-lg')) type = 'rounded-lg (old)';
            else if (cls.includes('rounded-2xl')) type = 'rounded-2xl (section)';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }""")
    print(f"  Card style types: {card_analysis}")
    
    # Check image aspect ratios
    aspect = page.evaluate("""() => {
        const imgs = document.querySelectorAll('[class*="aspect-"]');
        const ratios = {};
        imgs.forEach(i => {
            const cls = i.className.toString();
            const m = cls.match(/aspect-(\\w+)/);
            if (m) ratios[m[1]] = (ratios[m[1]] || 0) + 1;
        });
        return ratios;
    }""")
    print(f"  Image aspect ratios: {aspect}")
    
    browser.close()
    print("\nAudit complete!")
