#!/usr/bin/env node
/**
 * Affiliate Center invariant gate — static source checks + pure helpers.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const failures = [];

function mustInclude(file, needle, label) {
  const abs = join(root, file);
  if (!existsSync(abs)) {
    failures.push(`missing file: ${file}`);
    return;
  }
  const src = readFileSync(abs, "utf8");
  if (!src.includes(needle)) {
    failures.push(`${label}: expected ${JSON.stringify(needle)} in ${file}`);
  }
}

mustInclude(
  "components/workspace/WorkspaceShell.tsx",
  'isAffiliate ? "h-dvh overflow-hidden"',
  "fixed affiliate shell"
);
mustInclude(
  "lib/payments/finalize-order-payment.ts",
  "resolvedFromOrder",
  "commission referral fallback"
);
mustInclude(
  "lib/actions/checkout.ts",
  "affiliate_link_id: attribution?.affiliate_link_id",
  "checkout order item link id"
);
mustInclude(
  "app/api/affiliates/links/route.ts",
  "getLinkMetricsMap",
  "canonical link metrics"
);
mustInclude(
  "lib/affiliate/dashboard.ts",
  "getLinkMetricsMap",
  "dashboard recent-link metrics"
);
mustInclude("services/ai/openai.ts", "describeAiError", "truthful AI errors");
mustInclude(
  "app/(public)/ref/[code]/route.ts",
  "truncateIpForPrivacy",
  "privacy-safe click IP"
);
mustInclude(
  "lib/workspace/config.ts",
  'if (pathname.startsWith("/affiliates/ai")) return "ai"',
  "affiliate nav specificity"
);
mustInclude(
  "supabase/migrations/20260904231620_order_items_affiliate_link_attribution.sql",
  "affiliate_link_id",
  "order_items link migration"
);

function mergeLinkMetrics(live, denormalized) {
  const clicks = Math.max(live?.clicks ?? 0, Number(denormalized.clicks ?? 0));
  const conversions = Math.max(
    live?.conversions ?? 0,
    Number(denormalized.conversions ?? 0)
  );
  const earnings = Math.max(
    live?.earnings ?? 0,
    Number(denormalized.earnings ?? 0)
  );
  return {
    clicks,
    conversions,
    earnings: Math.round(earnings * 100) / 100,
  };
}

try {
  assert.deepEqual(
    mergeLinkMetrics(
      { clicks: 10, conversions: 2, earnings: 5.5 },
      { clicks: 3, conversions: 4, earnings: 1 }
    ),
    { clicks: 10, conversions: 4, earnings: 5.5 }
  );
  assert.deepEqual(
    mergeLinkMetrics(undefined, { clicks: 2, conversions: 1, earnings: 3 }),
    { clicks: 2, conversions: 1, earnings: 3 }
  );
} catch (err) {
  failures.push(`mergeLinkMetrics unit: ${err.message}`);
}

if (failures.length) {
  console.error("Affiliate center verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("✅ Affiliate Center verification passed");
