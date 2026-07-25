import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReadsClient = {
  from: (table: string) => {
    upsert: (
      row: Record<string, unknown>,
      opts?: { onConflict?: string }
    ) => Promise<{ error: { message: string } | null }>;
  };
};

/**
 * POST /api/c/messages/read
 * Body: { conversationKey: string, lastReadMessageId?: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    conversationKey?: string;
    lastReadMessageId?: string | null;
  };

  const conversationKey =
    typeof body.conversationKey === "string" ? body.conversationKey.trim() : "";
  if (!conversationKey) {
    return NextResponse.json({ error: "conversationKey required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const db = supabase as unknown as ReadsClient;

  const { error } = await db.from("messaging_conversation_reads").upsert(
    {
      user_id: user.id,
      conversation_key: conversationKey,
      last_read_at: now,
      last_read_message_id: body.lastReadMessageId ?? null,
      updated_at: now,
    },
    { onConflict: "user_id,conversation_key" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, last_read_at: now });
}
