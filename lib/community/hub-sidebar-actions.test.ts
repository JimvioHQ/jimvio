import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  PRIORITY_POPULAR_USERNAMES,
  PRIORITY_TRENDING_COMMUNITY_SLUGS,
} from "./discovery-priorities.ts";
import { communityIsPubliclyDiscoverable } from "./join-policy.ts";

describe("sidebar Create vs Manage Community", () => {
  const sidebar = readFileSync("components/shell/PrimarySidebar.tsx", "utf8");
  const auth = readFileSync("lib/feed/load-feed-auth.ts", "utf8");

  it("shows exactly one action: Manage when manageable, otherwise Create", () => {
    assert.match(sidebar, /\{manage \? \(/);
    assert.match(sidebar, /Manage Community/);
    assert.match(sidebar, /Create Community/);
    // Create sits in the else-branch of the same ternary — never both.
    const manageIdx = sidebar.indexOf("{manage ? (");
    const createIdx = sidebar.indexOf("Create Community", manageIdx);
    const branchIdx = sidebar.indexOf(") : !communitiesLoading || isGuest ? (");
    assert.ok(manageIdx > 0 && branchIdx > manageIdx && createIdx > branchIdx);
  });

  it("manage target is decided server-side with the owner-console capability check", () => {
    assert.match(auth, /listManageableCommunities\(/);
    assert.match(auth, /canEnterOwnerConsole\(c\.role\)/);
    // Inactive communities cannot be managed from the hub sidebar.
    assert.match(auth, /activeIds\.has\(c\.id\)/);
  });

  it("the manage route itself still enforces access server-side", () => {
    const layout = readFileSync("app/communities/(manage)/[slug]/manage/layout.tsx", "utf8");
    assert.match(layout, /canEnterOwnerConsole\(selected\.role\)/);
    assert.match(layout, /redirect\("\/communities\/create"\)/);
  });
});

describe("Trending & Popular Users eligibility", () => {
  it("PrimeFx Invest and QuantForg are priority trending communities", () => {
    assert.ok(PRIORITY_TRENDING_COMMUNITY_SLUGS.includes("primefx-invest"));
    assert.ok(PRIORITY_TRENDING_COMMUNITY_SLUGS.includes("quantforg"));
  });

  it("their creator profiles are priority popular users", () => {
    assert.ok(PRIORITY_POPULAR_USERNAMES.includes("primefxinvest"));
    assert.ok(PRIORITY_POPULAR_USERNAMES.includes("quantforg"));
  });

  it("priority never bypasses discoverability (hidden / invite-only / private stay out)", () => {
    const src = readFileSync("lib/feed/load-hub-discover.ts", "utf8");
    const priorityBlock = src.slice(src.indexOf("const missing ="), src.indexOf("const activity ="));
    assert.match(priorityBlock, /filter\(communityIsPubliclyDiscoverable\)/);
    for (const mode of ["hidden", "invite_only", "private"]) {
      assert.equal(
        communityIsPubliclyDiscoverable({ is_active: true, visibility_mode: mode }),
        false,
        mode,
      );
    }
    assert.equal(
      communityIsPubliclyDiscoverable({ is_active: false, visibility_mode: "public" }),
      false,
    );
  });

  it("uses real membership / post rows — no invented stats", () => {
    const src = readFileSync("lib/feed/load-hub-discover.ts", "utf8");
    assert.match(src, /from\("community_memberships"\)[\s\S]{0,120}\.eq\("status", "active"\)/);
    assert.match(src, /from\("community_posts"\)[\s\S]{0,160}\.eq\("is_published", true\)/);
    assert.doesNotMatch(src, /Math\.random/);
  });

  it("the viewer is hidden from their own Popular Users list on the client", () => {
    const hook = readFileSync("components/feed/use-feed-hub-discover.ts", "utf8");
    assert.match(hook, /\.filter\(\(u\) => u\.userId !== viewerId\)/);
  });
});
