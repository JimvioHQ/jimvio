import test from "node:test";
import assert from "node:assert/strict";
import { isPublishConfirmationValid } from "./mcp";

const id = "5d4fba84-2cb1-4e5b-9b7d-2a2b3c4d5e6f";

test("publication requires the exact article-specific confirmation", () => {
  assert.equal(isPublishConfirmationValid(id, `PUBLISH ${id}`), true);
});

test("publication rejects missing confirmation", () => {
  assert.equal(isPublishConfirmationValid(id, ""), false);
});

test("publication rejects a generic confirmation", () => {
  assert.equal(isPublishConfirmationValid(id, "PUBLISH"), false);
});

test("publication rejects confirmation for another article", () => {
  assert.equal(isPublishConfirmationValid(id, "PUBLISH 00000000-0000-4000-8000-000000000000"), false);
});
