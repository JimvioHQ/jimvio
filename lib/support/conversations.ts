import "server-only";
import { randomBytes } from "node:crypto";
import { hasSupabaseSecretKey } from "@/lib/supabase/service-role";
import { getAdminDB } from "@/services/base";
import { answerSupportQuestion } from "./answer-question";
import {
  countAvailableAgents,
  handoffCustomerNote,
  isTypingFresh,
  parseClientMessageId,
  shouldAnswerWithAssistant,
  statusAfterCustomerMessage,
  statusAfterHandoff,
  toCustomerChatMessages,
  validateChatBody,
  type ConversationMode,
  type ConversationStatus,
} from "./conversation-policy";

type Query = {
  select: (columns?: string) => Query;
  insert: (row: Record<string, unknown> | Record<string, unknown>[]) => Query;
  update: (row: Record<string, unknown>) => Query;
  upsert: (row: Record<string, unknown>, options?: { onConflict?: string }) => Query;
  eq: (column: string, value: unknown) => Query;
  in: (column: string, values: unknown[]) => Query;
  is: (column: string, value: null) => Query;
  order: (column: string, options?: { ascending?: boolean }) => Query;
  limit: (count: number) => Query;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { code?: string; message?: string } | null }>;
  single: () => Promise<{ data: Record<string, unknown> | null; error: { code?: string; message?: string } | null }>;
  then: Promise<{ data: Record<string, unknown>[] | null; error: { code?: string; message?: string } | null; count?: number | null }>["then"];
};

function database() {
  return getAdminDB() as unknown as { from: (table: string) => Query };
}

export function supportLiveReady() {
  return hasSupabaseSecretKey();
}

function unavailable() {
  return { error: "Live support is temporarily unavailable.", status: 503 as const };
}

function preview(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 140);
}

function newRef() {
  return `SC-${randomBytes(6).toString("hex")}`;
}

async function loadOwned(conversationId: string, userId: string) {
  const { data, error } = await database()
    .from("support_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.user_id !== userId) return null;
  return data;
}

async function threadForCustomer(conversationId: string) {
  const { data, error } = await database()
    .from("support_conversation_messages")
    .select("id, author_role, visibility, body, created_at, answer_mode, articles")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return [];
  return toCustomerChatMessages((data ?? []) as never);
}

function publicConversation(row: Record<string, unknown>) {
  return {
    id: row.id,
    publicRef: row.public_ref,
    status: row.status,
    mode: row.mode,
    priority: row.priority,
    subject: row.subject,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    customerUnread: row.customer_unread ?? 0,
    handoffRequestedAt: row.handoff_requested_at,
  };
}

async function findByClientMessage(clientMessageId: string, userId: string) {
  const { data } = await database()
    .from("support_conversation_messages")
    .select("conversation_id")
    .eq("client_message_id", clientMessageId)
    .maybeSingle();
  if (!data?.conversation_id) return null;
  const owned = await loadOwned(String(data.conversation_id), userId);
  if (!owned) return null;
  return {
    conversation: publicConversation(owned),
    messages: await threadForCustomer(String(owned.id)),
    duplicate: true as const,
  };
}

export async function listOwnConversations(userId: string) {
  if (!supportLiveReady()) return unavailable();
  const { data, error } = await database()
    .from("support_conversations")
    .select("id, public_ref, status, mode, priority, subject, updated_at, created_at, customer_unread, handoff_requested_at, last_preview")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return { error: "Could not load conversations.", status: 500 as const };
  return { conversations: data ?? [] };
}

export async function getOwnConversation(userId: string, conversationId: string) {
  if (!supportLiveReady()) return unavailable();
  const owned = await loadOwned(conversationId, userId);
  if (!owned) return { error: "Conversation not found.", status: 404 as const };
  await database()
    .from("support_conversations")
    .update({ customer_unread: 0 })
    .eq("id", conversationId)
    .eq("user_id", userId);
  return {
    conversation: publicConversation({ ...owned, customer_unread: 0 }),
    messages: await threadForCustomer(conversationId),
  };
}

export async function sendCustomerMessage(input: {
  userId: string;
  email: string | null;
  name: string | null;
  conversationId?: string | null;
  body: unknown;
  clientMessageId: unknown;
}) {
  if (!supportLiveReady()) return unavailable();
  const parsed = validateChatBody(input.body);
  if (!parsed.ok) return { error: parsed.error, status: 400 as const };
  const clientMessageId = parseClientMessageId(input.clientMessageId);
  if (!clientMessageId) return { error: "Invalid message id.", status: 400 as const };

  const duplicate = await findByClientMessage(clientMessageId, input.userId);
  if (duplicate) return { ok: true as const, ...duplicate };

  let conversation = input.conversationId
    ? await loadOwned(input.conversationId, input.userId)
    : null;
  if (input.conversationId && !conversation) return { error: "Conversation not found.", status: 404 as const };

  if (!conversation) {
    const created = await database()
      .from("support_conversations")
      .insert({
        public_ref: newRef(),
        user_id: input.userId,
        requester_name: input.name,
        requester_email: input.email,
        subject: preview(parsed.value),
        status: "ai",
        mode: "ai",
        priority: "normal",
      })
      .select("*")
      .single();
    if (created.error || !created.data) {
      console.error("[support-live] create conversation", created.error?.code);
      return { error: "Could not start the conversation.", status: 500 as const };
    }
    conversation = created.data;
  }

  const inserted = await database()
    .from("support_conversation_messages")
    .insert({
      conversation_id: conversation.id,
      author_id: input.userId,
      author_role: "customer",
      visibility: "customer",
      body: parsed.value,
      client_message_id: clientMessageId,
    })
    .select("id")
    .single();

  if (inserted.error) {
    if (String(inserted.error.code) === "23505") {
      const again = await findByClientMessage(clientMessageId, input.userId);
      if (again) return { ok: true as const, ...again };
    }
    console.error("[support-live] customer message", inserted.error.code);
    return { error: "Could not save the message.", status: 500 as const };
  }

  const mode = (conversation.mode === "human" ? "human" : "ai") as ConversationMode;
  const previous = String(conversation.status) as ConversationStatus;
  const nextStatus = statusAfterCustomerMessage(previous, mode);
  let assistantFailed = false;

  if (shouldAnswerWithAssistant(previous, mode)) {
    const answer = await answerSupportQuestion({ question: parsed.value });
    const aiInsert = await database().from("support_conversation_messages").insert({
      conversation_id: conversation.id,
      author_role: "ai",
      visibility: "customer",
      body: answer.answer,
      articles: answer.articles.map(({ slug, title, href }) => ({ slug, title, href })),
      answer_mode: answer.mode,
    });
    if (aiInsert.error) {
      assistantFailed = true;
      console.error("[support-live] assistant reply", aiInsert.error.code);
    }
  }

  await database()
    .from("support_conversations")
    .update({
      status: nextStatus,
      subject: conversation.subject || preview(parsed.value),
      last_preview: preview(parsed.value),
      staff_unread: Number(conversation.staff_unread ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  const fresh = await loadOwned(String(conversation.id), input.userId);
  return {
    ok: true as const,
    duplicate: false as const,
    assistantFailed,
    conversation: publicConversation(fresh ?? conversation),
    messages: await threadForCustomer(String(conversation.id)),
  };
}

export async function requestHumanHandoff(userId: string, conversationId: string) {
  if (!supportLiveReady()) return unavailable();
  const conversation = await loadOwned(conversationId, userId);
  if (!conversation) return { error: "Conversation not found.", status: 404 as const };
  const presence = await readAgentAvailability();
  const agentsOnline = presence.ok ? presence.count : null;
  if (conversation.mode === "human" && (conversation.status === "queued" || conversation.status === "active")) {
    return {
      ok: true as const,
      agentsAvailable: agentsOnline ?? 0,
      availability: presence.ok ? (presence.count > 0 ? "available" : "unavailable") : "error",
      conversation: publicConversation(conversation),
      messages: await threadForCustomer(conversationId),
    };
  }
  const next = statusAfterHandoff(String(conversation.status) as ConversationStatus);
  const note = handoffCustomerNote(agentsOnline);

  await database().from("support_conversation_messages").insert({
    conversation_id: conversationId,
    author_role: "system",
    visibility: "customer",
    body: note,
  });
  await database()
    .from("support_conversations")
    .update({
      status: next,
      mode: "human",
      handoff_requested_at: conversation.handoff_requested_at ?? new Date().toISOString(),
      last_preview: preview(note),
      staff_unread: Number(conversation.staff_unread ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  const fresh = await loadOwned(conversationId, userId);
  return {
    ok: true as const,
    agentsAvailable: agentsOnline ?? 0,
    availability: presence.ok ? ((agentsOnline ?? 0) > 0 ? "available" : "unavailable") : "error",
    conversation: publicConversation(fresh ?? conversation),
    messages: await threadForCustomer(conversationId),
  };
}

export async function readAgentAvailability() {
  if (!supportLiveReady()) return { ok: false as const };
  const { data, error } = await database()
    .from("support_agent_presence")
    .select("last_seen_at, available")
    .eq("available", true)
    .limit(50);
  if (error) return { ok: false as const };
  return {
    ok: true as const,
    count: countAvailableAgents((data ?? []) as Array<{ last_seen_at: string; available: boolean }>),
  };
}

export async function availableAgentCount() {
  const presence = await readAgentAvailability();
  return presence.ok ? presence.count : 0;
}

export async function touchTyping(conversationId: string, actor: "customer" | "staff", userId: string) {
  if (!supportLiveReady()) return unavailable();
  if (actor === "customer") {
    const owned = await loadOwned(conversationId, userId);
    if (!owned) return { error: "Conversation not found.", status: 404 as const };
  }
  await database().from("support_conversation_typing").upsert(
    { conversation_id: conversationId, actor, updated_at: new Date().toISOString() },
    { onConflict: "conversation_id,actor" },
  );
  return { ok: true as const };
}

export async function readTyping(conversationId: string, userId: string, asStaff: boolean) {
  if (!supportLiveReady()) return { customer: false, staff: false };
  if (!asStaff) {
    const owned = await loadOwned(conversationId, userId);
    if (!owned) return { customer: false, staff: false };
  }
  const { data } = await database()
    .from("support_conversation_typing")
    .select("actor, updated_at")
    .eq("conversation_id", conversationId);
  const rows = (data ?? []) as Array<{ actor: string; updated_at: string }>;
  return {
    customer: rows.some((row) => row.actor === "customer" && isTypingFresh(row.updated_at)),
    staff: rows.some((row) => row.actor === "staff" && isTypingFresh(row.updated_at)),
  };
}

export async function staffListConversations(filters: {
  q?: string;
  filter?: string;
  assigneeId?: string;
}) {
  if (!supportLiveReady()) return unavailable();
  const { data, error } = await database()
    .from("support_conversations")
    .select("id, public_ref, requester_name, requester_email, subject, status, mode, priority, assignee_id, last_preview, staff_unread, updated_at, created_at, ticket_id")
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error) return { error: "Could not load the inbox.", status: 500 as const };
  const q = (filters.q ?? "").trim().toLowerCase();
  let rows = data ?? [];
  if (filters.filter === "mine" && filters.assigneeId) {
    rows = rows.filter((row) => row.assignee_id === filters.assigneeId);
  } else if (filters.filter === "unassigned") {
    rows = rows.filter((row) => !row.assignee_id && row.status !== "resolved");
  } else if (filters.filter === "resolved") {
    rows = rows.filter((row) => row.status === "resolved");
  } else if (filters.filter === "queued") {
    rows = rows.filter((row) => row.status === "queued");
  } else if (filters.filter === "open") {
    rows = rows.filter((row) => row.status !== "resolved");
  }
  if (q) {
    rows = rows.filter((row) =>
      [row.public_ref, row.requester_name, row.requester_email, row.subject, row.last_preview]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }
  return { conversations: rows };
}

export async function staffGetConversation(conversationId: string) {
  if (!supportLiveReady()) return unavailable();
  const { data, error } = await database()
    .from("support_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (error || !data) return { error: "Conversation not found.", status: 404 as const };
  const messages = await database()
    .from("support_conversation_messages")
    .select("id, author_id, author_role, visibility, body, created_at, answer_mode, articles")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(300);
  await database().from("support_conversations").update({ staff_unread: 0 }).eq("id", conversationId);
  return { conversation: data, messages: messages.data ?? [] };
}

export async function staffSendMessage(input: {
  conversationId: string;
  authorId: string;
  body: unknown;
  visibility: "customer" | "internal";
  clientMessageId: unknown;
}) {
  if (!supportLiveReady()) return unavailable();
  const parsed = validateChatBody(input.body);
  if (!parsed.ok) return { error: parsed.error, status: 400 as const };
  const clientMessageId = parseClientMessageId(input.clientMessageId);
  if (!clientMessageId) return { error: "Invalid message id.", status: 400 as const };

  const existing = await database()
    .from("support_conversation_messages")
    .select("id, conversation_id, visibility")
    .eq("client_message_id", clientMessageId)
    .maybeSingle();
  if (existing.data?.id) {
    return staffGetConversation(String(existing.data.conversation_id));
  }

  const conversation = await database()
    .from("support_conversations")
    .select("*")
    .eq("id", input.conversationId)
    .maybeSingle();
  if (!conversation.data) return { error: "Conversation not found.", status: 404 as const };

  const inserted = await database()
    .from("support_conversation_messages")
    .insert({
      conversation_id: input.conversationId,
      author_id: input.authorId,
      author_role: "staff",
      visibility: input.visibility,
      body: parsed.value,
      client_message_id: clientMessageId,
    })
    .select("id, visibility, author_role")
    .single();
  if (inserted.error || !inserted.data) {
    if (String(inserted.error?.code) === "23505") return staffGetConversation(input.conversationId);
    return { error: "Could not save the reply.", status: 500 as const };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    assignee_id: conversation.data.assignee_id ?? input.authorId,
    status: conversation.data.status === "resolved" ? "active" : conversation.data.status === "ai" ? "active" : conversation.data.status === "queued" ? "active" : conversation.data.status,
    mode: "human",
  };
  if (input.visibility === "customer") {
    patch.last_preview = preview(parsed.value);
    patch.customer_unread = Number(conversation.data.customer_unread ?? 0) + 1;
  }
  await database().from("support_conversations").update(patch).eq("id", input.conversationId);

  const detail = await staffGetConversation(input.conversationId);
  return {
    ...detail,
    notify:
      input.visibility === "customer"
        ? {
            messageId: String(inserted.data.id),
            email: conversation.data.requester_email ? String(conversation.data.requester_email) : null,
            publicRef: String(conversation.data.public_ref),
            subject: String(conversation.data.subject ?? "Jimvio support"),
            body: parsed.value,
          }
        : null,
  };
}

export async function claimReplyNotification(messageId: string) {
  const { data } = await database()
    .from("support_conversation_messages")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", messageId)
    .is("notified_at", null)
    .select("id");
  const rows = (data ?? []) as Array<{ id?: string }>;
  return rows.length > 0;
}

export async function staffUpdateConversation(input: {
  conversationId: string;
  assigneeId?: string | null;
  status?: ConversationStatus;
  priority?: "low" | "normal" | "high";
  actorId: string;
}) {
  if (!supportLiveReady()) return unavailable();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status) patch.status = input.status;
  if (input.priority) patch.priority = input.priority;
  if (input.assigneeId !== undefined) patch.assignee_id = input.assigneeId;
  if (input.status === "active" || input.status === "queued") patch.mode = "human";
  const { error } = await database().from("support_conversations").update(patch).eq("id", input.conversationId);
  if (error) return { error: "Could not update the conversation.", status: 500 as const };
  return staffGetConversation(input.conversationId);
}

export async function heartbeatAgent(userId: string, available: boolean) {
  if (!supportLiveReady()) return unavailable();
  const { error } = await database().from("support_agent_presence").upsert(
    { user_id: userId, available, last_seen_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { error: "Could not update availability.", status: 500 as const };
  return { ok: true as const, availableAgents: await availableAgentCount() };
}
