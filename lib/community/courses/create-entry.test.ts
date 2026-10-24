import assert from "node:assert/strict";
import test from "node:test";
import { courseCreationHref } from "./create-entry";

test("course creation is hidden without knowledge.manage", () => {
  assert.equal(courseCreationHref([]), null);
  assert.equal(courseCreationHref([{ slug: "afrobeats-circle", role: "member" }]), null);
});

test("course creation opens the community course studio for one manager", () => {
  assert.equal(
    courseCreationHref([{ slug: "afrobeats-circle", role: "owner" }]),
    "/communities/afrobeats-circle/manage/courses"
  );
  assert.equal(
    courseCreationHref([{ slug: "studio", role: "moderator" }]),
    "/communities/studio/manage/courses"
  );
});

test("several manageable communities use the existing manager list", () => {
  assert.equal(
    courseCreationHref([
      { slug: "one", role: "admin" },
      { slug: "two", role: "owner" },
    ]),
    "/owner/communities"
  );
});
