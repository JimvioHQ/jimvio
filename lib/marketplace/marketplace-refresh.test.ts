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
  emptyCatalogReply,
  groundedCatalogBlock,
  groundedFallbackReply,
  isBroadShoppingQuestion,
  sanitizeShoppingMessage,
  shoppingAssistantSystemPrompt,
  shoppingIntentForMessage,
  SHOPPING_SUGGESTIONS,
} from "./shopping-assistant.ts";
import { parseVisualDataUrl, parseVisualQuery, validateVisualFile } from "./visual-search.ts";

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
    assert.match(block, /USD 19.50/);
    assert.match(block, /\/marketplace\/wireless-earbuds/);
    assert.doesNotMatch(block, /Sleeping Bag/);
    assert.match(groundedCatalogBlock([]), /none/);
    const stored = groundedCatalogBlock([
      { id: "2", name: "Desk Lamp", slug: "desk-lamp", price: 8320, price_usd: 5.63, currency: "RWF" },
    ]);
    assert.match(stored, /USD 5\.63/);
    assert.doesNotMatch(stored, /RWF|8320|6\.66/);
    const unlabeled = groundedCatalogBlock([
      { id: "3", name: "Desk Lamp", slug: "desk-lamp", price: 8320, currency: "RWF" },
    ]);
    assert.match(unlabeled, /price unavailable/);
    assert.doesNotMatch(unlabeled, /USD 8320|RWF 8320/);
  });

  it("maps suggestion chips to real catalog intents for the active marketplace", () => {
    assert.deepEqual(
      SHOPPING_SUGGESTIONS.physical.map((item) => item.label),
      ["Winning products", "Viral now", "High commission"],
    );
    assert.deepEqual(
      SHOPPING_SUGGESTIONS.digital.map((item) => item.label),
      ["Top courses", "Templates", "Software"],
    );
    assert.equal(shoppingIntentForMessage("Show digital courses I can buy"), "courses");
    assert.equal(shoppingIntentForMessage("Show physical products with the most sales"), "most_sales");
    assert.equal(shoppingIntentForMessage("wireless earbuds"), null);
    assert.match(emptyCatalogReply("digital", "courses"), /No courses/);
    assert.match(emptyCatalogReply("digital", null), /No digital products/);
    assert.doesNotMatch(emptyCatalogReply("digital", null), /physical listings from the marketplace/);
    const fallback = groundedFallbackReply("physical", [
      { id: "1", name: "Phone Case", slug: "phone-case", price: 12, currency: "USD" },
    ]);
    assert.match(fallback, /Phone Case/);
    assert.doesNotMatch(fallback, /\$12|discount|in stock/i);
  });

  it("accepts only small JPEG, PNG, and WebP photos and a short search query", () => {
    assert.equal(validateVisualFile({ type: "image/png", size: 1200 }).ok, true);
    assert.equal(validateVisualFile({ type: "image/gif", size: 1200 }).ok, false);
    assert.equal(validateVisualFile({ type: "image/jpeg", size: 5 * 1024 * 1024 }).ok, false);
    const png = `data:image/png;base64,${"a".repeat(8)}`;
    assert.equal(parseVisualDataUrl(png)?.mediaType, "image/png");
    assert.equal(parseVisualDataUrl("data:image/gif;base64,aaaa"), null);
    assert.equal(parseVisualQuery('{"query":"phone case"}'), "phone case");
    assert.equal(parseVisualQuery('{"query":""}'), "");
    assert.equal(parseVisualQuery("not json"), "");
  });
});

describe("marketplace wiring", () => {
  it("removes the Elite Club card and keeps the shopping assistant", () => {
    const sidebar = readFileSync(join(root, "components/marketplace/new/Sidebar.tsx"), "utf8");
    assert.match(sidebar, /AI Shopping Assistant/);
    assert.match(sidebar, /data-marketplace-assistant/);
    assert.match(sidebar, /SHOPPING_SUGGESTIONS/);
    assert.match(sidebar, /\/api\/marketplace\/shopping-assistant/);
    assert.match(sidebar, /data-filter-offer/);
    assert.match(sidebar, /data-filter-format/);
    assert.match(sidebar, /data-filter-listings/);
    assert.match(sidebar, /New arrivals/);
    assert.match(sidebar, /Trending/);
    assert.match(sidebar, /Fast shipping/);
    assert.match(sidebar, /Verified/);
    assert.match(sidebar, /AI-powered/);
    assert.doesNotMatch(sidebar, /Purchased/);
    assert.doesNotMatch(sidebar, /fmtCount/);
    assert.match(sidebar, /AbortController/);
    const filters = readFileSync(join(root, "components/marketplace/new/marketplace-context.tsx"), "utf8");
    assert.match(filters, /history\.replaceState\(null, "", href\)/);
    assert.match(sidebar, /marketplaceCustomerUsd/);
    assert.doesNotMatch(sidebar, /step=\{type === "digital" \? 5 : 50\}/);
    assert.doesNotMatch(sidebar, /Jimvio Elite Club/);
    assert.doesNotMatch(sidebar, /Join Elite Now/);
    assert.doesNotMatch(sidebar, /Exclusive perks/);
    assert.doesNotMatch(sidebar, /Supplier Rating/);
    assert.doesNotMatch(sidebar, /Product Rating/);
  });

  it("keeps trending tabs and routes text and photo search through the catalog", () => {
    const page = readFileSync(join(root, "components/marketplace/new/MarketplacePageClient.tsx"), "utf8");
    const tabs = readFileSync(join(root, "components/marketplace/new/TrendingProductsClient.tsx"), "utf8");
    const searchPage = readFileSync(join(root, "app/(public)/marketplace/search/page.tsx"), "utf8");
    assert.match(page, /marketplaceSearchResultsHref/);
    assert.match(page, /\/api\/marketplace\/visual-search/);
    assert.match(page, /validateVisualFile/);
    assert.match(page, /Search by photo/);
    assert.match(page, /\/api\/marketplace\/trending/);
    assert.match(page, /TrendingProductsClient/);
    assert.match(page, /digitalCategoryPhotoUrl/);
    assert.match(page, /price_usd/);
    assert.match(page, /arrivals/);
    assert.match(page, /DIGITAL_SHOP_CATEGORIES/);
    assert.match(page, /navigateMarketplace/);
    assert.match(page, /applyBrowseViewOrder\(applyFilters/);
    const trendingSelect = readFileSync(join(root, "lib/marketplace/trending-selection.ts"), "utf8");
    assert.match(trendingSelect, /price_usd/);
    assert.match(trendingSelect, /applyDigitalVerification/);
    const assistant = readFileSync(join(root, "app/api/marketplace/shopping-assistant/route.ts"), "utf8");
    assert.match(assistant, /timeoutMs: MODEL_TIMEOUT_MS/);
    assert.match(assistant, /MODEL_TIMEOUT_MS = 8_000/);
    assert.match(assistant, /price_usd/);
    assert.match(assistant, /shoppingIntentForMessage/);
    assert.doesNotMatch(assistant, /generateGeminiText/);
    assert.doesNotMatch(assistant, /while \(attempt < 2\)/);
    assert.match(searchPage, /runMarketplaceSearch/);
    assert.doesNotMatch(page, /\.gte\("rating"/);
    assert.match(tabs, /Best Selling/);
    assert.match(tabs, /Free Shipping/);
    assert.match(tabs, /New Arrivals/);
  });
});
