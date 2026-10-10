import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/support/types";
import { deliverSupportNotice } from "@/lib/support/notify";
import { staffGetTicket, staffUpdateTicket } from "@/lib/support/store";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { ref } = await context.params;
  const result = await staffGetTicket(ref);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { ref } = await context.params;
  const body = await request.json().catch(() => null);
  const status = TICKET_STATUSES.includes(body?.status) ? (body.status as TicketStatus) : undefined;
  const result = await staffUpdateTicket({
    publicRef: ref,
    staffId: auth.user.id,
    status,
    reply: typeof body?.reply === "string" ? body.reply : undefined,
    internalNote: typeof body?.internalNote === "string" ? body.internalNote : undefined,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const settings = await getResolvedPlatformSettings().catch(() => null);
  const email = result.reply
    ? await deliverSupportNotice({
        publicRef: result.publicRef,
        subject: result.subject,
        requesterEmail: result.requesterEmail,
        supportEmail: settings?.contact.support_email || "support@jimvio.com",
        reply: result.reply,
      })
    : { sent: false as const, reason: "not_configured" as const };
  return NextResponse.json({ ok: true, email });
}
