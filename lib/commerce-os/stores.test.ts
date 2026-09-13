import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildInitialStoreThemeDraft } from "./stores.ts";
import { storefrontDisplayUrl } from "./storefront-url.ts";

describe("create store theme seed", () => {
  it("seeds draft and published-ready homepage sections", () => {
    const draft = buildInitialStoreThemeDraft("Acme Shop", { primaryColor: "#111" });
    assert.equal(draft.settings.primaryColor, "#111");
    assert.ok(Array.isArray(draft.sections.home));
    assert.ok(draft.sections.home.some((s) => s.type === "hero" && s.enabled));
    assert.ok(
      draft.sections.home.some((s) => s.type === "featured_products" && s.enabled)
    );
    assert.ok(draft.sections.home.some((s) => s.type === "header" && s.enabled));
    assert.ok(draft.sections.home.some((s) => s.type === "footer" && s.enabled));
    const hero = draft.sections.home.find((s) => s.type === "hero");
    assert.equal(
      (hero?.props as { headline?: string } | undefined)?.headline,
      "Acme Shop"
    );
  });

  it("pairs with canonical subdomain public URL helper", () => {
    assert.equal(storefrontDisplayUrl("acme-shop"), "https://acme-shop.jimvio.com");
  });
});
