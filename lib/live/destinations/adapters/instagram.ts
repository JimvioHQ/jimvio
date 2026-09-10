import { platformCapabilities, platformReadiness } from "../capabilities";
import { ApprovalRequiredAdapter, type DestinationAdapter } from "./base";

/**
 * Instagram Live via official Meta APIs.
 * Consumer Instagram accounts are not supported.
 * Production activation requires INSTAGRAM_LIVE_ENABLED=true after App Review.
 */
export function createInstagramAdapter(): DestinationAdapter {
  const readiness = platformReadiness("instagram");
  return new ApprovalRequiredAdapter(
    "instagram",
    platformCapabilities("instagram"),
    readiness.message ??
      "Instagram Live requires Meta/Instagram Live API eligibility and App Review."
  );
}

export function instagramAuthUrl(): string | null {
  // Do not start OAuth until Jimvio has official Live access.
  if (platformReadiness("instagram").status !== "supported") return null;
  return null;
}
