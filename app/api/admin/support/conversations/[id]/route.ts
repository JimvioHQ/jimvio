import { NextResponse } from "next/server";
import { isUuid, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { claimReplyNotification, staffGetConversation, staffSendMessage, staffUpdateConversation } from "@/lib/support/conversations";
import { deliverConversationReply } from "@/lib/support/notify";
import { CONVERSATION_STATUSES, type ConversationStatus } from "@/lib/support/conversation-policy";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const result = await staffGetConversation(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const body = await request.json().catch(() => null);
  const visibility = body?.visibility === "internal" ? "internal" : "customer";
  const result = await staffSendMessage({
    conversationId: id,
    authorId: auth.user.id,
    body: body?.body,
    visibility,
    clientMessageId: body?.clientMessageId,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: "status" in result ? result.status : 500 });
  }

  let email: {
    sent: boolean;
    reason: "not_requested" | "not_configured" | "no_recipient" | "sent" | "failed";
  } = { sent: false, reason: "not_requested" };
  if ("notify" in result && result.notify) {
    const claimed = await claimReplyNotification(result.notify.messageId);
    if (claimed) {
      try {
        email = await deliverConversationReply({
          publicRef: result.notify.publicRef,
          subject: result.notify.subject,
          requesterEmail: result.notify.email,
          reply: result.notify.body,
        });
      } catch (error) {
        console.error("[support-live] reply email", error instanceof Error ? error.message : "error");
        email = { sent: false, reason: "failed" as const };
      }
    }
  }

  const emailPayload = {
    conversation: "conversation" in result ? result.conversation : null,
    messages: "messages" in result ? result.messages : [],
    email,
  };
  return NextResponse.json(emailPayload);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const body = await request.json().catch(() => null);
  const status = CONVERSATION_STATUSES.includes(body?.status) ? (body.status as ConversationStatus) : undefined;
  const priority = body?.priority === "low" || body?.priority === "normal" || body?.priority === "high" ? body.priority : undefined;
  let assigneeId: string | null | undefined;
  if (body?.assign === "me") assigneeId = auth.user.id;
  if (body?.assign === "none") assigneeId = null;
  const result = await staffUpdateConversation({
    conversationId: id,
    actorId: auth.user.id,
    assigneeId,
    status,
    priority,
  });
  if ("error" in result && result.error && !("conversation" in result)) {
    return NextResponse.json({ error: result.error }, { status: "status" in result ? result.status : 500 });
  }
  return NextResponse.json(result);
}
