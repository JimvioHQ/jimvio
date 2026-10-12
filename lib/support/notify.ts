import { customerSupportEmail } from "@/lib/contact-email";
import { createHash } from "node:crypto";
import { getAppBaseUrl, isEmailEnabled } from "@/lib/email/config";
import { wrapEmailHtml } from "@/lib/email/layout";
import { sendEmail, type SendEmailResult } from "@/lib/email/send";
import { customerReplySubject, staffHandoffSubject, ticketReceivedSubject } from "@/lib/support/email-subject";

type Mailer = (input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  idempotencyKey?: string;
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
  const heading = input.reply ? "There is a new reply on your request" : "Your support request has been received";
  const subject = input.reply ? customerReplySubject("Jimvio Support") : ticketReceivedSubject(input.subject);
  const preview = input.reply
    ? "A support reply was added to your Jimvio ticket."
    : "Your Jimvio support request was saved.";
  const body = input.reply
    ? `<p>There is a new reply on <strong>${escapeHtml(input.publicRef)}</strong>.</p><p style="white-space:pre-wrap">${escapeHtml(input.reply.slice(0, 2000))}</p><p style="font-size:13px;color:#6B7280;">Reference ${escapeHtml(input.publicRef)}. Questions can also go to ${escapeHtml(customerSupportEmail())}.</p>`
    : `<p>We saved your request.</p><p>${escapeHtml(input.subject)}</p><p style="font-size:13px;color:#6B7280;">Reference <strong>${escapeHtml(input.publicRef)}</strong>. Sign in with the same account to read the thread, or email ${escapeHtml(customerSupportEmail())}.</p>`;
  const html = wrapEmailHtml({
    preview,
    heading,
    bodyHtml: body,
    ctaLabel: "Open ticket",
    ctaUrl: ticketUrl,
    icon: "chat",
    help: "If you have any questions about this request, contact our support team.",
  });
  const text = `${heading}\n${input.subject}\n${ticketUrl}`;
  const recipients = [input.requesterEmail, input.reply ? null : input.supportEmail].filter(
    (email): email is string => Boolean(email && email.includes("@")),
  );
  const unique = [...new Set(recipients.map((email) => email.toLowerCase()))];
  if (unique.length === 0) return { sent: false as const, reason: "no_recipient" as const };

  let sent = false;
  for (const to of unique) {
    const result = await send({
      to,
      subject,
      html,
      text,
      idempotencyKey: `support.${input.reply ? "reply" : "received"}.${input.publicRef}.${createHash("sha256").update(`${to}:${input.reply ?? ""}`).digest("hex").slice(0, 12)}`,
    });
    if (result.ok) sent = true;
  }
  return sent
    ? { sent: true as const, reason: "sent" as const }
    : { sent: false as const, reason: "failed" as const };
}

export async function deliverConversationReply(
  input: { publicRef: string; subject: string; requesterEmail: string | null; reply: string; agentName?: string | null },
  deps?: { enabled?: boolean; send?: Mailer },
) {
  const enabled = deps?.enabled ?? isEmailEnabled();
  if (!enabled) return { sent: false as const, reason: "not_configured" as const };
  if (!input.requesterEmail || !input.requesterEmail.includes("@")) {
    return { sent: false as const, reason: "no_recipient" as const };
  }
  const send = deps?.send ?? sendEmail;
  const href = `${getAppBaseUrl()}/help`;
  const agent = input.agentName?.trim() || "Jimvio Support";
  const subject = customerReplySubject(agent);
  const html = wrapEmailHtml({
    preview: `${agent} replied in your Jimvio support conversation.`,
    heading: `${agent} replied`,
    bodyHtml: `<p>${escapeHtml(agent)} replied in your support conversation.</p><p style="white-space:pre-wrap">${escapeHtml(input.reply.slice(0, 2000))}</p><p style="font-size:13px;color:#6B7280;">Reference ${escapeHtml(input.publicRef)}. You can also reach ${escapeHtml(customerSupportEmail())}.</p>`,
    ctaLabel: "Continue the conversation",
    ctaUrl: href,
    icon: "chat",
    help: "If you have any questions about this conversation, contact our support team.",
  });
  const result = await send({
    to: input.requesterEmail,
    subject,
    html,
    text: `${subject}\n${input.reply.slice(0, 2000)}\nReference ${input.publicRef}\n${href}\n${customerSupportEmail()}`,
    idempotencyKey: `support.conversation.${input.publicRef}.${createHash("sha256").update(input.reply).digest("hex").slice(0, 12)}`,
  });
  return result.ok
    ? { sent: true as const, reason: "sent" as const, id: result.id }
    : { sent: false as const, reason: "failed" as const };
}

export async function deliverStaffHandoffNotice(
  input: { publicRef: string; subject: string; preview: string; supportEmail: string },
  deps?: { enabled?: boolean; send?: Mailer },
) {
  const enabled = deps?.enabled ?? isEmailEnabled();
  if (!enabled) return { sent: false as const, reason: "not_configured" as const };
  if (!input.supportEmail.includes("@")) return { sent: false as const, reason: "no_recipient" as const };
  const send = deps?.send ?? sendEmail;
  const href = `${getAppBaseUrl()}/admin/support`;
  const subject = staffHandoffSubject();
  const safePreview = input.preview.replace(/\s+/g, " ").trim().slice(0, 280);
  const html = wrapEmailHtml({
    preview: "A customer asked to talk with a person.",
    heading: "A customer is waiting for support",
    bodyHtml: `<p>A customer asked to talk with a person.</p><p>${escapeHtml(input.subject)}</p><p style="white-space:pre-wrap">${escapeHtml(safePreview)}</p><p style="font-size:13px;color:#6B7280;">Reference ${escapeHtml(input.publicRef)}</p>`,
    ctaLabel: "Open the inbox",
    ctaUrl: href,
    icon: "chat",
    help: "This message was sent to the Jimvio support inbox.",
  });
  const result = await send({
    to: input.supportEmail,
    subject,
    html,
    text: `${subject}\n${input.publicRef}\n${input.subject}\n${safePreview}\n${href}`,
    idempotencyKey: `support.handoff.${input.publicRef}.${createHash("sha256").update(safePreview).digest("hex").slice(0, 12)}`,
  });
  return result.ok
    ? { sent: true as const, reason: "sent" as const, id: result.id }
    : { sent: false as const, reason: "failed" as const };
}
