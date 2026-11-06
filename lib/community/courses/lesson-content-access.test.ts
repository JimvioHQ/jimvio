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

describe("redaction of a paid course tree", () => {
  it("hides paid lesson text, video and files without access, keeps free previews, keeps all with access", async () => {
    const { redactCourseTreeForAccess } = await import("@/lib/community/courses/access");
    const tree = {
      id: "c1",
      course_modules: [
        {
          id: "m1",
          course_lessons: [
            { id: "l1", title: "Paid lesson", is_free: false, body: "SECRET", video_url: "https://x.test/secret.mp4", attachments: { files: [{ url: "https://x.test/s.pdf" }] } },
            { id: "l2", title: "Free preview", is_free: true, body: "free text", video_url: "https://x.test/free.mp4", attachments: {} },
          ],
        },
      ],
    };
    const locked = redactCourseTreeForAccess(tree, false) as typeof tree;
    const [paid, free] = locked.course_modules[0]!.course_lessons as Array<Record<string, unknown>>;
    assert.equal(paid!.body, null);
    assert.equal(paid!.video_url, null);
    assert.deepEqual((paid!.attachments as { files: unknown[] }).files, []);
    assert.equal(paid!.locked, true);
    assert.equal(paid!.title, "Paid lesson");
    assert.equal(free!.body, "free text");
    assert.equal(free!.video_url, "https://x.test/free.mp4");
    assert.ok(!JSON.stringify(locked).includes("SECRET") && !JSON.stringify(locked).includes("secret.mp4") && !JSON.stringify(locked).includes("s.pdf"));
    const open = redactCourseTreeForAccess(tree, true) as typeof tree;
    assert.equal((open.course_modules[0]!.course_lessons[0] as Record<string, unknown>).body, "SECRET");
  });
});
