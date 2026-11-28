import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jimvioSharedCookieDomain } from "../auth/cookie-domain.ts";
import { resolvePublicOrigin } from "../auth/public-origin.ts";
import { STOREFRONT_NEUTRAL_FAVICON_PATH } from "./storefront-icons.ts";

describe("storefront favicon policy", () => {
  it("neutral path is the independently managed storefront fallback endpoint", () => {
    assert.equal(STOREFRONT_NEUTRAL_FAVICON_PATH, "/api/site-icons/storefront-empty");
  });
});

describe("merchant host auth origin", () => {
  it("keeps customers on merchant subdomain", () => {
    const origin = resolvePublicOrigin(
      new URL("https://p7-provider-store.jimvio.com/login")
    );
    assert.equal(origin, "https://p7-provider-store.jimvio.com");
  });

  it("still uses configured origin for www", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.jimvio.com";
    try {
      const origin = resolvePublicOrigin(new URL("https://www.jimvio.com/login"));
      assert.equal(origin, "https://www.jimvio.com");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});

describe("shared cookie domain", () => {
  it("sets .jimvio.com for merchant and www hosts", () => {
    assert.equal(jimvioSharedCookieDomain("brand.jimvio.com"), ".jimvio.com");
    assert.equal(jimvioSharedCookieDomain("www.jimvio.com"), ".jimvio.com");
    assert.equal(jimvioSharedCookieDomain("localhost:3000"), undefined);
  });
});
