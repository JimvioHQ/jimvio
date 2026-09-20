import type { DestinationCapabilities, DestinationPlatform } from "./types";
import { isTikTokOfficialLivePublishingAvailable } from "./tiktok-live-gate";

/**
 * User-facing Live Destinations presentation order.
 * Backend still supports facebook / instagram / custom_rtmp adapters;
 * those platforms are not listed in the Live Destinations UI.
 */
export const USER_VISIBLE_LIVE_DESTINATIONS: readonly DestinationPlatform[] = [
  "jimvio",
  "youtube",
  "twitch",
  "tiktok",
] as const;

export function isUserVisibleLiveDestination(
  platform: DestinationPlatform | string
): boolean {
  return (USER_VISIBLE_LIVE_DESTINATIONS as readonly string[]).includes(
    platform
  );
}

const EMPTY: DestinationCapabilities = {
  oauth: false,
  createBroadcast: false,
  createStream: false,
  startBroadcast: false,
  stopBroadcast: false,
  metadata: false,
  privacy: false,
  health: false,
  chat: false,
  comments: false,
  thumbnail: false,
  customRTMP: false,
};

export function platformCapabilities(
  platform: DestinationPlatform
): DestinationCapabilities {
  switch (platform) {
    case "jimvio":
      return {
        ...EMPTY,
        health: true,
        metadata: true,
        privacy: true,
        chat: true,
      };
    case "youtube":
      return {
        ...EMPTY,
        oauth: true,
        createBroadcast: true,
        createStream: true,
        startBroadcast: true,
        stopBroadcast: true,
        metadata: true,
        privacy: true,
        health: true,
        thumbnail: true,
      };
    case "twitch":
      return {
        ...EMPTY,
        oauth: true,
        createStream: true,
        startBroadcast: true,
        stopBroadcast: true,
        metadata: true,
        health: true,
      };
    case "facebook":
      return {
        ...EMPTY,
        oauth: true,
        createBroadcast: true,
        startBroadcast: true,
        stopBroadcast: true,
        metadata: true,
        privacy: true,
        health: true,
      };
    case "instagram":
      return {
        ...EMPTY,
        oauth: true,
        createBroadcast: true,
        startBroadcast: true,
        stopBroadcast: true,
        metadata: true,
        health: true,
      };
    case "tiktok":
      // Login Kit OAuth only until TikTok grants an official LIVE Open API.
      // Do not advertise create/start/stop broadcast capabilities prematurely.
      return {
        ...EMPTY,
        oauth: true,
      };
    case "custom_rtmp":
      return {
        ...EMPTY,
        customRTMP: true,
        health: true,
      };
    default:
      return EMPTY;
  }
}

export function platformLabel(platform: DestinationPlatform): string {
  switch (platform) {
    case "jimvio":
      return "Jimvio";
    case "youtube":
      return "YouTube";
    case "twitch":
      return "Twitch";
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "custom_rtmp":
      return "Custom RTMP";
    default:
      return platform;
  }
}

/**
 * Production readiness for Jimvio's app credentials / approval state.
 * Never mark a platform ready without official API access configured.
 */
export function platformReadiness(platform: DestinationPlatform): {
  status: "supported" | "requires_approval" | "unsupported";
  message: string | null;
  oauthConfigured: boolean;
} {
  switch (platform) {
    case "jimvio":
      return { status: "supported", message: null, oauthConfigured: true };
    case "youtube": {
      const ok = Boolean(
        process.env.YOUTUBE_CLIENT_ID?.trim() &&
          process.env.YOUTUBE_CLIENT_SECRET?.trim()
      );
      return {
        status: ok ? "supported" : "requires_approval",
        message: ok
          ? null
          : "YouTube OAuth credentials are not configured for this Jimvio deployment.",
        oauthConfigured: ok,
      };
    }
    case "twitch": {
      const ok = Boolean(
        process.env.TWITCH_CLIENT_ID?.trim() &&
          process.env.TWITCH_CLIENT_SECRET?.trim()
      );
      return {
        status: ok ? "supported" : "requires_approval",
        message: ok
          ? null
          : "Twitch OAuth credentials are not configured for this Jimvio deployment.",
        oauthConfigured: ok,
      };
    }
    case "facebook": {
      const approved =
        process.env.META_LIVE_VIDEO_ENABLED === "true" &&
        Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
      return {
        status: approved ? "supported" : "requires_approval",
        message: approved
          ? null
          : "Facebook Live requires Meta Live Video API access and App Review for Jimvio.",
        oauthConfigured: Boolean(
          process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()
        ),
      };
    }
    case "instagram": {
      const approved =
        process.env.INSTAGRAM_LIVE_ENABLED === "true" &&
        Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
      return {
        status: approved ? "supported" : "requires_approval",
        message: approved
          ? null
          : "Instagram Live requires Meta/Instagram Live API eligibility and App Review.",
        oauthConfigured: Boolean(
          process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()
        ),
      };
    }
    case "tiktok": {
      // Login Kit OAuth ≠ LIVE publishing. Official developers.tiktok.com has no
      // public Open API for third-party LIVE RTMP/stream-key creation. Env flags
      // (including TIKTOK_LIVE_ENABLED) must never mark LIVE as supported alone.
      const oauthConfigured = Boolean(
        process.env.TIKTOK_CLIENT_KEY?.trim() &&
          process.env.TIKTOK_CLIENT_SECRET?.trim()
      );
      const liveApiAvailable = isTikTokOfficialLivePublishingAvailable();
      return {
        status: liveApiAvailable && oauthConfigured ? "supported" : "requires_approval",
        message: liveApiAvailable
          ? null
          : "TikTok Live multistream requires an official TikTok programmatic LIVE API (not granted). Login Kit account connection does not enable Live publishing.",
        oauthConfigured,
      };
    }
    case "custom_rtmp":
      return { status: "supported", message: null, oauthConfigured: false };
    default:
      return {
        status: "unsupported",
        message: "Platform is not supported.",
        oauthConfigured: false,
      };
  }
}
