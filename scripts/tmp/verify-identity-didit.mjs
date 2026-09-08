#!/usr/bin/env node
/**
 * Static gate for Identity + Didit + mobile balance chip.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), "utf8");
const exists = (p) => existsSync(join(root, p));

assert(exists("components/wallet-os/WalletBalanceChip.tsx"), "WalletBalanceChip missing");
assert(exists("app/api/webhooks/didit/route.ts"), "Didit webhook route missing");
assert(exists("app/api/identity/verification/session/route.ts"), "Didit session route missing");
assert(exists("app/identity/verification/page.tsx"), "Verification page missing");
assert(exists("app/identity/privacy/page.tsx"), "Privacy page missing");
assert(exists("app/identity/account/page.tsx"), "Account settings page missing");
assert(exists("lib/identity/didit.ts"), "Didit helpers missing");

const chip = read("components/wallet-os/WalletBalanceChip.tsx");
const chipCode = chip.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
assert(!/Jimvio Balance/.test(chipCode), "chip must not render Jimvio Balance label");
assert(chip.includes("formatMoneyAsUSD"), "chip must use USD formatter");
assert(chip.includes("JimvioLogo"), "chip must use Jimvio logo mark");

const navbar = read("components/layout/navbar.tsx");
assert(navbar.includes("WalletBalanceChip"), "navbar must use WalletBalanceChip");
assert(!/>\s*Jimvio Balance\s*</.test(navbar), "navbar must not show Jimvio Balance text");

const edit = read("components/identity/IdentityEditClient.tsx");
assert(edit.includes('label: "Profile"'), "edit nav must include Profile");
assert(!edit.includes('label: "Social accounts"'), "edit nav must not include Social accounts");
assert(!edit.includes('label: "Portfolio"'), "edit nav must not include Portfolio");
assert(!edit.includes('label: "Resume"'), "edit nav must not include Resume");
assert(!edit.includes('label: "Privacy"'), "edit nav must not include Privacy");
assert(edit.includes("evaluateProfileStrength"), "profile strength required");
assert(edit.includes("VerifiedBadge"), "verified badge required");
assert(edit.includes("ExternalLinksSection") || edit.includes("Social / external links"), "external links on profile");

const settings = read("app/identity/settings/page.tsx");
assert(settings.includes("/identity/verification"), "settings must link verification");
assert(settings.includes("/identity/privacy"), "settings must link privacy");
assert(settings.includes("/identity/account"), "settings must link account");
assert(settings.includes("/wallet"), "settings must link wallet");

const webhook = read("app/api/webhooks/didit/route.ts");
assert(webhook.includes("verifyDiditWebhook"), "webhook must verify signature");
assert(webhook.includes("req.text()"), "webhook must read raw body");
assert(webhook.includes("jip_didit_webhook_events"), "webhook must be idempotent via event log");
assert(webhook.includes('status === "Approved"'), "only Approved marks verified");

const didit = read("lib/identity/didit.ts");
assert(didit.includes("DIDIT_API_KEY"), "Didit uses env API key");
assert(didit.includes("diditWebhookSecret"), "webhook secret helper");
assert(didit.includes("timingSafeEqual"), "constant-time compare");

console.log("✅ Identity + Didit + balance chip verification passed");
