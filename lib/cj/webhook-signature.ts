import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * CJ signs the exact raw request body with the account openId string as the
 * HMAC-SHA256 secret and sends the Base64 digest in the `sign` header.
 */
export function verifyCjWebhookSignature(
  rawBody: string,
  presentedSignature: string | null | undefined,
  openId: string | number | null | undefined
): boolean {
  if (!rawBody || !presentedSignature?.trim() || openId == null || String(openId).length === 0) {
    return false;
  }

  const expected = createHmac("sha256", String(openId))
    .update(rawBody, "utf8")
    .digest("base64");
  const presented = Buffer.from(presentedSignature.trim(), "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");

  return presented.length === expectedBytes.length &&
    timingSafeEqual(presented, expectedBytes);
}
