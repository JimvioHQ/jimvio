import { createHmac, timingSafeEqual } from "crypto";

export const QUANTFORG_SIGNATURE_HEADER = "x-quantforg-signature";

export function signQuantForgBody(secret: string, rawBody: string): string {
  return signQuantForgBodyWithKey(secretKeyCandidates(secret)[0], rawBody);
}

function signQuantForgBodyWithKey(key: Buffer, rawBody: string): string {
  return createHmac("sha256", key).update(rawBody).digest("hex");
}

/** UTF-8 key plus hex-decoded key when secret is 64-char hex (common ops pattern). */
function secretKeyCandidates(secret: string): Buffer[] {
  const keys: Buffer[] = [Buffer.from(secret, "utf8")];
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    keys.push(Buffer.from(secret, "hex"));
  }
  return keys;
}

function normalizeProvidedSignature(signature: string): string {
  const trimmed = signature.trim();
  return trimmed.toLowerCase().startsWith("sha256=")
    ? trimmed.slice("sha256=".length)
    : trimmed;
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a.toLowerCase(), "hex");
    const bufB = Buffer.from(b.toLowerCase(), "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function safeEqualDigest(expectedHex: string, provided: string): boolean {
  const normalized = normalizeProvidedSignature(provided);
  if (/^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0) {
    return safeEqualHex(expectedHex, normalized);
  }

  try {
    const expectedBuf = Buffer.from(expectedHex, "hex");
    const providedBuf = Buffer.from(normalized, "base64");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

function verifyHmacSignature(secret: string, rawBody: string, signature: string): boolean {
  const provided = normalizeProvidedSignature(signature);
  for (const key of secretKeyCandidates(secret)) {
    const expected = signQuantForgBodyWithKey(key, rawBody);
    if (safeEqualDigest(expected, provided)) return true;
  }
  return false;
}

function extractBearerToken(auth: string): string | null {
  const match = auth.match(/^bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * Validates QuantForg webhook authentication.
 * Accepts HMAC-SHA256 hex in X-QuantForg-Signature, or Authorization: Bearer <secret>.
 */
export function verifyQuantForgWebhookAuth(
  secret: string,
  rawBody: string,
  headers: Headers
): { ok: true } | { ok: false; reason: string } {
  const signature = headers.get(QUANTFORG_SIGNATURE_HEADER)?.trim();
  if (signature) {
    if (verifyHmacSignature(secret, rawBody, signature)) return { ok: true };
    return { ok: false, reason: "Invalid signature" };
  }

  const auth = headers.get("authorization")?.trim();
  const token = auth ? extractBearerToken(auth) : null;
  if (token) {
    if (token.length > 0 && token === secret) return { ok: true };
    return { ok: false, reason: "Invalid bearer token" };
  }

  return { ok: false, reason: "Missing authentication" };
}
