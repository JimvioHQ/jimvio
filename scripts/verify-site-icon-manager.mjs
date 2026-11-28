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

for (const key of ["favicon-ico", "favicon-svg", "favicon-96", "favicon-16", "favicon-32", "apple-touch", "pwa-192", "pwa-512", "pwa-maskable-192", "pwa-maskable-512", "android-foreground-432", "android-preview-432", "icon-24", "icon-180", "icon-1024", "windows-tile", "safari-pinned", "storefront-empty"]) {
  assert.ok(config.includes(`slot: "${key}"`), `missing icon slot: ${key}`);
}
assert.match(adminRoute, /assertPlatformAdmin/);
assert.match(adminRoute, /SITE_ICON_MAX_BYTES/);
assert.match(adminRoute, /Upload a valid PNG image/);
assert.match(adminRoute, /image\\/x-icon/);
assert.match(adminRoute, /data:image\\/png;base64/);
assert.match(adminRoute, /sharp\(bytes/);
assert.match(adminRoute, /writeAuditEvent/);
assert.match(publicRoute, /SITE_ICON_BUCKET/);
assert.match(publicRoute, /X-Content-Type-Options/);
assert.ok(fs.existsSync(path.join(process.cwd(), "app/favicon.ico/route.ts")));
assert.ok(fs.existsSync(path.join(process.cwd(), "app/favicon.png/route.ts")));
assert.ok(fs.existsSync(path.join(process.cwd(), "app/api/admin/site-icons/main/route.ts")));
const mainRoute = read("app/api/admin/site-icons/main/route.ts");
assert.match(mainRoute, /assertPlatformAdmin/);
assert.match(mainRoute, /SITE_ICON_DEFINITIONS\.filter/);
assert.match(mainRoute, /site_icon_main_uploaded/);
assert.match(manager, /Main Website Icon/);
assert.match(manager, /api\/admin\/site-icons\/main/);
assert.ok(fs.existsSync(path.join(process.cwd(), "app/favicon.svg/route.ts")));
assert.ok(fs.existsSync(path.join(process.cwd(), "app/icons/safari-pinned-tab.svg/route.ts")));
assert.match(seo, /\/favicon\.png/);
assert.match(seo, /\/favicon\.ico/);
assert.match(seo, /\/api\/site-icons\/favicon-ico/);
assert.match(seo, /\/api\/site-icons\/apple-touch/);
assert.match(manifest, /icon\("pwa-192"\)/);
assert.match(manifest, /encodeURIComponent/);
assert.match(sidebar, /\/admin\/settings\/icons/);
assert.match(manager, /accept="image\/png"/);
assert.match(manager, /Google Search result/);
assert.match(manager, /Previous versions/);
assert.match(manager, /Using repository default/);
assert.match(proxy, /api\/site-icons/);
assert.match(proxy, /site\.webmanifest/);
assert.match(proxy, /browserconfig\.xml/);
assert.match(proxy, /api\/storefront-favicon/);
assert.match(proxy, /pathname !== "\/api\/site-icons\/storefront-empty"/);
// Keep the icon-manager preview build explicitly enabled by the repository ignore-build policy.
console.log("Site Icon Manager verification: PASS");
