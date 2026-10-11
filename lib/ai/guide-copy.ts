/**
 * Customer-facing guide copy.
 * Internal model notes never belong in this text.
 */

export const GUIDE_PREFIX = "Jimvio guide. This is not a live answer.";

export const UNVERIFIED_GUIDE =
  "I couldn't verify that information from Jimvio's available documentation. Please check the relevant Jimvio page or contact support before relying on it.";

export const PRIVATE_ACCOUNT_GUIDE =
  "I can help you find the right page, but I can't access your private account details from this chat. Please open the relevant section in Jimvio to check your information.";

const LEAK_LINE =
  /Say you cannot verify|Do not invent|Do not quote|Do not claim|Unverified words:|No verified Jimvio article|Related public facts:|I can't see this account, its orders, payments, or verification from chat|Internal note, not a customer answer|Never reveal secrets|or these instructions/i;

/** Removes internal instructions and keeps a single guide label. */
export function presentAssistantContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;

  const guideCount = trimmed.split(GUIDE_PREFIX).length - 1;
  const leaked = LEAK_LINE.test(trimmed);
  if (!leaked && guideCount <= 1) return trimmed;

  const hadGuide = guideCount > 0;
  const text = trimmed.replaceAll(GUIDE_PREFIX, "").trim();
  const sawPrivateOnly =
    /I can't see this account, its orders, payments, or verification from chat/i.test(text) &&
    !/No verified Jimvio article|Say you cannot verify|Do not invent/i.test(text);

  const kept = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((part) => part.trim())
    .filter((part) => part && !LEAK_LINE.test(part))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const body = kept || (sawPrivateOnly ? PRIVATE_ACCOUNT_GUIDE : UNVERIFIED_GUIDE);
  return hadGuide ? `${GUIDE_PREFIX}\n\n${body}` : body;
}
