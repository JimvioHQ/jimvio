import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("unified Mobile Money routing — no hosted card checkout", () => {
  it("wallet deposits refuse mobile_money on generic POST", () => {
    const src = read("app/api/wallet/os/deposits/route.ts");
    assert.match(src, /method === "mobile_money"/);
    assert.match(src, /USE_MOMO_DEDICATED_FLOW|dedicated Mobile Money/i);
    assert.match(src, /paymentOptions:\s*"card"/);
  });

  it("wallet MoMo initiate uses createMobileMoneyPayment direct charge", () => {
    const src = read("app/api/wallet/os/deposits/mobile-money/initiate/route.ts");
    assert.match(src, /createMobileMoneyPayment/);
    assert.doesNotMatch(src, /createFlutterwavePaymentLink/);
    assert.doesNotMatch(src, /hosted\/pay/);
    assert.match(src, /purpose:\s*"wallet_deposit"/);
  });

  it("UGC deposit refuses mobile_money on generic POST", () => {
    const src = read("app/api/ugc/campaigns/[id]/deposit/route.ts");
    assert.match(src, /paymentMethod === "mobile_money"/);
    assert.match(src, /dedicated Mobile Money funding step/);
    assert.match(src, /paymentOptions:\s*"card"/);
  });

  it("UGC MoMo initiate uses createMobileMoneyPayment", () => {
    const src = read("app/api/ugc/campaigns/[id]/deposit/mobile-money/initiate/route.ts");
    assert.match(src, /createMobileMoneyPayment/);
    assert.doesNotMatch(src, /createFlutterwavePaymentLink/);
    assert.match(src, /purpose:\s*"ugc_funding"/);
  });

  it("WalletDepositsClient routes MoMo to dedicated step + initiate API", () => {
    const src = read("components/wallet-os/WalletDepositsClient.tsx");
    assert.match(src, /MobileMoneyPaymentStep/);
    assert.match(src, /\/api\/wallet\/os\/deposits\/mobile-money\/initiate/);
    assert.match(src, /checkout\.flutterwave\.com\/v3\/hosted\/pay/);
    assert.match(src, /setStage\("mobile_money"\)/);
    // Must not POST mobile_money to generic deposits endpoint
    assert.doesNotMatch(
      src,
      /JSON\.stringify\(\{\s*amount:.*method:\s*["']mobile_money["']/,
    );
  });

  it("CampaignFundClient routes MoMo to dedicated initiate API", () => {
    const src = read("components/ugc/campaign-center/CampaignFundClient.tsx");
    assert.match(src, /MobileMoneyPaymentStep/);
    assert.match(src, /\/deposit\/mobile-money\/initiate/);
    assert.match(src, /checkout\.flutterwave\.com\/v3\/hosted\/pay/);
    assert.match(src, /setStage\("mobile_money"\)/);
  });

  it("marketplace checkout still uses MoMo initiate endpoint", () => {
    const src = read("components/checkout/checkout-experience.tsx");
    assert.match(src, /mobile_money:\s*"\/api\/payments\/mobile-money\/initiate"/);
    assert.match(src, /MobileMoneyPaymentStep/);
  });

  it("shared MoMo purposes are declared", () => {
    const src = read("lib/payments/mobile-money-contexts.ts");
    assert.match(src, /marketplace_order/);
    assert.match(src, /wallet_deposit/);
    assert.match(src, /ugc_funding/);
  });

  it("Wallet overview uses available as Total Balance, not netWorth hero", () => {
    const src = read("components/wallet-os/WalletOverviewClient.tsx");
    assert.match(src, /overview\?\.available/);
    assert.match(src, /Balance/);
    assert.match(src, /Recent Transactions/);
    assert.match(src, /Add Funds/);
    assert.match(src, /Withdraw/);
    assert.doesNotMatch(src, /Your wallet is empty for now/);
    assert.doesNotMatch(src, /Your Jimvio balance is ready/);
    assert.doesNotMatch(src, /tone="ink"/);
    assert.doesNotMatch(src, /This month/);
    assert.doesNotMatch(src, /checkout\.flutterwave\.com\/v3\/hosted\/pay/);
  });

  it("Wallet shell uses light Jimvio navigation (not black banking theme)", () => {
    const src = read("components/wallet-os/WalletOsShell.tsx");
    assert.match(src, /bg-\[#F8FAFC\]/);
    assert.match(src, /bg-white/);
    assert.doesNotMatch(src, /bg-\[#0E0E10\]/);
  });
});
