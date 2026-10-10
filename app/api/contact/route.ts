import { NextResponse } from "next/server";
import { isContactTopic } from "@/lib/contact/topics";
import { sendEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/ops/rate-limit";
import { supportNotificationRecipient } from "@/lib/contact-email";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const limited = rateLimit(`contact:${clientIp(request)}`, 5, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const topic = isContactTopic(body?.topic) ? body.topic : null;
  const honeypot = typeof body?.company === "string" ? body.company.trim() : "";

  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!topic) {
    return NextResponse.json({ error: "Please choose a topic." }, { status: 400 });
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return NextResponse.json(
      { error: "Please enter a message between 10 and 5,000 characters." },
      { status: 400 },
    );
  }

  const { contact } = await getResolvedPlatformSettings();
  const to = supportNotificationRecipient(
    topic === "support" || topic === "creator" || topic === "vendor"
      ? contact.support_email
      : contact.info_email,
  );

  const subject = `[Jimvio Contact · ${topic}] ${name}`;
  const text = [
    `Topic: ${topic}`,
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message,
  ].join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">
      <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:16px 0" />
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  const result = await sendEmail({ to, subject, html, text, replyTo: email });
  if (!result.ok) {
    if (result.skipped) {
      return NextResponse.json(
        {
          error:
            "Contact email is temporarily unavailable. Please email us directly and we will follow up.",
          fallbackEmail: to,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Unable to send your message right now. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
