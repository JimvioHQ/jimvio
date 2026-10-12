import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  centsToUsd,
  cpmRewardCents,
  fixedRewardCents,
  parseAcceptedViews,
  quoteSubmissionReward,
} from "./submission-reward";

describe("ugc submission rewards", () => {
  it("calculates CPM from accepted views and rounds to cents", () => {
    assert.equal(cpmRewardCents(1500, 3), 450);
    assert.equal(centsToUsd(cpmRewardCents(333, 3)), 1);
    assert.equal(cpmRewardCents(0, 3), 0);
  });

  it("calculates a fixed per-clip reward without the CPM formula", () => {
    assert.equal(fixedRewardCents(50), 5000);
    const quote = quoteSubmissionReward({
      paymentModel: "fixed_per_content",
      ratePer1k: 9,
      fixedRate: 50,
      maxPayoutPerSub: null,
      acceptedViews: 999999,
      remainingBudget: 500,
    });
    assert.equal(quote.ok, true);
    if (quote.ok) assert.equal(quote.payableCents, 5000);
  });

  it("rejects negative, fractional, and overflowing view counts", () => {
    assert.equal(parseAcceptedViews(-1).ok, false);
    assert.equal(parseAcceptedViews(1.5).ok, false);
    assert.equal(parseAcceptedViews("nope").ok, false);
    assert.equal(parseAcceptedViews(3_000_000_000).ok, false);
    assert.deepEqual(parseAcceptedViews(0), { ok: true, views: 0 });
  });

  it("blocks CPM quotes that exceed the remaining budget when nothing remains", () => {
    const quote = quoteSubmissionReward({
      paymentModel: "per_views",
      ratePer1k: 10,
      fixedRate: 0,
      maxPayoutPerSub: null,
      acceptedViews: 5000,
      remainingBudget: 0,
    });
    assert.equal(quote.ok, false);
  });

  it("caps a fixed reward at the per-submission maximum", () => {
    const quote = quoteSubmissionReward({
      paymentModel: "fixed_per_content",
      ratePer1k: 9,
      fixedRate: 50,
      maxPayoutPerSub: 20,
      acceptedViews: null,
      remainingBudget: 100,
    });
    assert.equal(quote.ok, true);
    if (!quote.ok) return;
    assert.equal(quote.payableCents, 2000);
    assert.equal(quote.cappedBy, "max_payout");
    assert.equal(centsToUsd(quote.payableCents), 20);
  });

  it("does not invent a formula for an unknown payment model", () => {
    const quote = quoteSubmissionReward({
      paymentModel: "revenue_share",
      ratePer1k: 3,
      fixedRate: 10,
      maxPayoutPerSub: null,
      acceptedViews: 1000,
      remainingBudget: 100,
    });
    assert.equal(quote.ok, false);
  });
});

describe("ugc discover heading", () => {
  it("places the heading on a white page, not inside a card or color wash", () => {
    const page = readFileSync(
      join(process.cwd(), "components/ugc/workspace/UGCDiscoverPage.tsx"),
      "utf8",
    );
    const css = readFileSync(join(process.cwd(), "styles/globals.css"), "utf8");
    assert.match(page, /ugc-discover-page/);
    assert.match(page, /ugc-discover-heading/);
    assert.doesNotMatch(page, /ugc-discover-surface/);
    const pageAt = page.indexOf("ugc-discover-page");
    const headingAt = page.indexOf("ugc-discover-heading");
    const heroAt = page.indexOf("<UGCHeroHeader");
    assert.ok(pageAt > 0 && headingAt > pageAt && heroAt > headingAt);
    const headingRule = css.slice(css.indexOf(".ugc-discover-heading {"), css.indexOf(".ugc-discover-heading {") + 180);
    assert.match(headingRule, /background:\s*none/);
    assert.match(headingRule, /border-radius:\s*0/);
    const surface = css.slice(css.indexOf(".ugc-discover-page {"), css.indexOf(".ugc-discover-page {") + 220);
    assert.match(surface, /background:\s*#ffffff/);
    assert.doesNotMatch(surface, /linear-gradient|fff3df|ffe4c8/i);
  });
});

describe("ugc campaign detail honesty", () => {
  it("does not invent location, language, review time, or a payout guarantee", () => {
    const hero = readFileSync(
      join(process.cwd(), "components/ugc/campaign-detail/CampaignDetailHero.tsx"),
      "utf8",
    );
    const faqs = readFileSync(join(process.cwd(), "lib/ugc/campaign-detail.ts"), "utf8");
    const sidebar = readFileSync(
      join(process.cwd(), "components/ugc/campaign-detail/CampaignDetailSidebar.tsx"),
      "utf8",
    );
    assert.doesNotMatch(hero, />\s*Global\s*</);
    assert.doesNotMatch(hero, />\s*English\s*</);
    assert.doesNotMatch(faqs, /1–4 business days/);
    assert.doesNotMatch(faqs, /Is payment guaranteed/);
    assert.doesNotMatch(sidebar, /rate_per_1k_views \* 10/);
    assert.match(sidebar, /not your current earnings/);
  });

  it("styles featured carousel controls as buttons with labels", () => {
    const header = readFileSync(
      join(process.cwd(), "components/ugc/workspace/UGCFeaturedHeader.tsx"),
      "utf8",
    );
    assert.match(header, /aria-label="Previous campaign"/);
    assert.match(header, /aria-label="Next campaign"/);
    assert.match(header, /e\.key === "ArrowLeft"/);
    assert.match(header, /e\.key === "ArrowRight"/);
    assert.match(header, /focus-visible:ring-2/);
    assert.match(header, /bg-white text-\[#111827\]/);
    assert.doesNotMatch(header, /linear-gradient\(145deg, #FF5A1F/);
    assert.doesNotMatch(header, />\s*[<>]\s*</);
  });
});
