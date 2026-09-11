import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleFromJimvioSubdomain,
  isPlatformHostname,
  shouldAttemptStoreHostRewrite,
} from "./host.ts";

describe("commerce host routing", () => {
  it("extracts store handle from jimvio subdomain", () => {
    assert.equal(handleFromJimvioSubdomain("brand.jimvio.com"), "brand");
    assert.equal(handleFromJimvioSubdomain("my-shop.jimvio.com"), "my-shop");
    assert.equal(handleFromJimvioSubdomain("www.jimvio.com"), null);
    assert.equal(handleFromJimvioSubdomain("api.jimvio.com"), null);
  });

  it("recognizes platform hosts", () => {
    assert.equal(isPlatformHostname("www.jimvio.com"), true);
    assert.equal(isPlatformHostname("jimvio.com"), true);
    assert.equal(isPlatformHostname("brand.jimvio.com"), false);
  });

  it("does not rewrite platform paths on custom hosts", () => {
    assert.equal(shouldAttemptStoreHostRewrite("brand.com", "/api/health"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.com", "/admin"), false);
    assert.equal(shouldAttemptStoreHostRewrite("brand.jimvio.com", "/"), true);
  });
});
