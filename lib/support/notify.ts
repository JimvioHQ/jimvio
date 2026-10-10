import { getAppBaseUrl, isEmailEnabled } from "@/lib/email/config";
import { wrapEmailHtml } from "@/lib/email/layout";
import { sendEmail, type SendEmailResult } from "@/lib/email/send";

type Mailer = (input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) => Promise<SendEmailResult>;

export type SupportNotice = {
  publicRef: string;
  subject: string;
  requesterEmail: string | null;
  supportEmail: string;
  reply?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function deliverSupportNotice(
  input: SupportNotice,
  deps?: { enabled?: boolean; send?: Mailer },
) {
  const enabled = deps?.enabled ?? isEmailEnabled();
  if (!enabled) return { sent: false as const, reason: "not_configured" as const };

  const send = deps?.send ?? sendEmail;
  const ticketUrl = `${getAppBaseUrl()}/help/tickets/${encodeURIComponent(input.publicRef)}`;
  const heading = input.reply ? `Reply on ${input.publicRef}` : `Ticket ${input.publicRef} saved`;
  const preview = input.reply
    ? "A support reply was added to your Jimvio ticket."
    : "Your Jimvio support ticket was saved.";
  const body = input.reply
    ? `<p>There is a new reply on <strong>${escapeHtml(input.publicRef)}</strong>.</p><p style="white-space:pre-wrap">${escapeHtml(input.reply.slice(0, 2000))}</p>`
    : `<p>Ticket <strong>${escapeHtml(input.publicRef)}</strong> was saved.</p><p>${escapeHtml(input.subject)}</p><p>Sign in with the same account to read the thread.</p>`;
  const html = wrapEmailHtml({
    preview,
    heading,
    bodyHtml: body,
    ctaLabel: "Open ticket",
    ctaUrl: ticketUrl,
  });
  const text = `${heading}\n${input.subject}\n${ticketUrl}`;
  const recipients = [input.requesterEmail, input.reply ? null : input.supportEmail].filter(
    (email): email is string => Boolean(email && email.includes("@")),
  );
  const unique = [...new Set(recipients.map((email) => email.toLowerCase()))];
  if (unique.length === 0) return { sent: false as const, reason: "no_recipient" as const };

  let sent = false;
  for (const to of unique) {
    const result = await send({ to, subject: heading, html, text });
    if (result.ok) sent = true;
  }
  return sent
    ? { sent: true as const, reason: "sent" as const }
    : { sent: false as const, reason: "failed" as const };
}
