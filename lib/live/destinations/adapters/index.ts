import type { DestinationPlatform } from "../types";
import type { DestinationAdapter } from "./base";
import { JimvioDestinationAdapter } from "./jimvio";
import { YouTubeDestinationAdapter } from "./youtube";
import { TwitchDestinationAdapter } from "./twitch";
import { createFacebookAdapter } from "./facebook";
import { createInstagramAdapter } from "./instagram";
import { createTikTokAdapter } from "./tiktok";
import { CustomRtmpDestinationAdapter } from "./custom-rtmp";

export function getDestinationAdapter(
  platform: DestinationPlatform
): DestinationAdapter {
  switch (platform) {
    case "jimvio":
      return new JimvioDestinationAdapter();
    case "youtube":
      return new YouTubeDestinationAdapter();
    case "twitch":
      return new TwitchDestinationAdapter();
    case "facebook":
      return createFacebookAdapter();
    case "instagram":
      return createInstagramAdapter();
    case "tiktok":
      return createTikTokAdapter();
    case "custom_rtmp":
      return new CustomRtmpDestinationAdapter();
    default: {
      const _exhaustive: never = platform;
      throw new Error(`Unknown platform: ${_exhaustive}`);
    }
  }
}

export {
  youtubeAuthUrl,
  exchangeYouTubeCode,
  mapYouTubeOAuthError,
  revokeYouTubeAccess,
  YOUTUBE_OAUTH_SCOPES,
  YOUTUBE_OAUTH_REDIRECT_PATH,
} from "./youtube";
export { twitchAuthUrl, exchangeTwitchCode } from "./twitch";
export { facebookAuthUrl, exchangeFacebookCode } from "./facebook";
export { instagramAuthUrl } from "./instagram";
export {
  tiktokAuthUrl,
  exchangeTikTokCode,
  refreshTikTokCredentials,
  revokeTikTokAccess,
  isTikTokLoginKitConfigured,
  TIKTOK_LOGIN_KIT_SCOPE,
} from "./tiktok";
