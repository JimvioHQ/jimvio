import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bioLimitForValue,
  isValidHttpUrl,
  joinFullName,
  normalizeUsername,
  publicProfilePath,
  resolveDisplayName,
  splitFullName,
  validateOptionalHttpUrl,
  validateUsername,
} from "./profile";

describe("settings profile helpers", () => {
  it("splits and joins a full name without inventing parts", () => {
    assert.deepEqual(splitFullName("Ada Lovelace"), { firstName: "Ada", lastName: "Lovelace" });
    assert.deepEqual(splitFullName("Prince"), { firstName: "Prince", lastName: "" });
    assert.equal(joinFullName("Ada", "Lovelace"), "Ada Lovelace");
  });

  it("prefers an explicit display name", () => {
    assert.equal(
      resolveDisplayName({ displayName: "Ada L.", firstName: "Ada", lastName: "Lovelace" }),
      "Ada L.",
    );
    assert.equal(
      resolveDisplayName({ displayName: "  ", firstName: "Ada", lastName: "Lovelace" }),
      "Ada Lovelace",
    );
  });

  it("validates usernames used for public profile URLs", () => {
    assert.equal(validateUsername("ada_lovelace"), null);
    assert.equal(normalizeUsername("@Ada_Lovelace"), "ada_lovelace");
    assert.ok(validateUsername("ab"));
    assert.ok(validateUsername("Ada Lovelace"));
    assert.equal(publicProfilePath("ada_lovelace"), "/u/ada_lovelace");
  });

  it("accepts empty or http(s) social URLs only", () => {
    assert.equal(isValidHttpUrl(""), true);
    assert.equal(isValidHttpUrl("https://instagram.com/ada"), true);
    assert.equal(isValidHttpUrl("javascript:alert(1)"), false);
    assert.ok(validateOptionalHttpUrl("not-a-url", "Instagram"));
  });

  it("does not truncate an existing longer bio on load", () => {
    const long = "x".repeat(720);
    assert.equal(bioLimitForValue(long), 720);
    assert.equal(bioLimitForValue("hi"), 500);
  });
});
