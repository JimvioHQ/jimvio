import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILDER_SECTION_CATALOG,
  createCatalogSection,
  mergeThemeSettings,
  reorderSections,
  themeSettingsToCssVars,
} from "./registry.ts";

describe("theme registry builder helpers", () => {
  it("merges theme settings with safe defaults", () => {
    const merged = mergeThemeSettings(
      { primaryColor: "#111111" },
      { buttonStyle: "outline", productGridColumns: 4 }
    );
    assert.equal(merged.primaryColor, "#111111");
    assert.equal(merged.buttonStyle, "outline");
    assert.equal(merged.productGridColumns, 4);
    assert.equal(merged.backgroundColor, "#F8FAFC");
  });

  it("exposes a merchant section catalog", () => {
    const types = BUILDER_SECTION_CATALOG.map((c) => c.type);
    assert.ok(types.includes("hero"));
    assert.ok(types.includes("image_text"));
    assert.ok(types.includes("best_sellers"));
    assert.ok(types.includes("faq"));
  });

  it("creates and reorders catalog sections", () => {
    const a = createCatalogSection("hero", "Demo");
    const b = createCatalogSection("faq", "Demo");
    assert.equal(a.type, "hero");
    assert.equal(b.type, "faq");
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
    });
    assert.equal(vars["--store-primary"], "#123456");
    assert.equal(vars["--store-btn"], "#abcdef");
    assert.equal(vars["--store-btn-text"], "#111");
    assert.equal(vars["--store-radius"], "8px");
  });
});
