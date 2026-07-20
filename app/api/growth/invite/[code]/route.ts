import { NextRequest, NextResponse } from "next/server";
import { validateInvite } from "@/services/ops/growth";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limited = rateLimit(`invite:${request.headers.get("x-forwarded-for") ?? "unknown"}`, 30, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { code } = await params;
  const invite = await validateInvite(code);
  if (!invite?.valid) return NextResponse.json({ valid: false }, { status: 404 });
  return NextResponse.json({ valid: true, code: invite.code, inviteeEmail: invite.invitee_email });
}
