import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ugcBrandStorageKey,
  ugcDraftStorageKey,
  ugcStepStorageKey,
} from "./tenant-storage.ts";

describe("ugc tenant storage keys", () => {
  it("scopes draft keys by user and brand", () => {
    const a = ugcDraftStorageKey("user-a", "brand-1");
    const b = ugcDraftStorageKey("user-b", "brand-1");
    const c = ugcDraftStorageKey("user-a", "brand-2");
    assert.notEqual(a, b);
    assert.notEqual(a, c);
    assert.match(a, /user-a:brand-1/);
  });

  it("scopes brand selection by user only", () => {
    assert.notEqual(ugcBrandStorageKey("user-a"), ugcBrandStorageKey("user-b"));
  });

  it("scopes wizard step by user and brand", () => {
    assert.notEqual(
      ugcStepStorageKey("user-a", "brand-1"),
      ugcStepStorageKey("user-b", "brand-1"),
    );
  });
});
