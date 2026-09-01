/** Verified production IDs — override via env if destination changes. */
export const QUANTFORG_COMMUNITY_ID =
  process.env.QUANTFORG_COMMUNITY_ID?.trim() ||
  "bf08dbfb-2624-43e2-8af6-f2057d052356";

export const QUANTFORG_SPACE_ID =
  process.env.QUANTFORG_SPACE_ID?.trim() ||
  "69c96d68-71b2-4571-92c5-eafd36d0f714";

export const QUANTFORG_ROOM_ID =
  process.env.QUANTFORG_ROOM_ID?.trim() ||
  "496ad20c-1796-41c2-90e8-29ebc9243e2a";

/** QuantForg community owner profile — posts appear as this user. */
export const QUANTFORG_SENDER_USER_ID =
  process.env.QUANTFORG_SENDER_USER_ID?.trim() ||
  "450a1520-2d8d-4a71-ab5f-49d688c3ff62";

export const QUANTFORG_COMMUNITY_SLUG = "quantforg";
export const QUANTFORG_SPACE_SLUG = "quantforg-signals-mtihy5zc";

export const QUANTFORG_WEBHOOK_PROVIDER = "quantforg";

export function getQuantForgWebhookSecret(): string | null {
  const secret = process.env.QUANTFORG_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function quantForgIdempotencyKey(eventId: string): string {
  return `${QUANTFORG_WEBHOOK_PROVIDER}:${eventId}`;
}
