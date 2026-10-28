import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { renderJimvioEmail } from "@/lib/email/shell";

export const NEWSLETTER_CONSENT_TEXT =
  "Send me Jimvio product updates by email. I can unsubscribe at any time.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRM_TTL_SEC = 7 * 24 * 60 * 60;
// The confirmation message is the unsubscribe record. Keep that link valid
// for the life of a normal subscription.
const UNSUBSCRIBE_TTL_SEC = 10 * 365 * 24 * 60 * 60;

export type NewsletterStatus = "pending" | "confirmed" | "unsubscribed";

export type NewsletterSubscriber = {
  email_normalized: string;
  status: NewsletterStatus;
  confirm_token_hash: string | null;
  unsubscribe_token_hash: string | null;
};

export type NewsletterStore = {
  findByEmail(email: string): Promise<NewsletterSubscriber | null>;
  save(row: {
    email: string;
    email_normalized: string;
    status: NewsletterStatus;
    consent_text: string;
    confirm_token_hash: string | null;
    unsubscribe_token_hash: string | null;
    confirmed_at: string | null;
    unsubscribed_at: string | null;
  }): Promise<{ ok: true } | { ok: false }>;
};

export type NewsletterSend = (input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) => Promise<{ ok: true } | { ok: false; skipped?: boolean }>;

export type SubscribeOutcome =
  | { status: "confirmation_sent" }
  | { status: "already_subscribed" }
  | { status: "invalid_email" }
  | { status: "rate_limited" }
  | { status: "delivery_failed" }
  | { status: "database_error" }
  | { status: "not_configured" };

export function normalizeNewsletterEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidNewsletterEmail(value: string): boolean {
  const email = normalizeNewsletterEmail(value);
  return email.length <= 200 && EMAIL_PATTERN.test(email);
}

export function hashNewsletterToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newsletterTokenHashMatches(storedHash: string | null, token: string): boolean {
  if (!storedHash) return false;
  const actual = Buffer.from(hashNewsletterToken(token));
  const stored = Buffer.from(storedHash);
  if (stored.length !== actual.length || stored.length === 0) return false;
  return timingSafeEqual(stored, actual);
}

export function newsletterTokenSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return value.length >= 16 ? value : null;
}

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createNewsletterToken(input: {
  email: string;
  purpose: "confirm" | "unsubscribe";
  secret: string;
  nowSec: number;
  ttlSec?: number;
}): string {
  const ttl = input.ttlSec ?? (input.purpose === "confirm" ? CONFIRM_TTL_SEC : UNSUBSCRIBE_TTL_SEC);
  const body = Buffer.from(JSON.stringify({
    e: normalizeNewsletterEmail(input.email),
    p: input.purpose,
    exp: input.nowSec + ttl,
  })).toString("base64url");
  return `${body}.${signBody(body, input.secret)}`;
}

export function readNewsletterToken(
  token: string,
  secret: string,
  nowSec: number,
): { ok: true; email: string; purpose: "confirm" | "unsubscribe" } | { ok: false; reason: "invalid" | "expired" } {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return { ok: false, reason: "invalid" };
  const expected = signBody(body, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || left.length === 0) return { ok: false, reason: "invalid" };
  if (!timingSafeEqual(left, right)) return { ok: false, reason: "invalid" };
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      e?: unknown;
      p?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.e !== "string" || !isValidNewsletterEmail(parsed.e)) {
      return { ok: false, reason: "invalid" };
    }
    if (parsed.p !== "confirm" && parsed.p !== "unsubscribe") return { ok: false, reason: "invalid" };
    if (typeof parsed.exp !== "number" || parsed.exp < nowSec) return { ok: false, reason: "expired" };
    return { ok: true, email: normalizeNewsletterEmail(parsed.e), purpose: parsed.p };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function mayReceiveNewsletter(row: NewsletterSubscriber | null): boolean {
  return row?.status === "confirmed";
}

export function newsletterConfirmationContent(input: {
  confirmUrl: string;
  unsubscribeUrl: string;
  assetBaseUrl: string;
}): { subject: string; html: string; text: string } {
  const rendered = renderJimvioEmail({
    preview: "Confirm your Jimvio newsletter subscription",
    icon: "mail-check",
    titleLead: "Confirm your",
    titleAccent: "subscription",
    subtitle: "You are not subscribed until you open the confirmation link. Jimvio will not send marketing email before that.",
    cta: { label: "Confirm subscription", url: input.confirmUrl },
    footnote: `If you did not request this, ignore the message. Unsubscribe: ${input.unsubscribeUrl}`,
    help: "Privacy",
    helpUrl: `${input.assetBaseUrl.replace(/\/$/, "")}/privacy`,
    assetBaseUrl: input.assetBaseUrl,
  });
  return {
    subject: "Confirm your Jimvio newsletter subscription",
    html: rendered.html,
    text: `${rendered.text}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

export async function subscribeToNewsletter(input: {
  email: string;
  store: NewsletterStore;
  send: NewsletterSend;
  secret: string | null;
  rateAllowed: boolean;
  nowSec: number;
  appBaseUrl: string;
}): Promise<SubscribeOutcome> {
  if (!isValidNewsletterEmail(input.email)) return { status: "invalid_email" };
  if (!input.rateAllowed) return { status: "rate_limited" };
  if (!input.secret) return { status: "not_configured" };

  const email = normalizeNewsletterEmail(input.email);
  const existing = await input.store.findByEmail(email);
  if (existing?.status === "confirmed") return { status: "already_subscribed" };

  const confirmToken = createNewsletterToken({
    email,
    purpose: "confirm",
    secret: input.secret,
    nowSec: input.nowSec,
  });
  const unsubscribeToken = createNewsletterToken({
    email,
    purpose: "unsubscribe",
    secret: input.secret,
    nowSec: input.nowSec,
  });
  const saved = await input.store.save({
    email,
    email_normalized: email,
    status: "pending",
    consent_text: NEWSLETTER_CONSENT_TEXT,
    confirm_token_hash: hashNewsletterToken(confirmToken),
    unsubscribe_token_hash: hashNewsletterToken(unsubscribeToken),
    confirmed_at: null,
    unsubscribed_at: null,
  });
  if (!saved.ok) return { status: "database_error" };

  const base = input.appBaseUrl.replace(/\/$/, "");
  const message = newsletterConfirmationContent({
    confirmUrl: `${base}/newsletter/confirm?token=${encodeURIComponent(confirmToken)}`,
    unsubscribeUrl: `${base}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
    assetBaseUrl: base,
  });
  const sent = await input.send({
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    idempotencyKey: `newsletter.confirm.${hashNewsletterToken(confirmToken).slice(0, 32)}`,
  });
  if (!sent.ok) return { status: sent.skipped ? "not_configured" : "delivery_failed" };
  return { status: "confirmation_sent" };
}

export async function confirmNewsletter(input: {
  token: string;
  store: NewsletterStore;
  secret: string | null;
  nowSec: number;
}): Promise<"confirmed" | "already_subscribed" | "invalid" | "expired" | "unsubscribed" | "not_configured" | "database_error"> {
  if (!input.secret) return "not_configured";
  const read = readNewsletterToken(input.token, input.secret, input.nowSec);
  if (!read.ok) return read.reason;
  if (read.purpose !== "confirm") return "invalid";
  const row = await input.store.findByEmail(read.email);
  if (!row || !newsletterTokenHashMatches(row.confirm_token_hash, input.token)) return "invalid";
  if (row.status === "unsubscribed") return "unsubscribed";
  if (row.status === "confirmed") return "already_subscribed";
  const saved = await input.store.save({
    email: read.email,
    email_normalized: read.email,
    status: "confirmed",
    consent_text: NEWSLETTER_CONSENT_TEXT,
    confirm_token_hash: null,
    unsubscribe_token_hash: row.unsubscribe_token_hash,
    confirmed_at: new Date(input.nowSec * 1000).toISOString(),
    unsubscribed_at: null,
  });
  return saved.ok ? "confirmed" : "database_error";
}

export async function unsubscribeNewsletter(input: {
  token: string;
  store: NewsletterStore;
  secret: string | null;
  nowSec: number;
}): Promise<"unsubscribed" | "invalid" | "expired" | "not_configured" | "database_error"> {
  if (!input.secret) return "not_configured";
  const read = readNewsletterToken(input.token, input.secret, input.nowSec);
  if (!read.ok) return read.reason;
  if (read.purpose !== "unsubscribe") return "invalid";
  const row = await input.store.findByEmail(read.email);
  if (!row || !newsletterTokenHashMatches(row.unsubscribe_token_hash, input.token)) return "invalid";
  if (row.status === "unsubscribed") return "unsubscribed";
  const saved = await input.store.save({
    email: read.email,
    email_normalized: read.email,
    status: "unsubscribed",
    consent_text: NEWSLETTER_CONSENT_TEXT,
    confirm_token_hash: null,
    unsubscribe_token_hash: row.unsubscribe_token_hash,
    confirmed_at: null,
    unsubscribed_at: new Date(input.nowSec * 1000).toISOString(),
  });
  return saved.ok ? "unsubscribed" : "database_error";
}
