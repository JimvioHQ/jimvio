#!/usr/bin/env node
/**
 * Static verification: affiliate product pick + link + attribution wiring.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];

function mustContain(file, needles, label) {
  const path = join(root, file);
  if (!existsSync(path)) {
    checks.push({ ok: false, label: `${label}: missing ${file}` });
    return;
  }
  const src = readFileSync(path, "utf8");
  for (const n of needles) {
    if (!src.includes(n)) {
      checks.push({ ok: false, label: `${label}: expected ${JSON.stringify(n)} in ${file}` });
      return;
    }
  }
  checks.push({ ok: true, label });
}

mustContain(
  "lib/affiliate/campaigns.ts",
  ["findActiveProductLink", "isUniqueViolation", "Idempotent pick"],
  "createAffiliateLink is idempotent"
);

mustContain(
  "app/api/affiliates/links/route.ts",
  ["affiliate_enabled", "picked: true", "Product is not available for affiliate promotion"],
  "POST /api/affiliates/links validates product eligibility"
);

mustContain(
  "app/(public)/affiliates/promote/[slug]/page.tsx",
  ["affiliate_enabled", "initialPicked", "createAffiliateLink"],
  "Promote page gates eligibility and creates/reuses link"
);

mustContain(
  "components/affiliate/AffiliatePromoteProductClient.tsx",
  ["Picked ✓", "Product added", "ensureLink", "View picked products"],
  "Promote client shows picked state + auto ensure"
);

mustContain(
  "lib/affiliate/attribution.ts",
  ["custom_slug", "Canonical cookie/checkout code is always LNK-"],
  "resolveReferralCode resolves custom slugs"
);

mustContain(
  "app/(public)/ref/[code]/route.ts",
  ["cookieCode", "link.link_code"],
  "Ref redirect stores canonical LNK cookie"
);

mustContain(
  "components/cards/index.tsx",
  ["/api/affiliates/links", "Link copied"],
  "AffiliateCard copies tracked /ref link"
);

mustContain(
  "supabase/migrations/20260904005430_affiliate_links_pick_idempotency.sql",
  ["uq_affiliate_links_active_affiliate_product"],
  "Unique index migration present"
);

mustContain(
  "lib/actions/account-settings.ts",
  ["is_active: true", "!existing.is_active"],
  "Affiliate activation reactivates inactive rows"
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.label}`);
}
if (failed.length) {
  console.error(`\n${failed.length} affiliate pick verification(s) failed`);
  process.exit(1);
}
console.log("\n✅ Affiliate product pick verification passed");
