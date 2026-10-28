import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DESIGN_PRESETS } from "./registry.ts";
import {
  PROVIDER_STORE_TEMPLATE_ID,
  applyStoreTemplate,
  buildProviderStoreDraft,
  homeSectionsForTemplate,
  listStoreTemplates,
  storeThemeIsCustomized,
  templateReplacesSections,
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

  it("replaces the homepage with that template and keeps the rest of the store", () => {
    const current = buildProviderStoreDraft("Alpha");
    current.settings.logoUrl = "https://cdn.example/alpha.png";
    current.settings.faviconUrl = "https://cdn.example/alpha.ico";
    current.sections.home.push({
      id: "faq-1",
      type: "faq",
      enabled: true,
      props: { title: "Questions" },
    });
    current.sections.product = [
      { id: "product_detail", type: "product_detail", enabled: true },
    ];
    current.sections.cart = [{ id: "cart", type: "cart", enabled: true }];
    const next = applyStoreTemplate({
      storeName: "Alpha",
      templateId: "fashion",
      current,
    });
    assert.ok(next);
    assert.equal(next?.settings.logoUrl, "https://cdn.example/alpha.png");
    assert.equal(next?.settings.faviconUrl, "https://cdn.example/alpha.ico");
    assert.equal(next?.templateId, "fashion");
    assert.equal(next?.sections.home.some((section) => section.type === "faq"), false);
    assert.equal(next?.sections.product?.[0]?.type, "product_detail");
    assert.equal(next?.sections.cart?.[0]?.type, "cart");
    const hero = next?.sections.home.find((section) => section.type === "hero");
    assert.equal(hero?.props?.headline, "Alpha");
    assert.equal(hero?.props?.subhead, "Shop Alpha");
    assert.equal(hero?.props?.layout, "split");
    assert.equal(JSON.stringify(next).toLowerCase().includes("p7 provider"), false);
    assert.equal(storeThemeIsCustomized(next, "Alpha"), false);
  });

  it("gives every template a different homepage stack", () => {
    const cards = listStoreTemplates();
    const sequence = (id: string) =>
      homeSectionsForTemplate(id, "Alpha")
        .map((section) => `${section.type}:${String(section.props?.layout || "")}`)
        .join("|");
    const sequences = cards.map((card) => {
      assert.equal(card.layoutLabel.length > 0, true);
      assert.equal(card.composition.length > 0, true);
      return sequence(card.id);
    });
    assert.equal(new Set(sequences).size, sequences.length);
    assert.notEqual(sequence("fashion"), sequence("electronics"));
    assert.notEqual(sequence("beauty"), sequence("premium"));
    const electronics = applyStoreTemplate({
      storeName: "Alpha",
      templateId: "electronics",
      current: null,
    });
    assert.ok(electronics?.sections.home.some((section) => section.type === "best_sellers"));
    assert.equal(
      electronics?.sections.home.some((section) => section.type === "new_arrivals"),
      false,
    );
    const homes = cards.map((card) => JSON.stringify(homeSectionsForTemplate(card.id, "Alpha"))).join("\n");
    assert.equal(/testimonial|discount|% off|delivery|review/i.test(homes), false);
    for (const id of ["fashion", "electronics", "provider", "editorial"]) {
      assert.equal(templateReplacesSections(id), true);
    }
    assert.equal(templateReplacesSections("not-a-template"), false);
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
