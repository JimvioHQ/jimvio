import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORY_PHOTO_CATALOG } from "../community/photo-content/catalog.ts";
import { unsplashDownloadUrl } from "../community/photo-content/unsplash.ts";
import { digitalCategoryPhotoUrl } from "./digital-category-images.ts";

const EXPECTED_KEYS = {
  "digital-education-learning": ["Education", 0],
  "digital-business-entrepreneurship": ["Business", 0],
  "digital-marketing-sales": ["Marketing", 1],
  "digital-design-creative": ["Design", 0],
  "digital-photography-video": ["Photography", 1],
  "digital-music-audio": ["Music", 0],
  "digital-software-technology": ["Technology", 0],
  "digital-ai-automation": ["AI", 0],
  "digital-finance-investing": ["Finance", 0],
  "digital-health-fitness": ["Health", 0],
  "digital-creator-influencer": ["Creator", 0],
  "digital-ebooks-publications": ["Education", 0],
  "digital-documents-templates": ["Design", 0],
  "digital-memberships-access": ["Business", 0],
  "digital-events-experiences": ["Entertainment", 0],
  "digital-games-entertainment": ["Gaming", 0],
  "digital-art-collectibles": ["Design", 0],
  "digital-other": ["Other", 0],
} as const;

describe("digital category images", () => {
  it("uses a licensed catalog photo for each live digital category", () => {
    for (const [slug, [key, index]] of Object.entries(EXPECTED_KEYS)) {
      const photo = CATEGORY_PHOTO_CATALOG[key][index];
      assert.ok(photo);
      assert.equal(digitalCategoryPhotoUrl(slug), unsplashDownloadUrl(photo.sourceId, 960));
    }
    assert.equal(digitalCategoryPhotoUrl("digital-lifestyle"), null);
    assert.equal(digitalCategoryPhotoUrl("digital-culture-language"), null);
    assert.equal(digitalCategoryPhotoUrl("consumer-electronics"), null);
  });
});
