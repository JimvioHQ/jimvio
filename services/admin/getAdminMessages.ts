import { getAdminDB } from "@/services/base";

export type AdminConversationRow = {
  id: string;
  updated_at: string;
  created_at: string;
  buyer: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  vendor: {
    id: string;
    business_name: string | null;
    business_slug: string | null;
    business_logo: string | null;
  } | null;
  last_message: {
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
  message_count: number;
};

export type AdminMessagesResult = {
  rows: AdminConversationRow[];
  total: number;
  activeLast7d: number;
};

const PAGE_SIZE = 25;
const SEARCH_FETCH_CAP = 5000;

export async function getAdminMessages(opts?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminMessagesResult> {
  const admin = getAdminDB();
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = opts?.pageSize ?? PAGE_SIZE;
  const q = (opts?.q ?? "").trim().toLowerCase();

  let convQuery = admin
    .from("conversations")
    .select(
      `
      id, buyer_id, vendor_id, created_at, updated_at,
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, email, avatar_url),
      vendor:vendors!conversations_vendor_id_fkey(id, business_name, business_slug, business_logo)
    `,
      { count: "exact" },
    )
    .order("updated_at", { ascending: false });

  if (q) {
    convQuery = convQuery.limit(SEARCH_FETCH_CAP);
  } else {
    convQuery = convQuery.range((page - 1) * pageSize, page * pageSize - 1);
  }

  const { data: conversations, count } = await convQuery;

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { count: activeLast7d } = await admin
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .gte("updated_at", weekAgo);

  const list = (conversations ?? []) as any[];
  const ids = list.map((c) => c.id as string);

  const lastByConv = new Map<string, { body: string; created_at: string; sender_id: string }>();
  const countByConv = new Map<string, number>();

  if (ids.length > 0) {
    const { data: messages } = await admin
      .from("conversation_messages")
      .select("conversation_id, body, created_at, sender_id")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });

    for (const m of messages ?? []) {
      countByConv.set(m.conversation_id, (countByConv.get(m.conversation_id) ?? 0) + 1);
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, {
          body: m.body ?? "",
          created_at: m.created_at,
          sender_id: m.sender_id,
        });
      }
    }
  }

  let rows: AdminConversationRow[] = list.map((c) => {
    const buyer = Array.isArray(c.buyer) ? c.buyer[0] : c.buyer;
    const vendor = Array.isArray(c.vendor) ? c.vendor[0] : c.vendor;
    return {
      id: c.id,
      updated_at: c.updated_at,
      created_at: c.created_at,
      buyer: buyer ?? null,
      vendor: vendor ?? null,
      last_message: lastByConv.get(c.id) ?? null,
      message_count: countByConv.get(c.id) ?? 0,
    };
  });

  if (q) {
    rows = rows.filter((r) => {
      const hay = [
        r.buyer?.full_name,
        r.buyer?.email,
        r.vendor?.business_name,
        r.vendor?.business_slug,
        r.last_message?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    const totalFiltered = rows.length;
    const start = (page - 1) * pageSize;
    rows = rows.slice(start, start + pageSize);
    return {
      rows,
      total: totalFiltered,
      activeLast7d: activeLast7d ?? 0,
    };
  }

  return {
    rows,
    total: count ?? 0,
    activeLast7d: activeLast7d ?? 0,
  };
}
