import assert from "node:assert/strict";
import test from "node:test";
import { interpretSpacesResponse } from "./hub-spaces-response";

test("a failed Spaces response stays an error", () => {
  const result = interpretSpacesResponse(500, { error: "Could not load Spaces" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "Could not load Spaces");
});

test("an empty successful Spaces response is not an error", () => {
  const result = interpretSpacesResponse(200, { spaces: [], nextOffset: null, total: 0 });
  assert.deepEqual(result, { ok: true, spaces: [], nextOffset: null, total: 0 });
});

test("Spaces cards use the returned rows and stop when there is no next page", () => {
  const result = interpretSpacesResponse(200, {
    spaces: [{ id: "space-1" }],
    nextOffset: null,
    total: 1,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.spaces.length, 1);
    assert.equal(result.nextOffset, null);
  }
});
