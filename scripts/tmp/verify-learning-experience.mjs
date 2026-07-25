/**
 * Production learning experience — Courses, Resources, Knowledge.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const courseRoom = mustExist("components/community/rooms/CourseRoom.tsx");
const resourcesRoom = mustExist("components/community/rooms/ResourcesRoom.tsx");
const resourceLib = mustExist("components/community/os/ResourceLibrary.tsx");
const knowledgePanel = mustExist(
  "components/community/workspace/channel/panels/KnowledgePanel.tsx"
);
const courseSection = mustExist(
  "components/community/workspace/sections/course-section.tsx"
);
const coursesApi = mustExist("app/api/courses/[roomId]/route.ts");
const progressApi = mustExist(
  "app/api/courses/lessons/[lessonId]/progress/route.ts"
);
const manageApi = mustExist("app/api/courses/[roomId]/management/route.ts");
const hubData = mustExist("services/community/hub-data.ts");
const roomContent = mustExist(
  "components/community/workspace/room-content.tsx"
);

assert.match(courseRoom, /Mark Complete|markComplete/);
assert.match(courseRoom, /progressReady|Resume|first incomplete|!progress\[l\.id\]/);
assert.match(courseRoom, /isLessonLocked/);
assert.match(courseRoom, /toast\.(error|success)/);
assert.match(courseRoom, /Open Discussion|Discussion/);
assert.match(courseRoom, /Resources/);
assert.match(courseRoom, /Back to Space|Back to Group/);
assert.match(courseRoom, /Lock/);

assert.match(resourcesRoom, /Upload your first resource|ChannelEmptyState/);
assert.match(resourcesRoom, /Search resources/);
assert.match(resourcesRoom, /isTrustedChatMediaUrl|safeHref/);
assert.match(resourcesRoom, /toast\.error/);
assert.match(resourcesRoom, /loading=\"lazy\"|loading='lazy'/);

assert.match(resourceLib, /Search library|search library/i);
assert.match(resourceLib, /extractFileItems/);
assert.match(knowledgePanel, /Create your first knowledge article|No knowledge yet/);
assert.match(knowledgePanel, /searchKnowledge/);
assert.match(knowledgePanel, /pinnedCollections|Pinned/);

assert.match(courseSection, /Continue learning|Start course/);
assert.match(coursesApi, /canAccessRoom/);
assert.match(progressApi, /lesson_progress/);
assert.match(progressApi, /canAccessRoom/);
assert.match(manageApi, /assertCourseStaff|owner_id/);
assert.match(manageApi, /moderator/);

assert.match(hubData, /rooms\(slug\)/);
assert.match(hubData, /\/spaces\/|\/channels\//);
assert.doesNotMatch(
  hubData,
  /href: community \? `\/communities\/\$\{community\.slug\}\/courses`/
);

assert.match(roomContent, /CourseRoom/);
assert.match(roomContent, /ResourcesRoom/);

console.log("verify-learning-experience: ok");
