import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("course curriculum integrity", () => {
  it("keeps module, lesson and duration totals synchronized without definer privileges", () => {
    const sql = read("supabase/migrations/20261128120000_course_curriculum_counter_sync.sql");
    assert.match(sql, /CREATE TRIGGER course_modules_sync_totals[\s\S]*?AFTER INSERT OR UPDATE OR DELETE/);
    assert.match(sql, /CREATE TRIGGER course_lessons_sync_totals[\s\S]*?AFTER INSERT OR UPDATE OR DELETE/);
    assert.match(sql, /FOR UPDATE/);
    assert.match(sql, /total_modules = \([\s\S]*?count\(\*\)/);
    assert.match(sql, /total_lessons = \([\s\S]*?count\(\*\)/);
    assert.match(sql, /total_duration = COALESCE/);
    assert.doesNotMatch(sql, /SECURITY DEFINER/i);
  });

  it("protects learner progress, quiz attempts and assignment submissions from deletion", () => {
    const route = read("app/api/c/owner/courses/[courseId]/route.ts");
    assert.match(route, /loadManaged\(user, courseId\)/);
    assert.match(route, /from\("lesson_progress"\)/);
    assert.match(route, /from\("course_quiz_attempts"\)/);
    assert.match(route, /from\("course_assignment_submissions"\)/);
    assert.match(route, /status: 409/);
  });

  it("derives preview counters from the actual curriculum rows", () => {
    const route = read("app/api/c/courses/[courseId]/route.ts");
    assert.match(route, /total_modules: modules\?\.length/);
    assert.match(route, /total_lessons: \(modules \?\? \[\]\)\.reduce/);
    assert.match(route, /total_duration: \(modules \?\? \[\]\)\.reduce/);
  });

  it("shows lesson-specific assignments and course-level assignments once in the learning flow", () => {
    const learn = read("components/community/courses/CourseLearn.tsx");
    assert.match(learn, /const visibleAssignments = \[/);
    assert.match(learn, /assignments\.filter\(\(item\) => item\.lesson_id === lesson\?\.id\)/);
    assert.match(learn, /index === lessons\.length - 1/);
    assert.doesNotMatch(learn, /assignments\.find\(\(item\) => item\.lesson_id === lesson\?\.id\) \?\? assignments\[0\]/);
  });

  it("exposes safe curriculum ordering, lesson settings, quiz editing and assignment grading controls", () => {
    const manager = read("components/community/owner-console/courses/CoursesManagement.tsx");
    assert.match(manager, /shiftModule/);
    assert.match(manager, /shiftLesson/);
    assert.match(manager, /lessonDuration/);
    assert.match(manager, /lessonIsFree/);
    assert.match(manager, /Add question/);
    assert.match(manager, /deleteQuiz/);
    assert.match(manager, /assignmentPassScore/);
    assert.match(manager, /deleteAssignment/);
  });
});
