#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migration = join(root, "database/migrations/103_community_member_visits.sql");

function mustExist(rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    console.error(`Missing: ${rel}`);
    process.exit(1);
  }
  return abs;
}

mustExist("database/migrations/103_community_member_visits.sql");
mustExist("supabase/migrations/20260725094209_community_member_visits.sql");
mustExist("lib/community/load-hub-home.ts");
mustExist("components/community/hub/hub-home.tsx");
mustExist("app/api/c/visits/route.ts");

const sql = readFileSync(migration, "utf8");
for (const needle of [
  "community_member_visits",
  "ENABLE ROW LEVEL SECURITY",
  "community_member_visits_select",
  "community_member_visits_insert",
  "community_memberships_user_active_subscribed_idx",
]) {
  if (!sql.includes(needle)) {
    console.error(`Migration missing expected fragment: ${needle}`);
    process.exit(1);
  }
}

console.log("verify-community-member-visits: ok");
