#!/usr/bin/env node
/**
 * Documents CI secret names without reading or printing their values.
 *
 * CRITICAL BLOCKER (observed on JimvioHQ/jimvio):
 * GitHub Actions jobs do not start when org billing payments fail or the
 * spending limit blocks hosted runners. Annotation text:
 *   "The job was not started because recent account payments have failed
 *    or your spending limit needs to be increased."
 * Fix: https://github.com/organizations/JimvioHQ/settings/billing
 * Private repos on Free plan require a working Actions billing setup.
 */
const required = [
  {
    name: "SUPABASE_ACCESS_TOKEN",
    purpose: "Supabase CLI auth for migration list / link.",
  },
  {
    name: "SUPABASE_PROJECT_REF",
    purpose: "Remote Supabase project ref (e.g. vsfhwfimudpdipdkxbww).",
  },
  {
    name: "SUPABASE_DB_PASSWORD",
    purpose: "Optional — DB password for linked CLI operations that need it.",
  },
  {
    name: "VERCEL_TOKEN",
    purpose: "Preview/release Vercel CLI deploys.",
  },
  {
    name: "VERCEL_ORG_ID",
    purpose: "Vercel team/org for CLI deploys.",
  },
  {
    name: "VERCEL_PROJECT_ID",
    purpose: "Vercel project for CLI deploys.",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    purpose: "Public production URL for post-deploy health (release).",
  },
];

console.log("GitHub Actions secret checklist:");
for (const secret of required) {
  console.log(`- [ ] ${secret.name}: ${secret.purpose}`);
}
console.log(
  "No secret values are read or emitted. Workflows fail with named missing-secret errors when required secrets are absent."
);
console.log(
  "Default runner: self-hosted (linux/x64). Set USE_GITHUB_HOSTED_RUNNERS=true only if hosted minutes are available."
);
console.log("Local validation without GitHub runners: npm run ci:verify — see docs/CI_SELF_HOSTED.md");
