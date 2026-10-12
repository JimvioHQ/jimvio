import { getEmailFromAddress, isEmailEnabled } from "@/lib/email/config";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Stable key so a retry does not create a second provider message. */
  idempotencyKey?: string;
};

export type SendEmailResult =
  /** `sent` means the provider accepted the API request. It does not mean the inbox received it. */
  | { ok: true; id?: string; status: "sent" }
  | { ok: false; error: string; skipped?: boolean; status: "failed" | "skipped" };

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

export function shouldRetryEmailStatus(status: number): boolean {
  return RETRYABLE.has(status);
}

export function emailBackoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}

export function redactEmailLog(message: string): string {
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b\d{6}\b/g, "[code]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 300);
}

export function normalizeIdempotencyKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 200);
  return cleaned.length >= 8 ? cleaned : undefined;
}

function validRecipient(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
}

function validFrom(value: string): boolean {
  return /<[^@\s<>]+@[^@\s<>]+>$/.test(value) || /^[^@\s<>]+@[^@\s<>]+$/.test(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!validRecipient(input.to)) {
    return { ok: false, error: "Invalid recipient", status: "failed" };
  }
  if (!isEmailEnabled()) {
    return { ok: false, error: "Email not configured", skipped: true, status: "skipped" };
  }

  const from = getEmailFromAddress();
  if (!validFrom(from)) {
    return { ok: false, error: "Invalid sender configuration", status: "failed" };
  }

  const apiKey = process.env.RESEND_API_KEY!.trim();
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  let lastError = "Send failed";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(input.replyTo && validRecipient(input.replyTo) ? { reply_to: input.replyTo } : {}),
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.ok) {
        return { ok: true, id: payload.id, status: "sent" };
      }

      lastError = redactEmailLog(payload.message ?? `HTTP ${res.status}`);
      if (!shouldRetryEmailStatus(res.status) || attempt === 2) {
        console.error("[sendEmail] provider rejected", { status: res.status, error: lastError });
        return { ok: false, error: lastError, status: "failed" };
      }
    } catch (err) {
      lastError = redactEmailLog(err instanceof Error ? err.message : "Send failed");
      if (attempt === 2) {
        console.error("[sendEmail] network failure", { error: lastError });
        return { ok: false, error: lastError, status: "failed" };
      }
    }
    await sleep(emailBackoffMs(attempt));
  }

  return { ok: false, error: lastError, status: "failed" };
}
