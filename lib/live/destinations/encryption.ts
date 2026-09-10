import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { EncryptedCredentialPayload } from "./types";

const ALGO = "aes-256-gcm";
const PREFIX = "jvd1:"; // jimvio destination v1

function resolveKey(): Buffer {
  const raw =
    process.env.LIVE_DESTINATION_ENCRYPTION_KEY?.trim() ||
    process.env.APP_ENCRYPTION_KEY?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "LIVE_DESTINATION_ENCRYPTION_KEY is required to store destination credentials"
    );
  }
  // Accept 64-char hex or any string (hashed to 32 bytes).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptCredentials(payload: EncryptedCredentialPayload): string {
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    Buffer.concat([iv, tag, encrypted]).toString("base64url")
  );
}

export function decryptCredentials(ciphertext: string): EncryptedCredentialPayload {
  if (!ciphertext.startsWith(PREFIX)) {
    throw new Error("Unsupported credential ciphertext format");
  }
  const key = resolveKey();
  const buf = Buffer.from(ciphertext.slice(PREFIX.length), "base64url");
  if (buf.length < 28) throw new Error("Invalid credential ciphertext");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as EncryptedCredentialPayload;
}

/** Fingerprint for ingest URLs — never store full push URL in DB. */
export function fingerprintIngestUrl(pushUrl: string): string {
  return createHash("sha256").update(pushUrl).digest("hex").slice(0, 24);
}

export function maskSecret(value: string | null | undefined, visible = 4): string | null {
  if (!value) return null;
  if (value.length <= visible) return "*".repeat(8);
  return `${"*".repeat(Math.min(12, value.length - visible))}${value.slice(-visible)}`;
}

export function isEncryptionConfigured(): boolean {
  return Boolean(
    process.env.LIVE_DESTINATION_ENCRYPTION_KEY?.trim() ||
      process.env.APP_ENCRYPTION_KEY?.trim()
  );
}
