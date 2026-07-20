#!/usr/bin/env node
/** Soft-launch surface verification (static). */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "database/migrations/094_soft_launch_feedback.sql",
  "components/soft-launch/SoftLaunchProviders.tsx",
  "components/soft-launch/ProductFeedbackWidget.tsx",
  "components/soft-launch/SessionAnalytics.tsx",
  "components/soft-launch/CrashAnalytics.tsx",
  "components/soft-launch/PerformanceAnalytics.tsx",
  "app/api/feedback/route.ts",
  "app/api/admin/feedback/route.ts",
  "app/admin/feedback/page.tsx",
  "docs/SOFT_LAUNCH.md",
  "lib/email/transactional.ts",
];

let errors = 0;
for (const rel of required) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.error(`Missing: ${rel}`);
    errors += 1;
    continue;
  }
  const body = readFileSync(path, "utf8");
  if (!body.trim()) {
    console.error(`Empty: ${rel}`);
    errors += 1;
  }
}

const transactional = readFileSync(join(root, "lib/email/transactional.ts"), "utf8");
if (!transactional.includes("sendWelcomeEmail")) {
  console.error("sendWelcomeEmail missing from transactional.ts");
  errors += 1;
}

const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
if (!layout.includes("SoftLaunchProviders")) {
  console.error("SoftLaunchProviders not mounted in app/layout.tsx");
  errors += 1;
}

if (errors) {
  console.error(`verify-soft-launch failed (${errors})`);
  process.exit(1);
}
console.log("Soft launch verification passed.");
