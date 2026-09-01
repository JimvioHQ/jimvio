/**
 * Community Owner Console Foundation smoke checks — no network.
 * Routes live under /owner/communities/[communitySlug].
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const consoleRoot = "app/owner/communities/[communitySlug]";

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const nav = mustExist("lib/community/owner-console/nav.ts");
const access = mustExist("lib/community/owner-console/access.ts");
const store = mustExist("lib/community/owner-console/store.ts");
const metrics = mustExist("lib/community/owner-console/dashboard-metrics.ts");
const index = mustExist("lib/community/owner-console/index.ts");
const layoutUi = mustExist(
  "components/community/owner-console/OwnerConsoleLayout.tsx"
);
const sidebar = mustExist(
  "components/community/owner-console/OwnerConsoleSidebar.tsx"
);
const topbar = mustExist(
  "components/community/owner-console/OwnerConsoleTopBar.tsx"
);
const dash = mustExist(
  "components/community/owner-console/OwnerDashboardShell.tsx"
);
const section = mustExist(
  "components/community/owner-console/OwnerSectionShell.tsx"
);
const gate = mustExist(
  "components/community/owner-console/OwnerConsoleClientGate.tsx"
);
const appLayout = mustExist(`${consoleRoot}/layout.tsx`);
const overview = mustExist(`${consoleRoot}/page.tsx`);
const spaces = mustExist(`${consoleRoot}/spaces/page.tsx`);
const groups = mustExist(`${consoleRoot}/groups/page.tsx`);
const members = mustExist(`${consoleRoot}/members/page.tsx`);
const settings = mustExist(`${consoleRoot}/settings/page.tsx`);
const moderation = mustExist(`${consoleRoot}/moderation/page.tsx`);
const analytics = mustExist(`${consoleRoot}/analytics/page.tsx`);
const roles = mustExist(`${consoleRoot}/roles/page.tsx`);
const hub = mustExist("app/owner/communities/page.tsx");
const hubClient = mustExist("components/dashboard/my-communities-client.tsx");
const legacyRedirect = mustExist("app/community-owner/[[...rest]]/page.tsx");
const wsTypes = mustExist("lib/community/workspace/types.ts");
const perms = mustExist("lib/community/workspace/permissions.ts");

assert.match(nav, /OWNER_CONSOLE_BASE/);
assert.match(nav, /OWNER_CONSOLE_HUB/);
assert.match(nav, /ownerConsoleHref/);
assert.match(nav, /\/owner\/communities/);
assert.match(nav, /OWNER_NAV_ITEMS/);
assert.match(nav, /OWNER_NAV_SECTIONS/);
assert.match(nav, /OWNER_QUICK_ACTIONS/);
assert.match(nav, /moderation/);
assert.match(nav, /automations/);
assert.match(nav, /audit/);
assert.match(nav, /Community Settings/);
assert.match(access, /listManageableCommunities/);
assert.match(access, /canEnterOwnerConsole/);
assert.match(access, /hasCapability|resolveWorkspaceRole/);
assert.match(access, /ownerConsoleHref/);
assert.match(store, /useOwnerConsoleUiStore/);
assert.match(metrics, /buildOwnerDashboardMetrics/);
assert.match(index, /export/);
assert.match(layoutUi, /OwnerConsoleSidebar/);
assert.match(layoutUi, /OwnerConsoleTopBar/);
assert.match(layoutUi, /OwnerConsoleSidebar|OwnerConsoleTopBar/);
assert.match(sidebar, /Manage Community|aria-|Search console|Collapse|Overview/i);
assert.match(sidebar, /Overview|Dashboard/);
assert.match(topbar, /Quick search|Notifications|ROLE_LABELS/i);
assert.match(dash, /Quick [Aa]ctions/);
assert.match(dash, /Community Settings|Community Tools|Spaces Management|Manage Community/);
assert.match(metrics, /Active community roster|Community members|buildOwnerDashboardMetrics/);
assert.match(metrics, /Open Reports|Pending Reports|Needs moderation|Queue clear/);
assert.match(section, /OwnerSectionShell/);
assert.match(gate, /communitySlug/);
assert.match(appLayout, /listManageableCommunities/);
assert.match(appLayout, /communitySlug/);
assert.match(overview, /OwnerDashboardShell/);
assert.match(spaces, /sectionId="spaces"/);
assert.match(spaces, /GroupsManagement/);
assert.match(groups, /permanentRedirect/);
assert.match(nav, /Create Space/);
assert.doesNotMatch(nav, /label: "Create Group"/);
assert.doesNotMatch(nav, /label: "Create Channel"/);
assert.match(members, /sectionId="members"/);
assert.match(settings, /sectionId="settings"/);
assert.match(moderation, /sectionId="moderation"/);
assert.match(analytics, /sectionId="analytics"/);
assert.match(roles, /sectionId="roles"/);
assert.match(hub, /MyCommunitiesClient/);
assert.match(hubClient, /Community Hub|ownerConsoleHref/);
assert.match(hubClient, /Manage/);
assert.match(legacyRedirect, /ownerConsoleHref/);
assert.match(wsTypes, /mentor/);
assert.match(wsTypes, /vip/);
assert.match(wsTypes, /CustomRoleDefinition/);
assert.match(perms, /mentor:/);
assert.match(perms, /vip:/);

const requiredRoutes = [
  "channels",
  "content",
  "courses",
  "events",
  "live",
  "commerce",
  "ai",
  "automations",
  "security",
  "integrations",
  "audit",
];
for (const r of requiredRoutes) {
  mustExist(`${consoleRoot}/${r}/page.tsx`);
}

assert.doesNotMatch(access, /fork ChatRoom/i);
assert.doesNotMatch(layoutUi, /new WebSocket/);
assert.doesNotMatch(hubClient, /\/creator\/\$\{.*\}\/dashboard/);

console.log("Community owner console foundation verification passed.");
