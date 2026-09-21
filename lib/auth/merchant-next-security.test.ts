import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeInternalPath } from "./safe-path.ts";
import { isPlatformDestinationPath } from "./post-login-redirect.ts";

describe("merchant next parameter security", () => {
  it("allows relative merchant paths", () => {
    for (const path of [
      "/cart",
      "/checkout",
      "/account",
      "/account/orders",
      "/product/widget",
      "/collections/all",
    ]) {
      assert.equal(isSafeInternalPath(path), true);
      assert.equal(isPlatformDestinationPath(path), false);
    }
  });

  it("rejects open redirects and protocol tricks", () => {
    for (const path of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "data:text/html,hi",
    ]) {
      assert.equal(isSafeInternalPath(path), false);
    }
  });

  it("treats platform destinations as forbidden merchant landings", () => {
    for (const path of [
      "/communities",
      "/marketplace",
      "/commerce/orders",
      "/dashboard",
    ]) {
      assert.equal(isPlatformDestinationPath(path), true);
    }
    assert.equal(isSafeInternalPath("https://www.jimvio.com/communities"), false);
  });
});
