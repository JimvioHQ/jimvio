/**
 * Generate EC P-256 key pair for PawaPay HTTP message signatures (RFC 9421).
 * Default signing in app uses ecdsa-p256-sha256 — matches this curve.
 *
 * 1. Run: npm run pawapay:generate-signing-key
 * 2. Upload the printed PUBLIC key in PawaPay Dashboard → API tokens / signing (sandbox: dashboard.sandbox.pawapay.io).
 * 3. Copy the Key ID the dashboard shows into PAWAPAY_HTTP_SIGNING_KEY_ID.
 * 4. Put the PRIVATE key in PAWAPAY_HTTP_SIGNING_PRIVATE_KEY (quoted, use \\n for newlines in .env).
 * 5. Remove PAWAPAY_HTTP_SIGNING_DISABLED if you set it.
 *
 * @see https://docs.pawapay.io/v2/docs/signatures
 */

import { generateKeyPairSync } from "crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

const pubPem = publicKey.export({ type: "spki", format: "pem" });
const privPem = privateKey.export({ type: "pkcs8", format: "pem" });

const privOneLine = privPem.trim().replace(/\r?\n/g, "\\n");

console.log(`
=== PawaPay signing key (EC P-256) — keep the PRIVATE key secret ===

--- PUBLIC KEY (upload this in PawaPay Dashboard → signed requests / API tokens) ---
${pubPem.trim()}

--- PRIVATE KEY for .env (single line with \\\\n) ---
PAWAPAY_HTTP_SIGNING_PRIVATE_KEY="${privOneLine}"

After upload, set (use the Key ID from the dashboard, not a guess):
PAWAPAY_HTTP_SIGNING_KEY_ID=<key_id_from_dashboard>

Optional (already default in code):
PAWAPAY_HTTP_SIGNING_ALG=ecdsa-p256-sha256

Then restart: npm run dev
`);
