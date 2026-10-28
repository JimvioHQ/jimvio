import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  MARKETPLACE_BENEFITS,
  MARKETPLACE_GROWTH_PATHS,
  buildMarketplaceHref,
  canonicalMarketplacePath,
  categoryTypeOrFilter,
  compatibleMarketplaceSearch,
  marketplaceEmptyCopy,
  marketplaceEntryDecision,
  marketplaceFiltersHref,
  marketplaceHrefWithoutCategory,
  marketplaceIndexHref,
  marketplacePopularSearches,
  marketplaceSearchPlaceholders,
  marketplaceSearchResultsHref,
  marketplaceSwitchHref,
  marketplaceTypeFromPathname,
  readMarketplaceFilters,
} from "./experience.ts";

const root = process.cwd();

describe("marketplace canonical routes", () => {
  it("resolves product type from the pathname", () => {
    assert.equal(marketplaceTypeFromPathname("/marketplace/physical"), "physical");
    assert.equal(marketplaceTypeFromPathname("/marketplace/digital"), "digital");
    assert.equal(marketplaceTypeFromPathname("/marketplace/digital?category=ebooks"), "digital");
    assert.equal(marketplaceTypeFromPathname("/marketplace"), null);
    assert.equal(canonicalMarketplacePath("digital"), "/marketplace/digital");
  });

  it("sends the index to the canonical path and keeps a same-type category", () => {
    assert.equal(marketplaceIndexHref({}), "/marketplace/physical");
    assert.equal(
      marketplaceIndexHref({ type: "digital", category: "digital-online-courses", minRating: "4" }),
      "/marketplace/digital?category=digital-online-courses",
    );
    assert.equal(
      marketplaceIndexHref({ type: "physical", page: "2" }),
      "/marketplace/physical?page=2",
    );
  });

  it("switches type in the pathname and drops incompatible filters", () => {
    const current = new URLSearchParams(
      "category=digital-ebooks&minRating=4&maxPrice=40&shipping=CN&delivery=fast&page=3&sort=newest",
    );
    assert.equal(
      marketplaceSwitchHref("digital", current),
      "/marketplace/digital?sort=newest&maxPrice=40",
    );
    assert.equal(
      marketplaceSwitchHref("physical", new URLSearchParams("minRating=4&maxPrice=40&sort=newest")),
      "/marketplace/physical?sort=newest&maxPrice=40",
    );
    assert.equal(
      marketplaceSwitchHref("physical", new URLSearchParams("offer=free_shipping&format=course&maxPrice=40")),
      "/marketplace/physical?maxPrice=40&offer=free_shipping",
    );
    assert.equal(
      marketplaceSwitchHref("digital", new URLSearchParams("offer=free_shipping&format=course&maxPrice=40")),
      "/marketplace/digital?maxPrice=40&format=course",
    );
    assert.equal(
      marketplaceSwitchHref("digital", new URLSearchParams("arrivals=1&purchased=1&offer=free_shipping")),
      "/marketplace/digital?arrivals=1&purchased=1",
    );
    const invalid = marketplaceEntryDecision("physical", { arrivals: "no", purchased: "1" });
    assert.equal(invalid.redirectTo, "/marketplace/physical?purchased=1");
  });

  it("normalizes a conflicting type query and a legacy cat param", () => {
    const conflict = marketplaceEntryDecision("physical", {
      type: "digital",
      category: "shoes",
      page: "2",
      minRating: "3",
    });
    assert.equal(conflict.redirectTo, "/marketplace/digital");

    const legacy = marketplaceEntryDecision("digital", { cat: "digital-ebooks", type: "digital" });
    assert.equal(legacy.redirectTo, "/marketplace/digital?category=digital-ebooks");
    assert.equal(legacy.category, "digital-ebooks");

    const clean = marketplaceEntryDecision("physical", { category: "electronics", minRating: "4" });
    assert.equal(clean.redirectTo, "/marketplace/physical?category=electronics");
    assert.equal(clean.category, "electronics");
    const offer = marketplaceEntryDecision("physical", { category: "electronics", offer: "free_shipping" });
    assert.equal(offer.redirectTo, null);
    assert.equal(offer.category, "electronics");
  });

  it("drops physical-only filters on the digital route and strips an invalid category", () => {
    const shipping = marketplaceEntryDecision("digital", { shipping: "CN", delivery: "fast", minPrice: "5" });
    assert.equal(shipping.redirectTo, "/marketplace/digital?minPrice=5");
    assert.equal(
      marketplaceHrefWithoutCategory("physical", { category: "digital-ebooks", page: "4", minRating: "4", offer: "flash_deal" }),
      "/marketplace/physical?offer=flash_deal",
    );
  });

  it("round-trips filters for refresh and ignores the other type's category field", () => {
    const params = new URLSearchParams("category=electronics&minRating=4&maxPrice=80&shipping=US&page=2");
    const physical = readMarketplaceFilters(params, "physical");
    assert.equal(physical.category, "electronics");
    assert.equal(physical.page, 2);
    assert.deepEqual(physical.shippingFrom, ["US"]);
    assert.equal(physical.minRating, 0);
    assert.equal(physical.priceRange[1], 80);
    assert.equal(physical.offer, "");

    const digital = readMarketplaceFilters(params, "digital");
    assert.deepEqual(digital.shippingFrom, []);
    assert.equal(digital.format, "");
    assert.equal(
      marketplaceFiltersHref("digital", { ...digital, page: 1, category: "" }, params),
      "/marketplace/digital?maxPrice=80",
    );
    const withFormat = readMarketplaceFilters(new URLSearchParams("format=course&offer=free_shipping"), "digital");
    assert.equal(withFormat.format, "course");
    assert.equal(withFormat.offer, "");

    const kept = compatibleMarketplaceSearch("physical", params, { dropType: true });
    assert.equal(buildMarketplaceHref("physical", kept).includes("category=electronics"), true);
    assert.equal(
      marketplaceSearchResultsHref("digital", "ebook", {
        category: "ebooks",
        format: "ebook",
        offer: "free_shipping",
        priceRange: [10, 40],
      }),
      "/marketplace/search?q=ebook&type=digital&category=ebooks&minPrice=10&maxPrice=40&format=ebook",
    );
    assert.equal(
      marketplaceSearchResultsHref("physical", "headphones", {
        offer: "free_shipping",
        format: "course",
        arrivals: true,
        purchased: true,
        priceRange: [0, 5000],
      }),
      "/marketplace/search?q=headphones&type=physical&offer=free_shipping&arrivals=1&purchased=1",
    );
  });
});

describe("marketplace type-specific content", () => {
  it("keeps physical benefits and uses accurate digital benefits", () => {
    assert.deepEqual(
      MARKETPLACE_BENEFITS.physical.map((item) => [item.title, item.subtitle]),
      [
        ["Secure Payments", "100% safe"],
        ["Buyer Protection", "Money-back guarantee"],
        ["Verified Suppliers", "Trusted & reliable"],
        ["Fast Delivery", "Worldwide shipping"],
      ],
    );
    const digital = MARKETPLACE_BENEFITS.digital.map((item) => `${item.title} ${item.subtitle}`).join(" | ");
    assert.match(digital, /Digital Delivery/);
    assert.match(digital, /Hosted files after payment/);
    assert.match(digital, /Buyer Access/);
    assert.match(digital, /Learn, Create & Grow/);
    assert.match(digital, /Courses, ebooks, templates and more/);
    assert.doesNotMatch(digital, /instantly|Instant|Verified Digital Creators|Protected access|100% safe|Money-back/i);
  });

  it("points growth cards at the live destinations", () => {
    assert.deepEqual(
      MARKETPLACE_GROWTH_PATHS.map((card) => [card.title, card.cta, card.href]),
      [
        ["Earn commissions", "Start earning", "/affiliates"],
        ["Join UGC campaigns", "Browse campaigns", "/ugc"],
        ["Start Dropshipping", "Start Dropshipping", "/commerce/stores"],
        ["Join communities", "Explore groups", "/communities"],
      ],
    );
    const titles = MARKETPLACE_GROWTH_PATHS.map((card) => card.title).join(" ");
    assert.doesNotMatch(titles, /Open your store|Sell on Jimvio/);
  });

  it("uses different search and empty copy for each type", () => {
    const digitalLabels = marketplaceSearchPlaceholders("digital").map((item) => item.label).join(" ");
    const physicalLabels = marketplaceSearchPlaceholders("physical").map((item) => item.label).join(" ");
    assert.match(digitalLabels, /Ebooks/);
    assert.doesNotMatch(digitalLabels, /Wireless Earbuds/);
    assert.match(physicalLabels, /Wireless Earbuds/);
    assert.deepEqual(marketplacePopularSearches("digital")[0], "Online course");
    assert.match(marketplaceEmptyCopy("digital", "").body, /digital/);
    assert.match(marketplaceEmptyCopy("physical", "lamp").title, /physical/);
  });

  it("filters categories by category_type", () => {
    assert.equal(categoryTypeOrFilter("digital"), "category_type.eq.digital");
    assert.match(categoryTypeOrFilter("physical"), /category_type\.eq\.physical/);
    assert.match(categoryTypeOrFilter("physical"), /category_type\.is\.null/);
  });
});

describe("marketplace route wiring", () => {
  it("renders both canonical pages from the shared marketplace", () => {
    const physical = readFileSync(join(root, "app/(public)/marketplace/physical/page.tsx"), "utf8");
    const digital = readFileSync(join(root, "app/(public)/marketplace/digital/page.tsx"), "utf8");
    const index = readFileSync(join(root, "app/(public)/marketplace/page.tsx"), "utf8");
    assert.match(physical, /MarketplacePage/);
    assert.match(physical, /"physical"/);
    assert.match(digital, /MarketplacePage/);
    assert.match(digital, /"digital"/);
    assert.match(index, /marketplaceIndexHref/);
    assert.doesNotMatch(digital, /MarketplaceClient/);
  });

  it("navigates the type control and promo card through real routes", () => {
    const client = readFileSync(join(root, "components/marketplace/new/MarketplacePageClient.tsx"), "utf8");
    const hub = readFileSync(join(root, "components/marketplace/new/MarketplaceEngagementHub.tsx"), "utf8");
    const strip = readFileSync(join(root, "components/marketplace/new/MarketplaceTrustStrip.tsx"), "utf8");
    assert.match(client, /marketplaceSwitchHref/);
    assert.match(client, /\/marketplace\/digital/);
    assert.match(client, /\/marketplace\/physical/);
    assert.doesNotMatch(client, /handleTypeChange/);
    assert.match(hub, /MARKETPLACE_GROWTH_PATHS/);
    assert.doesNotMatch(hub, /Open your store|Sell on Jimvio|List products & reach buyers/);
    assert.match(strip, /MARKETPLACE_BENEFITS/);

    const sidebar = readFileSync(join(root, "components/marketplace/new/Sidebar.tsx"), "utf8");
    assert.match(sidebar, /categoryTypeOrFilter/);
    assert.match(sidebar, /value: c\.slug/);
    assert.doesNotMatch(sidebar, /resolveShopCategories/);

    const marketplacePage = readFileSync(join(root, "components/marketplace/new/Marketplacepage .tsx"), "utf8");
    assert.match(marketplacePage, /fetchHeroProducts\(supabase, type\)/);
    assert.doesNotMatch(marketplacePage, /initialCollections/);

    const flash = readFileSync(join(root, "app/(public)/marketplace/flash-deals/page.tsx"), "utf8");
    assert.match(flash, /getMarketplaceTypeFilter/);
    const tabs = readFileSync(join(root, "components/marketplace/new/TrendingProductsClient.tsx"), "utf8");
    assert.match(tabs, /All formats/);
    assert.doesNotMatch(tabs, /Instant Access/);
  });
});
