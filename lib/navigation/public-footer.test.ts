import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FOOTER_COLUMNS, getFooterUtilityLinks } from "./public-footer";

describe("public footer links", () => {
  it("gives every column exactly five links and leaves the remaining Company links unchanged", () => {
    assert.deepEqual(
      FOOTER_COLUMNS.map((column) => column.title),
      ["Marketplace", "Earn & Grow", "Resources", "Company"],
    );
    for (const column of FOOTER_COLUMNS) {
      assert.equal(column.links.length, 5, column.title);
      assert.equal(new Set(column.links.map((link) => link.href)).size, 5, column.title);
    }

    assert.deepEqual(
      FOOTER_COLUMNS.map((column) => [column.title, column.links.map((link) => [link.label, link.href])]),
      [
        ["Marketplace", [
          ["Browse Products", "/marketplace"],
          ["Top Suppliers", "/vendors"],
          ["New Arrivals", "/marketplace/collections/new-arrivals"],
          ["Digital Products", "/marketplace/digital"],
          ["Buyer Protection", "/protection"],
        ]],
        ["Earn & Grow", [
          ["Affiliate Program", "/affiliates"],
          ["Creator Monetization", "/monetization"],
          ["Brand Campaigns", "/ugc/brand-deals"],
          ["UGC & Clipping", "/ugc"],
          ["Earnings & Payouts", "/wallet"],
        ]],
        ["Resources", [
          ["Help Center", "/help"],
          ["Trade Guides", "/guides"],
          ["Creator Guides", "/help/topics/creators"],
          ["API Docs", "/docs"],
          ["Platform Updates", "/updates"],
        ]],
        ["Company", [
          ["About Us", "/about"],
          ["Careers", "/careers"],
          ["Press & Media", "/media"],
          ["Legal Center", "/legal"],
          ["Contact", "/contact"],
        ]],
      ],
    );
  });

  it("places Cookies immediately after About Us in the utility bar", () => {
    const links = getFooterUtilityLinks("https://status.jimvio.com");
    assert.deepEqual(
      links.map((link) => link.label),
      ["Status", "Legal", "Privacy", "Terms", "About Us", "Cookies"],
    );
    assert.equal(links.find((link) => link.label === "Cookies")?.href, "/cookies");
    assert.equal(links.find((link) => link.label === "Status")?.external, true);
  });

  it("does not render the operational badge or heading icons", () => {
    const source = readFileSync(
      join(process.cwd(), "components/layout/footer.tsx"),
      "utf8",
    );
    assert.equal(/all systems operational/i.test(source), false);
    assert.equal(source.includes("ChevronRight"), false);
    assert.equal(source.includes("FOOTER_COLUMNS"), true);
  });
});
