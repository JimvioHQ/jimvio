#!/usr/bin/env node
/**
 * Verify PesaPal sandbox/live credentials outside Next.js.
 * Run from project root: npm run pesapal:verify
 *
 * - Loads .env then .env.local (later overrides)
 * - POSTs to RequestToken (same URL as lib/pesapal.ts)
 * - Prints OK + token prefix, or the exact JSON error from PesaPal
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

function loadEnv() {
  const env = {};
  for (const name of [".env", ".env.local"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseLine(line);
      if (parsed) env[parsed.key] = parsed.val;
    }
  }
  return env;
}

function normalize(raw) {
  if (raw == null) return "";
  let v = String(raw).replace(/\r/g, "").replace(/^\uFEFF/, "").trim();
  if (v.length >= 2) {
    const a = v[0];
    const b = v[v.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      v = v.slice(1, -1).trim();
    }
  }
  return v;
}

const env = loadEnv();
const PESAPAL_ENV = env.PESAPAL_ENV === "live" ? "live" : "sandbox";
const base =
  PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";
const url = `${base}/api/Auth/RequestToken`;

const key = normalize(env.PESAPAL_CONSUMER_KEY);
const secret = normalize(env.PESAPAL_CONSUMER_SECRET);

console.log("PesaPal credential check (outside Next.js)");
console.log("  PESAPAL_ENV:", PESAPAL_ENV);
console.log("  Base URL:   ", base);
console.log("  Key length: ", key.length, key.length ? `(starts with ${key.slice(0, 4)}…)` : "(EMPTY)");
console.log("  Secret len: ", secret.length, secret.length ? "(set)" : "(EMPTY)");
console.log("  Request URL:", url);
console.log("");

const looksPlaceholder =
  /^your[-_]?/i.test(key) ||
  /^your[-_]?/i.test(secret) ||
  /xxxxx/i.test(key) ||
  key.length < 16 ||
  secret.length < 16;
if (looksPlaceholder && key && secret) {
  console.warn(
    "WARNING: Key/secret look like .env.example placeholders. Replace with REAL values from PesaPal (download API 3.0 test credentials)."
  );
  console.warn("");
}

if (!key || !secret) {
  console.error(
    "FAIL: PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET is missing in .env / .env.local"
  );
  process.exit(1);
}

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({
    consumer_key: key,
    consumer_secret: secret,
  }),
});

const data = await res.json();
if (data.token) {
  console.log("OK: PesaPal returned an access token.");
  console.log("    Token prefix:", String(data.token).slice(0, 24) + "…");
  console.log("    Your credentials work with this environment. If Next.js still errors, restart `npm run dev` after saving .env and ensure no typo in variable names.");
  process.exit(0);
}

console.error("FAIL: No token. HTTP status:", res.status);
console.error("PesaPal body:", JSON.stringify(data, null, 2));
console.error("");
console.error(
  "If code is invalid_consumer_key_or_secret_provided: download fresh API 3.0 test credentials from https://developer.pesapal.com (sandbox) and paste BOTH key and secret. Live keys only work with PESAPAL_ENV=live."
);
process.exit(1);
