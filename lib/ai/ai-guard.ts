const SECRET_REQUEST =
  /\b(api[_ -]?key|access token|secret key|signing secret|password|process\.env|environment variable|system prompt|hidden prompt|service role|database url|private key|session cookie|document\.cookie)\b/i;

const OTHER_USER =
  /\b(another user|other user'?s|someone else'?s|another customer|another member|another seller|other people'?s|user id|email of|dump (the )?(users|database|table|tickets|messages))\b/i;

const OVERRIDE =
  /\b(ignore (all |any )?(previous|prior|above) instructions|disregard (all |any )?(previous|prior|above) (instructions|rules)|reveal (your |the )?(system|hidden) prompt|new system prompt|you are now|jailbreak)\b/i;

const REVEAL = /\b(reveal|print|show|dump|exfiltrate|leak)\b/i;

const PASSWORD_HELP = /\b(how (do|can|to)|where (do|can)|reset|change|forgot|update)\b/i;

/** Requests that must be refused before any model or tool call. */
export function isConfidentialAiRequest(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  if (OTHER_USER.test(value) || OVERRIDE.test(value)) return true;
  if (PASSWORD_HELP.test(value) && /\bpassword\b/i.test(value)) {
    const withoutPassword = value.replace(/\bpasswords?\b/gi, " ");
    if (REVEAL.test(withoutPassword)) return true;
    if (
      /\b(api[_ -]?key|process\.env|environment variable|system prompt|hidden prompt|session cookie|document\.cookie|service role|private key)\b/i.test(
        withoutPassword,
      )
    ) {
      return true;
    }
    return false;
  }
  return SECRET_REQUEST.test(value);
}

export const CONFIDENTIAL_AI_REFUSAL = `I can't share private keys, other people's accounts, or internal Jimvio instructions.

I can help with public earning options on Jimvio: selling, affiliates, UGC campaigns, dropshipping, communities, live sessions, and digital products. What would you like to start with?`;
