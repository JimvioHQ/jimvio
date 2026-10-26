import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FOOTER_COLUMNS, getFooterUtilityLinks } from "./public-footer";

describe("public footer links", () => {
  it("gives every column exactly six links and leaves Company unchanged", () => {
    assert.deepEqual(
      FOOTER_COLUMNS.map((column) => column.title),
      ["Marketplace", "Earn & Grow", "Resources", "Company"],
    );
    for (const column of FOOTER_COLUMNS) {
      assert.equal(column.links.length, 6, column.title);
      assert.equal(new Set(column.links.map((link) => link.href)).size, 6, column.title);
    }

    const company = FOOTER_COLUMNS.find((column) => column.title === "Company");
    assert.deepEqual(
      company?.links.map((link) => [link.label, link.href]),
      [
        ["About Us", "/about"],
        ["Careers", "/careers"],
        ["Press", "/press"],
        ["Trust & Safety", "/community-guidelines"],
        ["Legal Center", "/legal"],
        ["Contact", "/contact"],
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
