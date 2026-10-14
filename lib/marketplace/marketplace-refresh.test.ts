import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  hashVisitSeed,
  isEligibleMarketplaceListing,
  selectRotatedTrending,
} from "./trending-rotation.ts";
import {
  groundedCatalogBlock,
  isBroadShoppingQuestion,
  sanitizeShoppingMessage,
  shoppingAssistantSystemPrompt,
} from "./shopping-assistant.ts";

const root = process.cwd();

describe("trending rotation", () => {
  const pool = Array.from({ length: 40 }, (_, index) => ({
    id: `p-${index}`,
    sku: `sku-${index}`,
    status: "active",
    is_active: true,
    deleted_at: null,
    auto_unpublished: false,
  }));

  it("rejects inactive, draft, deleted, and unpublished listings", () => {
    assert.equal(isEligibleMarketplaceListing(pool[0]), true);
    assert.equal(isEligibleMarketplaceListing({ ...pool[0], status: "draft" }), false);
    assert.equal(isEligibleMarketplaceListing({ ...pool[0], is_active: false }), false);
    assert.equal(isEligibleMarketplaceListing({ ...pool[0], deleted_at: "2026-01-01" }), false);
    assert.equal(isEligibleMarketplaceListing({ ...pool[0], auto_unpublished: true }), false);
  });

  it("rotates the selection by visit seed without duplicates", () => {
    const eligible = pool.filter(isEligibleMarketplaceListing);
    const first = selectRotatedTrending(eligible, "visit-alpha-seed", 12);
    const second = selectRotatedTrending(eligible, "visit-zulu-seed-99", 12);
    const same = selectRotatedTrending(eligible, "visit-alpha-seed", 12);
    assert.equal(first.length, 12);
    assert.deepEqual(first.map((item) => item.id), same.map((item) => item.id));
    assert.equal(new Set(first.map((item) => item.id)).size, first.length);
    const ids = new Set(first.map((item) => item.id));
    assert.equal(second.some((item) => !ids.has(item.id)), true);
    assert.equal(hashVisitSeed("visit-alpha-seed"), hashVisitSeed("visit-alpha-seed"));
  });

  it("drops duplicate identities inside one selection", () => {
    const selected = selectRotatedTrending(
      [
        { id: "a", sku: "same" },
        { id: "b", sku: "same" },
        { id: "c", sku: "other" },
      ],
      "visit-alpha-seed",
      12,
    );
    assert.deepEqual(selected.map((item) => item.id), ["a", "c"]);
  });
});

describe("shopping assistant grounding", () => {
  it("sanitizes messages and treats vague prompts as broad", () => {
    assert.equal(sanitizeShoppingMessage("  earbuds \n under 20  "), "earbuds under 20");
    assert.equal(isBroadShoppingQuestion("help"), true);
    assert.equal(isBroadShoppingQuestion("wireless earbuds under 30"), false);
  });

  it("only cites products that were retrieved", () => {
    const prompt = shoppingAssistantSystemPrompt();
    assert.match(prompt, /Never invent/);
    const block = groundedCatalogBlock([
      { id: "1", name: "Wireless Earbuds", slug: "wireless-earbuds", price: 19.5, currency: "USD" },
    ]);
    assert.match(block, /Wireless Earbuds/);
    assert.match(block, /\/marketplace\/wireless-earbuds/);
    assert.doesNotMatch(block, /Sleeping Bag/);
    assert.match(groundedCatalogBlock([]), /none/);
  });
});

describe("marketplace wiring", () => {
  it("sends Join Elite Now to the help center", () => {
    const sidebar = readFileSync(join(root, "components/marketplace/new/Sidebar.tsx"), "utf8");
    assert.match(sidebar, /AI Shopping Assistant/);
    assert.match(sidebar, /https:\/\/www\.jimvio\.com\/help/);
    assert.match(sidebar, /Join Elite Now/);
    assert.match(sidebar, /\/api\/marketplace\/shopping-assistant/);
  });

  it("keeps trending tabs and routes search to the results page", () => {
    const page = readFileSync(join(root, "components/marketplace/new/MarketplacePageClient.tsx"), "utf8");
    const tabs = readFileSync(join(root, "components/marketplace/new/TrendingProductsClient.tsx"), "utf8");
    assert.match(page, /\/marketplace\/search\?q=/);
    assert.match(page, /\/api\/marketplace\/trending/);
    assert.match(page, /TrendingProductsClient/);
    assert.match(tabs, /Best Selling/);
    assert.match(tabs, /Free Shipping/);
    assert.match(tabs, /New Arrivals/);
  });
});
