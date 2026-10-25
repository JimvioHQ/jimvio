import { providerRequest } from "./provider-http";
import { failureCode } from "./search-console";

const DOMAINS_URL = "https://api.resend.com/domains";
const EMAILS_URL = "https://api.resend.com/emails";
const SINK = /^delivered(?:\+[a-z0-9._-]{1,40})?@resend\.dev$/i;

export type ResendProbe =
  | { ok: true; domainCount: number }
  | { ok: false; code: "missing" | "unauthorized" | "forbidden" | "http_error" | "network" | "invalid_json"; status?: number };

export type ResendTestSend =
  | { ok: true; id: string | null }
  | { ok: false; code: "missing" | "refused_recipient" | "unauthorized" | "forbidden" | "http_error" | "network" | "invalid_json"; status?: number };

export function connectivityRecipientAllowed(address: string): boolean {
  return SINK.test(address.trim());
}

export async function readResendDomains(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  attempts?: number;
  backoffMs?: number;
}): Promise<ResendProbe> {
  const env = input.env ?? process.env;
  const key = env.RESEND_API_KEY?.trim() ?? "";
  if (!key) return { ok: false, code: "missing" };
  const result = await providerRequest({
    url: DOMAINS_URL,
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
  if (!result.ok) {
    if (result.code === "network") return { ok: false, code: "network" };
    if (result.code === "invalid_json") return { ok: false, code: "invalid_json", status: result.status };
    return { ok: false, code: failureCode(result.status), status: result.status };
  }
  const data = result.body && typeof result.body === "object" ? (result.body as { data?: unknown }).data : null;
  return { ok: true, domainCount: Array.isArray(data) ? data.length : 0 };
}

/**
 * Sends one message to Resend's documented sink address. It refuses every other recipient.
 * The growth cycle does not call this.
 */
export async function sendResendConnectivityTest(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
  attempts?: number;
  backoffMs?: number;
}): Promise<ResendTestSend> {
  const env = input.env ?? process.env;
  const key = env.RESEND_API_KEY?.trim() ?? "";
  const to = "delivered@resend.dev";
  if (!connectivityRecipientAllowed(to)) return { ok: false, code: "refused_recipient" };
  if (!key) return { ok: false, code: "missing" };
  const from = env.EMAIL_FROM?.trim() || "Jimvio <info@jimvio.com>";
  const day = (input.now ?? new Date()).toISOString().slice(0, 10);
  const result = await providerRequest({
    url: EMAILS_URL,
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `growth-resend-connectivity-${day}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Jimvio Resend connectivity check",
      text: "This is a single connectivity check sent to Resend's delivered test address.",
    }),
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
  if (!result.ok) {
    if (result.code === "network") return { ok: false, code: "network" };
    if (result.code === "invalid_json") return { ok: false, code: "invalid_json", status: result.status };
    return { ok: false, code: failureCode(result.status), status: result.status };
  }
  const id = result.body && typeof result.body === "object" ? (result.body as { id?: unknown }).id : null;
  return { ok: true, id: typeof id === "string" ? id.slice(0, 80) : null };
}
