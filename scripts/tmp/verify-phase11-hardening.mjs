/**
 * Phase 11 hardening — static checks.
 * Parses source only. Does not connect to production, print secrets,
 * call provider dashboards, or execute destructive endpoints.
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

const cjWh = mustExist("app/api/webhooks/cj/route.ts");
assert.match(cjWh, /assertCjWebhookAuthorized/);
assert.match(cjWh, /status: 401/);
assert.match(cjWh, /hasStoredOpenId/);
assert.match(cjWh, /CJ_WEBHOOK_SECRET/);
assert.match(cjWh, /previewPrivilegedForbidden/);
assert.doesNotMatch(cjWh, /Raw body \(first 500 chars\)/);

const cronAuth = mustExist("lib/ops/cron-auth.ts");
assert.match(cronAuth, /VERCEL_ENV === "preview"/);
assert.match(cronAuth, /Cron is disabled on Preview/);
assert.match(cronAuth, /timingSafeEqual/);
assert.doesNotMatch(cronAuth, /searchParams\.get\(["']secret/);

const preview = mustExist("lib/ops/preview-guard.ts");
assert.match(preview, /isPreviewPrivilegedPath/);
assert.match(preview, /\/api\/admin/);
assert.match(preview, /\/api\/payments\//);
assert.match(preview, /\/api\/webhooks/);

const middleware = mustExist("lib/supabase/middleware.ts");
assert.match(middleware, /isVercelPreview\(\)/);
assert.match(middleware, /isPreviewPrivilegedPath/);

const platformAdmin = mustExist("lib/auth/platform-admin.ts");
assert.match(platformAdmin, /previewPrivilegedDenied/);

const trackView = mustExist("app/api/clips/track-view/route.ts");
assert.doesNotMatch(trackView, /jimvio-salt-2025/);
assert.match(trackView, /VIEW_HASH_SALT/);
assert.match(trackView, /not_configured/);

const disconnect = mustExist("app/api/shopify/disconnect/route.ts");
assert.match(disconnect, /requireVendorOwnerOrAdmin/);
assert.match(disconnect, /shopify_credentials/);

const connectForm = mustExist("components/vendor/ShopifyConnectForm.tsx");
assert.match(connectForm, /\/api\/shopify\/disconnect/);
assert.doesNotMatch(connectForm, /from\("shopify_credentials"\)\.delete/);

const settingsForm = mustExist("app/admin/settings/settings-form.tsx");
assert.doesNotMatch(settingsForm, /sk_live_51234567890abcdefgh/);

const viewsSync = mustExist("app/api/ugc/views/sync/route.ts");
assert.match(viewsSync, /assertCronAuthorized/);

const cjQueue = mustExist("app/api/cron/cj-queue/route.ts");
assert.match(cjQueue, /assertCronAuthorized/);
assert.doesNotMatch(cjQueue, /Bearer \$\{process\.env\.CRON_SECRET\}/);

const catalogSync = mustExist("app/api/cron/cj-catalog-sync/route.ts");
assert.match(catalogSync, /assertCronAuthorized/);
assert.doesNotMatch(catalogSync, /function authorized/);

console.log("verify-phase11-hardening: PASS");
