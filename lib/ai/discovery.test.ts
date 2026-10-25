import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  discoveryPreface,
  mapCampaignPayload,
  mapCommunityPayload,
  mapPostPayload,
  mapProductPayload,
  planDiscovery,
  resolveDiscoveryCards,
} from "./discovery.ts";

describe("chat discovery plans", () => {
  it("requests view-ranked products for trending and Kinyarwanda catalog asks", () => {
    const english = planDiscovery("Show me trending products.");
    assert.equal(english.length, 1);
    assert.equal(english[0]?.kind, "products");
    assert.match(english[0]?.path ?? "", /\/api\/products\?/);
    assert.match(english[0]?.path ?? "", /sort=trending/);
    assert.equal(english[0]?.path.includes("q="), false);
    assert.match(english[0]?.label ?? "", /view count/);

    const kinyarwanda = planDiscovery("Ndashaka ibicuruzwa bigezweho");
    assert.equal(kinyarwanda[0]?.kind, "products");
    assert.equal(kinyarwanda[0]?.path.includes("q="), false);
  });

  it("searches a category without turning a how-to into a catalog", () => {
    const shoes = planDiscovery("Find popular products in shoes");
    assert.match(shoes[0]?.path ?? "", /q=shoes/);
    assert.deepEqual(planDiscovery("How do I publish a product?"), []);
    assert.deepEqual(planDiscovery("How do I reset my password?"), []);
    assert.deepEqual(planDiscovery("Show me the API key"), []);
  });

  it("uses public community post counts and the public post feed separately", () => {
    const trending = planDiscovery("What is trending in the community?");
    assert.equal(trending.length, 1);
    assert.equal(trending[0]?.kind, "communities");
    assert.match(trending[0]?.path ?? "", /\/api\/communities\?/);
    assert.match(trending[0]?.path ?? "", /sort=trending/);
    assert.match(trending[0]?.label ?? "", /post count/);
    assert.equal(trending.some((item) => item.path.includes("/api/posts")), false);

    const posts = planDiscovery("Find posts about phones");
    assert.equal(posts.length, 1);
    assert.equal(posts[0]?.kind, "posts");
    assert.match(posts[0]?.path ?? "", /\/api\/posts\/feed\?/);
    assert.match(posts[0]?.path ?? "", /tag=phones/);
    assert.equal(posts[0]?.path.includes("/api/posts?"), false);
    assert.match(posts[0]?.label ?? "", /Private rooms are not included/);

    const trendingPosts = planDiscovery("Show me trending posts");
    assert.match(trendingPosts[0]?.path ?? "", /filter=trending/);
    assert.equal(planDiscovery("Find posts about cool shoes").some((item) => item.kind === "posts"), false);
    assert.match(discoveryPreface("Find posts about cool shoes") ?? "", /cannot search every room/);
    assert.match(discoveryPreface("Find posts about phones") ?? "", /#phones/);
  });

  it("requests active campaigns by stored submission count", () => {
    const campaigns = planDiscovery("Show me popular campaigns");
    assert.equal(campaigns[0]?.kind, "campaigns");
    assert.match(campaigns[0]?.path ?? "", /\/api\/ugc\/campaigns\?/);
    assert.match(campaigns[0]?.path ?? "", /sort=popular/);
    assert.equal(campaigns[0]?.path.includes("mine="), false);
  });
});

describe("chat discovery mapping", () => {
  it("keeps public catalog fields and drops private community data", () => {
    const products = mapProductPayload({
      data: [{
        id: "p1",
        name: "Phone case",
        slug: "phone-case",
        price: 12,
        currency: "USD",
        images: ["https://cdn.example/case.jpg", "javascript:alert(1)"],
        view_count: 8,
        affiliate_enabled: false,
        affiliate_commission_rate: 40,
        vendor_email: "seller@example.com",
      }],
    }, "Active products ordered by stored view count.");
    assert.equal(products.length, 1);
    assert.equal(products[0]?.price, "$12.00");
    assert.equal(products[0]?.image, "https://cdn.example/case.jpg");
    assert.equal(products[0]?.commission, null);
    assert.match(products[0]?.basis ?? "", /Stored view count: 8/);
    assert.equal(JSON.stringify(products).includes("seller@example.com"), false);

    const communities = mapCommunityPayload({
      communities: [
        {
          id: "c1",
          name: "Design",
          slug: "design",
          is_private: false,
          visibility: "public",
          member_count: 3,
          post_count: 9,
          tagline: "Public design talk",
          settings: { invite_code: "secret-code" },
          profiles: { email: "owner@example.com" },
        },
        { id: "c2", name: "Hidden", is_private: true, visibility: "private", member_count: 50 },
      ],
    }, "Public communities ordered by stored post count.");
    assert.equal(communities.length, 1);
    assert.equal(communities[0]?.name, "Design");
    assert.equal(communities[0]?.members, "3");
    assert.match(communities[0]?.basis ?? "", /Stored post count: 9/);
    assert.equal(JSON.stringify(communities).includes("secret-code"), false);
    assert.equal(JSON.stringify(communities).includes("owner@example.com"), false);
  });

  it("maps only active campaigns and does not invent a rate", () => {
    const campaigns = mapCampaignPayload({
      data: [
        { id: "u1", title: "Clip this", status: "active", campaign_type: "ugc", submission_count: 4, payment_model: "per_views", rate_per_1k_views: 2 },
        { id: "u2", title: "Draft", status: "draft", submission_count: 100 },
      ],
    }, "Active campaigns ordered by stored submission count.");
    assert.equal(campaigns.length, 1);
    assert.equal(campaigns[0]?.rate, "Listed rate per 1K views 2");
    assert.match(campaigns[0]?.basis ?? "", /Stored submission count: 4/);
  });

  it("maps public feed posts and drops private authors and rooms", () => {
    const posts = mapPostPayload({
      posts: [
        {
          id: "post-1",
          title: "Phone tips",
          audience: "public",
          like_count: 2,
          comment_count: 1,
          author_id: "user-secret",
          communities: { slug: "design", name: "Design", is_private: false, visibility: "public" },
          profiles: { email: "author@example.com" },
        },
        { id: "post-2", title: "Hidden", audience: "private", communities: { slug: "secret", is_private: true, visibility: "private" } },
      ],
    }, "Public posts that include this hashtag.");
    assert.equal(posts.length, 1);
    assert.equal(posts[0]?.href, "/communities/design/feed?post=post-1");
    assert.match(posts[0]?.basis ?? "", /Stored like count: 2/);
    assert.match(posts[0]?.basis ?? "", /Stored comment count: 1/);
    assert.equal(JSON.stringify(posts).includes("user-secret"), false);
    assert.equal(JSON.stringify(posts).includes("author@example.com"), false);
  });

  it("returns no cards when the catalog call fails", async () => {
    let calls = 0;
    const cards = await resolveDiscoveryCards(
      "Show me trending products.",
      async () => {
        calls += 1;
        return null;
      },
      new AbortController().signal,
    );
    assert.equal(calls, 1);
    assert.deepEqual(cards, {});
  });

  it("does not fetch for a support question", async () => {
    let calls = 0;
    const cards = await resolveDiscoveryCards(
      "How do I open a support ticket?",
      async () => {
        calls += 1;
        return { data: [] };
      },
      new AbortController().signal,
    );
    assert.equal(calls, 0);
    assert.deepEqual(cards, {});
  });
});

describe("chat discovery wiring", () => {
  it("attaches catalog cards from the copilot response path", () => {
    const provider = readFileSync(new URL("./copilot/http-provider.ts", import.meta.url), "utf8");
    assert.match(provider, /resolveDiscoveryCards/);
    assert.match(provider, /discoveryPreface/);
    const hook = readFileSync(new URL("../../components/copilot/use-copilot-chat.ts", import.meta.url), "utf8");
    assert.match(hook, /\.\.\.metadata/);
  });
});
