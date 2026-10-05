/**
 * Jimvio editorial community programming — static contract checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const origin = read("lib/community/editorial-origin.ts");
const catalog = read("lib/community/editorial-catalog.ts");
const seed = read("scripts/seed-community-world.ts");
const settingsPatch = read("app/api/c/owner/settings/route.ts");
const settingsForm = read("components/community/owner-console/settings/SettingsSectionForm.tsx");
const categories = read("lib/community/categories.ts");
const feed = read("components/community/workspace/sections/Feed.tsx");
const feedCard = read("components/feed/FeedPostCard.tsx");
const platform = read("services/platform.ts");

assert.match(origin, /readCommunityEditorialOrigin/);
assert.match(origin, /mergeCommunitySettingsPreservingProvenance/);
assert.match(origin, /jimvioPromotionLabel/);
assert.match(origin, /From Jimvio/);
assert.doesNotMatch(origin, /fake user|seed script|demo database/i);

assert.match(catalog, /slug: "news-desk"/);
assert.match(catalog, /slug: "entertainment-circle"/);
assert.match(catalog, /slug: "sports-room"/);
assert.match(catalog, /slug: "faith-and-inspiration"/);
assert.match(catalog, /category: "News"/);
assert.match(catalog, /category: "Entertainment"/);
assert.match(catalog, /category: "Sports"/);
assert.match(catalog, /category: "Faith"/);
assert.match(catalog, /href: "\/affiliates"/);
assert.match(catalog, /href: "\/ugc"/);
assert.match(catalog, /href: "\/identity"/);
assert.match(catalog, /href: "\/marketplace"/);
assert.match(catalog, /href: "\/communities\/live"/);
assert.match(catalog, /Want to earn on Jimvio/);
assert.match(catalog, /Looking for paid creator opportunities/);
assert.match(catalog, /Build your creator presence on Jimvio/);
assert.match(catalog, /No fabricated breaking news/);
assert.match(catalog, /Do not invent a result/);
assert.doesNotMatch(catalog, /Hello everyone/);
assert.doesNotMatch(catalog, /Good morning/);
assert.doesNotMatch(catalog, /Nice post/);
assert.doesNotMatch(catalog, /fake user|bot account|seed script|demo database/i);
assert.doesNotMatch(catalog, /guaranteed payout|easy money|members are making/i);

const ecosystem = read("lib/community/editorial-world-blueprints.ts");
assert.match(ecosystem, /WORLD_COMMUNITY_SEEDS/);
assert.match(ecosystem, /slug: "tech-and-developers"/);
assert.match(ecosystem, /slug: "content-creators"/);
assert.match(ecosystem, /slug: "rwanda-community"/);
assert.match(ecosystem, /slug: "africa-creators"/);
assert.ok(
  (ecosystem.match(/slug:\s*"/g) || []).length >= 200,
  "world blueprints should define >=200 communities"
);

const personas = read("lib/community/editorial-personas.ts");
assert.match(personas, /editorial\+/);
assert.match(personas, /jimvio\.com/);
assert.match(personas, /ALL_EDITORIAL_PERSONAS/);
assert.doesNotMatch(personas, /Bot 1|Demo User|Seed User|Fake Member/i);

assert.match(seed, /ensureDefaultCommunityWorkspace/);
assert.match(seed, /communityEditorialSettings/);
assert.match(seed, /editorialPostAttachments/);
assert.match(seed, /from\("communities"\)/);
assert.match(seed, /from\("community_posts"\)/);
assert.match(seed, /from\("community_post_comments"\)/);
assert.match(seed, /from\("community_messages"\)/);
assert.match(seed, /forex-hub/);
assert.match(seed, /gcs-unity/);
assert.match(seed, /ensurePersonas|ALL_EDITORIAL_PERSONAS/);
assert.match(seed, /editorialPersonaEmail/);
assert.match(seed, /auth\.admin\.createUser/);
assert.match(seed, /jimvio_editorial|origin: "editorial"/);
assert.doesNotMatch(seed, /DISABLE ROW LEVEL SECURITY/);
assert.doesNotMatch(seed, /Bot 1|Demo User 2|Fake Member/i);

assert.match(settingsPatch, /mergeCommunitySettingsPreservingProvenance/);
assert.match(settingsForm, /Jimvio editorial community/);
assert.doesNotMatch(settingsForm, /fake user|seed script|demo database/i);

assert.match(categories, /"News"/);
assert.match(categories, /"Faith"/);

assert.match(feed, /jimvioPromotionLabel/);
assert.match(feed, /post\.title/);
assert.match(feedCard, /promotionLabel/);
assert.match(feedCard, /jimvioPromotionLabel/);

assert.match(platform, /order\("is_featured"/);
assert.match(platform, /homepage-communities-v9/);
assert.match(platform, /getPublicCommunitiesTotal/);

const explore = read("app/communities/(discovery)/explore/page.tsx");
assert.match(explore, /getPublicCommunitiesTotal/);
assert.match(explore, /Suspense/);

const discovery = read("components/community/communities-discovery.tsx");
assert.match(discovery, /IntersectionObserver/);
assert.match(discovery, /Load more communities/);
assert.match(discovery, /reached the end of discoverable communities/);
assert.match(discovery, /useSearchParams/);

const migrations = fs
  .readdirSync(path.join(root, "supabase", "migrations"))
  .filter((name) => /editorial|seeded-community|community-experiences/i.test(name));
assert.equal(migrations.length, 0, "no editorial community migration should exist");

console.log("verify-community-editorial-experiences: ok");
