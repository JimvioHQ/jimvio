import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CATALOG_REFRESH_UNPUBLISH_REASON, isPermanentUnpublishReason } from "@/lib/cj/import-intelligence/progressive-publish";

/**
 * Nine products taken off sale by the owner-approved 2026–2030 catalog refresh were
 * republished an hour later by the auto-publish queue, because publishProductSystem
 * never looked at the removal reason. Every automated publish path must now refuse.
 */
describe("automation never republishes a permanent removal", () => {
  it("the catalog refresh reason is permanent", () => {
    assert.equal(isPermanentUnpublishReason(CATALOG_REFRESH_UNPUBLISH_REASON), true);
  });

  it("publishProductSystem checks the reason before publishing", () => {
    const src = readFileSync("lib/cj/premium-intelligence/system-publish.ts", "utf8");
    const fn = src.slice(src.indexOf("export async function publishProductSystem"));
    const guard = fn.indexOf("isPermanentUnpublishReason(product.auto_unpublish_reason");
    const firstUpdate = fn.indexOf(".update(");
    assert.ok(guard > 0 && guard < firstUpdate, "guard must run before any update");
  });

  it("the queue closes such jobs instead of retrying them", () => {
    const src = readFileSync("lib/cj/premium-intelligence/auto-publish-queue.ts", "utf8");
    assert.ok(src.includes("pub.permanentlyRemoved"));
  });

  it("restore and qualified-catalog paths keep their own checks", () => {
    assert.ok(readFileSync("lib/cj/premium-intelligence/marketplace-restore.ts", "utf8").includes("isPermanentUnpublishReason(reason)"));
    assert.ok(readFileSync("lib/cj/premium-intelligence/publish-qualified-catalog.ts", "utf8").includes("isPermanentUnpublishReason("));
  });
});
