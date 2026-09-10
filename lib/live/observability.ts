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
