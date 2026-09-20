/**
 * Structured production logs for Live Studio (token, media, egress, sessions).
 * Safe for Vercel / platform log drains — never log secrets or raw JWTs.
 */

export type LiveStudioLogLevel = "info" | "warn" | "error";

export type LiveStudioEvent =
  | "session_create"
  | "session_join"
  | "session_end"
  | "session_report"
  | "token_mint"
  | "token_denied"
  | "token_failed"
  | "media_publish"
  | "media_publish_failed"
  | "reconnect"
  | "recording_start"
  | "recording_stop"
  | "recording_failed"
  | "egress_webhook"
  | "egress_webhook_failed"
  | "security_denied"
  | "destination_prepare"
  | "destination_prepare_failed"
  | "destination_start"
  | "destination_failed"
  | "destination_reconnect"
  | "destination_stop"
  | "multistream_egress_started"
  | "multistream_egress_start_failed"
  | "multistream_stopped"
  | "tiktok_oauth_start"
  | "tiktok_oauth_callback"
  | "tiktok_oauth_success"
  | "tiktok_oauth_denied"
  | "tiktok_oauth_state_invalid"
  | "tiktok_oauth_token_exchange_failed"
  | "tiktok_oauth_disconnect"
  | "tiktok_token_refresh"
  | "tiktok_destination_prepare"
  | "tiktok_destination_start"
  | "tiktok_destination_live"
  | "tiktok_destination_error"
  | "tiktok_destination_retry"
  | "tiktok_destination_stop"
  | "tiktok_destination_cleanup"
  | "tiktok_live_capability_blocked"
  | "youtube_oauth_disconnect"
  | "youtube_oauth_start"
  | "youtube_oauth_callback"
  | "youtube_oauth_success"
  | "youtube_oauth_denied"
  | "youtube_oauth_state_invalid"
  | "youtube_oauth_token_exchange_failed"
  | "twitch_oauth_started"
  | "twitch_oauth_success"
  | "twitch_oauth_denied"
  | "twitch_oauth_failed"
  | "twitch_token_valid"
  | "twitch_token_invalid"
  | "twitch_token_refresh"
  | "twitch_connection_created"
  | "twitch_connection_removed"
  | "twitch_destination_prepare"
  | "twitch_destination_started"
  | "twitch_destination_failed"
  | "twitch_destination_stopped"
  | "twitch_oauth_disconnect"
  | "unhandled";

type Fields = Record<string, string | number | boolean | null | undefined>;

export function liveStudioLog(
  level: LiveStudioLogLevel,
  event: LiveStudioEvent,
  fields: Fields = {}
): void {
  const payload = {
    level,
    scope: "live_studio",
    event,
    ts: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
