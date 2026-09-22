/**
 * Static verification for community photo-content seeding helpers.
 * Run: npx tsx scripts/verify-community-photo-content.ts
 */
import assert from "node:assert/strict";
import {
  PHOTO_CONTENT_KEY_PREFIX,
  photoContentKey,
  parsePhotoContentKey,
  catalogStats,
  photosForCommunity,
  buildPhotoCaption,
  captionKinds,
  normalizeUnsplashPhotoId,
  unsplashDownloadUrl,
  editorialPhotoPublicId,
} from "../lib/community/photo-content";
import { isEditorialPersonaEmail } from "../lib/community/editorial-personas";

assert.equal(PHOTO_CONTENT_KEY_PREFIX, "photo-content:");
assert.equal(
  photoContentKey("faith-and-inspiration", "photo-123"),
  "photo-content:faith-and-inspiration:photo-123"
);
assert.deepEqual(parsePhotoContentKey("photo-content:ai-and-automation:photo-abc"), {
  slug: "ai-and-automation",
  sourceId: "photo-abc",
});
assert.equal(parsePhotoContentKey("other-key"), null);

const stats = catalogStats();
assert.ok(stats.categories >= 20, "expected broad category coverage");
assert.ok(stats.uniquePhotos >= 100, "expected a sizable licensed photo catalog");

const fitness = photosForCommunity({
  category: "Fitness",
  slug: "health-and-fitness",
  name: "Health & Fitness",
});
assert.ok(fitness.length >= 5);
assert.ok(fitness.every((p) => p.provider === "unsplash"));
assert.ok(fitness.every((p) => p.license.toLowerCase().includes("unsplash")));
assert.ok(fitness.every((p) => p.sourceUrl.startsWith("https://")));

const africa = photosForCommunity({
  category: "Creator",
  slug: "africa-creators",
  name: "Africa Creators",
  description: "African creators",
});
assert.ok(africa.length >= fitness.length);

const kinds = captionKinds();
assert.ok(kinds.includes("question"));
assert.ok(kinds.includes("progress"));
const caption = buildPhotoCaption({
  category: "Fitness",
  communityName: "Health & Fitness",
  salt: "photo-content:health-and-fitness:photo-1",
  kind: "progress",
});
assert.ok(caption.body.length > 10);
assert.ok(!/🚀|🔥|Welcome to our amazing/i.test(caption.body));

assert.equal(
  normalizeUnsplashPhotoId("1518770660439-4636190af475"),
  "photo-1518770660439-4636190af475"
);
assert.ok(unsplashDownloadUrl("photo-1518770660439-4636190af475").includes("images.unsplash.com"));
assert.ok(editorialPhotoPublicId("photo-abc").startsWith("editorial_"));

// Editorial email matcher must treat `+` as a literal (regression guard).
assert.equal(isEditorialPersonaEmail("editorial+amina@jimvio.com"), true);
assert.equal(isEditorialPersonaEmail("editorial+afx123@jimvio.com"), true);
assert.equal(isEditorialPersonaEmail("admin@jimvio.com"), false);

console.log("✅ verify-community-photo-content passed");
