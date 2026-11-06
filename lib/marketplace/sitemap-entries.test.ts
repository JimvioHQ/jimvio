import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("sitemap lists only final URLs", () => {
  const src = readFileSync("app/sitemap.ts", "utf8");
  it("does not list /marketplace, which redirects permanently", () => {
    assert.ok(!/path:\s*"\/marketplace"\s*,/.test(src));
    assert.ok(/path:\s*"\/marketplace\/physical"/.test(src));
  });
  it("lists products by their current slug with the live-only filters", () => {
    assert.ok(src.includes('.eq("status", "active")') && src.includes('.eq("is_active", true)') && src.includes('.is("deleted_at", null)'));
  });
});
