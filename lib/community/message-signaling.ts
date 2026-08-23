const CALL_SIGNAL_TYPES = new Set(["call_signal", "call_start"]);

/** WebRTC signaling payloads stored as inbox/room messages — never show as chat text. */
export function isCallSignalingMessage(
  messageType: string | null | undefined,
  body?: string | null
): boolean {
  if (messageType && CALL_SIGNAL_TYPES.has(messageType)) return true;
  return looksLikeSignalingBody(body);
}

/** Feed/activity bodies that are signaling payloads, not human posts. */
export function isTechnicalFeedBody(body: string | null | undefined): boolean {
  return looksLikeSignalingBody(body);
}

function looksLikeSignalingBody(body: string | null | undefined): boolean {
  if (!body) return false;
  const trimmed = body.trim();
  if (!trimmed) return false;
  if (/^candidate:/i.test(trimmed)) return true;
  if (/"ice"\s*:\s*\{/.test(trimmed) && /candidate/i.test(trimmed)) return true;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try {
    const parsed = JSON.parse(trimmed) as {
      sdp?: unknown;
      ice?: unknown;
      type?: unknown;
      candidate?: unknown;
    };
    if (parsed.sdp != null || parsed.ice != null || parsed.candidate != null) {
      return true;
    }
    if (
      parsed.type === "offer" ||
      parsed.type === "answer" ||
      parsed.type === "candidate"
    ) {
      return true;
    }
    return false;
  } catch {
    return (
      trimmed.includes('"sdp"') ||
      trimmed.includes('"ice"') ||
      /"type"\s*:\s*"(offer|answer|candidate)"/.test(trimmed)
    );
  }
}

export function previewChatMessage(
  body: string,
  messageType: string | null | undefined
): string {
  if (messageType === "call_start") {
    return body === "video" ? "Video call" : "Voice call";
  }
  if (isCallSignalingMessage(messageType, body)) return "";
  if (messageType === "audio") return "Voice message";
  if (messageType === "file") return "Sent a file";
  if (messageType === "image") return "Sent an image";
  return body || "No messages yet";
}

export function findLastVisibleMessage<
  T extends { body?: string | null; message_type?: string | null; created_at?: string | null },
>(messages: T[]): T | undefined {
  const sorted = [...messages].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
  return sorted.find((m) => !isCallSignalingMessage(m.message_type, m.body));
}
