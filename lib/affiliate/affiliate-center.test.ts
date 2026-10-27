import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { mergeLinkMetrics } from "./link-metrics";
import { resolveWorkspaceNavActive, WORKSPACES } from "../workspace/config";
import { isWithinAttributionWindow } from "./attribution";

describe("affiliate link metrics merge", () => {
  it("prefers the higher of live vs denormalized counters", () => {
    assert.deepEqual(
      mergeLinkMetrics(
        { clicks: 10, conversions: 2, earnings: 5.5 },
        { clicks: 3, conversions: 4, earnings: 1 }
      ),
      { clicks: 10, conversions: 4, earnings: 5.5 }
    );
  });

  it("handles missing live metrics", () => {
    assert.deepEqual(
      mergeLinkMetrics(undefined, { clicks: 2, conversions: 1, earnings: 3 }),
      { clicks: 2, conversions: 1, earnings: 3 }
    );
  });
});

describe("affiliate workspace nav active", () => {
  it("highlights products on /affiliates hub", () => {
    assert.equal(resolveWorkspaceNavActive("/affiliates", "affiliates"), "products");
  });

  it("prefers specific affiliate routes over shared parents", () => {
    assert.equal(resolveWorkspaceNavActive("/affiliates/links", "affiliates"), "links");
    assert.equal(
      resolveWorkspaceNavActive("/affiliates/analytics", "affiliates"),
      "analytics"
    );
    assert.equal(resolveWorkspaceNavActive("/affiliates/ai", "affiliates"), "ai");
    assert.equal(
      resolveWorkspaceNavActive("/affiliates/dashboard", "affiliates"),
      "dashboard"
    );
    assert.equal(
      resolveWorkspaceNavActive("/affiliates/payouts", "affiliates"),
      "payouts"
    );
  });

  it("shows the capped affiliate offer on the AI promotion page", () => {
    const root = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(root, "../../app/(public)/affiliates/ai/page.tsx"),
      "utf8",
    );
    const client = readFileSync(
      join(root, "../../components/affiliate/AffiliateAiClient.tsx"),
      "utf8",
    );
    assert.match(source, /offerForAffiliateProduct/);
    assert.match(source, /affiliate_price/);
    assert.match(source, /earning: offer\.earningUsd/);
    assert.match(client, /formatAffiliateRate\(selected\.rate\)/);
    assert.match(client, /selected\.earning/);
    assert.doesNotMatch(source, /rate: Number\(row\.affiliate_commission_rate/);
  });

  it("stores the server offer on new links and ignores a client commission", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app/api/affiliates/links/route.ts"),
      "utf8",
    );
    assert.match(source, /offerForAffiliateProduct/);
    assert.match(source, /clientPercent: body\?\.commissionRate/);
    assert.doesNotMatch(source, /body\?\.commissionRate != null && Number\.isFinite/);
    assert.doesNotMatch(source, /commissionRate = Number\(product\.affiliate_commission_rate\)/);
  });

  it("caps the legacy order action and leaves refunds on the recorded amount", () => {
    const root = dirname(fileURLToPath(import.meta.url));
    const orders = readFileSync(join(root, "../actions/orders.ts"), "utf8");
    const commissions = readFileSync(join(root, "commissions.ts"), "utf8");
    const attribution = readFileSync(join(root, "attribution.ts"), "utf8");
    assert.match(orders, /offerForAffiliateProduct/);
    assert.doesNotMatch(orders, /\(totalPrice \* commissionRate\) \/ 100/);
    assert.match(attribution, /resolveAffiliateOffer/);
    assert.match(attribution, /isSupportedAffiliateCurrency/);
    assert.match(commissions, /original_commission_amount/);
    assert.doesNotMatch(commissions, /resolveAffiliateOffer|offerForAffiliateProduct/);
    assert.match(commissions, /if \(existing\) return \{ created: false/);
  });

  it("does not keep the affiliate sidebar promotional card", () => {
    assert.equal(WORKSPACES.affiliates.proCard, undefined);
    assert.equal(
      WORKSPACES.affiliates.sidebarSections?.some((section) =>
        section.items.some((item) => item.id === "products" && item.href === "/affiliates"),
      ),
      true,
    );
  });
});

describe("affiliate discovery route", () => {
  it("filters on the server and ignores a client commission", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app/api/affiliates/products/route.ts"),
      "utf8",
    );
    assert.match(source, /parseAffiliateDiscoveryCategory/);
    assert.match(source, /normalizeAffiliateSearch/);
    assert.match(source, /getAffiliateDiscoveryProducts/);
    assert.match(source, /Unknown affiliate category/);
    assert.doesNotMatch(source, /commissionRate|clientPercent|searchParams\.get\("rate"\)/);
  });

  it("renders an unknown category as featured without throwing a redirect", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app/(public)/affiliates/page.tsx"),
      "utf8",
    );
    assert.match(source, /replaceUrl/);
    assert.doesNotMatch(source, /redirect\(/);
    assert.match(source, /requested \?\? "featured"/);
  });

  it("keeps Promote Now on the authenticated promote route", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../components/affiliate/sections/AffiliateProducts.tsx"),
      "utf8",
    );
    assert.match(source, /\/affiliates\/promote\/\$\{product\.slug\}/);
    assert.match(source, /Promote Now/);
    assert.doesNotMatch(source, /commissionRate/);
  });
});

describe("attribution window", () => {
  it("allows missing timestamp for legacy cookies", () => {
    assert.equal(isWithinAttributionWindow(null, 30), true);
  });

  it("rejects expired attribution", () => {
    const old = Date.now() - 40 * 24 * 60 * 60 * 1000;
    assert.equal(isWithinAttributionWindow(old, 30), false);
  });
});
