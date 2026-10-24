import assert from "node:assert/strict";
import test from "node:test";
import { communityErrorDetail, publicErrorMessage } from "./public-error";

test("database errors are logged in detail and sanitized for clients", () => {
  const error = { message: "column community_tasks.status does not exist", code: "42703" };
  assert.equal(
    communityErrorDetail(error),
    "column community_tasks.status does not exist",
  );
  assert.equal(publicErrorMessage(error, "Could not load missions"), "Could not load missions");
});

test("application errors stay readable", () => {
  assert.equal(
    publicErrorMessage(new Error("Not authorized to manage events"), "Could not load events"),
    "Not authorized to manage events",
  );
});

test("publicErrorMessage falls back when nothing is readable", () => {
  assert.equal(publicErrorMessage(null, "Could not load missions"), "Could not load missions");
  assert.equal(publicErrorMessage({ code: "42703" }, "Could not load missions"), "Could not load missions");
});
