import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveProfileFollowerCount,
  SHOWCASE_PROFILE_FOLLOWER_COUNTS,
} from "../community/follower-count.ts";
import {
  resolveCommunityMemberCount,
  SHOWCASE_COMMUNITY_MEMBER_COUNTS,
} from "../community/member-count.ts";
import {
  PRIORITY_POPULAR_USERNAMES,
  PRIORITY_TRENDING_COMMUNITY_SLUGS,
} from "../community/discovery-priorities.ts";
import { POPULAR_USER_COUNT } from "./load-feed-sidebar.ts";
import { isTikTokOfficialLivePublishingAvailable } from "../live/destinations/tiktok-live-gate.ts";

const root = join(process.cwd());

describe("Communities real-data honesty", () => {
  it("keeps showcase floors empty and pins only real priority handles", () => {
    assert.equal(Object.keys(SHOWCASE_PROFILE_FOLLOWER_COUNTS).length, 0);
    assert.equal(Object.keys(SHOWCASE_COMMUNITY_MEMBER_COUNTS).length, 0);
    assert.deepEqual([...PRIORITY_POPULAR_USERNAMES], ["barick", "p7provider"]);
    assert.deepEqual([...PRIORITY_TRENDING_COMMUNITY_SLUGS], ["p7provider"]);
  });

  it("does not inflate follower or member counts", () => {
    assert.equal(
      resolveProfileFollowerCount({ username: "p7provider", follower_count: 2 }),
      2
    );
    assert.equal(
      resolveCommunityMemberCount({
        slug: "p7provider",
        member_count: 3,
        settings: { display_member_count: 900 },
      }),
      3
    );
  });

  it("caps Popular Users at five without requiring exactly five", () => {
    assert.equal(POPULAR_USER_COUNT, 5);
  });

  it("feed mock-data exports only FEED_TABS (no fake posts/stories)", () => {
    const src = readFileSync(join(root, "lib/feed/mock-data.ts"), "utf8");
    assert.match(src, /FEED_TABS/);
    assert.equal(/export const STORIES/.test(src), false);
    assert.equal(/export const FEED_POSTS/.test(src), false);
    assert.equal(/picsum\.photos/.test(src), false);
  });

  it("hub FeedPostCard does not render fake creator levels", () => {
    const src = readFileSync(join(root, "components/feed/FeedPostCard.tsx"), "utf8");
    assert.equal(/Lv\.\s*\{?post\.author\.level/.test(src), false);
    assert.equal(/level:\s*1/.test(src), false);
  });

  it("keeps TikTok LIVE publishing hard-gated", () => {
    assert.equal(isTikTokOfficialLivePublishingAvailable(), false);
  });
});
