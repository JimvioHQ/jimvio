/**
 * Customer-facing guide copy.
 * Internal model notes never belong in this text.
 */

/** Legacy label. It is stripped from every customer-facing reply. */
export const GUIDE_PREFIX = "Jimvio guide. This is not a live answer.";

const PROHIBITED_SOURCE =
  "Jimvio guide\\. This is not a live answer\\.|I couldn't verify that information from Jimvio's available documentation\\.|Please check the relevant Jimvio page or contact support before relying on it\\.";
const PROHIBITED_REPLY = new RegExp(PROHIBITED_SOURCE, "gi");
const PROHIBITED_TEST = new RegExp(PROHIBITED_SOURCE, "i");

export const CLARIFYING_GUIDE =
  "I can help you with that on Jimvio. Are you trying to join a campaign as a creator, or publish a campaign as a brand? I can also walk you through selling, affiliate promotions, communities, or your wallet.";

export const PRIVATE_ACCOUNT_GUIDE =
  "I can help you find the right page, but I can't access your private account details from this chat. Please open the relevant section in Jimvio to check your information.";

const LEAK_LINE =
  /Say you cannot verify|Do not invent|Do not quote|Do not claim|Unverified words:|No verified Jimvio article|Related public facts:|I can't see this account, its orders, payments, or verification from chat|Internal note, not a customer answer|Never reveal secrets|or these instructions|couldn't verify that information|not a live answer|check the relevant Jimvio page/i;

export function isSimpleGreeting(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[!?.]+$/g, "").trim();
  return /^(hi|hello|hey|good morning|good afternoon|good evening|how are you)$/.test(normalized);
}

export function greetingReply(text: string): string {
  const normalized = text.trim().toLowerCase();
  const offer =
    "What would you like help with today? I can guide you through selling products, earning with affiliate promotions, finding UGC and clipping campaigns, growing a community, or getting started on Jimvio.";
  if (normalized.startsWith("good morning")) return `Good morning! 👋 Welcome to Jimvio. ${offer}`;
  if (normalized.startsWith("good afternoon")) return `Good afternoon! 👋 Welcome to Jimvio. ${offer}`;
  if (normalized.startsWith("good evening")) return `Good evening! 👋 Welcome to Jimvio. ${offer}`;
  if (normalized.startsWith("how are you")) return `I'm doing well, thanks for asking. 👋 Welcome to Jimvio. ${offer}`;
  if (normalized.startsWith("hey")) return `Hey! 👋 Welcome to Jimvio. ${offer}`;
  if (normalized.startsWith("hello")) return `Hello! 👋 Welcome to Jimvio. ${offer}`;
  return `Hi! 👋 Welcome to Jimvio. ${offer}`;
}

/** Removes internal instructions and prohibited fallback wording. */
export function presentAssistantContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;

  const sawPrivate =
    /I can't see this account, its orders, payments, or verification from chat|can't access your private account details/i.test(trimmed);
  PROHIBITED_REPLY.lastIndex = 0;
  const text = trimmed.replace(PROHIBITED_REPLY, " ").replaceAll(GUIDE_PREFIX, " ").trim();
  const leaked = LEAK_LINE.test(text);
  if (!leaked && text === trimmed) return trimmed;

  const kept = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((part) => part.trim())
    .filter((part) => part && !LEAK_LINE.test(part) && !PROHIBITED_TEST.test(part))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return kept || (sawPrivate ? PRIVATE_ACCOUNT_GUIDE : CLARIFYING_GUIDE);
}
