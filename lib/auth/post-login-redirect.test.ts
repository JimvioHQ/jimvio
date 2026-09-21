import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_POST_LOGIN_PATH,
  MERCHANT_POST_LOGIN_PATH,
  isPlatformDestinationPath,
  resolvePostLoginPath,
} from "./post-login-redirect.ts";

describe("isPlatformDestinationPath", () => {
  it("flags Jimvio platform destinations", () => {
    assert.equal(isPlatformDestinationPath("/communities"), true);
    assert.equal(isPlatformDestinationPath("/communities/abc"), true);
    assert.equal(isPlatformDestinationPath("/marketplace"), true);
    assert.equal(isPlatformDestinationPath("/commerce/orders"), true);
    assert.equal(isPlatformDestinationPath("/welcome"), true);
  });

  it("allows merchant storefront paths", () => {
    assert.equal(isPlatformDestinationPath("/"), false);
    assert.equal(isPlatformDestinationPath("/cart"), false);
    assert.equal(isPlatformDestinationPath("/checkout"), false);
    assert.equal(isPlatformDestinationPath("/account"), false);
    assert.equal(isPlatformDestinationPath("/account/orders"), false);
    assert.equal(isPlatformDestinationPath("/product/widget"), false);
  });
});

describe("resolvePostLoginPath merchant storefront", () => {
  it("defaults to merchant home when next is missing", async () => {
    const path = await resolvePostLoginPath("user-merchant-1", null, {
      merchantStorefront: true,
    });
    assert.equal(path, MERCHANT_POST_LOGIN_PATH);
  });

  it("honors safe merchant next destinations", async () => {
    assert.equal(
      await resolvePostLoginPath("user-merchant-2", "/cart", {
        merchantStorefront: true,
      }),
      "/cart",
    );
    assert.equal(
      await resolvePostLoginPath("user-merchant-3", "/checkout", {
        merchantStorefront: true,
      }),
      "/checkout",
    );
    assert.equal(
      await resolvePostLoginPath("user-merchant-4", "/account/orders", {
        merchantStorefront: true,
      }),
      "/account/orders",
    );
  });

  it("never lands merchant sessions on /communities", async () => {
    const path = await resolvePostLoginPath("user-merchant-5", "/communities", {
      merchantStorefront: true,
    });
    assert.equal(path, MERCHANT_POST_LOGIN_PATH);
    assert.notEqual(path, DEFAULT_POST_LOGIN_PATH);
  });

  it("rejects other platform next values on merchant hosts", async () => {
    for (const next of [
      "/marketplace",
      "/affiliates",
      "/ugc",
      "/commerce",
      "/dashboard",
      "/welcome",
    ]) {
      const path = await resolvePostLoginPath("user-merchant-6", next, {
        merchantStorefront: true,
      });
      assert.equal(path, MERCHANT_POST_LOGIN_PATH, `next=${next}`);
    }
  });
});
