import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSettingsLanguage,
  isValidTimeZone,
  toUgcLocale,
} from "./preferences";

describe("settings preferences", () => {
  it("accepts only languages Jimvio currently translates", () => {
    assert.equal(isSettingsLanguage("en"), true);
    assert.equal(isSettingsLanguage("fr"), true);
    assert.equal(isSettingsLanguage("rw"), true);
    assert.equal(isSettingsLanguage("sw"), false);
  });

  it("maps supported settings languages onto UGC locales", () => {
    assert.equal(toUgcLocale("fr"), "fr");
    assert.equal(toUgcLocale("rw"), "rw");
    assert.equal(toUgcLocale("en"), "en");
  });

  it("rejects invalid timezones", () => {
    assert.equal(isValidTimeZone("Africa/Kigali"), true);
    assert.equal(isValidTimeZone("Not/AZone"), false);
  });
});
