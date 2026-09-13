import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILDER_SECTION_CATALOG,
  DESIGN_PRESETS,
  HERO_PRESETS,
  applyDesignPreset,
  applyHeroPreset,
  contrastWarning,
  createCatalogSection,
  duplicateSection,
  mergeThemeSettings,
  reorderSections,
  suggestSeoDescription,
  themeSettingsToCssVars,
  defaultHomeSections,
} from "./registry.ts";
import { isSafeNavHref, sanitizeNavItems } from "../builder/nav-safe.ts";
import { DraftHistory } from "../builder/history.ts";

describe("theme registry builder helpers", () => {
  it("merges theme settings with safe defaults", () => {
    const merged = mergeThemeSettings(
      { primaryColor: "#111111" },
      { buttonStyle: "outline", productGridColumns: 4, logoSize: "large" }
    );
    assert.equal(merged.primaryColor, "#111111");
    assert.equal(merged.buttonStyle, "outline");
    assert.equal(merged.productGridColumns, 4);
    assert.equal(merged.logoSize, "large");
    assert.equal(merged.backgroundColor, "#F8FAFC");
  });

  it("exposes a rich merchant section catalog", () => {
    const types = BUILDER_SECTION_CATALOG.map((c) => c.type);
    assert.ok(types.includes("hero"));
    assert.ok(types.includes("image_text"));
    assert.ok(types.includes("best_sellers"));
    assert.ok(types.includes("faq"));
    assert.ok(types.includes("sale_rail"));
    assert.ok(types.includes("discount_banner"));
    assert.ok(types.includes("video"));
    assert.ok(BUILDER_SECTION_CATALOG.every((c) => c.group));
  });

  it("creates, duplicates, and reorders catalog sections", () => {
    const a = createCatalogSection("hero", "Demo");
    const b = createCatalogSection("faq", "Demo");
    const copy = duplicateSection(a);
    assert.equal(a.type, "hero");
    assert.equal(b.type, "faq");
    assert.notEqual(copy.id, a.id);
    const ordered = reorderSections([a, b], 0, 1);
    assert.equal(ordered[0]?.type, "faq");
    assert.equal(ordered[1]?.type, "hero");
  });

  it("maps theme settings to CSS variables", () => {
    const vars = themeSettingsToCssVars({
      primaryColor: "#123456",
      backgroundColor: "#fff",
      textColor: "#000",
      fontFamily: "DM Sans",
      radius: "8px",
      buttonColor: "#abcdef",
      buttonTextColor: "#111",
      logoSize: "large",
      shadow: "medium",
    });
    assert.equal(vars["--store-primary"], "#123456");
    assert.equal(vars["--store-btn"], "#abcdef");
    assert.equal(vars["--store-btn-text"], "#111");
    assert.equal(vars["--store-radius"], "8px");
    assert.equal(vars["--store-logo-size"], "48px");
    assert.equal(vars["--store-header-bg"], "#FFFFFF");
    assert.equal(vars["--store-announce-bg"], "#0F172A");
    assert.equal(vars["--store-font-scale"], "1");
    assert.ok(vars["--store-shadow"]);
    const defaults = themeSettingsToCssVars(mergeThemeSettings(null, null));
    assert.equal(defaults["--store-grid-cols"], "4");
    assert.equal(defaults["--store-card-gap"], "0.75rem");
  });

  it("applies design and hero presets without wiping media", () => {
    const themed = applyDesignPreset(mergeThemeSettings(null, null), "luxury");
    assert.equal(themed.primaryColor, DESIGN_PRESETS.luxury.settings.primaryColor);
    const hero = applyHeroPreset(
      { imageUrl: "https://cdn.example/hero.jpg", headline: "Keep me" },
      "split"
    );
    assert.equal(hero.imageUrl, "https://cdn.example/hero.jpg");
    assert.equal(hero.layout, HERO_PRESETS.split.props.layout);
  });

  it("warns on low contrast colors", () => {
    assert.ok(contrastWarning("#FFFFFF", "#EEEEEE"));
    assert.equal(contrastWarning("#000000", "#FFFFFF"), null);
  });

  it("suggests seo description", () => {
    const d = suggestSeoDescription("Acme", "Short");
    assert.ok(d.includes("Acme"));
    assert.ok(d.length <= 155);
  });

  it("does not seed unverifiable trust claims on new stores", () => {
    const home = defaultHomeSections("Acme");
    const trust = home.find((s) => s.id === "trust");
    const hero = home.find((s) => s.type === "hero");
    assert.equal(trust?.enabled, false);
    assert.equal(String(trust?.props?.subhead || ""), "");
    assert.equal(hero?.props?.trustItems, undefined);
    assert.ok(!JSON.stringify(home).includes("24/7"));
    assert.ok(!JSON.stringify(home).includes("10k+"));
    const catalog = JSON.stringify(BUILDER_SECTION_CATALOG);
    const presets = JSON.stringify(HERO_PRESETS);
    assert.ok(!catalog.includes("Secure checkout"));
    assert.ok(!presets.includes("Secure checkout"));
    assert.ok(!presets.includes("ready to ship"));
  });
});

describe("builder nav safety", () => {
  it("rejects unsafe hrefs", () => {
    assert.equal(isSafeNavHref("javascript:alert(1)"), false);
    assert.equal(isSafeNavHref("data:text/html,hi"), false);
    assert.equal(isSafeNavHref("/collections/all"), true);
    assert.equal(isSafeNavHref("https://example.com"), true);
  });

  it("sanitizes nav items", () => {
    const items = sanitizeNavItems([
      { label: "Home", href: "/" },
      { label: "Bad", href: "javascript:void(0)" },
      { label: "", href: "/x" },
      { label: "Shop", href: "/collections/all" },
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.label, "Home");
    assert.equal(items[1]?.label, "Shop");
  });
});

describe("builder draft history", () => {
  it("supports undo and redo", () => {
    const h = new DraftHistory({ n: 1 });
    h.push({ n: 2 });
    h.push({ n: 3 });
    assert.equal(h.current.n, 3);
    assert.equal(h.undo()?.n, 2);
    assert.equal(h.undo()?.n, 1);
    assert.equal(h.redo()?.n, 2);
    assert.equal(h.canUndo, true);
    assert.equal(h.canRedo, true);
  });
});
