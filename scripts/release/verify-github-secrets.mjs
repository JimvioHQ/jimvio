#!/usr/bin/env node
/**
 * Documents CI secret names without reading or printing their values.
 * Succeeds so contributors see setup guidance before secrets are provisioned.
 *
 * IMPORTANT: GitHub Actions jobs currently fail to *start* when the org
 * billing payment method / spending limit blocks runners. That is not a
 * workflow YAML bug — restore Billing & plans for JimvioHQ before expecting
 * green checks.
 */
const required = [
  {
    name: "SUPABASE_ACCESS_TOKEN",
    purpose: "Allows the Supabase workflow to link to the remote project.",
  },
  {
    name: "SUPABASE_PROJECT_REF",
    purpose: "Selects the remote Supabase project for migration checks.",
  },
  {
    name: "SUPABASE_DB_PASSWORD",
    purpose: "Optional DB password for linked CLI operations that need it.",
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
    purpose: "Public production URL for post-deploy health (release job).",
  },
];

console.log("GitHub Actions secret checklist:");
for (const secret of required) {
  console.log(`- [ ] ${secret.name}: ${secret.purpose}`);
}
console.log(
  "No secret values are read or emitted. Workflows skip/deploy-skip clearly when secrets are unavailable."
);
console.log(
  "If Actions annotations say payments failed / spending limit, fix org Billing & plans — workflows cannot run until then."
);
