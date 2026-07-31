/**
 * Community QA: Create Space UI must align with group.create capability
 * (moderators are isAdmin but must not see create controls that 403).
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

const spacesSection = read(
  "components/community/workspace/sections/SpacesSection.tsx"
);
assert.match(spacesSection, /hasCapability/);
assert.match(spacesSection, /group\.create/);
assert.doesNotMatch(
  spacesSection,
  /const canCreate = isOwner \|\| isAdmin/
);

const sidebar = read("components/shell/CommunitySidebar.tsx");
assert.match(sidebar, /hasCapability/);
assert.match(sidebar, /group\.create/);
assert.doesNotMatch(
  sidebar,
  /canManage = Boolean\(workspace\?\.isOwner \|\| workspace\?\.isAdmin\)/
);

const overview = read("components/community/hub/hub-community-overview.tsx");
assert.match(overview, /canCreateSpace/);
assert.match(overview, /group\.create/);

const settings = read("app/communities/(hubs)/[slug]/settings/page.tsx");
assert.match(settings, /settings\.view/);
assert.match(settings, /moderation/);
assert.doesNotMatch(
  settings,
  /membership\.role === "moderator".*redirect\(sectionPath\("settings"/s
);

const posting = read("lib/community/workspace/channel-posting.ts");
assert.match(posting, /isGroupDiscussionRoom/);
assert.match(posting, /DISCUSSION_PERMISSION_CONFIG/);

const mappers = read("lib/community/workspace/mappers.ts");
assert.match(mappers, /room,/);

console.log("verify-community-qa-hardening: ok");
