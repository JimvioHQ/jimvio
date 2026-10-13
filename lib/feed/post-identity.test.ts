import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FEED_EDITORIAL_POSTS, feedEditorialKey } from "../community/feed-editorial/collection.ts";
import {
  assertCommunityPublish,
  canPublishAsCommunity,
  isUsableAvatarUrl,
  planEditorialPublishAs,
  readPublishAs,
  resolveFeedPublisher,
  withPublishAs,
} from "./post-identity.ts";

describe("post as authorization", () => {
  it("lets a member publish as their own profile", () => {
    const result = assertCommunityPublish({
      publishAs: "profile",
      role: "member",
      actorId: "user-1",
    });
    assert.equal(result.ok, true);
  });

  it("lets an owner publish as the community", () => {
    assert.equal(canPublishAsCommunity("owner"), true);
    const result = assertCommunityPublish({
      publishAs: "community",
      role: "admin",
      actorId: "user-1",
    });
    assert.equal(result.ok, true);
  });

  it("rejects a member publishing as a community", () => {
    const result = assertCommunityPublish({
      publishAs: "community",
      role: "member",
      actorId: "user-1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 403);
  });

  it("rejects impersonating another user", () => {
    const result = assertCommunityPublish({
      publishAs: "profile",
      role: "owner",
      actorId: "user-1",
      requestedAuthorId: "user-2",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "You can only publish as yourself");
  });

  it("keeps an existing user-authored post on the profile", () => {
    const publisher = resolveFeedPublisher({
      attachments: { jimvio: { origin: "editorial", key: "feed-editorial:v1:fe-001" } },
      profile: { name: "Eric M.", username: "eric_m", avatar: "https://cdn.example/a.jpg" },
      community: { name: "Startups Kigali", slug: "startups-kigali", avatar: null },
    });
    assert.equal(publisher.kind, "profile");
    assert.equal(publisher.name, "Eric M.");
    assert.equal(publisher.href, "/u/eric_m");
  });
});

describe("community identity", () => {
  it("shows the community name, avatar, and canonical route", () => {
    const attachments = withPublishAs(
      { jimvio: { origin: "editorial", key: "feed-editorial:v1:fe-001" }, hashtags: ["leadership"] },
      "community",
    );
    assert.equal(readPublishAs(attachments), "community");
    assert.equal((attachments.jimvio as { key: string }).key, "feed-editorial:v1:fe-001");
    const publisher = resolveFeedPublisher({
      attachments,
      profile: { name: "Eric M.", username: "eric_m", avatar: null },
      community: {
        name: "Startups Kigali",
        slug: "startups-kigali",
        avatar: "https://cdn.example/c.jpg",
      },
    });
    assert.equal(publisher.kind, "community");
    assert.equal(publisher.name, "Startups Kigali");
    assert.equal(publisher.href, "/communities/startups-kigali");
    assert.equal(publisher.avatar, "https://cdn.example/c.jpg");
  });

  it("does not invent a community link when the slug is missing", () => {
    const publisher = resolveFeedPublisher({
      attachments: withPublishAs({}, "community"),
      profile: { name: "Eric M.", username: "eric_m", avatar: null },
      community: { name: "Startups Kigali", slug: null, avatar: null },
    });
    assert.equal(publisher.kind, "profile");
    assert.equal(publisher.href, "/u/eric_m");
  });
});

describe("editorial attribution plan", () => {
  it("keeps 78 unique posts and splits them about evenly without new ids", () => {
    const keys = FEED_EDITORIAL_POSTS.map((post) => feedEditorialKey(post.id));
    const plan = planEditorialPublishAs(keys);
    assert.equal(plan.length, 78);
    assert.equal(new Set(plan.map((row) => row.key)).size, 78);
    const community = plan.filter((row) => row.publishAs === "community").length;
    const profile = plan.filter((row) => row.publishAs === "profile").length;
    assert.equal(community, 39);
    assert.equal(profile, 39);
  });
});

describe("avatar urls", () => {
  it("accepts a valid image url and rejects empty or invalid values", () => {
    assert.equal(isUsableAvatarUrl("https://cdn.example/a.jpg"), true);
    assert.equal(isUsableAvatarUrl(""), false);
    assert.equal(isUsableAvatarUrl(null), false);
    assert.equal(isUsableAvatarUrl("not a url"), false);
  });
});
