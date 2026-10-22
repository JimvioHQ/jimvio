import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  quizPayloadForViewer,
  stripQuizAnswerKey,
  unauthorizedQuizAccessDenied,
} from "./quiz-privacy";

describe("quiz answer-key privacy", () => {
  it("strips correctAnswer before student payloads", () => {
    const stripped = stripQuizAnswerKey([
      { prompt: "Capital of Kenya?", choices: ["Nairobi", "Mombasa"], correctAnswer: 0, answer: 0 },
    ]);
    assert.equal(stripped[0].prompt, "Capital of Kenya?");
    assert.deepEqual(stripped[0].choices, ["Nairobi", "Mombasa"]);
    assert.equal("correctAnswer" in stripped[0], false);
    assert.equal("answer" in stripped[0], false);
  });

  it("keeps the answer key only for staff", () => {
    const quiz = { id: "q1", questions: [{ prompt: "A", correctAnswer: 1 }] };
    assert.equal("correctAnswer" in (quizPayloadForViewer(quiz, true).questions as object[])[0], true);
    assert.equal("correctAnswer" in (quizPayloadForViewer(quiz, false).questions as object[])[0], false);
  });

  it("denies cross-course and unenrolled student access", () => {
    assert.equal(unauthorizedQuizAccessDenied({ isStaff: false, enrolled: false, sameCourse: true }), true);
    assert.equal(unauthorizedQuizAccessDenied({ isStaff: false, enrolled: true, sameCourse: false }), true);
    assert.equal(unauthorizedQuizAccessDenied({ isStaff: false, enrolled: true, sameCourse: true }), false);
    assert.equal(unauthorizedQuizAccessDenied({ isStaff: true, enrolled: false, sameCourse: false }), false);
  });
});

describe("quiz RLS migration", () => {
  it("restricts student SELECT of course_quizzes and attempt inserts", () => {
    const sql = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../database/migrations/167_course_privacy_wallet_seller_rls.sql"),
      "utf8"
    );
    assert.match(sql, /DROP POLICY IF EXISTS course_quizzes_select/);
    assert.match(sql, /REVOKE ALL ON TABLE public.course_quizzes FROM anon/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_quiz_attempts FROM authenticated/);
    assert.doesNotMatch(sql, /c\.is_published = true/);
  });
});
