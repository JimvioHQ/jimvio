/**
 * Verifies default post-login destination is /communities (not UGC campaign center),
 * and merchant storefronts have an isolated default of "/".
 * Usage: node scripts/verify-post-login-default.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "lib/auth/post-login-redirect.ts");
const src = fs.readFileSync(file, "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(src.includes('DEFAULT_POST_LOGIN_PATH = "/communities"'), "default path");
assert(src.includes('MERCHANT_POST_LOGIN_PATH = "/"'), "merchant default path");
assert(/vendor:\s*DEFAULT_POST_LOGIN_PATH/.test(src), "vendor must use DEFAULT_POST_LOGIN_PATH");
assert(!/vendor:\s*"\/ugc\/campaign-center"/.test(src), "vendor must not hardcode campaign-center");
assert(src.includes("merchantStorefront"), "merchant storefront option required");
assert(src.includes("isPlatformDestinationPath"), "platform destination guard required");

const nextConfig = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
assert(
  nextConfig.includes("camera=(self), microphone=(self)"),
  "Permissions-Policy must allow first-party camera/mic"
);
assert(
  nextConfig.includes("display-capture=(self)"),
  "Permissions-Policy must allow first-party display-capture for Live screen share"
);
assert(
  !nextConfig.includes("camera=(), microphone=()"),
  "Permissions-Policy must not deny camera/mic site-wide"
);

const settings = fs.readFileSync(path.join(root, "app/identity/settings/page.tsx"), "utf8");
assert(!settings.includes("Live Destinations"), "General Settings must not list Live Destinations");
assert(!settings.includes("/identity/live-destinations"), "General Settings must not link live destinations");

console.log("verify-post-login-default: PASS");
