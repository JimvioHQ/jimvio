/**
 * Marketplace production QA hardening — routes, checkout returns, affiliate hrefs.
 * Auto-picked up by ci:prepush via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const nextConfig = mustExist("next.config.ts");
assert.match(
  nextConfig,
  /source:\s*"\/products\/:path\*"[\s\S]*?destination:\s*"\/marketplace\/:path\*"/
);
assert.match(nextConfig, /source:\s*"\/affiliate"/);
assert.match(nextConfig, /destination:\s*"\/affiliates"/);

const success = mustExist("app/(public)/checkout/success/page.tsx");
assert.match(success, /hasFlutterwaveParams|Flutterwave-specific/);
assert.doesNotMatch(
  success,
  /if \(!status\) \{\s*redirect\(buildErrorRedirect\("We couldn't confirm your payment status/
);

const checkout = mustExist("app/(public)/checkout/page.tsx");
assert.match(checkout, /orderId \?\? searchParams\.order_id \?\? searchParams\.order|orderId \?\? .*order_id/);

const cancel = mustExist("app/(public)/checkout/cancel/page.tsx");
assert.match(cancel, /orderId|order_id/);
assert.match(cancel, /params\.get\("orderId"\)|params\.get\("order_id"\)/);

const shared = mustExist("components/marketplace/product-detail-shared.tsx");
assert.match(shared, /\/affiliates\/promote\//);
assert.match(shared, /PLATFORM_SETTINGS_DEFAULTS|DEFAULT_AFFILIATE_RATE/);
assert.doesNotMatch(shared, /href=\{`\/affiliate\?/);
assert.doesNotMatch(shared, /href="\/affiliate"/);

const reel = mustExist("components/marketplace/short-clips-reel.tsx");
assert.match(reel, /\/communities\/\$\{/);
assert.doesNotMatch(reel, /\/groups\/community\//);

const action = mustExist("components/marketplace/product-action-module.tsx");
assert.match(action, /\/dashboard\/library\?highlight=/);
assert.doesNotMatch(action, /\/dashboard\/digital-assets/);

const login = mustExist("app/(auth)/login/page.tsx");
assert.match(login, /returnUrl/);

const physCard = mustExist("components/marketplace/product-card-physical.tsx");
assert.match(physCard, /Authentication required/);
assert.match(physCard, /login\?next=/);

const digital = mustExist("components/marketplace/product-detail-digital.tsx");
assert.doesNotMatch(digital, /Alex K\.|Figma UI Kit Pro|SIDEBAR_PRODUCTS/);
assert.match(digital, /PLATFORM_SETTINGS_DEFAULTS/);

console.log("verify-marketplace-qa-hardening: ok");
