import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const config = read("lib/site-icons/config.ts");
const adminRoute = read("app/api/admin/site-icons/route.ts");
const publicRoute = read("app/api/site-icons/[asset]/route.ts");
const seo = read("lib/seo.ts");
const manifest = read("app/manifest.ts");
const sidebar = read("components/admin/admin-sidebar.tsx");
const manager = read("components/admin/site-icon-manager.tsx");
const proxy = read("proxy.ts");

for (const key of ["favicon-ico", "favicon-svg", "favicon-16", "favicon-32", "apple-touch", "pwa-192", "pwa-512", "pwa-maskable-192", "pwa-maskable-512", "android-foreground-432", "android-preview-432", "icon-24", "icon-180", "icon-1024", "windows-tile", "safari-pinned"]) {
  assert.ok(config.includes(`key: "${key}"`), `missing icon slot: ${key}`);
}
assert.match(adminRoute, /assertPlatformAdmin/);
assert.match(adminRoute, /SITE_ICON_MAX_BYTES/);
assert.match(adminRoute, /DOMPurify\.sanitize/);
assert.match(adminRoute, /sharp\(bytes/);
assert.match(adminRoute, /writeAuditEvent/);
assert.match(publicRoute, /SITE_ICON_BUCKET/);
assert.match(publicRoute, /X-Content-Type-Options/);
assert.ok(fs.existsSync(path.join(process.cwd(), "app/favicon.ico/route.ts")));
assert.ok(fs.existsSync(path.join(process.cwd(), "app/favicon.svg/route.ts")));
assert.ok(fs.existsSync(path.join(process.cwd(), "app/icons/safari-pinned-tab.svg/route.ts")));
assert.match(seo, /\/api\/site-icons\/favicon-ico/);
assert.match(seo, /\/api\/site-icons\/apple-touch/);
assert.match(manifest, /\/api\/site-icons\/pwa-192/);
assert.match(sidebar, /\/admin\/settings\/icons/);
assert.match(manager, /Previous versions/);
assert.match(manager, /Using repository default/);
assert.match(proxy, /api\/site-icons/);
assert.match(proxy, /site\.webmanifest/);
assert.match(proxy, /api\/storefront-favicon/);
// Keep the icon-manager preview build explicitly enabled by the repository ignore-build policy.
console.log("Site Icon Manager verification: PASS");
