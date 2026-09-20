import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

describe("storefront commerce hardening guards", () => {
  it("does not attach unscoped orders onto merchant checkout", () => {
    const src = readFileSync(
      join(root, "app/(public)/s/[handle]/checkout/page.tsx"),
      "utf8",
    );
    assert.equal(/jimvio_store_id:\s*store\.id/.test(src), false);
    assert.match(src, /orderStoreId !== store\.id/);
  });

  it("webhook logger treats any existing key as duplicate", () => {
    const src = readFileSync(join(root, "lib/payments/webhook-logger.ts"), "utf8");
    assert.match(src, /isDuplicate:\s*true/);
    assert.equal(/isDuplicate:\s*existing\.status === "processed"/.test(src), false);
  });

  it("new stores disable incomplete guest checkout", () => {
    const src = readFileSync(join(root, "lib/commerce-os/stores.ts"), "utf8");
    assert.match(src, /guestCheckout:\s*false/);
  });

  it("scopes /products→marketplace redirects to platform hosts only", () => {
    const src = readFileSync(join(root, "next.config.ts"), "utf8");
    assert.match(src, /source:\s*"\/products"/);
    assert.match(src, /value:\s*"www\.jimvio\.com"/);
    // Must not leave an unscoped permanent /products → /marketplace redirect.
    assert.equal(
      /\{\s*source:\s*"\/products",\s*destination:\s*"\/marketplace"/s.test(src),
      false,
    );
  });
});
