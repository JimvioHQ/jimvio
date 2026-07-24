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

assert.match(perms, /guest: new Set\(\["channel\.read"\]\)/);
assert.match(perms, /member: new Set\(/);
assert.match(perms, /moderator: new Set\(/);
assert.match(perms, /owner: new Set\(/);
assert.match(perms, /"channel\.manage"/);
assert.match(perms, /"pins\.manage"/);
assert.match(perms, /"settings\.manage"/);

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

assert.match(
  fs.readFileSync(
    path.join(root, "components/community/hub/hub-community-overview.tsx"),
    "utf8"
  ),
  /CreatorWorkspaceWidgets/
);
assert.match(
  fs.readFileSync(
    path.join(root, "components/community/hub/hub-community-overview.tsx"),
    "utf8"
  ),
  /OnlinePresenceBar/
);
assert.match(
  fs.readFileSync(
    path.join(root, "lib/community/presence/use-community-presence.ts"),
    "utf8"
  ),
  /presence:community/
);
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

console.log("Community permission + Creator OS certification gates passed.");
