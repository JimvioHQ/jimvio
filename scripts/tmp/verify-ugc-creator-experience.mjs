#!/usr/bin/env node
/**
 * Static gate for the creator-first UGC navigation + schedule APIs.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = {
  sidebar: join(root, "components/ugc/workspace/UGCWorkspaceSidebar.tsx"),
  discover: join(root, "components/ugc/workspace/UGCDiscoverPage.tsx"),
  myCampaigns: join(root, "components/ugc/workspace/UGCMyCampaignsPage.tsx"),
  datePanel: join(root, "components/ugc/workspace/UGCDateDetailPanel.tsx"),
  scheduleApi: join(root, "app/api/ugc/campaigns/[id]/schedule/route.ts"),
  migration: join(root, "database/migrations/140_ugc_campaign_schedule.sql"),
};

let failed = 0;
for (const [name, path] of Object.entries(files)) {
  if (!existsSync(path)) {
    console.error(`missing ${name}: ${path}`);
    failed += 1;
  }
}

const sidebar = readFileSync(files.sidebar, "utf8");
for (const banned of ["/ugc/dashboard", "Creator Copilot", "Achievements", "More tools", "Go Premium"]) {
  if (sidebar.includes(banned)) {
    console.error(`sidebar still contains banned nav copy: ${banned}`);
    failed += 1;
  }
}
for (const required of ["Discover Campaigns", "My Campaigns", "Submissions", "Earnings"]) {
  if (!sidebar.includes(required)) {
    console.error(`sidebar missing required nav: ${required}`);
    failed += 1;
  }
}

const datePanel = readFileSync(files.datePanel, "utf8");
if (!datePanel.includes("What happens today")) {
  console.error("date panel missing one-date information heading");
  failed += 1;
}

if (failed) {
  process.exit(1);
}
console.log("UGC creator experience static checks passed");
