#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];

function must(file, needles, label) {
  const path = join(root, file);
  if (!existsSync(path)) {
    checks.push({ ok: false, label: `${label}: missing ${file}` });
    return;
  }
  const src = readFileSync(path, "utf8");
  for (const n of needles) {
    if (!src.includes(n)) {
      checks.push({ ok: false, label: `${label}: missing ${JSON.stringify(n)}` });
      return;
    }
  }
  checks.push({ ok: true, label });
}

function mustNot(file, needles, label) {
  const path = join(root, file);
  const src = readFileSync(path, "utf8");
  for (const n of needles) {
    if (src.includes(n)) {
      checks.push({ ok: false, label: `${label}: still contains ${JSON.stringify(n)}` });
      return;
    }
  }
  checks.push({ ok: true, label });
}

must(
  "app/activate/[role]/page.tsx",
  ["activateUserRole", "window.location.assign", "Accepted affiliate terms", "Activating…"],
  "Activate page calls server activation"
);

mustNot(
  "app/activate/[role]/page.tsx",
  ["At least one active referral source", 'setupPath: "/affiliates/dashboard"'],
  "No circular referral requirement / fake link CTA"
);

must(
  "lib/actions/account-settings.ts",
  ["is_active: true", "revalidatePath(\"/affiliates/dashboard\")", "Affiliate activation did not persist"],
  "activateUserRole persists + revalidates"
);

must(
  "app/api/affiliates/dashboard/route.ts",
  ["getSessionAffiliate", "requireActive: true"],
  "Dashboard gate uses active affiliate"
);

must(
  "lib/affiliate/access.ts",
  ["is_active", "requireActive"],
  "Canonical access helper exists"
);

must(
  "components/growth/RoleActivationChecklist.tsx",
  ["/affiliates/dashboard"],
  "Checklist points to dashboard"
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.label}`);
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log("\n✅ Affiliate activation loop verification passed");
