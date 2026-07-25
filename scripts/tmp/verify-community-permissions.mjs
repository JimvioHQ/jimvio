/**
 * Static Community permission matrix verification (no network / no secrets).
 * Ensures ROLE_CAPABILITIES stay coherent for certification gates.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const permsPath = path.join(root, "lib/community/workspace/permissions.ts");
const accessPath = path.join(root, "services/accessControl.ts");
const storefrontPath = path.join(
  root,
  "components/community/commerce/CommunityStorefront.tsx"
);
const overviewPath = path.join(
  root,
  "components/community/hub/hub-community-overview.tsx"
);
const osPath = path.join(
  root,
  "components/community/os/CreatorOSDashboard.tsx"
);

const perms = fs.readFileSync(permsPath, "utf8");
const access = fs.readFileSync(accessPath, "utf8");
const storefront = fs.readFileSync(storefrontPath, "utf8");
const overview = fs.readFileSync(overviewPath, "utf8");
const osDash = fs.readFileSync(osPath, "utf8");

assert.match(perms, /guest: new Set\(\["community\.view", "channel\.read"\]\)/);
assert.match(perms, /member: new Set\(/);
assert.match(perms, /moderator: new Set\(/);
assert.match(perms, /owner: new Set\(/);
assert.match(perms, /"channel\.manage"/);
assert.match(perms, /"pins\.manage"/);
assert.match(perms, /"settings\.manage"/);
assert.match(perms, /"roles\.view"/);
assert.match(perms, /"roles\.manage"/);
assert.match(perms, /normalizeCapability/);
assert.match(perms, /resolveEffectiveCapabilities/);
assert.match(perms, /CAPABILITY_ALIASES/);

// Unlocked rooms must still require membership (or owner).
assert.match(access, /isMembershipActive\(membership\)/);
assert.doesNotMatch(
  access,
  /if \(!room\.is_locked\) return true;\s*\n\s*const membership/
);

// Creator OS must not hide crashes behind soft boundaries.
assert.doesNotMatch(overview, /OverviewOsSoftBoundary/);
assert.doesNotMatch(osDash, /IntelligenceSoftBoundary/);
assert.match(osDash, /CommunityIntelligenceHost/);

// Storefront must use useShallow to avoid React #185 getSnapshot loops.
assert.match(storefront, /useShallow/);
assert.match(storefront, /featuredForCommunity\(communityId\)/);

// Persist-backed store data must wait for client mount (React #418).
assert.match(storefront, /useClientReady/);
assert.match(osDash, /useClientReady/);
assert.match(
  fs.readFileSync(
    path.join(root, "components/community/intelligence/CommunityIntelligenceHost.tsx"),
    "utf8"
  ),
  /useClientReady/
);

// Member Overview is member-first — analytics/command widgets stay out of it.
assert.doesNotMatch(overview, /CreatorWorkspaceWidgets/);
assert.doesNotMatch(overview, /OnlinePresenceBar/);
assert.doesNotMatch(overview, /CreatorOSDashboard/);
assert.doesNotMatch(overview, /CommunityHealthScoreCard/);
assert.doesNotMatch(overview, /CreatorCommandCenterShell/);
assert.doesNotMatch(overview, /UnifiedCreatorCommerceShell/);
assert.match(overview, /Description|Mission|Vision|Announcements/);
assert.match(overview, /grid-cols-12/);
assert.doesNotMatch(overview, /Join General/);
assert.doesNotMatch(overview, /CreatorOSDashboard/);
assert.doesNotMatch(overview, /Latest Activity/);
assert.doesNotMatch(overview, /Latest Activity/);
assert.doesNotMatch(overview, /Health Score|Community Score|CreatorOSDashboard/);
assert.match(overview, /Owner Console/);
assert.match(
  fs.readFileSync(
    path.join(root, "components/community/owner-console/OwnerDashboardShell.tsx"),
    "utf8"
  ),
  /Owner-only analytics/
);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/community/presence/use-community-presence.ts"),
    "utf8"
  ),
  /presence:community/
);
// Creator OS shells remain available as owner/staff surfaces (not Overview).
assert.match(osDash, /CreatorCommandCenterShell/);
assert.match(osDash, /UnifiedCreatorCommerceShell/);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/command-center/providers/index.ts"),
    "utf8"
  ),
  /communityScopedProvider/
);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/community/commerce/unified/derive.ts"),
    "utf8"
  ),
  /deriveCommerceMetrics/
);
assert.match(osDash, /GlobalCreatorEconomyShell/);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/community/economy/matching.ts"),
    "utf8"
  ),
  /localCreatorMatchProvider/
);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/community/economy/opportunities.ts"),
    "utf8"
  ),
  /deriveOpportunities/
);
assert.match(osDash, /AiNativePlatformShell/);
assert.match(
  fs.readFileSync(path.join(root, "lib/ai/native/registry.ts"), "utf8"),
  /getAiContentProvider/
);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/command-center/providers/nl-intent.ts"),
    "utf8"
  ),
  /nlIntentSearchProvider/
);
assert.match(osDash, /LiveCommerceNetworkShell/);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/community/live-network/providers.ts"),
    "utf8"
  ),
  /livekitMediaProvider/
);

console.log("Community permission + Creator OS certification gates passed.");
