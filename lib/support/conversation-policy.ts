import { containsSensitiveSupportText, cleanText } from "./validation";

export const CONVERSATION_STATUSES = ["ai", "queued", "active", "resolved"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export type ConversationMode = "ai" | "human";

export const PRESENCE_FRESH_MS = 90_000;
export const TYPING_FRESH_MS = 4_000;

const CLIENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPresenceFresh(lastSeenIso: string, available: boolean, now = Date.now()) {
  if (!available) return false;
  const seen = Date.parse(lastSeenIso);
  if (!Number.isFinite(seen)) return false;
  return now - seen <= PRESENCE_FRESH_MS;
}

export function countAvailableAgents(
  rows: Array<{ last_seen_at: string; available: boolean }>,
  now = Date.now(),
) {
  return rows.filter((row) => isPresenceFresh(row.last_seen_at, row.available, now)).length;
}

export function isTypingFresh(updatedIso: string | null | undefined, now = Date.now()) {
  if (!updatedIso) return false;
  const seen = Date.parse(updatedIso);
  if (!Number.isFinite(seen)) return false;
  return now - seen <= TYPING_FRESH_MS;
}

export function statusAfterHandoff(current: ConversationStatus): ConversationStatus {
  if (current === "active") return "active";
  return "queued";
}

export function statusAfterCustomerMessage(status: ConversationStatus, mode: ConversationMode): ConversationStatus {
  if (status !== "resolved") return status;
  return mode === "human" ? "queued" : "ai";
}

export function shouldAnswerWithAssistant(status: ConversationStatus, mode: ConversationMode) {
  return mode === "ai" && statusAfterCustomerMessage(status, mode) === "ai";
}

export function validateChatBody(body: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const value = cleanText(body, 4000);
  if (value.length < 1) return { ok: false, error: "Enter a message." };
  if (containsSensitiveSupportText(value)) {
    return { ok: false, error: "Remove passwords, authenticator codes, and card numbers before sending." };
  }
  return { ok: true, value };
}

export function parseClientMessageId(value: unknown) {
  if (typeof value !== "string" || !CLIENT_ID.test(value)) return null;
  return value.toLowerCase();
}

export type CustomerChatMessage = {
  id: string;
  authorRole: "customer" | "ai" | "staff" | "system";
  body: string;
  createdAt: string;
  answerMode: "knowledge" | "live" | "refused" | null;
  articles: Array<{ slug: string; title: string; href: string }>;
};

export function toCustomerChatMessages(
  messages: Array<{
    id: string;
    author_role: string;
    visibility: string;
    body: string;
    created_at: string;
    answer_mode?: string | null;
    articles?: unknown;
  }>,
): CustomerChatMessage[] {
  return messages
    .filter((message) => message.visibility === "customer")
    .filter((message) => message.author_role !== "internal")
    .map((message) => ({
      id: message.id,
      authorRole: (message.author_role === "ai" ||
      message.author_role === "staff" ||
      message.author_role === "system"
        ? message.author_role
        : "customer") as CustomerChatMessage["authorRole"],
      body: message.body,
      createdAt: message.created_at,
      answerMode:
        message.answer_mode === "knowledge" || message.answer_mode === "live" || message.answer_mode === "refused"
          ? message.answer_mode
          : null,
      articles: normalizeArticles(message.articles),
    }));
}

function normalizeArticles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { slug?: unknown; title?: unknown; href?: unknown };
      if (typeof row.slug !== "string" || typeof row.title !== "string" || typeof row.href !== "string") return null;
      if (!row.href.startsWith("/help/articles/")) return null;
      return { slug: row.slug, title: row.title, href: row.href };
    })
    .filter((item): item is { slug: string; title: string; href: string } => item !== null);
}

export function shouldEmailCustomerReply(message: { author_role: string; visibility: string }) {
  return message.author_role === "staff" && message.visibility === "customer";
}
