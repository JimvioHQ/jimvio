import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("owner course guard", () => {
  it("loads the managed course by course id, not user id", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../app/api/c/owner/courses/[courseId]/guard.ts"),
      "utf8",
    );
    assert.match(src, /loadManagedCourse\(courseId, userId\)/);
    assert.doesNotMatch(src, /loadManagedCourse\(userId, courseId\)/);
  });
});
