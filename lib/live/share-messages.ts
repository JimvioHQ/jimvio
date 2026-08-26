export type LiveShareCode =
  | "ended"
  | "no_access"
  | "conversation_unavailable"
  | "invalid_target"
  | "send_failed";

export const LIVE_SHARE_CLIENT_MESSAGE: Record<LiveShareCode, string> = {
  ended: "The Live has ended.",
  no_access: "You no longer have access to this Live.",
  conversation_unavailable: "This conversation is unavailable.",
  invalid_target: "This conversation is unavailable.",
  send_failed: "Unable to send the Live link. Please try again.",
};
