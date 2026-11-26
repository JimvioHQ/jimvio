#!/usr/bin/env node
/**
 * Static verification for premium header + profile menu IA.
 * Fails if Orders/theme/Inbox/email/Total Orders reappear in canonical chrome.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const navbar = read("components/layout/navbar.tsx");
const profileMenu = read("components/shell/ProfileAccountMenu.tsx");
const primaryNav = read("lib/navigation/primary-nav.ts");
const headerUtils = read("components/shell/HeaderUtilityActions.tsx");
const appTopNav = read("components/shell/AppTopNav.tsx");
const themeProvider = read("components/providers/theme-provider.tsx");
const themeToggle = read("components/ui/theme-toggle.tsx");
const counts = read("lib/actions/marketplace.ts");

assert(navbar.includes("HeaderUtilityActions"), "navbar must use HeaderUtilityActions");
assert(!navbar.includes('href="/orders"'), "navbar must not link Orders in header");
assert(!navbar.includes("ThemeToggle"), "navbar must not render ThemeToggle");
assert(navbar.includes("notificationCount"), "navbar must wire notification count");
assert(navbar.includes("walletBalance"), "navbar must wire wallet balance");

assert(headerUtils.includes("NOTIFICATIONS_HREF"), "header utilities must include notifications");
assert(headerUtils.includes("CART_HREF"), "header utilities must include cart");
assert(headerUtils.includes("WALLET_HREF"), "header utilities must include wallet");
assert(!headerUtils.includes('"/orders"'), "header utilities must not include Orders");

assert(profileMenu.includes("View and manage your account"), "profile menu identity subtitle");
assert(!profileMenu.includes("user.email"), "profile menu must not render email");
assert(!/label:\s*"Inbox"/.test(profileMenu) && !profileMenu.includes('href="/inbox"'), "profile menu must not include Inbox");
assert(!profileMenu.includes("Total Orders"), "profile menu must not include Total Orders");
assert(profileMenu.includes("Wallet Balance"), "profile menu must show wallet balance");
assert(profileMenu.includes("Rewards"), "profile menu must show Rewards metric");
assert(profileMenu.includes("PROFILE_TOOL_ITEMS"), "profile menu must use tool items");
assert(profileMenu.includes("PROFILE_SUPPORT_ITEMS"), "profile menu must use support items");
assert(profileMenu.includes("Logout"), "profile menu must include Logout");

assert(primaryNav.includes('label: "My Products"'), "primary-nav My Products");
assert(primaryNav.includes('label: "Earnings"'), "primary-nav Earnings");
assert(primaryNav.includes('label: "Saved Items"'), "primary-nav Saved Items");
assert(primaryNav.includes('label: "Help Center"'), "primary-nav Help Center");
assert(!primaryNav.includes('label: "Inbox"'), "primary-nav must not list Inbox");
assert(
  primaryNav.indexOf('label: "Orders"') > primaryNav.indexOf('label: "Saved Items"'),
  "primary-nav Orders must appear immediately below Saved Items"
);

assert(appTopNav.includes("HeaderUtilityActions"), "AppTopNav must use HeaderUtilityActions");
assert(!appTopNav.includes("ThemeToggle"), "AppTopNav must not render ThemeToggle");
assert(!appTopNav.includes('href="/orders"'), "AppTopNav must not link Orders");

assert(themeProvider.includes('forcedTheme="light"'), "ThemeProvider must force light theme");
assert(themeToggle.includes("return null"), "ThemeToggle must be a no-op");

assert(counts.includes("notificationCount"), "getNavbarCounts must return notificationCount");
assert(counts.includes("walletBalance"), "getNavbarCounts must return walletBalance");
assert(counts.includes("rewardsBalance"), "getNavbarCounts must return rewardsBalance");

if (failures.length) {
  console.error("FAIL header/profile verification:\n" + failures.map((f) => ` - ${f}`).join("\n"));
  process.exit(1);
}

console.log("PASS header/profile verification (" + [
  "Orders removed",
  "Theme removed",
  "Notifications",
  "Cart",
  "Wallet",
  "Profile IA",
].join(", ") + ")");
