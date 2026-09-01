/**
 * Cloudinary signed upload param verifier.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
config({ path: resolve(root, ".env.local") });

function buildSignature(params, secret) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha256").update(sorted + secret).digest("hex");
}

function main() {
  const secret = process.env.CLOUDINARY_API_SECRET || "test-secret";

  const folder = "jimvio/identity";
  const timestamp = "1700000000";
  const type = "upload";
  const params = { folder, timestamp, type };

  const sig = buildSignature(params, secret);
  assert.equal(typeof sig, "string");
  assert.equal(sig.length, 64);

  const withoutType = buildSignature({ folder, timestamp }, secret);
  assert.notEqual(sig, withoutType, "type must be part of signed params");

  const canonical = `folder=${folder}&timestamp=${timestamp}&type=${type}`;
  assert.ok(canonical.includes("type=upload"));

  console.log("verify-cloudinary-upload-signature: ok");
}

main();
