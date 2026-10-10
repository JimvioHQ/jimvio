import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { deliverSupportNotice } from "@/lib/support/notify";
import { createSupportTicket, listOwnTickets } from "@/lib/support/store";
import { supportNotificationRecipient } from "@/lib/contact-email";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your tickets." }, { status: 401 });

  const url = new URL(request.url);
  const result = await listOwnTickets(user.id, {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 20),
    offset: Number(url.searchParams.get("offset") ?? 0),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ tickets: result.tickets, total: result.total });
}

export async function POST(request: Request) {
  const limited = rateLimit(`support-ticket:${clientIp(request)}`, 8, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many tickets. Please wait a minute." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = await request.json().catch(() => null);
  const result = await createSupportTicket({
    raw: {
      subject: body?.subject,
      category: body?.category,
      issueType: body?.issueType,
      description: body?.description,
      priority: body?.priority,
      referenceCode: body?.referenceCode,
      name: body?.name,
      email: body?.email,
      idempotencyKey: body?.idempotencyKey,
      company: body?.company,
    },
    userId: user?.id ?? null,
    email: user?.email ?? null,
    name: typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    requireEmail: !user,
  });

  if ("ignored" in result) return NextResponse.json({ ok: true });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  let email: { sent: boolean; reason: "not_configured" | "no_recipient" | "sent" | "failed" } = {
    sent: false,
    reason: "not_configured",
  };
  if (!result.duplicate) {
    const settings = await getResolvedPlatformSettings().catch(() => null);
    email = await deliverSupportNotice({
      publicRef: result.ticket.public_ref,
      subject: result.ticket.subject,
      requesterEmail: user?.email ?? (typeof body?.email === "string" ? body.email : null),
      supportEmail: supportNotificationRecipient(settings?.contact.support_email),
    });
  }
  return NextResponse.json({ ok: true, ticket: result.ticket, duplicate: result.duplicate, email });
}
