import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Paid lesson content (body, video_url, attachments) leaves the server only for
 * viewers with valid access. Before this fix, listCourseTree returned the full,
 * unredacted tree to anonymous callers of GET /api/creator/courses/[courseId]
 * and to signed-in users when the course had no room.
 */
describe("course tree never ships paid lesson content without access", () => {
  const src = readFileSync("services/creator-economy/courses.ts", "utf8");
  const fn = src.slice(src.indexOf("export async function listCourseTree"), src.indexOf("export async function saveQuiz"));

  it("returns the unredacted tree only when fullContent is true", () => {
    const returns = [...fn.matchAll(/return ([^;]+);/g)].map((m) => m[1]!.trim());
    const unredacted = returns.filter((r) => r === "tree" || r.startsWith("{\n    ...course"));
    assert.deepEqual(unredacted, ["tree"]);
    assert.ok(fn.includes("if (fullContent) return tree;"));
  });

  it("checks access for signed-in viewers regardless of room and redacts otherwise", () => {
    assert.ok(fn.includes("if (!fullContent && userId) {"));
    assert.ok(!fn.includes("userId && course.room_id"));
    assert.ok(fn.includes("redactCourseTreeForAccess("));
  });
});
