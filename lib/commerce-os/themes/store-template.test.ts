import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DESIGN_PRESETS } from "./registry.ts";
import {
  PROVIDER_STORE_TEMPLATE_ID,
  applyStoreTemplate,
  buildProviderStoreDraft,
  listStoreTemplates,
  storeThemeIsCustomized,
} from "./store-template.ts";

describe("provider store template", () => {
  it("seeds a new store with its own name and the provider layout", () => {
    const draft = buildProviderStoreDraft("Northwind Goods");
    const serialized = JSON.stringify(draft);
    assert.equal(draft.templateId, PROVIDER_STORE_TEMPLATE_ID);
    assert.equal(serialized.toLowerCase().includes("p7 provider"), false);
    const hero = draft.sections.home.find((section) => section.type === "hero");
    assert.equal(hero?.props?.headline, "Northwind Goods");
    assert.equal(hero?.props?.subhead, "Shop Northwind Goods");
    assert.ok(draft.sections.home.some((section) => section.type === "announcement"));
    assert.ok(draft.sections.home.some((section) => section.type === "featured_products"));
    assert.ok(draft.sections.home.some((section) => section.type === "footer"));
    assert.equal(draft.settings.logoUrl ?? null, null);
    assert.equal(draft.settings.productGridColumns, 5);
  });

  it("does not treat the provider layout as shared merchant data", () => {
    const first = buildProviderStoreDraft("Alpha");
    const second = buildProviderStoreDraft("Beta");
    assert.notEqual(
      first.sections.home.find((section) => section.type === "hero")?.props?.headline,
      second.sections.home.find((section) => section.type === "hero")?.props?.headline,
    );
  });

  it("lists the provider template plus the real design presets", () => {
    const cards = listStoreTemplates();
    assert.equal(cards[0]?.id, PROVIDER_STORE_TEMPLATE_ID);
    for (const id of Object.keys(DESIGN_PRESETS)) {
      assert.ok(cards.some((card) => card.id === id));
    }
  });

  it("keeps logo and existing sections when applying a color preset", () => {
    const current = buildProviderStoreDraft("Alpha");
    current.settings.logoUrl = "https://cdn.example/alpha.png";
    current.sections.home.push({
      id: "faq-1",
      type: "faq",
      enabled: true,
      props: { title: "Questions" },
    });
    const next = applyStoreTemplate({
      storeName: "Alpha",
      templateId: "fashion",
      current,
    });
    assert.ok(next);
    assert.equal(next?.settings.logoUrl, "https://cdn.example/alpha.png");
    assert.equal(next?.templateId, "fashion");
    assert.ok(next?.sections.home.some((section) => section.type === "faq"));
    assert.equal(JSON.stringify(next).toLowerCase().includes("p7 provider"), false);
  });

  it("leaves an untouched provider draft unmarked as customized", () => {
    const draft = buildProviderStoreDraft("Alpha");
    assert.equal(storeThemeIsCustomized(draft, "Alpha"), false);
    draft.settings.primaryColor = "#123456";
    assert.equal(storeThemeIsCustomized(draft, "Alpha"), true);
  });

  it("refuses an unknown template id", () => {
    assert.equal(
      applyStoreTemplate({
        storeName: "Alpha",
        templateId: "not-a-template",
        current: null,
      }),
      null,
    );
  });
});
