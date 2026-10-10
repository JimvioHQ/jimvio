import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ops/rate-limit";
import { listOwnConversations, sendCustomerMessage } from "@/lib/support/conversations";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view support chats." }, { status: 401 });
  const result = await listOwnConversations(user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to message support." }, { status: 401 });

  const limited = rateLimit(`support-chat:${user.id}`, 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many messages. Please wait a minute." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const result = await sendCustomerMessage({
    userId: user.id,
    email: user.email ?? null,
    name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    conversationId: typeof body?.conversationId === "string" ? body.conversationId : null,
    body: body?.body,
    clientMessageId: body?.clientMessageId,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
