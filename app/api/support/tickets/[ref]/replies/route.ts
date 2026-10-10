import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { replyToOwnTicket } from "@/lib/support/store";

export async function POST(
  request: Request,
  context: { params: Promise<{ ref: string }> },
) {
  const { ref } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });

  const limited = rateLimit(`support-reply:${user.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many replies. Please wait a minute." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const result = await replyToOwnTicket(user.id, ref, typeof body?.body === "string" ? body.body : "");
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: typeof result.status === "number" ? result.status : 500 },
    );
  }
  return NextResponse.json({ ok: true, status: result.status });
}
