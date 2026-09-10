import { platformCapabilities, platformReadiness } from "../capabilities";
import { ApprovalRequiredAdapter, type DestinationAdapter } from "./base";

/**
 * TikTok Live via official TikTok developer APIs only.
 * Without TIKTOK_LIVE_ENABLED + partner approval, never fake connect/live.
 */
export function createTikTokAdapter(): DestinationAdapter {
  const readiness = platformReadiness("tiktok");
  return new ApprovalRequiredAdapter(
    "tiktok",
    platformCapabilities("tiktok"),
    readiness.message ??
      "TikTok Live is not currently enabled for this Jimvio integration."
  );
}

export function tiktokAuthUrl(): string | null {
  return null;
}
