import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireVendor, requireInfluencer } from "@/lib/ugc/platform/auth";
import { recordUgcActivity } from "@/lib/ugc/platform/activity";
import { notifyUser } from "@/lib/notifications/notify-user";

export const dynamic = "force-dynamic";

async function assertThreadAccess(
  userId: string,
  threadId: string
) {
  const { db, vendor } = await requireVendor(userId);
  const { influencer } = await requireInfluencer(userId);

  const { data: thread } = await db
    .from("ugc_campaign_chat_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) return { db, thread: null, allowed: false as const };

  const allowed =
    (vendor != null && vendor.id === thread.brand_id) ||
    (influencer != null && influencer.id === thread.influencer_id);

  return { db, thread, allowed, vendor, influencer };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const access = await assertThreadAccess(user.id, id);
  if (!access.thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pinnedOnly = req.nextUrl.searchParams.get("pinned") === "true";
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50));

  let query = access.db
    .from("ugc_campaign_chat_messages")
    .select("*")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pinnedOnly) query = query.eq("is_pinned", true);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], thread: access.thread });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const access = await assertThreadAccess(user.id, id);
  if (!access.thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const attachmentUrl =
    typeof body.attachment_url === "string" ? body.attachment_url.trim() : null;
  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: "body or attachment_url required" }, { status: 400 });
  }

  const messageType = String(body.message_type ?? (attachmentUrl ? "attachment" : "text"));
  const allowedTypes = new Set(["text", "attachment", "voice", "system"]);
  if (!allowedTypes.has(messageType)) {
    return NextResponse.json({ error: "Invalid message_type" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const preview = text
    ? text.slice(0, 140)
    : body.attachment_name
      ? String(body.attachment_name).slice(0, 140)
      : "Attachment";

  const { data: message, error: insErr } = await access.db
    .from("ugc_campaign_chat_messages")
    .insert({
      thread_id: id,
      campaign_id: access.thread.campaign_id,
      sender_user_id: user.id,
      body: text || null,
      message_type: messageType,
      attachment_url: attachmentUrl,
      attachment_name: typeof body.attachment_name === "string" ? body.attachment_name : null,
      attachment_mime: typeof body.attachment_mime === "string" ? body.attachment_mime : null,
    })
    .select("*")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await access.db
    .from("ugc_campaign_chat_threads")
    .update({
      last_message_at: now,
      last_message_preview: preview,
    })
    .eq("id", id);

  await recordUgcActivity(access.db, {
    campaignId: access.thread.campaign_id,
    eventType: "message",
    title: "New chat message",
    description: preview,
    actorUserId: user.id,
    influencerId: access.thread.influencer_id,
    metadata: { thread_id: id, message_id: message.id },
  });

  // Notify the other party
  let recipientUserId: string | null = null;
  if (access.vendor && access.vendor.id === access.thread.brand_id) {
    const { data: inf } = await access.db
      .from("influencers")
      .select("user_id")
      .eq("id", access.thread.influencer_id)
      .maybeSingle();
    recipientUserId = inf?.user_id ?? null;
  } else {
    const { data: brand } = await access.db
      .from("vendors")
      .select("user_id")
      .eq("id", access.thread.brand_id)
      .maybeSingle();
    recipientUserId = brand?.user_id ?? null;
  }

  if (recipientUserId) {
    await notifyUser(access.db, {
      userId: recipientUserId,
      type: "message",
      title: "New campaign message",
      message: preview,
      actionUrl: `/ugc/${access.thread.campaign_id}/chat`,
      data: {
        campaignId: access.thread.campaign_id,
        threadId: id,
        event: "ugc_chat_message",
      },
      actorId: user.id,
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
