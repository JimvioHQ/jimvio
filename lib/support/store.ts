import "server-only";
import { hasSupabaseSecretKey } from "@/lib/supabase/service-role";
import { getAdminDB } from "@/services/base";
import { customerVisibleMessages } from "./format";
import { STATUS_EXPLANATIONS, type TicketStatus } from "./types";
import {
  canTransition,
  containsSensitiveSupportText,
  isHoneypot,
  newPublicRef,
  ticketSearchTerm,
  validateTicketInput,
  type TicketInput,
} from "./validation";

type SupportError = { code?: string; message?: string } | null;

interface DbRow {
  id: string;
  public_ref: string;
  subject: string;
  category: string;
  issue_type: string;
  priority: string;
  status: string;
  description: string;
  reference_code: string | null;
  created_at: string;
  updated_at: string;
  author_role: string;
  visibility: string;
  body: string;
  user_id: string | null;
  requester_email: string | null;
  requester_name: string | null;
}

type SupportResult<T> = {
  data: T;
  error: SupportError;
  count?: number | null;
};

type SupportQuery = {
  select: (columns: string, options?: { count?: "exact" }) => SupportQuery;
  insert: (row: Record<string, unknown>) => SupportQuery;
  update: (row: Record<string, unknown>) => SupportQuery;
  eq: (column: string, value: unknown) => SupportQuery;
  or: (filters: string) => SupportQuery;
  order: (column: string, options: { ascending: boolean }) => SupportQuery;
  range: (from: number, to: number) => SupportQuery;
  limit: (count: number) => SupportQuery;
  maybeSingle: () => Promise<SupportResult<DbRow | null>>;
  single: () => Promise<SupportResult<DbRow>>;
  then: Promise<SupportResult<DbRow[]>>["then"];
};

function database() {
  return getAdminDB() as unknown as {
    from: (table: string) => SupportQuery;
  };
}

export function supportStoreReady() {
  return hasSupabaseSecretKey();
}

function unavailable() {
  return { error: "Support tickets are temporarily unavailable.", status: 503 as const };
}

export async function createSupportTicket(input: {
  raw: TicketInput;
  userId: string | null;
  email: string | null;
  name: string | null;
  requireEmail?: boolean;
}) {
  const parsed = validateTicketInput(input.raw, { requireEmail: input.requireEmail });
  if (!parsed.ok) return { error: parsed.error, status: 400 as const };
  if (isHoneypot(parsed.value)) return { ok: true as const, ignored: true as const };
  if (!supportStoreReady()) return unavailable();

  const value = parsed.value;
  const db = database();
  if (value.idempotencyKey) {
    const existing = await db
      .from("support_tickets")
      .select("public_ref, status, subject, created_at, user_id, requester_email")
      .eq("idempotency_key", value.idempotencyKey)
      .maybeSingle();
    if (existing.data?.public_ref) {
      const sameUser = input.userId
        ? existing.data.user_id === input.userId
        : existing.data.requester_email === (value.email || input.email || "").toLowerCase();
      if (!sameUser) return { error: "Invalid submission key.", status: 400 as const };
      return {
        ok: true as const,
        ticket: {
          public_ref: existing.data.public_ref,
          status: existing.data.status,
          subject: existing.data.subject,
          created_at: existing.data.created_at,
        },
        duplicate: true as const,
      };
    }
  }

  const row = {
    public_ref: newPublicRef(),
    user_id: input.userId,
    requester_name: value.name || input.name,
    requester_email: (value.email || input.email || "").toLowerCase() || null,
    subject: value.subject,
    category: value.category,
    issue_type: value.issueType,
    description: value.description,
    priority: value.priority,
    reference_code: value.referenceCode,
    status: "open",
    idempotency_key: value.idempotencyKey,
  };

  const { data, error } = await db
    .from("support_tickets")
    .insert(row)
    .select("id, public_ref, status, subject, created_at")
    .single();

  if (error) {
    if (String(error.code) === "23505" && value.idempotencyKey) {
      const existing = await db
        .from("support_tickets")
        .select("public_ref, status, subject, created_at, user_id, requester_email")
        .eq("idempotency_key", value.idempotencyKey)
        .maybeSingle();
      const sameUser = existing.data
        ? input.userId
          ? existing.data.user_id === input.userId
          : existing.data.requester_email === (value.email || input.email || "").toLowerCase()
        : false;
      if (existing.data && sameUser) {
        return {
          ok: true as const,
          ticket: {
            public_ref: existing.data.public_ref,
            status: existing.data.status,
            subject: existing.data.subject,
            created_at: existing.data.created_at,
          },
          duplicate: true as const,
        };
      }
    }
    console.error("[support] create ticket failed", error.code);
    return { error: "Could not save the ticket. Please try again.", status: 500 as const };
  }

  const messageInsert = await db.from("support_ticket_messages").insert({
    ticket_id: data.id,
    author_id: input.userId,
    author_role: "customer",
    visibility: "customer",
    body: value.description,
  });
  if (messageInsert.error) {
    console.error("[support] opening message failed", messageInsert.error.code);
  }

  return {
    ok: true as const,
    ticket: {
      public_ref: data.public_ref,
      status: data.status,
      subject: data.subject,
      created_at: data.created_at,
    },
    duplicate: false as const,
  };
}

export async function listOwnTickets(userId: string, filters?: {
  q?: string;
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  if (!supportStoreReady()) return unavailable();
  const limit = Math.min(Math.max(filters?.limit ?? 20, 1), 50);
  const offset = Math.max(filters?.offset ?? 0, 0);
  let query = database()
    .from("support_tickets")
    .select("public_ref, subject, category, issue_type, priority, status, reference_code, created_at, updated_at", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.q) {
    const safe = ticketSearchTerm(filters.q);
    if (safe) query = query.or(`subject.ilike.%${safe}%,public_ref.ilike.%${safe}%,reference_code.ilike.%${safe}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[support] list tickets failed", error.code);
    return { error: "Could not load tickets.", status: 500 as const };
  }
  return { ok: true as const, tickets: data ?? [], total: count ?? 0 };
}

export async function getOwnTicket(userId: string, publicRef: string) {
  if (!supportStoreReady()) return unavailable();
  const db = database();
  const { data: ticket, error } = await db
    .from("support_tickets")
    .select("id, public_ref, subject, category, issue_type, priority, status, description, reference_code, created_at, updated_at")
    .eq("user_id", userId)
    .eq("public_ref", publicRef)
    .maybeSingle();
  if (error) return { error: "Could not load the ticket.", status: 500 as const };
  if (!ticket) return { error: "Ticket not found.", status: 404 as const };

  const { data: messages } = await db
    .from("support_ticket_messages")
    .select("id, author_role, body, created_at, visibility")
    .eq("ticket_id", ticket.id)
    .eq("visibility", "customer")
    .order("created_at", { ascending: true });

  return {
    ok: true as const,
    ticket: {
      public_ref: ticket.public_ref,
      subject: ticket.subject,
      category: ticket.category,
      issue_type: ticket.issue_type,
      priority: ticket.priority,
      status: ticket.status,
      description: ticket.description,
      reference_code: ticket.reference_code,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      statusExplanation: STATUS_EXPLANATIONS[ticket.status as TicketStatus] ?? "",
    },
    messages: customerVisibleMessages(messages ?? []),
  };
}

export async function replyToOwnTicket(userId: string, publicRef: string, body: string) {
  const text = body.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 8000);
  if (text.length < 2) return { error: "Enter a reply.", status: 400 as const };
  if (containsSensitiveSupportText(text)) {
    return {
      error: "Remove passwords, authenticator codes, and card numbers before replying.",
      status: 400 as const,
    };
  }
  if (!supportStoreReady()) return unavailable();
  const db = database();
  const { data: ticket } = await db
    .from("support_tickets")
    .select("id, status")
    .eq("user_id", userId)
    .eq("public_ref", publicRef)
    .maybeSingle();
  if (!ticket) return { error: "Ticket not found.", status: 404 as const };

  const currentStatus = ticket.status as TicketStatus;
  const nextStatus: TicketStatus =
    currentStatus === "resolved" || currentStatus === "closed" ? "open" : currentStatus;

  const { error } = await db.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    author_id: userId,
    author_role: "customer",
    visibility: "customer",
    body: text,
  });
  if (error) return { error: "Could not save the reply.", status: 500 as const };

  await db
    .from("support_tickets")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", ticket.id);

  return { ok: true as const, status: nextStatus };
}

export async function staffListTickets(filters?: {
  q?: string;
  status?: string;
  category?: string;
  limit?: number;
}) {
  if (!supportStoreReady()) return unavailable();
  const limit = Math.min(Math.max(filters?.limit ?? 30, 1), 100);
  let query = database()
    .from("support_tickets")
    .select("public_ref, subject, category, status, priority, requester_email, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.q) {
    const safe = ticketSearchTerm(filters.q);
    if (safe) query = query.or(`subject.ilike.%${safe}%,public_ref.ilike.%${safe}%,requester_email.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) return { error: "Could not load tickets.", status: 500 as const };
  return { ok: true as const, tickets: data ?? [] };
}

export async function staffGetTicket(publicRef: string) {
  if (!supportStoreReady()) return unavailable();
  const db = database();
  const { data: ticket } = await db
    .from("support_tickets")
    .select("id, public_ref, user_id, subject, category, issue_type, priority, status, description, reference_code, requester_email, requester_name, created_at, updated_at")
    .eq("public_ref", publicRef)
    .maybeSingle();
  if (!ticket) return { error: "Ticket not found.", status: 404 as const };
  const { data: messages } = await db
    .from("support_ticket_messages")
    .select("id, author_role, visibility, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });
  return { ok: true as const, ticket, messages: messages ?? [] };
}

export async function staffUpdateTicket(input: {
  publicRef: string;
  staffId: string;
  status?: TicketStatus;
  reply?: string;
  internalNote?: string;
}) {
  if (!supportStoreReady()) return unavailable();
  const db = database();
  const { data: ticket } = await db
    .from("support_tickets")
    .select("id, status, public_ref, subject, requester_email")
    .eq("public_ref", input.publicRef)
    .maybeSingle();
  if (!ticket) return { error: "Ticket not found.", status: 404 as const };

  if (input.status && !canTransition(ticket.status as TicketStatus, input.status, "staff")) {
    return { error: "That status change is not allowed.", status: 400 as const };
  }

  const reply = input.reply?.trim().slice(0, 8000) ?? "";
  const note = input.internalNote?.trim().slice(0, 8000) ?? "";
  if (reply && containsSensitiveSupportText(reply)) {
    return {
      error: "Remove passwords, authenticator codes, and card numbers from the customer reply.",
      status: 400 as const,
    };
  }
  if (reply) {
    await db.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: input.staffId,
      author_role: "staff",
      visibility: "customer",
      body: reply,
    });
  }
  if (note) {
    await db.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: input.staffId,
      author_role: "staff",
      visibility: "internal",
      body: note,
    });
  }
  if (input.status && input.status !== ticket.status) {
    await db.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: input.staffId,
      author_role: "system",
      visibility: "customer",
      body: `Status changed to ${input.status.replace(/_/g, " ")}. ${STATUS_EXPLANATIONS[input.status]}`,
    });
  }

  await db
    .from("support_tickets")
    .update({
      status: input.status ?? ticket.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  return {
    ok: true as const,
    publicRef: String(ticket.public_ref),
    subject: String(ticket.subject),
    requesterEmail: typeof ticket.requester_email === "string" ? ticket.requester_email : null,
    reply: reply || null,
  };
}

export async function saveArticleFeedback(input: {
  slug: string;
  helpful: boolean;
  note: string | null;
  userId: string | null;
  ipHash: string | null;
}) {
  if (!supportStoreReady()) return unavailable();
  const { error } = await database().from("support_article_feedback").insert({
    article_slug: input.slug,
    helpful: input.helpful,
    note: input.note,
    user_id: input.userId,
    ip_hash: input.userId ? null : input.ipHash,
  });
  if (error) {
    if (String(error.code) === "23505") {
      return { error: "You already sent feedback for this article.", status: 409 as const };
    }
    return { error: "Could not save feedback.", status: 500 as const };
  }
  return { ok: true as const };
}
