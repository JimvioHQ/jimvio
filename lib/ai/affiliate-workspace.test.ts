import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { assembleAffiliateProductContext } from "./affiliate-product-facts.ts";
import {
  signAffiliatePromotionTask,
  verifyAffiliatePromotionTask,
} from "./affiliate-task-token.ts";
import {
  beginAffiliateWorkspaceHandoff,
  consumeAffiliateAutoStart,
  decideAffiliateAutoStart,
  readAffiliateHandoff,
  readConsumedAffiliateAutoStarts,
  shouldAutoRetryAffiliateProvider,
  shouldOfferAffiliateWorkspace,
  writeAffiliateHandoff,
  type AffiliateMemoryStorage,
} from "./affiliate-workspace.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function memory(): AffiliateMemoryStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("affiliate workspace fallback", () => {
  it("offers the existing workspace after provider failure and does not auto-retry", () => {
    assert.equal(shouldOfferAffiliateWorkspace(502, "provider"), true);
    assert.equal(shouldOfferAffiliateWorkspace(429, "quota"), true);
    assert.equal(shouldOfferAffiliateWorkspace(503, "unconfigured"), true);
    assert.equal(shouldOfferAffiliateWorkspace(401, "unauthorized"), false);
    assert.equal(shouldAutoRetryAffiliateProvider(), false);
    const client = readFileSync(join(root, "components/affiliate/AffiliateAiClient.tsx"), "utf8");
    const chat = readFileSync(join(root, "app/api/ai/chat/route.ts"), "utf8");
    assert.match(client, /AffiliateAiRecovery/);
    assert.doesNotMatch(client, /openai|OPENAI/);
    assert.match(chat, /verifyAffiliatePromotionTask/);
    assert.equal(chat.includes("openai"), false);
  });

  it("preserves the product id and skips automatic handoff after a successful generation", () => {
    assert.equal(
      beginAffiliateWorkspaceHandoff({
        succeeded: true,
        productId: "prod-1",
        returnPath: "/affiliates/ai",
      }),
      null,
    );
    const handoff = beginAffiliateWorkspaceHandoff({
      succeeded: false,
      productId: "prod-1",
      returnPath: "/affiliates/promote/boots",
      platform: "TikTok",
      now: 10,
      id: "attempt-1",
    });
    assert.ok(handoff);
    assert.equal(handoff?.productId, "prod-1");
    assert.equal(handoff?.autoGenerate, true);
    assert.equal(handoff?.platform, "TikTok");
    const storage = memory();
    writeAffiliateHandoff(handoff!, storage);
    assert.equal(readAffiliateHandoff(storage)?.id, "attempt-1");
  });

  it("starts generation once, then keeps the task ready for a manual Generate", () => {
    const storage = memory();
    const handoff = { id: "attempt-1", autoGenerate: true as const };
    assert.equal(
      decideAffiliateAutoStart({
        handoff,
        consumedIds: [],
        contextReady: true,
        sending: false,
      }),
      "start",
    );
    consumeAffiliateAutoStart(handoff.id, storage);
    assert.equal(
      decideAffiliateAutoStart({
        handoff,
        consumedIds: readConsumedAffiliateAutoStarts(storage),
        contextReady: true,
        sending: false,
      }),
      "manual",
    );
    assert.equal(
      decideAffiliateAutoStart({
        handoff,
        consumedIds: [],
        contextReady: false,
        sending: false,
      }),
      "manual",
    );
  });

  it("uses the database product instead of a client-supplied price", () => {
    const clientPrice = 1;
    void clientPrice;
    const context = assembleAffiliateProductContext(
      {
        id: "prod-1",
        slug: "platform-boots",
        name: "Platform boots",
        description: "<p>Black mid heel</p>",
        price: 42,
        currency: "USD",
        affiliate_enabled: true,
        affiliate_commission_rate: 20,
        features: ["Side zipper"],
        images: ["https://cdn.example.com/boot.jpg"],
      },
      { trackingPath: "/ref/abc", siteUrl: "https://www.jimvio.com" },
    );
    assert.ok(context);
    assert.equal(context?.price, 42);
    assert.equal(context?.commissionPercent, 20);
    assert.equal(context?.productUrl, "https://www.jimvio.com/marketplace/platform-boots");
    assert.equal(context?.trackingUrl, "https://www.jimvio.com/ref/abc");
    assert.equal(context?.imageUrls[0], "https://cdn.example.com/boot.jpg");
    assert.match(context?.description ?? "", /Black mid heel/);
    assert.equal(context?.price === clientPrice, false);
  });

  it("rejects a tampered promotion task and accepts a signed one", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "fixture-cron-secret-value";
    try {
      const context = assembleAffiliateProductContext(
        {
          id: "prod-1",
          slug: "platform-boots",
          name: "Platform boots",
          description: "Black mid heel",
          price: 42,
          currency: "USD",
          affiliate_enabled: true,
          affiliate_commission_rate: 20,
        },
        { siteUrl: "https://www.jimvio.com" },
      );
      assert.ok(context);
      const token = signAffiliatePromotionTask(context!, 1_000);
      assert.ok(token);
      const verified = verifyAffiliatePromotionTask(token, 1_000);
      assert.equal(verified?.productId, "prod-1");
      assert.match(verified?.addendum ?? "", /USD 42/);
      assert.match(verified?.addendum ?? "", /20%/);
      const [body, sig] = token!.split(".");
      assert.equal(verifyAffiliatePromotionTask(`${body}x.${sig}`, 1_000), null);
      assert.equal(verifyAffiliatePromotionTask(token, 1_000 + 31 * 60 * 1000), null);
    } finally {
      if (previous == null) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});
