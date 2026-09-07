/**
 * Static + unit gate for UGC Discover campaign card polish.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

async function loadTs(rel) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const src = read(rel);
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: path.basename(rel),
  });
  const out = path.join(
    os.tmpdir(),
    `${path.basename(rel, ".ts")}-${process.pid}-${Math.random().toString(16).slice(2)}.mjs`,
  );
  fs.writeFileSync(out, outputText);
  try {
    return await import(pathToFileURL(out).href);
  } finally {
    try {
      fs.unlinkSync(out);
    } catch {
      /* ignore */
    }
  }
}

const card = read("components/ugc/workspace/UGCPremiumCampaignCard.tsx");
const marks = read("components/ugc/workspace/UGCPlatformMarks.tsx");
const discover = read("components/ugc/workspace/UGCDiscoverPage.tsx");
const hero = read("components/ugc/workspace/UGCPremiumFeaturedHero.tsx");
const carousel = read("components/ugc/workspace/UGCFeaturedCarousel.tsx");

assert.match(card, /bg-\[#FF5A1F\]/);
assert.match(card, /formatUgcFundingUsd/);
assert.match(card, /getClipRateBadge/);
assert.match(card, /group-hover\/card:opacity-100/);
assert.match(card, /group-focus-within\/card:opacity-100/);
assert.match(card, /bg-\[#EBF5FF\]/);
assert.match(card, /text-\[#1D4ED8\]/);
assert.doesNotMatch(card, /\bHeart\b/);
assert.doesNotMatch(card, /\bBookmark\b/);
assert.doesNotMatch(card, /Live/);
assert.doesNotMatch(card, /formatCreatorCount/);
assert.doesNotMatch(card, /getDaysRemaining/);
assert.doesNotMatch(card, /submission_count/);

assert.match(marks, /#FF0000/);
assert.match(marks, /#1877F2/);
assert.match(marks, /#9146FF/);
assert.match(marks, /#FFFC00/);
assert.match(marks, /#FE2C55/);
assert.match(marks, /ugc-ig-grad/);
assert.doesNotMatch(marks, /text-\[#111827\]/);

assert.match(discover, /UGCFeaturedHeader/);
assert.match(discover, /featured=true/);
assert.match(discover, /UGCFeaturedHeader/);
assert.doesNotMatch(discover, /aspect-\[16\/5\]/);
assert.doesNotMatch(discover, /total > 1/);

assert.match(hero, /UGCFeaturedHeader/);
assert.doesNotMatch(hero, /from-black\/80/);

assert.match(carousel, /UGCPremiumCampaignCard/);
assert.match(carousel, /w-\[220px\]/);

const utils = await loadTs("components/ugc/workspace/ugc-campaign-utils.ts");
assert.equal(utils.formatUgcFundingUsd(0), "$0");
assert.equal(utils.formatUgcFundingUsd(5000), "$5,000");
assert.equal(utils.formatUgcFundingUsd(89767), "$89,767");
assert.equal(utils.formatUgcRateUsd(50), "$50.0");
assert.equal(utils.formatUgcRateUsd(1.5), "$1.5");
assert.equal(utils.formatUgcRateUsd(1.25), "$1.25");

assert.equal(
  utils.getClipRateBadge({
    payment_model: "fixed_per_content",
    fixed_rate: 50,
    rate_per_1k_views: 0,
  }),
  "$50.0/clip",
);
assert.equal(
  utils.getClipRateBadge({
    payment_model: "per_views",
    fixed_rate: 0,
    rate_per_1k_views: 1.5,
  }),
  "$1.5/1K",
);
assert.equal(
  utils.getClipRateBadge({
    payment_model: "fixed_per_content",
    fixed_rate: 0,
    rate_per_1k_views: 0,
  }),
  null,
);

console.log("UGC campaign card polish checks passed");
