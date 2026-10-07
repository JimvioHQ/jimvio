import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReservedStoreHandle } from "./tenant.ts";

describe("isReservedStoreHandle", () => {
  it("blocks platform and commerce reserved handles", () => {
    for (const h of [
      "www",
      "api",
      "commerce",
      "marketplace",
      "communities",
      "affiliates",
      "login",
      "register",
      "checkout",
      "account",
      "products",
      "orders",
      "jimvio",
    ]) {
      assert.equal(isReservedStoreHandle(h), true, h);
      assert.equal(isReservedStoreHandle(h.toUpperCase()), true, h);
    }
  });

  it("allows normal merchant handles", () => {
    assert.equal(isReservedStoreHandle("p7-provider-store"), false);
    assert.equal(isReservedStoreHandle("acme-shop"), false);
  });
});
