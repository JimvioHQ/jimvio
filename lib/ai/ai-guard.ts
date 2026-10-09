const SECRET_REQUEST =
  /\b(api[_ -]?key|access token|secret key|signing secret|password|process\.env|environment variable|system prompt|hidden prompt|service role|database url|private key)\b/i;

const OTHER_USER =
  /\b(another user|other user'?s|someone else'?s|user id|email of|dump (the )?(users|database|table))\b/i;

const OVERRIDE =
  /\b(ignore (all |any )?(previous|prior|above) instructions|reveal (your |the )?(system|hidden) prompt|you are now|jailbreak)\b/i;

/** Requests that must be refused before any model or tool call. */
export function isConfidentialAiRequest(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  return SECRET_REQUEST.test(value) || OTHER_USER.test(value) || OVERRIDE.test(value);
}

export const CONFIDENTIAL_AI_REFUSAL = `I can't share private keys, other people's accounts, or internal Jimvio instructions.

I can help with public earning options on Jimvio: selling, affiliates, UGC campaigns, dropshipping, communities, live sessions, and digital products. What would you like to start with?`;
