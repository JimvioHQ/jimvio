import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const helper = read("lib/payments/binance-pay-maintenance.ts");
const checkout = read("app/api/payments/binancepay/initiate/route.ts");
const wallet = read("app/api/wallet/os/deposits/route.ts");
const ugc = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
const community = read("app/api/communities/[slug]/subscribe/route.ts");
const checkoutUi = read("components/checkout/checkout-experience.tsx");
const selector = read("components/checkout/PaymentMethodSelector.tsx");
const webhook = read("app/api/webhooks/binance/route.ts");

assert.match(helper, /BINANCE_PAY_MAINTENANCE_ENABLED\s*=\s*true/);
assert.match(helper, /BINANCEPAY_UNAVAILABLE/);
assert.match(helper, /temporarily under maintenance/i);
assert.match(helper, /available again soon/i);

for (const [name, source] of [
  ["marketplace checkout", checkout],
  ["wallet deposits", wallet],
  ["UGC campaign funding", ugc],
  ["community subscriptions", community],
]) {
  assert.match(source, /BINANCE_PAY_MAINTENANCE_ENABLED/, name + " must enforce the maintenance gate");
  assert.match(source, /binancePayMaintenancePayload\(\)/, name + " must return the shared customer message");
}

assert.ok(
  wallet.indexOf("binancePayMaintenancePayload()") < wallet.indexOf("const db = createServiceRoleClient()"),
  "wallet deposits must reject before creating database records",
);
assert.ok(
  ugc.indexOf("binancePayMaintenancePayload()") < ugc.indexOf("requireCampaignPermission"),
  "UGC funding must reject before funding-side effects",
);
assert.ok(
  community.indexOf("binancePayMaintenancePayload()") < community.indexOf("getAdminDB()"),
  "community subscriptions must reject before creating orders",
);
assert.match(checkoutUi, /BINANCEPAY_UNAVAILABLE:.*maintenance/i);
assert.match(selector, /id:\s*"binancepay"/);
assert.match(webhook, /verifyBinanceWebhook/);
assert.match(webhook, /binance_pay/i);

console.log("Binance Pay maintenance gate checks passed.");
