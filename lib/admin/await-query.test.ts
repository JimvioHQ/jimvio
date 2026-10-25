import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { awaitQueryResult } from "./await-query.ts";

describe("awaitQueryResult", () => {
  it("reads a thenable that has no catch method", async () => {
    const builder = {
      then(onFulfilled: (value: { data: string[]; error: null }) => unknown) {
        return Promise.resolve(onFulfilled({ data: ["ok"], error: null }));
      },
    };
    assert.equal("catch" in builder, false);
    const result = await awaitQueryResult(builder);
    assert.deepEqual(result.data, ["ok"]);
    assert.equal(result.error, null);
  });

  it("returns unavailable when the thenable rejects", async () => {
    const builder = {
      then(_onFulfilled: unknown, onRejected?: (reason: unknown) => unknown) {
        onRejected?.(new Error("down"));
      },
    };
    const result = await awaitQueryResult(builder);
    assert.equal(result.data, null);
    assert.equal(result.error?.message, "unavailable");
  });

  it("does not chain catch onto the admin ticket query builder", () => {
    const source = readFileSync(new URL("../../services/admin/getAdminUsers.ts", import.meta.url), "utf8");
    assert.match(source, /awaitQueryResult/);
    assert.doesNotMatch(source, /limit\(5\)\s*\.catch/);
  });
});
