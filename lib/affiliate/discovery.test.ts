import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AFFILIATE_DISCOVERY_CATEGORIES,
  KNOWN_AFFILIATE_PRODUCT_TYPES,
  affiliateDiscoveryHref,
  affiliateDiscoveryOrFilter,
  affiliateDiscoverySectionTitle,
  parseAffiliateDiscoveryCategory,
  affiliateSearchOrFilter,
  affiliateSlugBucket,
  classifyAffiliateProduct,
  emptyDiscoveryCategoryIds,
  filterDiscoveryCategories,
  normalizeAffiliateSearch,
  productMatchesDiscoveryView,
} from "./discovery";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("affiliate discovery categories", () => {
  it("lists the eight approved categories in order", () => {
    assert.deepEqual(
      AFFILIATE_DISCOVERY_CATEGORIES.map((category) => category.label),
      [
        "Featured",
        "Physical Products",
        "Digital Products",
        "eBooks & Guides",
        "Websites & Online Services",
        "Courses & Learning",
        "Apps & Software",
        "Others",
      ],
    );
    assert.deepEqual(
      AFFILIATE_DISCOVERY_CATEGORIES.map((category) => category.id),
      ["featured", "physical", "digital", "ebooks", "services", "courses", "software", "others"],
    );
  });

  it("does not offer Travel or UGC campaigns in the selector", () => {
    const labels = AFFILIATE_DISCOVERY_CATEGORIES.map((category) => category.label);
    for (const removed of ["Travel & Experiences", "UGC & Clipping Campaigns"]) {
      assert.equal(labels.includes(removed), false);
    }
    assert.equal(affiliateSlugBucket("digital-travel-resources"), null);
    assert.equal(affiliateSlugBucket("digital-ugc-resources"), null);
  });

  it("finds category names with partial case-insensitive search", () => {
    assert.deepEqual(
      filterDiscoveryCategories("ebook").map((category) => category.id),
      ["ebooks"],
    );
    assert.deepEqual(
      filterDiscoveryCategories("WEB").map((category) => category.id),
      ["services"],
    );
    assert.deepEqual(
      filterDiscoveryCategories("app").map((category) => category.id),
      ["software"],
    );
    assert.equal(filterDiscoveryCategories("").length, 8);
    assert.deepEqual(filterDiscoveryCategories("zzz"), []);
  });
});

describe("affiliate product classification", () => {
  it("maps every database product type and keeps unknown types out of Others", () => {
    const schema = readFileSync(join(root, "schema.sql"), "utf8");
    const block = schema.match(/CREATE TYPE "public"."product_type" AS ENUM \(([\s\S]*?)\);/);
    assert.ok(block);
    const types = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
    assert.deepEqual(types, [...KNOWN_AFFILIATE_PRODUCT_TYPES]);
    for (const type of types) {
      const result = classifyAffiliateProduct({ productType: type });
      assert.equal(result.unmapped, false, type);
      assert.ok(result.category, type);
    }
    const unknown = classifyAffiliateProduct({ productType: "travel", name: "Trip" });
    assert.equal(unknown.unmapped, true);
    assert.equal(unknown.category, null);
    assert.equal(productMatchesDiscoveryView(unknownProduct("travel"), "others"), false);
    assert.equal(productMatchesDiscoveryView(unknownProduct("travel"), "digital"), false);
  });

  it("keeps each category exclusive", () => {
    const samples = [
      { productType: "physical", category: "physical" },
      { productType: "digital", category: "digital" },
      { productType: "ebook", category: "ebooks" },
      { productType: "course", category: "courses" },
      { productType: "coaching", category: "courses" },
      { productType: "software", category: "software" },
      { productType: "subscription", category: "services" },
      { productType: "community", category: "services" },
      { productType: "template", category: "others" },
      { productType: "bundle", category: "others" },
    ] as const;
    for (const sample of samples) {
      for (const category of ["physical", "digital", "ebooks", "services", "courses", "software", "others"] as const) {
        assert.equal(
          productMatchesDiscoveryView({ productType: sample.productType, name: "Item" }, category),
          category === sample.category,
          `${sample.productType} in ${category}`,
        );
      }
    }
  });

  it("uses category slugs only to refine generic digital products", () => {
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "ebooks" }).category,
      "ebooks",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "digital-educational-guides" }).category,
      "ebooks",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "digital-online-courses" }).category,
      "courses",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "ai-tools" }).category,
      "software",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "digital-subscriptions" }).category,
      "services",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "digital-other-misc" }).category,
      "others",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "digital-travel-resources" }).category,
      "digital",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "digital", categorySlug: "digital-ugc-resources" }).category,
      "digital",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "physical", categorySlug: "ebooks" }).category,
      "physical",
    );
    assert.equal(
      classifyAffiliateProduct({ productType: "template", categorySlug: "courses" }).category,
      "courses",
    );
  });

  it("shows featured products only from the featured flag", () => {
    const physical = { productType: "physical", name: "Case", isFeatured: true };
    const plain = { productType: "physical", name: "Case", isFeatured: false };
    assert.equal(productMatchesDiscoveryView(physical, "featured"), true);
    assert.equal(productMatchesDiscoveryView(plain, "featured"), false);
    assert.equal(productMatchesDiscoveryView(physical, "physical"), true);
    assert.equal(
      productMatchesDiscoveryView({ productType: "travel", isFeatured: true, name: "Trip" }, "featured"),
      true,
    );
  });

  it("composes search with the active category and restores results when cleared", () => {
    const digital = { productType: "digital", name: "Logo Kit", slug: "logo-kit", shortDescription: "Brand pack" };
    const physical = { productType: "physical", name: "Logo Hat", slug: "logo-hat" };
    assert.equal(productMatchesDiscoveryView(digital, "digital", "logo"), true);
    assert.equal(productMatchesDiscoveryView(physical, "digital", "logo"), false);
    assert.equal(productMatchesDiscoveryView(digital, "digital", "brand"), true);
    assert.equal(productMatchesDiscoveryView(digital, "digital", "missing"), false);
    assert.equal(productMatchesDiscoveryView(digital, "digital", ""), true);
    assert.equal(productMatchesDiscoveryView(digital, "digital", "   "), true);
  });
});

describe("affiliate discovery queries", () => {
  it("builds a featured section title and a shareable filter URL", () => {
    assert.equal(affiliateDiscoverySectionTitle("featured"), "Featured products to promote");
    assert.equal(
      affiliateDiscoveryHref("digital", "Logo Kit"),
      "/affiliates?category=digital&q=Logo+Kit",
    );
    assert.equal(affiliateDiscoveryHref("featured"), "/affiliates?category=featured");
    assert.equal(parseAffiliateDiscoveryCategory("Featured"), "featured");
    assert.equal(parseAffiliateDiscoveryCategory("travel"), null);
    assert.equal(parseAffiliateDiscoveryCategory("ugc"), null);
  });

  it("sanitizes search before it can change the filter syntax", () => {
    assert.equal(normalizeAffiliateSearch("  phone,case%_  "), "phone case");
    assert.equal(normalizeAffiliateSearch('a"b(or)c'), "a b or c");
    const filter = affiliateSearchOrFilter("phone case");
    assert.equal(
      filter,
      'name.ilike."%phone case%",slug.ilike."%phone case%",short_description.ilike."%phone case%"',
    );
    assert.equal(affiliateSearchOrFilter("%%%"), null);
  });

  it("keeps category SQL on that category's product types", () => {
    const ids = emptyDiscoveryCategoryIds();
    ids.ebooks.push("11111111-1111-1111-1111-111111111111");
    ids.courses.push("22222222-2222-2222-2222-222222222222");
    const ebooks = affiliateDiscoveryOrFilter("ebooks", ids);
    assert.match(ebooks, /product_type\.eq\.ebook/);
    assert.match(ebooks, /11111111-1111-1111-1111-111111111111/);
    assert.doesNotMatch(ebooks, /product_type\.eq\.physical/);
    const digital = affiliateDiscoveryOrFilter("digital", ids);
    assert.match(digital, /product_type\.eq\.digital/);
    assert.match(digital, /category_id\.not\.in\./);
    assert.doesNotMatch(digital, /product_type\.eq\.ebook/);
    const physical = affiliateDiscoveryOrFilter("physical", ids);
    assert.match(physical, /product_type\.eq\.physical/);
    assert.doesNotMatch(physical, /product_type\.eq\.digital/);
    const courses = affiliateDiscoveryOrFilter("courses", ids);
    assert.match(courses, /product_type\.in\.\(course,coaching\)/);
    const others = affiliateDiscoveryOrFilter("others", ids);
    assert.match(others, /template,bundle/);
    assert.doesNotMatch(others, /product_type\.eq\.ebook/);
    assert.doesNotMatch(others, /product_type\.eq\.physical/);
  });
});

function unknownProduct(productType: string) {
  return { productType, name: "Trip" };
}
