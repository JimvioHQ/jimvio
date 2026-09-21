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
    binanceWh.includes("amount mismatch") &&
    binanceWh.includes("order resolved via transactions"),
  "Binance webhook must verify amount, resolve via tx fallback, and finalize"
);
assert(
  flwWh.includes("finalizeOrderPayment") &&
    flwWh.includes("completeWalletDepositByReference") &&
    flwWh.includes("verifiedAmount"),
  "Flutterwave webhook must finalize orders and verify deposit amounts"
);
assert(
  nowWh.includes("finalizeOrderPayment") &&
    nowWh.includes("amount mismatch") &&
    nowWh.includes("paymentAmountsMatch") &&
    nowWh.includes("nowp-invoice-"),
  "NOWPayments webhook must verify amount, bind invoice lock, and finalize"
);
const nowLegacy = read("app/api/nowpayments/ipn/route.ts");
assert(
  nowLegacy.includes("paymentAmountsMatch") &&
    nowLegacy.includes("finalizeOrderPayment") &&
    nowLegacy.includes('paymentProvider: "nowpayments"'),
  "Legacy NOWPayments IPN must match canonical amount+finalize guarantees"
);
const paypalCapture = read("app/api/payments/paypal/capture/route.ts");
const paypalWh = read("app/api/payments/paypal/webhook/route.ts");
const paypalCreate = read("app/api/payments/paypal/create-order/route.ts");
const pesapalInitiate = read("app/api/payments/pesapal/initiate/route.ts");
assert(
  paypalCapture.includes("retiredPaymentProviderResponse") &&
    paypalWh.includes("retiredPaymentProviderResponse") &&
    paypalCreate.includes("retiredPaymentProviderResponse"),
  "PayPal routes must reject as retired providers"
);
assert(
  pesapalInitiate.includes("retiredPaymentProviderResponse"),
  "PesaPal initiate must reject as retired provider"
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

const paymentProviders = read("app/api/platform/payment-providers/route.ts");
assert(
  paymentProviders.includes("Never advertise methods that cannot initiate") ||
    !paymentProviders.includes("withCredentials.length > 0 ? withCredentials : adminEnabled"),
  "payment-providers must not fall back to admin-enabled without credentials"
);
assert(
  paymentProviders.includes('"mobile_money"') &&
    paymentProviders.includes("flutterwave"),
  "payment-providers must advertise dedicated Mobile Money when Flutterwave is configured"
);

const momoCaps = read("lib/payments/flutterwave-mobile-money-capabilities.ts");
const momoService = read("lib/payments/flutterwave-mobile-money.ts");
const momoInitiate = read("app/api/payments/mobile-money/initiate/route.ts");
const momoStatus = read("app/api/payments/mobile-money/status/route.ts");
const selector = read("components/checkout/PaymentMethodSelector.tsx");
assert(
  momoCaps.includes("mobile_money_rwanda") &&
    momoCaps.includes("mpesa") &&
    momoCaps.includes("mobile_money_ghana") &&
    momoCaps.includes("mobile_money_franco") &&
    momoCaps.includes("getFlutterwaveMobileMoneyCapabilities"),
  "MoMo capability catalog must cover Flutterwave charge types globally"
);
assert(
  momoService.includes("charges?type=") &&
    momoService.includes("createMobileMoneyPayment") &&
    !momoService.includes("payment_options"),
  "MoMo service must use direct charge, not generic hosted payment options"
);
assert(
  momoInitiate.includes("requireSessionUser") &&
    momoInitiate.includes("generateTxRef") &&
    momoInitiate.includes('provider: "flutterwave"') &&
    momoInitiate.includes('method: "mobile_money"'),
  "MoMo initiate must authenticate, mint server tx refs, and reuse Flutterwave webhook path"
);
assert(
  momoStatus.includes("finalizeOrderPayment") &&
    momoStatus.includes("amount_currency_mismatch"),
  "MoMo status poll must verify amount/currency before finalize"
);
assert(
  selector.includes('id: "mobile_money"') &&
    selector.includes("Pay with Cards") &&
    !selector.includes("International Payments") &&
    !selector.includes("Pay with Any Card, Mobile Money or Apple Pay") &&
    !selector.includes("Popular in Rwanda") &&
    !selector.includes("Other Networks") &&
    selector.includes("Pay securely with your local mobile wallet") &&
    selector.includes("Continue to a secure Mobile Money checkout"),
  "Checkout must show Pay with Cards + dedicated Mobile Money without Rwanda-specific copy"
);
assert(
  !momoInitiate.includes("provider_reference:") &&
    momoInitiate.includes("provider_transaction_id: txRef"),
  "MoMo initiate must not write nonexistent transactions.provider_reference"
);
assert(
  !momoStatus.includes("provider_reference"),
  "MoMo status must not select nonexistent transactions.provider_reference"
);
assert(
  momoService.includes("buildFlutterwaveMobileMoneyCharge") &&
    momoService.includes("includeOrderIdInCharge"),
  "MoMo adapter must build market-specific Flutterwave charge payloads"
);
assert(
  checkout.includes("/api/payments/mobile-money/initiate") &&
    checkout.includes("openMobileMoneyStep") &&
    checkout.includes("backToPaymentMethods") &&
    checkout.includes("MobileMoneyPaymentStep") &&
    (checkout.includes("Waiting for Mobile Money confirmation") ||
      checkout.includes("Waiting for Mobile Money authorization")),
  "Checkout must navigate to dedicated MoMo step and poll pending confirmation"
);
const momoPanel = read("components/checkout/MobileMoneyCheckoutPanel.tsx");
assert(
  momoPanel.includes("Back to payment methods") &&
    momoPanel.includes("Continue with Mobile Money") &&
    momoPanel.includes("Select country") &&
    !momoPanel.includes("Popular in Rwanda") &&
    !momoPanel.includes("Other Networks"),
  "MoMo dedicated step must require explicit country and never show Rwanda-only marketing"
);
const paymentIdx = checkout.indexOf('{stage === "payment" && (');
const momoStageIdx = checkout.indexOf('{stage === "mobile_money" && (');
assert(
  paymentIdx >= 0 &&
    momoStageIdx > paymentIdx &&
    !checkout.slice(paymentIdx, momoStageIdx).includes("MobileMoneyPaymentStep") &&
    checkout.slice(paymentIdx, momoStageIdx).includes("PaymentMethodSelector"),
  "MoMo must not expand inline under payment methods"
);

const retired = read("lib/payments/retired-providers.ts");
assert(
  retired.includes('"afripay"') && retired.includes('"pawapay"'),
  "AfriPay and PawaPay must be marked retired"
);
assert(
  !selector.match(/^export type MethodId =[\s\S]*?pawapay/m),
  "Checkout MethodId must not include pawapay"
);
assert(
  !existsSync(join(root, "lib/payments/afripay.ts")) &&
    !existsSync(join(root, "lib/afripay/afripay.ts")) &&
    !existsSync(join(root, "lib/payments/confirm-pawapay-deposit.ts")) &&
    !existsSync(join(root, "lib/pawapay-convert.ts")),
  "AfriPay/PawaPay adapter modules must be deleted"
);
assert(
  !read("services/admin/getSystemAnalysis.ts").includes("PAWAPAY_API_TOKEN"),
  "System analysis must not check PAWAPAY_API_TOKEN"
);

const binancePay = read("lib/binance-pay/index.ts");
assert(
  binancePay.includes("BINANCEPAY_API_KEY") &&
    binancePay.includes("BINANCEPAY_SECRET_KEY"),
  "Binance Pay client must accept BINANCEPAY_* env aliases"
);

const flwVerify = read("lib/payments/Transaction-verify.ts");
assert(
  flwVerify.includes("FLUTTERWAVE_SECRET_KEY"),
  "Flutterwave verify must accept FLUTTERWAVE_SECRET_KEY alias"
);

const syncShipping = read("lib/cj/sync-shipping.ts");
assert(
  syncShipping.includes("isCjQuotaCircuitOpenAsync") &&
    syncShipping.includes("markCjQuotaExhausted"),
  "CJ shipping sync must respect durable quota circuit"
);

const quotaCircuit = read("lib/cj/quota-circuit.ts");
assert(
  quotaCircuit.includes("cj_api_quota_circuit") &&
    quotaCircuit.includes("platform_settings"),
  "CJ quota circuit must persist via platform_settings"
);

const enrichmentCron = read("app/api/cron/cj-enrichment/route.ts");
assert(
  enrichmentCron.includes("assertCjQuotaAvailableForBackground"),
  "Enrichment cron must pause when CJ API quota is exhausted"
);

if (fails.length) {
  console.error("VERIFY FAIL — checkout/payment flow invariants:");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log("VERIFY OK — checkout/payment/CJ/mobile/theme invariants hold (static).");
console.log("NOTE: real provider sandboxes / live paid orders were not executed.");
process.exit(0);
