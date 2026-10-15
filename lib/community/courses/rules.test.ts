import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAutoEnrollFree,
  canOpenCourseTree,
  completionSatisfied,
  coursePurchaseMayGrant,
  safeHttpUrl,
  isCatalogVisible,
  retainsLearningAccess,
  serverPriceCents,
} from "./rules";

describe("course catalog visibility", () => {
  it("hides drafts, archives, and private courses", () => {
    assert.equal(
      isCatalogVisible({
        isPublished: false,
        archived: false,
        accessMode: "public",
        viewerIsMember: true,
      }),
      false
    );
    assert.equal(
      isCatalogVisible({
        isPublished: true,
        archived: true,
        accessMode: "public",
        viewerIsMember: true,
      }),
      false
    );
    assert.equal(
      isCatalogVisible({
        isPublished: true,
        archived: false,
        accessMode: "private",
        viewerIsMember: true,
      }),
      false
    );
  });

  it("shows member courses only to members and public courses to everyone", () => {
    assert.equal(
      isCatalogVisible({
        isPublished: true,
        archived: false,
        accessMode: "members",
        viewerIsMember: false,
      }),
      false
    );
    assert.equal(
      isCatalogVisible({
        isPublished: true,
        archived: false,
        accessMode: "public",
        viewerIsMember: false,
      }),
      true
    );
  });
});

describe("course enrollment rules", () => {
  it("does not auto-enroll paid or private courses from membership", () => {
    assert.equal(
      canAutoEnrollFree({
        isPublished: true,
        archived: false,
        accessMode: "members",
        isFree: false,
        isMember: true,
      }),
      false
    );
    assert.equal(
      canAutoEnrollFree({
        isPublished: true,
        archived: false,
        accessMode: "private",
        isFree: true,
        isMember: true,
      }),
      false
    );
    assert.equal(
      canAutoEnrollFree({
        isPublished: true,
        archived: false,
        accessMode: "members",
        isFree: true,
        isMember: true,
      }),
      true
    );
  });

  it("keeps learning access for an active enrollment after unpublish", () => {
    assert.equal(retainsLearningAccess(true), true);
    assert.equal(retainsLearningAccess(false), false);
  });
});

describe("completion and price", () => {
  it("requires lessons, quizzes, and assignments", () => {
    assert.equal(
      completionSatisfied({
        lessonCount: 2,
        completedLessons: 2,
        quizIds: ["q1"],
        passedQuizIds: [],
        requiredAssignmentIds: [],
        passedAssignmentIds: [],
      }).ok,
      false
    );
    assert.equal(
      completionSatisfied({
        lessonCount: 2,
        completedLessons: 2,
        quizIds: ["q1"],
        passedQuizIds: ["q1"],
        requiredAssignmentIds: ["a1"],
        passedAssignmentIds: ["a1"],
      }).ok,
      true
    );
  });

  it("ignores client-side non-positive prices", () => {
    assert.equal(serverPriceCents(-5), 0);
    assert.equal(serverPriceCents("12.9"), 13);
  });
});

describe("course management and payment gates", () => {
  it("lets managers open drafts that they did not create", () => {
    assert.equal(
      canOpenCourseTree({
        isPublished: false,
        archived: false,
        isCreator: false,
        isManager: true,
      }),
      true
    );
    assert.equal(
      canOpenCourseTree({
        isPublished: false,
        archived: false,
        isCreator: false,
        isManager: false,
      }),
      false
    );
  });

  it("does not grant access from a failed or cancelled payment", () => {
    assert.equal(coursePurchaseMayGrant("pending"), true);
    assert.equal(coursePurchaseMayGrant("failed"), false);
    assert.equal(coursePurchaseMayGrant("cancelled"), false);
    assert.equal(coursePurchaseMayGrant("refunded"), false);
  });

  it("accepts only http and https resource URLs", () => {
    assert.equal(safeHttpUrl("https://cdn.example.com/guide.pdf"), "https://cdn.example.com/guide.pdf");
    assert.equal(safeHttpUrl("javascript:alert(1)"), null);
    assert.equal(safeHttpUrl("/relative/file.pdf"), null);
    assert.equal(safeHttpUrl(""), null);
  });
});
