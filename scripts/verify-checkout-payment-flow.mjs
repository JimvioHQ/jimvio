#!/usr/bin/env node
/**
 * Static production payment-flow verification gate.
 * Asserts critical source invariants for checkout → pay → CJ.
 * Does NOT execute real payments or CJ API calls.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fails = [];

function read(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    fails.push(`missing file: ${rel}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function assert(cond, msg) {
  if (!cond) fails.push(msg);
}

const setShipping = read("app/api/cj/set-shipping/route.ts");
const quoteToken = read("lib/cj/checkout-quote-token.ts");
const shippingRates = read("app/api/cj/shipping-rates/route.ts");
const checkout = read("components/checkout/checkout-experience.tsx");
const fab = read("components/command-center/CommandCenterFAB.tsx");
const command = read("components/command-center/CommandCenter.tsx");
const theme = read("components/providers/theme-provider.tsx");
const globals = read("styles/globals.css");
const afterPay = read("lib/order-fulfillment/after-payment.ts");
const submitCj = read("lib/sources/cj/submit-order.ts");
const binanceWh = read("app/api/webhooks/binance/route.ts");
const flwWh = read("app/api/payments/flutterwave/webhook/route.ts");
const nowWh = read("app/api/webhooks/nowpayments/route.ts");
const errors = read("lib/cj/customer-errors-shared.ts");
const appNav = read("components/shell/AppTopNav.tsx");

assert(
  setShipping.includes("NEVER burn another freightCalculate"),
  "set-shipping must refuse freightCalculate when a quote token exists"
);
assert(
  setShipping.includes("shipping_quote_reuse"),
  "set-shipping must log shipping_quote_reuse"
);
assert(
  quoteToken.includes("orderIds") && quoteToken.includes("QUOTE_GRACE_MS"),
  "quote tokens must be order-bindable with grace"
);
assert(
  shippingRates.includes("checkout_quote_token") &&
    shippingRates.includes("orderIds"),
  "shipping-rates must persist order-bound checkout_quote_token"
);
assert(
  checkout.includes("quoteToken: cjQuoteToken") &&
    checkout.includes("orderIds: orders.map"),
  "checkout must send orderIds + quoteToken at Pay"
);
assert(
  /return null/.test(fab) && !fab.includes("fixed bottom"),
  "CommandCenterFAB must not render the floating mobile shortcut"
);
assert(
  command.includes("bg-[#FFFFFF]") || command.includes("bg-[#ffffff]"),
  "Command Center light panel must be #FFFFFF"
);
assert(
  theme.includes('defaultTheme="light"') && theme.includes("enableSystem={false}"),
  "Light theme must remain default with system override disabled"
);
assert(
  globals.includes("#0F1115") &&
    globals.includes("#151922") &&
    globals.includes("#1B202A"),
  "Dark theme must use layered neutrals"
);
assert(
  afterPay.includes('cj_fulfillment_status: "failed"') &&
    afterPay.includes("retryable"),
  "CJ failure after pay must remain retryable without reversing payment"
);
assert(
  submitCj.includes("Already submitted") ||
    submitCj.includes("cj_order_submission_skipped_duplicate"),
  "CJ submit must skip when cj_order_id already exists"
);
assert(
  binanceWh.includes("finalizeOrderPayment") &&
    binanceWh.includes("amount mismatch"),
  "Binance webhook must verify amount and finalize"
);
assert(
  flwWh.includes("finalizeOrderPayment"),
  "Flutterwave webhook must finalizeOrderPayment"
);
assert(
  nowWh.includes("finalizeOrderPayment"),
  "NOWPayments webhook must finalizeOrderPayment"
);
assert(
  !errors.includes("temporarily unavailable from the carrier"),
  "Old carrier-unavailable copy must be removed"
);
assert(
  appNav.includes('aria-label="Search"') &&
    appNav.includes("min-[1060px]:hidden"),
  "Mobile header Search icon must be present"
);

if (fails.length) {
  console.error("VERIFY FAIL — checkout/payment flow invariants:");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log("VERIFY OK — checkout/payment/CJ/mobile/theme invariants hold (static).");
console.log("NOTE: real provider sandboxes / live paid orders were not executed.");
process.exit(0);
