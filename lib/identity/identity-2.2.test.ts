import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emphasizePhrase,
  mergeShortBioIntoPrivacyCustom,
  resolveShortBioLines,
  sanitizeShortBioLines,
} from "@/lib/identity/short-bio";

describe("identity 2.2 short professional bio", () => {
  it("sanitizes and caps three short bio lines", () => {
    const lines = sanitizeShortBioLines([
      "  First sentence.  ",
      "Second sentence.",
      "Third sentence.",
      "Fourth ignored.",
      123,
      "",
    ]);
    assert.deepEqual(lines, ["First sentence.", "Second sentence.", "Third sentence."]);
  });

  it("prefers saved short bio lines over full biography", () => {
    const resolved = resolveShortBioLines({
      shortBioLines: [
        "Professional investing built around clear planning.",
        "Portfolio management for informed decisions.",
        "Technology-led insights for confidence.",
      ],
      bio: "This long bio should not win. Another sentence. And another one.",
    });
    assert.equal(resolved.length, 3);
    assert.match(resolved[0]!, /Professional investing/);
  });

  it("derives up to three clean sentences from bio without inventing content", () => {
    const resolved = resolveShortBioLines({
      shortBioLines: [],
      bio: "🌍 PrimeFx Invest | Professional Investment Platform. Structured Investment Plans & Portfolio Management. AI-Powered Investment Insights. Extra noise.",
    });
    assert.ok(resolved.length >= 1 && resolved.length <= 3);
    assert.ok(resolved.every((line) => !/🌍|📊|🤖/.test(line)));
  });

  it("returns empty when no usable short bio or bio exists", () => {
    assert.deepEqual(resolveShortBioLines({ shortBioLines: [], bio: "" }), []);
  });

  it("emphasizes a meaningful phrase in the first sentence", () => {
    const result = emphasizePhrase(
      "Professional investing built around clear, structured investment planning.",
    );
    assert.match(result.emphasis, /structured investment planning/i);
    assert.ok(result.before.length > 0 || result.after.length > 0);
  });

  it("merges short bio into privacy_custom without wiping other flags", () => {
    const merged = mergeShortBioIntoPrivacyCustom(
      { showResume: true, showContact: false },
      ["One.", "Two.", "Three."],
    );
    assert.equal(merged.showResume, true);
    assert.equal(merged.showContact, false);
    assert.deepEqual(merged.shortBioLines, ["One.", "Two.", "Three."]);
  });

  it("clears short bio lines when emptied", () => {
    const merged = mergeShortBioIntoPrivacyCustom(
      { shortBioLines: ["Old."], showMediaKit: true },
      ["", "  "],
    );
    assert.equal("shortBioLines" in merged, false);
    assert.equal(merged.showMediaKit, true);
  });
});
