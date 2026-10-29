import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { digitalCategoryPhotoUrl } from "./digital-category-images.ts";
import { DIGITAL_SHOP_CATEGORIES } from "./digital-shop-categories.ts";
import {
  AI_CATEGORY_SLUG,
  applyDigitalVerification,
  applyFastShipping,
  applyBrowseViewOrder,
  applyTrendingSales,
  hasTrendingSales,
  isAiCategorySlug,
  isFastShippingDelivery,
  isVerifiedDigitalListing,
} from "./catalog-filters.ts";

describe("marketplace catalog filters", () => {
  it("treats completed sales as trending and ignores empty counts", () => {
    assert.equal(hasTrendingSales(2), true);
    assert.equal(hasTrendingSales("1"), true);
    assert.equal(hasTrendingSales(0), false);
    assert.equal(hasTrendingSales(null), false);
  });

  it("accepts only stored fast-shipping delivery values", () => {
    assert.equal(isFastShippingDelivery("fast"), true);
    assert.equal(isFastShippingDelivery("3"), true);
    assert.equal(isFastShippingDelivery("7"), true);
    assert.equal(isFastShippingDelivery("8"), false);
    assert.equal(isFastShippingDelivery("7-15"), false);
    assert.equal(isFastShippingDelivery("standard"), false);
    assert.equal(isFastShippingDelivery(null), false);
    assert.equal(isFastShippingDelivery(""), false);
  });

  it("verifies a digital listing only when the stored state is published", () => {
    assert.equal(isVerifiedDigitalListing("published"), true);
    assert.equal(isVerifiedDigitalListing("approved"), false);
    assert.equal(isVerifiedDigitalListing(null), false);
    assert.equal(isVerifiedDigitalListing("active"), false);
  });

  it("classifies AI products by the AI category family", () => {
    assert.equal(isAiCategorySlug(AI_CATEGORY_SLUG), true);
    assert.equal(isAiCategorySlug("digital-ai-prompts"), true);
    assert.equal(isAiCategorySlug("digital-ebooks-publications"), false);
    assert.equal(isAiCategorySlug("digital"), false);
  });

  it("shows the seven digital shop categories with licensed photos", () => {
    assert.deepEqual(
      DIGITAL_SHOP_CATEGORIES.map((category) => category.name),
      [
        "Courses & Education",
        "Ebooks",
        "Templates",
        "AI Tools",
        "SaaS Products",
        "Creator Resources",
        "Design Assets",
      ],
    );
    for (const category of DIGITAL_SHOP_CATEGORIES) {
      const photo = digitalCategoryPhotoUrl(category.slug);
      assert.equal(typeof photo, "string");
      assert.match(photo ?? "", /^https:\/\/(images\.unsplash\.com\/photo-|res\.cloudinary\.com\/jimvio\/)/);
    }
    const photos = DIGITAL_SHOP_CATEGORIES.map((category) => digitalCategoryPhotoUrl(category.slug));
    assert.equal(new Set(photos).size, photos.length);
  });

  it("applies verification, sales, and fast shipping on the query", () => {
    const calls: string[] = [];
    const query = {
      eq(column: string, value: string) {
        calls.push(`eq:${column}:${value}`);
        return this;
      },
      gt(column: string, value: number) {
        calls.push(`gt:${column}:${value}`);
        return this;
      },
      gte() {
        return this;
      },
      in(column: string, values: readonly string[]) {
        calls.push(`in:${column}:${values.join(",")}`);
        return this;
      },
      order(column: string) {
        calls.push(`order:${column}`);
        return this;
      },
    };
    applyBrowseViewOrder(applyTrendingSales(applyFastShipping(applyDigitalVerification(query, "digital"))));
    assert.deepEqual(calls, [
      "eq:digital_verification_state:published",
      "in:delivery_time:fast,1,2,3,4,5,6,7",
      "gt:sale_count:0",
      "order:sale_count",
      "order:view_count",
    ]);
    const physical: string[] = [];
    applyDigitalVerification(
      {
        ...query,
        eq(column: string, value: string) {
          physical.push(`${column}:${value}`);
          return this;
        },
      },
      "physical",
    );
    assert.deepEqual(physical, []);
  });
});
