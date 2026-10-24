import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRAND_NAME,
  BRAND_TITLE,
  CLOSING_LINE,
  CONCISE_DEFINITION,
  MASTER_DEFINITION,
  PUBLIC_ECOSYSTEM,
  SEO_DESCRIPTION,
} from "./positioning";

describe("public brand positioning", () => {
  it("keeps the brand name and primary title", () => {
    assert.equal(BRAND_NAME, "Jimvio");
    assert.equal(
      BRAND_TITLE,
      "Jimvio — The All-in-One Creator Commerce & Digital Business Platform",
    );
  });

  it("uses the master definition and a snippet-length SEO description", () => {
    assert.match(MASTER_DEFINITION, /^Jimvio is an all-in-one global creator-commerce/);
    assert.match(MASTER_DEFINITION, /Create\. Sell\. Connect\. Monetize\. Grow\./);
    assert.match(CONCISE_DEFINITION, /one ecosystem\.$/);
    assert.equal(CLOSING_LINE, "Create. Sell. Connect. Monetize. Grow. All in one place.");
    assert.ok(SEO_DESCRIPTION.length <= 155, `SEO description is ${SEO_DESCRIPTION.length} characters`);
    assert.equal(SEO_DESCRIPTION.includes("…"), false);
  });

  it("links each public category to an existing in-app path", () => {
    assert.ok(PUBLIC_ECOSYSTEM.length >= 12);
    const ids = new Set<string>();
    for (const item of PUBLIC_ECOSYSTEM) {
      assert.equal(ids.has(item.id), false);
      ids.add(item.id);
      assert.match(item.href, /^\//);
      assert.equal(item.href.startsWith("//"), false);
      assert.ok(item.title.length > 0);
      assert.ok(item.description.length > 40);
    }
    for (const id of ["marketplace", "affiliates", "ugc", "communities", "dropshipping", "payments", "ai"]) {
      assert.equal(ids.has(id), true);
    }
  });

  it("does not advertise retired payment providers", () => {
    const copy = `${MASTER_DEFINITION}\n${CONCISE_DEFINITION}\n${PUBLIC_ECOSYSTEM.map((item) => item.description).join("\n")}`.toLowerCase();
    for (const retired of ["paypal", "pesapal", "pawapay", "afripay", "stripe"]) {
      assert.equal(copy.includes(retired), false, retired);
    }
  });
});
