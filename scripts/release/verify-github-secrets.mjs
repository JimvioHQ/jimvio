#!/usr/bin/env node
/**
 * Checklist of CI secret names (documentation only — no values printed).
 * For automated validation, use: npm run ci:secrets
 *
 * CRITICAL BLOCKER (observed on JimvioHQ/jimvio):
 * GitHub Actions jobs do not start when org billing payments fail or the
 * spending limit blocks hosted runners. Annotation text:
 *   "The job was not started because recent account payments have failed
 *    or your spending limit needs to be increased."
 * Fix: https://github.com/organizations/JimvioHQ/settings/billing
 * Prefer self-hosted runners (default) — see docs/CI_SELF_HOSTED.md
 */
import { spawnSync } from "node:child_process";

const required = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
];

const optional = [
  "SUPABASE_DB_PASSWORD",
  "NEXT_PUBLIC_APP_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "RESEND_API_KEY",
];

console.log("Canonical Supabase project secret: SUPABASE_PROJECT_REF.");
console.log("SUPABASE_PROJECT_ID is not read by workflows.");
console.log("GitHub Actions secret checklist:");
for (const name of required) console.log(`- [ ] ${name} (required)`);
for (const name of optional) console.log(`- [ ] ${name} (optional)`);
console.log(
  "\nAutomated check (never prints values): npm run ci:secrets [--github] [--strict]"
);
console.log(
  "Default runner: self-hosted (linux/x64). Set USE_GITHUB_HOSTED_RUNNERS=true only if hosted minutes are available."
);
console.log("Local validation without GitHub runners: npm run ci:verify — see docs/CI_SELF_HOSTED.md");

const r = spawnSync(process.execPath, ["scripts/ci/verify-secrets.mjs"], {
  stdio: "inherit",
  cwd: process.cwd(),
});
process.exit(r.status === 0 ? 0 : r.status ?? 1);
