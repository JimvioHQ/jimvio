import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AFFILIATE_AI_PROVIDER,
  affiliateGeminiConfig,
  createAffiliatePromotionResponse,
  selectGenerationBackend,
  type AffiliatePromotionKit,
} from "./affiliate-gemini";
import { GEMINI_API_KEY_ENV, GEMINI_FALLBACK_MODEL } from "./gemini-model";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE_KEY = "AIzaSyFIXTUREKEY1234567890";

const kit: AffiliatePromotionKit = {
  tiktokCaption: "TikTok caption",
  instagramCaption: "Instagram caption",
  youtubeTitle: "YouTube title",
  facebookPost: "Facebook post",
  threadsPost: "Threads post",
  xPost: "X post",
  emailCopy: "Email copy",
  blogIntro: "Blog intro",
  seoTitle: "SEO title",
  keywords: ["boots"],
  hashtags: ["#boots"],
  hooks: ["Look at these boots"],
  scripts: ["15 second script"],
};

const params = {
  productName: "Platform boots",
  category: "Shoes",
  price: 42,
  currency: "USD",
  commissionRate: 20,
  features: ["<b>Side zipper</b>"],
  description: "<p>Black mid heel</p><img src=\"https://cf.cjdropshipping.com/a.jpg\">",
};

function noWait() {
  return async () => undefined;
}

describe("affiliate Gemini provider", () => {
  it("selects Gemini for both affiliate promotion entry points", () => {
    assert.equal(selectGenerationBackend("affiliate_promotion"), "gemini");
    assert.equal(selectGenerationBackend("product_description"), "openai");
    assert.equal(AFFILIATE_AI_PROVIDER, "gemini");
    const promote = readFileSync(
      join(root, "components/affiliate/AffiliatePromoteProductClient.tsx"),
      "utf8",
    );
    const studio = readFileSync(join(root, "components/affiliate/AffiliateAiClient.tsx"), "utf8");
    const route = readFileSync(join(root, "app/api/ai/generate/route.ts"), "utf8");
    assert.match(promote, /type: "affiliate_promotion"/);
    assert.match(promote, /productId: product.id/);
    assert.match(studio, /type: "affiliate_promotion"/);
    assert.match(studio, /productId: selected.id/);
    assert.match(studio, /Continue in Jimvio AI|AffiliateAiRecovery/);
    assert.match(promote, /AffiliateAiRecovery/);
    assert.match(route, /createAffiliatePromotionResponse/);
    assert.match(route, /loadAffiliateProductContext/);
    const affiliateBranch = route.slice(
      route.indexOf('params.type === "affiliate_promotion"'),
      route.indexOf("const provider = getAiProviderStatus"),
    );
    assert.doesNotMatch(affiliateBranch, /params\.price|openai|aiService/);
    assert.doesNotMatch(
      route.slice(0, route.indexOf("const provider = getAiProviderStatus")),
      /getAiProviderStatus\(/,
    );
  });

  it("reads the Gemini key on the server without returning it", async () => {
    const config = affiliateGeminiConfig({
      [GEMINI_API_KEY_ENV]: FIXTURE_KEY,
    });
    assert.equal(config.configured, true);
    assert.equal(config.keyEnv, "GOOGLE_GENERATIVE_AI_API_KEY");
    assert.equal(config.model, "gemini-2.5-flash-lite");
    let seenPrompt = "";
    const result = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      complete: async (request) => {
        seenPrompt = request.prompt;
        assert.equal(request.model, "gemini-2.5-flash-lite");
        return JSON.stringify(kit);
      },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.provider, "gemini");
    assert.equal(result.body.data?.tiktokCaption, kit.tiktokCaption);
    assert.equal(result.body.data?.hooks[0], kit.hooks[0]);
    assert.equal(result.body.data?.hashtags[0], kit.hashtags[0]);
    assert.equal(result.body.data?.scripts[0], kit.scripts[0]);
    assert.equal(JSON.stringify(result).includes(FIXTURE_KEY), false);
    assert.equal(seenPrompt.includes(FIXTURE_KEY), false);
    assert.match(seenPrompt, /Black mid heel/);
    assert.doesNotMatch(seenPrompt, /<img/);
  });

  it("reports Gemini quota without retrying or mentioning OpenAI", async () => {
    let calls = 0;
    const result = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      complete: async () => {
        calls += 1;
        throw new Error(`429 You exceeded your current quota for key=${FIXTURE_KEY}`);
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.status, 429);
    assert.equal(result.body.code, "quota");
    assert.match(String(result.body.error), /Gemini/);
    assert.doesNotMatch(String(result.body.error), /OpenAI|AI_GATEWAY|AIza/);
    assert.equal(JSON.stringify(result).includes(FIXTURE_KEY), false);
  });

  it("fails closed when Gemini credentials are missing", async () => {
    let calls = 0;
    const result = await createAffiliatePromotionResponse(params, {
      env: {},
      sleep: noWait(),
      complete: async () => {
        calls += 1;
        return JSON.stringify(kit);
      },
    });
    assert.equal(calls, 0);
    assert.equal(result.status, 503);
    assert.equal(result.body.code, "unconfigured");
    assert.match(String(result.body.error), /Gemini/);
    assert.equal(result.body.providerReady, false);
  });

  it("retries transient failures and a retired model, then accepts a valid kit", async () => {
    let calls = 0;
    const recovered = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      complete: async () => {
        calls += 1;
        if (calls < 3) throw new Error("503 Service Unavailable");
        return JSON.stringify(kit);
      },
    });
    assert.equal(calls, 3);
    assert.equal(recovered.status, 200);

    const models: string[] = [];
    const fallback = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      complete: async (request) => {
        models.push(request.model);
        if (request.model !== GEMINI_FALLBACK_MODEL) throw new Error("404 model not found");
        return JSON.stringify(kit);
      },
    });
    assert.deepEqual(models, ["gemini-2.5-flash-lite", GEMINI_FALLBACK_MODEL]);
    assert.equal(fallback.status, 200);
  });

  it("retries a rate limit once and rejects invalid output without crashing", async () => {
    let limited = 0;
    const rateLimited = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      complete: async () => {
        limited += 1;
        throw new Error("429 rate limit exceeded");
      },
    });
    assert.equal(limited, 2);
    assert.equal(rateLimited.body.code, "rate_limit");
    assert.match(String(rateLimited.body.error), /Gemini/);

    let invalid = 0;
    const bad = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      complete: async () => {
        invalid += 1;
        return "not json";
      },
    });
    assert.equal(invalid, 1);
    assert.equal(bad.status, 502);
    assert.equal(bad.body.code, "invalid_output");
    assert.equal(bad.body.workspaceFallback, true);
    assert.equal(bad.body.data, undefined);
    assert.doesNotMatch(String(bad.body.error), /not json|stack/i);
  });

  it("uses the workspace model catalog once and offers Jimvio AI after quota or provider failure", async () => {
    let calls = 0;
    const quota = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      listModels: async () => ({ models: [], category: "rate_limit", detail: "quota exceeded" }),
      complete: async () => {
        calls += 1;
        return JSON.stringify(kit);
      },
    });
    assert.equal(calls, 0);
    assert.equal(quota.body.code, "quota");
    assert.equal(quota.body.workspaceFallback, true);
    assert.doesNotMatch(String(quota.body.error), /OpenAI/);

    const models: string[] = [];
    const selected = await createAffiliatePromotionResponse(params, {
      env: { [GEMINI_API_KEY_ENV]: FIXTURE_KEY },
      sleep: noWait(),
      listModels: async () => ({ models: ["gemini-2.5-flash"] }),
      complete: async (request) => {
        models.push(request.model);
        return JSON.stringify(kit);
      },
    });
    assert.deepEqual(models, ["gemini-2.5-flash"]);
    assert.equal(selected.status, 200);
    assert.equal(selected.body.workspaceFallback, undefined);
  });
});
