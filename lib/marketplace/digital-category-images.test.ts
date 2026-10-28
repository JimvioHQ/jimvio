import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORY_PHOTO_CATALOG } from "../community/photo-content/catalog.ts";
import { unsplashDownloadUrl } from "../community/photo-content/unsplash.ts";
import { digitalCategoryPhotoUrl } from "./digital-category-images.ts";

const EXPECTED_KEYS = {
  "digital-education-learning": "Education",
  "digital-business-entrepreneurship": "Business",
  "digital-marketing-sales": "Marketing",
  "digital-design-creative": "Design",
  "digital-photography-video": "Photography",
  "digital-music-audio": "Music",
  "digital-software-technology": "Technology",
  "digital-ai-automation": "AI",
  "digital-finance-investing": "Finance",
  "digital-health-fitness": "Health",
  "digital-creator-influencer": "Creator",
  "digital-ebooks-publications": "Education",
  "digital-documents-templates": "Design",
  "digital-memberships-access": "Business",
  "digital-events-experiences": "Entertainment",
  "digital-games-entertainment": "Gaming",
  "digital-art-collectibles": "Design",
  "digital-other": "Other",
} as const;

describe("digital category images", () => {
  it("uses the first licensed catalog photo for each live digital category", () => {
    for (const [slug, key] of Object.entries(EXPECTED_KEYS)) {
      const photo = CATEGORY_PHOTO_CATALOG[key][0];
      assert.ok(photo);
      assert.equal(digitalCategoryPhotoUrl(slug), unsplashDownloadUrl(photo.sourceId, 960));
    }
    assert.equal(digitalCategoryPhotoUrl("digital-lifestyle"), null);
    assert.equal(digitalCategoryPhotoUrl("digital-culture-language"), null);
    assert.equal(digitalCategoryPhotoUrl("consumer-electronics"), null);
  });
});
