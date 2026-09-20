import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMemberCountLabel,
  resolveCommunityMemberCount,
  resolveSpaceMemberCount,
  spaceInheritsCommunityMembership,
} from "./member-count";

describe("resolveCommunityMemberCount", () => {
  it("uses authoritative member_count only (no showcase or settings floors)", () => {
    assert.equal(
      resolveCommunityMemberCount({
        slug: "p7provider",
        member_count: 3,
        settings: { display_member_count: 900 },
      }),
      3
    );
    assert.equal(
      resolveCommunityMemberCount({ slug: "quantforg", member_count: 12 }),
      12
    );
    assert.equal(
      resolveCommunityMemberCount({ slug: "indie-hub", member_count: 41 }),
      41
    );
  });
});

describe("resolveSpaceMemberCount", () => {
  it("lets free spaces inherit the community display count", () => {
    assert.equal(
      resolveSpaceMemberCount(
        { access_type: "free", member_count: 1 },
        42
      ),
      42
    );
    assert.equal(
      resolveSpaceMemberCount(
        { accessType: "inherit", member_count: 1 },
        42
      ),
      42
    );
  });

  it("does not copy community count onto paid or private spaces", () => {
    assert.equal(
      resolveSpaceMemberCount(
        { access_type: "paid", member_count: 18 },
        842
      ),
      18
    );
    assert.equal(
      resolveSpaceMemberCount(
        { access_type: "private", member_count: 4 },
        842
      ),
      4
    );
  });

  it("uses the space column when the community count is zero", () => {
    assert.equal(
      resolveSpaceMemberCount({ access_type: "free", member_count: 7 }, 0),
      7
    );
  });
});

describe("spaceInheritsCommunityMembership", () => {
  it("treats empty and public access as inherited", () => {
    assert.equal(spaceInheritsCommunityMembership(null), true);
    assert.equal(spaceInheritsCommunityMembership("public"), true);
    assert.equal(spaceInheritsCommunityMembership("premium"), false);
  });
});

describe("formatMemberCountLabel", () => {
  it("uses singular grammar for one member", () => {
    assert.equal(formatMemberCountLabel(1), "1 member");
    assert.equal(formatMemberCountLabel(0), "0 members");
    assert.equal(formatMemberCountLabel(842), "842 members");
  });
});
