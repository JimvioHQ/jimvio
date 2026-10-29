import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SITE_MESSAGES, siteT } from "./site-messages.ts";
import { normalizeSiteLocale } from "./site-locale.ts";
import { FOOTER_COLUMNS, getFooterUtilityLinks } from "../navigation/public-footer.ts";

describe("site languages (N-6)", () => {
  it("has rw, fr and sw for every entry", () => {
    for (const [en, row] of Object.entries(SITE_MESSAGES)) {
      for (const l of ["rw", "fr", "sw"] as const) assert.ok(row[l]?.trim(), `${en} → ${l}`);
    }
  });

  it("translates every footer title and link", () => {
    const texts = [
      ...FOOTER_COLUMNS.flatMap((c) => [c.title, ...c.links.map((l) => l.label)]),
      ...getFooterUtilityLinks().map((l) => l.label),
    ];
    for (const text of texts) assert.ok(SITE_MESSAGES[text], `missing translation: ${text}`);
  });

  it("falls back to English and reads the cookie value safely", () => {
    assert.equal(siteT("rw", "Something new"), "Something new");
    assert.equal(siteT("rw", "Communities"), "Imiryango");
    assert.equal(normalizeSiteLocale("sw-KE"), "sw");
    assert.equal(normalizeSiteLocale("kinyarwanda"), "rw");
    assert.equal(normalizeSiteLocale(undefined), "en");
  });
});
