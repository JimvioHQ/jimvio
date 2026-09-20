/**
 * TikTok LIVE publishing capability gate (shared, no circular imports).
 *
 * Official developers.tiktok.com (audited): Login Kit + Content Posting API
 * (VOD) exist. There is no documented public Open API for third-party apps to
 * create LIVE broadcasts / obtain RTMP ingest URLs programmatically.
 *
 * Flip ONLY when:
 * 1. TikTok documents an official LIVE Open API contract, AND
 * 2. Jimvio is granted that product/scope in the Developer Portal, AND
 * 3. A real TikTokLiveDestinationAdapter implements that contract.
 *
 * Env vars (including TIKTOK_LIVE_ENABLED) must NEVER alone enable LIVE.
 */

export const TIKTOK_LIVE_BLOCKED_MESSAGE =
  "TikTok Live multistream is not available: TikTok has not granted Jimvio an official programmatic LIVE API. Connecting a TikTok account (Login Kit) does not enable Live publishing.";

export function isTikTokOfficialLivePublishingAvailable(): boolean {
  return false;
}
