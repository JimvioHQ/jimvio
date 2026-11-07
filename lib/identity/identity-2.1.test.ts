import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCanonicalIdentityType,
  resolvePrimaryIdentityLabel,
  shouldShowCreatorProgramBadge,
} from "@/lib/identity/identity-types";
import { formatPublicCountry, shortBioPreview } from "@/lib/identity/public-location";
import {
  modulePresenceFromSnapshots,
  toPublicModuleSlice,
  type ModuleSnapshots,
} from "@/lib/identity/module-snapshots";

describe("identity types", () => {
  it("recognizes canonical identity types", () => {
    assert.equal(isCanonicalIdentityType("Entrepreneur"), true);
    assert.equal(isCanonicalIdentityType("Investing services"), false);
  });

  it("preserves legacy industry labels", () => {
    assert.equal(resolvePrimaryIdentityLabel(["Investing services"]), "Investing services");
    assert.equal(resolvePrimaryIdentityLabel(["Entrepreneur"]), "Entrepreneur");
  });

  it("only shows creator badge for creator identities or earned influencers", () => {
    assert.equal(shouldShowCreatorProgramBadge("Entrepreneur"), false);
    assert.equal(shouldShowCreatorProgramBadge("Creator"), true);
    assert.equal(
      shouldShowCreatorProgramBadge("Professional", { isInfluencer: true, xp: 50 }),
      false,
    );
    assert.equal(
      shouldShowCreatorProgramBadge("Professional", { isInfluencer: true, xp: 1500 }),
      true,
    );
  });
});

describe("public location", () => {
  it("formats ISO codes as canonical country names", () => {
    assert.equal(formatPublicCountry("RW"), "Rwanda");
    assert.equal(formatPublicCountry("AE"), "United Arab Emirates");
  });

  it("strips city from city, CODE combinations", () => {
    assert.equal(formatPublicCountry("Kigali, RW"), "Rwanda");
  });

  it("keeps full country names", () => {
    assert.equal(formatPublicCountry("Rwanda"), "Rwanda");
  });

  it("builds a short bio preview", () => {
    const bio = "Forex trader helping people build wealth. More details here.";
    assert.equal(shortBioPreview(bio), "Forex trader helping people build wealth.");
  });
});

describe("module public privacy", () => {
  const sample: ModuleSnapshots = {
    ugc: {
      isOwner: true,
      ownedCampaigns: [
        {
          campaignId: "c1",
          title: "Owned",
          description: null,
          status: "active",
          coverImage: null,
          createdAt: null,
        },
      ],
      isCreator: true,
      recentCampaigns: [],
      recentSubmissions: [],
    },
    affiliate: {
      isAffiliate: true,
      affiliateCode: "SECRET",
      tier: "silver",
      totalClicks: 99,
      totalConversions: 12,
      totalEarnings: 500,
      pendingEarnings: 40,
      availableBalance: 100,
    },
    marketplace: {
      isVendor: true,
      businessName: "Prime Store",
      businessSlug: "prime-store",
      productsCount: 8,
      totalRevenue: 1200,
      totalSales: 44,
    },
    community: {
      communitiesManaged: [
        {
          communityId: "x",
          name: "Owned Comm",
          slug: "owned",
          avatarUrl: null,
          description: null,
          role: "owner",
          memberCount: 3,
        },
      ],
      communitiesJoined: [],
    },
    computedAt: new Date().toISOString(),
  };

  it("reports presence from owned data only", () => {
    const presence = modulePresenceFromSnapshots(sample);
    assert.equal(presence.ugc, true);
    assert.equal(presence.affiliate, true);
    assert.equal(presence.marketplace, true);
    assert.equal(presence.community, true);
    assert.equal(presence.any, true);
  });

  it("strips affiliate financials and codes from public slice", () => {
    const pub = toPublicModuleSlice("affiliate", sample) as typeof sample.affiliate;
    assert.equal(pub.isAffiliate, true);
    assert.equal(pub.tier, "silver");
    assert.equal(pub.affiliateCode, null);
    assert.equal(pub.totalEarnings, 0);
    assert.equal(pub.totalClicks, 0);
  });

  it("strips marketplace sales metrics from public slice", () => {
    const pub = toPublicModuleSlice("marketplace", sample) as typeof sample.marketplace;
    assert.equal(pub.isVendor, true);
    assert.equal(pub.businessName, "Prime Store");
    assert.equal(pub.productsCount, 0);
    assert.equal(pub.totalSales, 0);
    assert.equal(pub.totalRevenue, 0);
  });
});
