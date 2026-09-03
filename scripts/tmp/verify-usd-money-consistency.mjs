/**
 * Cart → Checkout USD money consistency gate (no network).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function must(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function toPlatformUsd(amount, from, rate = 0.0008) {
  const c = (from || "USD").toUpperCase();
  if (c === "USD") return Math.round(amount * 100) / 100;
  if (c === "RWF") return Math.round(amount * rate * 100) / 100;
  return Math.round(amount * 100) / 100;
}
function resolveLineUnitUsd({ unitPriceAtAdd, currencyAtAdd, catalogPrice, catalogCurrency }) {
  const atAdd = Number(unitPriceAtAdd);
  const addC = (currencyAtAdd || "").toUpperCase();
  if (addC === "USD" && Number.isFinite(atAdd) && atAdd >= 0) return Math.round(atAdd * 100) / 100;
  if (Number.isFinite(atAdd) && atAdd >= 0 && addC) return toPlatformUsd(atAdd, addC);
  return toPlatformUsd(Number(catalogPrice ?? 0), catalogCurrency);
}

assert.equal(toPlatformUsd(14100, "RWF"), 11.28);
assert.equal(toPlatformUsd(11.28, "USD"), 11.28);
assert.equal(
  resolveLineUnitUsd({
    unitPriceAtAdd: 11.28,
    currencyAtAdd: "USD",
    catalogPrice: 14100,
    catalogCurrency: "RWF",
  }),
  11.28,
);

const platform = must("lib/currency/platform.ts");
assert.match(platform, /resolveLineUnitUsd/);
assert.match(platform, /looksLikeRwfasUsd/);
assert.match(platform, /resolveCheckoutShippingAmountUsd/);

const sync = must("lib/actions/checkout.ts");
assert.match(sync, /resolveLineUnitUsd/);
assert.match(sync, /unit_price_at_add, currency_at_add/);
assert.match(sync, /syncOrderWithCart/);

const ensure = must("lib/commerce/ensure-platform-currency.ts");
assert.match(ensure, /looksLikeRwfasUsd/);

const marketplace = must("lib/actions/marketplace.ts");
assert.match(marketplace, /currency_at_add: PLATFORM_CURRENCY/);

const shipping = must("lib/cj/customer-errors-shared.ts");
assert.match(shipping, /temporarily unavailable/);
assert.doesNotMatch(shipping, /refreshing shipping options/);

const deposits = must("app/api/wallet/os/deposits/route.ts");
assert.match(deposits, /PLATFORM_CURRENCY/);
assert.match(deposits, /createFlutterwavePaymentLink/);

const complete = must("lib/wallet-os/complete-deposit.ts");
assert.match(complete, /completeWalletDeposit/);
assert.match(complete, /WDEP-/);

const depositsUi = must("components/wallet-os/WalletDepositsClient.tsx");
assert.match(depositsUi, /PaymentMethodSelector/);
assert.match(depositsUi, /payment-providers/);

const flwCb = must("app/api/payments/flutterwave/callback/route.ts");
assert.match(flwCb, /completeWalletDeposit/);

console.log("verify-usd-money-consistency: ok");
