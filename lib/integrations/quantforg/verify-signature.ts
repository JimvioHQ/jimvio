import { createHmac, timingSafeEqual } from "crypto";

export const QUANTFORG_SIGNATURE_HEADER = "x-quantforg-signature";

export function signQuantForgBody(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
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
    const expected = signQuantForgBody(secret, rawBody);
    const provided = signature.startsWith("sha256=")
      ? signature.slice("sha256=".length)
      : signature;
    if (safeEqualHex(expected, provided)) return { ok: true };
    return { ok: false, reason: "Invalid signature" };
  }

  const auth = headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token.length > 0 && token === secret) return { ok: true };
    return { ok: false, reason: "Invalid bearer token" };
  }

  return { ok: false, reason: "Missing authentication" };
}
