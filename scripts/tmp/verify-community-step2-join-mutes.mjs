/**
 * Static verification for Community Step-2 join / mute / types wiring.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mustExist = [
  "app/api/communities/[slug]/join-request/route.ts",
  "app/api/c/spaces/[id]/join/route.ts",
  "app/api/c/notification-mutes/route.ts",
  "lib/community/space-access.ts",
  "lib/community/notification-mutes.ts",
  "database/migrations/104_community_notification_mutes.sql",
];

const mustContain = [
  [
    "app/api/communities/[slug]/join/route.ts",
    "join_request_required",
  ],
  [
    "components/community/community-detail-view.tsx",
    "/join-request",
  ],
  [
    "components/community/workspace/group/GroupWorkspace.tsx",
    "/api/c/spaces/",
  ],
  [
    "components/shell/PrimarySidebar.tsx",
    "No communities yet",
  ],
  [
    "app/api/c/owner/groups/[id]/members/route.ts",
    "revokeSpaceAccess",
  ],
  [
    "components/community/chat/message-engine/MessageCard.tsx",
    'aria-label="Delivered"',
  ],
  [
    "types/supabase.ts",
    "live_sessions:",
  ],
  [
    "types/supabase.ts",
    "notification_mutes:",
  ],
];

let failed = false;
for (const rel of mustExist) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error("MISSING", rel);
    failed = true;
  }
}
for (const [rel, needle] of mustContain) {
  const p = path.join(root, rel);
  const text = fs.readFileSync(p, "utf8");
  if (!text.includes(needle)) {
    console.error("MISSING CONTENT", rel, "→", needle);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log("verify-community-step2-join-mutes: ok");
