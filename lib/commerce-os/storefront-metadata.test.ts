import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStorefrontMetadata } from "./storefront-metadata.ts";

const store = {
  name: "P7 PROVIDER STORE",
  handle: "p7-provider-store",
  description: "Shop the latest",
  logo_url: "https://cdn.example.com/logo.png",
  favicon_url: null as string | null,
  seo: {} as Record<string, unknown>,
};

describe("storefront metadata", () => {
  it("builds store-owned SEO without Jimvio platform defaults", () => {
    const meta = buildStorefrontMetadata(store);
    assert.deepEqual(meta.title, { absolute: "P7 PROVIDER STORE" });
    assert.equal(meta.description, "Shop the latest");
    assert.equal(meta.applicationName, "P7 PROVIDER STORE");
    assert.equal(meta.alternates?.canonical, "https://p7-provider-store.jimvio.com");
    assert.equal(meta.openGraph?.url, "https://p7-provider-store.jimvio.com");
    assert.equal(meta.openGraph?.siteName, "P7 PROVIDER STORE");
    assert.equal(meta.openGraph?.title, "P7 PROVIDER STORE");
    assert.equal(meta.twitter?.title, "P7 PROVIDER STORE");
    assert.equal(meta.twitter?.description, "Shop the latest");
    assert.equal(meta.twitter?.site, "P7 PROVIDER STORE");
    assert.equal(meta.twitter?.creator, "P7 PROVIDER STORE");
    assert.equal(
      (meta.other as Record<string, string>)?.["twitter:url"],
      "https://p7-provider-store.jimvio.com"
    );
    assert.ok(Array.isArray(meta.keywords));
    assert.ok(!(meta.keywords as string[]).some((k) => /jimvio marketplace/i.test(k)));
    assert.ok(!(meta.keywords as string[]).includes("UGC campaigns"));
    assert.equal(meta.creator, "P7 PROVIDER STORE");
    assert.equal(meta.appleWebApp?.title, "P7 PROVIDER STORE");
  });

  it("supports product path overrides and remains tenant-scoped", () => {
    const meta = buildStorefrontMetadata(store, {
      path: "/product/hat",
      title: "Winter Hat | P7 PROVIDER STORE",
      description: "A warm hat",
      image: "https://cdn.example.com/hat.jpg",
    });
    assert.deepEqual(meta.title, {
      absolute: "Winter Hat | P7 PROVIDER STORE",
    });
    assert.equal(
      meta.alternates?.canonical,
      "https://p7-provider-store.jimvio.com/product/hat"
    );
    assert.equal(
      meta.openGraph?.url,
      "https://p7-provider-store.jimvio.com/product/hat"
    );
    assert.equal(meta.twitter?.title, "Winter Hat | P7 PROVIDER STORE");
  });

  it("falls back to the merchant logo for favicon when no dedicated icon exists", () => {
    const withLogo = buildStorefrontMetadata(store);
    assert.equal(
      (withLogo.icons as { shortcut?: string })?.shortcut,
      store.logo_url
    );
    const withFavicon = buildStorefrontMetadata({
      ...store,
      favicon_url: "https://cdn.example.com/favicon.png",
    });
    assert.equal(
      (withFavicon.icons as { shortcut?: string })?.shortcut,
      "https://cdn.example.com/favicon.png"
    );
  });
});
