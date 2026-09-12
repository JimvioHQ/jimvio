import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupSectionsByZone,
  insertIndexForNewTemplateSection,
  zoneForSectionType,
} from "./section-zones";
import type { ThemeSection } from "../themes/registry";

describe("section zones", () => {
  it("maps types to Horizon-style zones", () => {
    assert.equal(zoneForSectionType("announcement"), "header");
    assert.equal(zoneForSectionType("header"), "header");
    assert.equal(zoneForSectionType("hero"), "template");
    assert.equal(zoneForSectionType("footer"), "footer");
  });

  it("groups sections preserving indices", () => {
    const sections: ThemeSection[] = [
      { id: "a", type: "announcement", enabled: true },
      { id: "h", type: "header", enabled: true },
      { id: "hero", type: "hero", enabled: true },
      { id: "f", type: "footer", enabled: true },
    ];
    const g = groupSectionsByZone(sections);
    assert.equal(g.header.length, 2);
    assert.equal(g.template.length, 1);
    assert.equal(g.footer.length, 1);
    assert.equal(g.template[0].index, 2);
  });

  it("inserts new template sections before footer", () => {
    const sections: ThemeSection[] = [
      { id: "h", type: "header", enabled: true },
      { id: "hero", type: "hero", enabled: true },
      { id: "f", type: "footer", enabled: true },
    ];
    assert.equal(insertIndexForNewTemplateSection(sections), 2);
  });
});
