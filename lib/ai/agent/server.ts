/**
 * Server ports for Jimvio AI.
 * Identity, ownership, and permission checks use the signed-in session.
 * The model never receives a database client or a service credential.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createOwnedCommunity, slugifyCommunityName } from "@/lib/community/create-owned-community";
import { ensureDefaultCommunityWorkspace } from "@/lib/community/ensure-default-workspace";
import {
  ensureOwnedCommunityChannels,
  findOwnedCommunityBySlug,
  updateOwnedCommunityDetails,
} from "@/lib/community/agent-community";
import { listVendorJimvioStores } from "@/lib/commerce-os/merchant-store";
import { createJimvioStore } from "@/lib/commerce-os/stores";
import { storefrontBrowsePath } from "@/lib/commerce-os/storefront-url";
import { cosAdminDb, requireCommerceMerchant, slugifyHandle } from "@/lib/commerce-os/tenant";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/base";
import type { AgentPorts, StoredAgentExecution } from "./execute";
import { isAgentToolName, normalizeAgentPreference, redactAgentText, type AgentScope, type AgentMode } from "./plan";

export const AGENT_RECORD_ERROR = "Jimvio AI could not record this action. Nothing further was run.";

type AgentPreference = { mode: AgentMode; scopes: AgentScope[] };

type Session =
  | { ok: false; status: 401; error: string }
  | { ok: true; supabase: SupabaseClient; user: User; preference: AgentPreference };

function amount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 32);
  return "unavailable";
}

function ledgerTitle(status: StoredAgentExecution["status"]) {
  if (status === "completed") return "Jimvio AI finished an action";
  if (status === "partial") return "Jimvio AI finished part of an action";
  if (status === "failed") return "Jimvio AI could not finish an action";
  if (status === "cancelled") return "Jimvio AI cancelled an action";
  if (status === "awaiting_confirmation") return "Jimvio AI is waiting for confirmation";
  return "Jimvio AI is running an action";
}

function sanitizeRecord(userId: string, record: StoredAgentExecution): StoredAgentExecution {
  return {
    id: record.id,
    userId,
    status: record.status,
    summary: redactAgentText(record.summary || ""),
    retryCount: Number.isFinite(record.retryCount) ? record.retryCount : 0,
    confirmation: record.confirmation,
    communityId: record.communityId,
    communitySlug: record.communitySlug,
    communityName: record.communityName ? redactAgentText(record.communityName) : undefined,
    steps: record.steps.filter((step) => isAgentToolName(step.tool)).slice(0, 6),
    results: (record.results ?? []).slice(0, 6).map((result) => ({
      tool: result.tool,
      status: result.status,
      summary: redactAgentText(result.summary || ""),
      href: result.href,
      resourceId: result.resourceId,
    })),
  };
}

function parseStored(data: unknown, userId: string, id: string): StoredAgentExecution | null {
  if (!data || typeof data !== "object") return null;
  const record = (data as { record?: unknown }).record;
  if (!record || typeof record !== "object") return null;
  const row = record as StoredAgentExecution;
  if (row.userId !== userId || row.id !== id || !Array.isArray(row.steps)) return null;
  if (!row.steps.every((step) => step && isAgentToolName(step.tool))) return null;
  return sanitizeRecord(userId, {
    ...row,
    results: Array.isArray(row.results) ? row.results : [],
    retryCount: Number.isFinite(row.retryCount) ? row.retryCount : 0,
    confirmation: row.confirmation || "pending",
  });
}

async function adminDb() {
  try {
    return getAdminDB();
  } catch {
    return null;
  }
}

async function writeLedger(supabase: SupabaseClient, userId: string, record: StoredAgentExecution) {
  const safe = sanitizeRecord(userId, record);
  const row = {
    user_id: userId,
    type: "system" as const,
    category: "ai",
    title: ledgerTitle(safe.status),
    message: safe.summary || ledgerTitle(safe.status),
    action_url: safe.communitySlug ? `/communities/${safe.communitySlug}` : null,
    event_key: safe.id,
    group_key: "jimvio_ai",
    delivery_channel: "in_app",
    is_read: false,
    data: { kind: "jimvio_ai_execution", record: safe },
  };
  const clients = [supabase, await adminDb()].filter((client): client is SupabaseClient => Boolean(client));
  for (const client of clients) {
    const { data: existing, error: readError } = await client
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("event_key", safe.id)
      .maybeSingle();
    if (readError) continue;
    if (existing?.id) {
      const { error } = await client
        .from("notifications")
        .update({
          title: row.title,
          message: row.message,
          action_url: row.action_url,
          category: "ai",
          data: row.data as never,
        })
        .eq("id", existing.id)
        .eq("user_id", userId);
      if (!error) return true;
      continue;
    }
    const { error } = await client.from("notifications").insert(row as never);
    if (!error) return true;
  }
  console.error("[jimvio-ai] ledger write failed");
  return false;
}

async function readLedger(supabase: SupabaseClient, userId: string, id: string) {
  const clients = [supabase, await adminDb()].filter((client): client is SupabaseClient => Boolean(client));
  for (const client of clients) {
    const { data, error } = await client
      .from("notifications")
      .select("data, user_id")
      .eq("user_id", userId)
      .eq("event_key", id)
      .eq("category", "ai")
      .maybeSingle();
    if (error || !data || data.user_id !== userId) continue;
    const parsed = parseStored(data.data, userId, id);
    if (parsed) return parsed;
  }
  return null;
}

async function workspaceReady(communityId: string, name: string, slug: string) {
  const admin = await adminDb();
  if (!admin) return false;
  const seeded = await ensureDefaultCommunityWorkspace(admin, communityId, {
    communityName: name,
    communitySlug: slug,
  });
  return Boolean(seeded.spaceId);
}

async function openSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in before Jimvio AI can use your account." };
  }
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    supabase,
    user,
    preference: normalizeAgentPreference(metadata.jimvio_ai),
  };
}

function buildPorts(supabase: SupabaseClient, userId: string, preference: AgentPreference): AgentPorts {
  return {
    userId,
    mode: preference.mode,
    scopes: preference.scopes,
    loadExecution: (id) => readLedger(supabase, userId, id),
    saveExecution: async (record) => {
      const saved = await writeLedger(supabase, userId, record);
      if (!saved && record.status === "awaiting_confirmation") {
        throw new Error(AGENT_RECORD_ERROR);
      }
    },
    createCommunity: async (input) => {
      const name = input.name.trim();
      const slug = slugifyCommunityName(name);
      if (!slug) return { ok: false, error: "A community name is required.", status: 400 };
      const existing = await findOwnedCommunityBySlug(supabase, userId, slug);
      if (existing && !existing.archived_at) {
        return {
          ok: true,
          id: existing.id,
          slug: existing.slug,
          name: existing.name,
          reused: true,
          workspaceReady: await workspaceReady(existing.id, existing.name, existing.slug),
        };
      }
      const created = await createOwnedCommunity({
        name,
        description: input.description,
        visibility: "public",
        is_private: false,
        is_free: true,
        currency: "USD",
      });
      if (!created.ok) {
        if (created.status === 409) {
          const again = await findOwnedCommunityBySlug(supabase, userId, slug);
          if (again && !again.archived_at) {
            return {
              ok: true,
              id: again.id,
              slug: again.slug,
              name: again.name,
              reused: true,
              workspaceReady: await workspaceReady(again.id, again.name, again.slug),
            };
          }
        }
        return { ok: false, error: redactAgentText(created.error), status: created.status };
      }
      return {
        ok: true,
        id: created.community.id,
        slug: created.community.slug,
        name: created.community.name,
        reused: false,
        workspaceReady: await workspaceReady(created.community.id, created.community.name, created.community.slug),
      };
    },
    configureCommunity: (input) => updateOwnedCommunityDetails(supabase, userId, input.communityId, input),
    addChannels: async (input) => {
      const admin = await adminDb();
      if (!admin) return { ok: false, error: "Could not add a channel.", status: 500 };
      return ensureOwnedCommunityChannels(supabase, admin, userId, input.communityId, input.channels);
    },
    createStore: async (input) => {
      const auth = await requireCommerceMerchant();
      if (!auth.ok) return { ok: false, error: auth.error, status: auth.status };
      if (auth.userId !== userId) {
        return { ok: false, error: "That store action does not match the signed-in account.", status: 403 };
      }
      const db = cosAdminDb();
      const handle = slugifyHandle(input.name);
      const existing = handle
        ? (await listVendorJimvioStores(db, auth.vendorId)).find((store) => store.handle === handle)
        : undefined;
      if (existing) {
        return { ok: true, handle: existing.handle, url: storefrontBrowsePath(existing.handle), reused: true };
      }
      const created = await createJimvioStore(db, { vendorId: auth.vendorId, name: input.name });
      if (!created.ok) {
        const status = created.code === "ENTITLEMENT" ? 403 : created.code === "HANDLE_TAKEN" ? 409 : 400;
        const error = created.code === "CREATE_FAILED" ? "Could not create the store." : redactAgentText(created.error);
        return { ok: false, error, status };
      }
      return { ok: true, handle: created.handle, url: created.url, reused: false };
    },
    readAccount: async () => {
      const setupGaps: string[] = [];
      let communities: string[] | null = null;
      let stores: string[] | null = null;
      const { data: communityRows, error: communityError } = await supabase
        .from("communities")
        .select("name")
        .eq("owner_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(8);
      if (communityError) {
        setupGaps.push("Community list is unavailable right now.");
      } else {
        communities = (communityRows ?? []).map((row) => String(row.name || "")).filter(Boolean);
        if (!communities.length) setupGaps.push("No community is recorded for this account.");
      }
      const { data: vendorRows, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      if (vendorError) {
        setupGaps.push("Store list is unavailable right now.");
      } else if (!vendorRows?.[0]?.id) {
        stores = [];
        setupGaps.push("No seller account is recorded, so store setup cannot be checked.");
      } else {
        try {
          stores = (await listVendorJimvioStores(cosAdminDb(), vendorRows[0].id)).map((store) => store.name).slice(0, 8);
          if (!stores.length) setupGaps.push("No store is recorded for this seller account.");
        } catch {
          stores = null;
          setupGaps.push("Store list is unavailable right now.");
        }
      }
      return { communities, stores, setupGaps };
    },
    readActivity: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("title, message")
        .eq("user_id", userId)
        .eq("category", "ai")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) return { unavailable: "Action history is unavailable right now." };
      return {
        items: (data ?? []).map((row) => redactAgentText(`${row.title}: ${row.message}`)),
      };
    },
    readOrders: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("order_number, status, payment_status, total_amount, currency")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return { unavailable: "Order history is unavailable right now." };
      return {
        items: (data ?? []).map((order) => {
          const payment = order.payment_status ? ` Payment ${order.payment_status}.` : "";
          const total =
            order.currency && order.total_amount != null
              ? ` Stored total ${order.total_amount} ${order.currency}.`
              : "";
          return `Order ${order.order_number} is ${order.status || "status unavailable"}.${payment}${total}`;
        }),
      };
    },
    searchCommunities: async (query) => {
      const admin = await adminDb();
      if (!admin) return { unavailable: "Community search is unavailable right now." };
      const q = query.replace(/[%_,()]/g, " ").trim().slice(0, 60);
      let req = admin
        .from("communities")
        .select("name, slug, tagline, member_count, is_private, visibility_mode")
        .eq("is_active", true)
        .is("archived_at", null)
        .not("is_private", "is", true)
        .order("member_count", { ascending: false })
        .limit(6);
      if (q) req = req.or(`name.ilike.%${q}%,tagline.ilike.%${q}%,category.ilike.%${q}%`);
      const { data, error } = await req;
      if (error) return { unavailable: "Community search is unavailable right now." };
      return {
        items: (data ?? [])
          .filter((c: { visibility_mode?: string | null }) => c.visibility_mode !== "hidden")
          .map((c: { name: string; slug: string; tagline: string | null; member_count: number | null }) => ({
            name: redactAgentText(String(c.name)),
            slug: String(c.slug),
            members: Number(c.member_count ?? 0) || 0,
            tagline: c.tagline ? redactAgentText(String(c.tagline)).slice(0, 80) : null,
          })),
      };
    },
    updateProfile: async (input) => {
      const patch: Record<string, string> = {};
      if (input.fullName) patch.full_name = input.fullName.slice(0, 80);
      if (input.bio) patch.bio = input.bio.slice(0, 300);
      if (!Object.keys(patch).length) return { ok: false, error: "Nothing to change.", status: 400 };
      const { data, error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select("username")
        .maybeSingle();
      if (error) return { ok: false, error: "Could not update your profile.", status: 500 };
      return { ok: true, username: (data as { username?: string | null } | null)?.username ?? null };
    },
    createPost: async (input) => {
      const body = input.body.trim();
      if (!body) return { ok: false, error: "The post text is empty.", status: 400 };
      // Communities the member owns or belongs to (active).
      const [{ data: owned }, { data: memberships }] = await Promise.all([
        supabase.from("communities").select("id, name, slug").eq("owner_id", userId).eq("is_active", true).is("archived_at", null).limit(50),
        supabase
          .from("community_memberships")
          .select("community_id, communities!inner(id, name, slug, is_active, archived_at)")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(100),
      ]);
      const pool = new Map<string, { id: string; name: string; slug: string }>();
      for (const c of (owned ?? []) as Array<{ id: string; name: string; slug: string }>) pool.set(c.id, c);
      type JoinedCommunity = { id: string; name: string; slug: string; is_active: boolean | null; archived_at: string | null };
      for (const m of (memberships ?? []) as unknown as Array<{ communities: JoinedCommunity | JoinedCommunity[] | null }>) {
        const c = Array.isArray(m.communities) ? m.communities[0] : m.communities;
        if (c && c.is_active !== false && !c.archived_at) pool.set(c.id, { id: c.id, name: c.name, slug: c.slug });
      }
      const all = [...pool.values()];
      if (!all.length) {
        return { ok: false, error: "Join or create a community first — posts are published inside a community.", status: 400 };
      }
      let target = all.length === 1 ? all[0] : undefined;
      if (input.community) {
        const want = input.community.toLowerCase();
        target =
          all.find((c) => c.name.toLowerCase() === want || c.slug.toLowerCase() === want) ??
          all.find((c) => c.name.toLowerCase().includes(want));
        if (!target) {
          return {
            ok: false,
            error: `You are not a member of “${input.community}”. Your communities: ${all.map((c) => c.name).join(", ")}.`,
            status: 404,
          };
        }
      }
      if (!target) {
        return {
          ok: false,
          error: `Which community should I post in? Your communities: ${all.map((c) => c.name).join(", ")}.`,
          status: 400,
        };
      }
      // Reuse the regular post endpoint so membership, identity and room
      // rules are exactly the same as posting by hand.
      const { POST } = await import("@/app/api/posts/feed/route");
      const { NextRequest } = await import("next/server");
      const res = await POST(
        new NextRequest("http://jimvio.internal/api/posts/feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ community_id: target.id, body, is_published: true, audience: "public" }),
        }),
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string; post?: { id?: string } };
      if (!res.ok) return { ok: false, error: data.error || "Could not publish the post.", status: res.status };
      const postId = data.post?.id;
      return {
        ok: true,
        communityName: target.name,
        href: `/communities/${target.slug}/feed${postId ? `?post=${encodeURIComponent(postId)}` : ""}`,
      };
    },
    readWallet: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("available_balance, pending_balance, currency")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return { unavailable: "Wallet information is unavailable right now." };
      if (!data) return { summary: "No wallet is recorded for this account." };
      const currency = data.currency ? String(data.currency) : "currency unavailable";
      return {
        summary: `Available balance ${amount(data.available_balance)} ${currency}. Pending balance ${amount(data.pending_balance)} ${currency}.`,
      };
    },
  };
}

export async function loadAgentSession() {
  const session = await openSession();
  if (!session.ok) return session;
  const history = await readAgentHistory(session.supabase, session.user.id);
  return {
    ok: true as const,
    preference: session.preference,
    ...history,
    ports: buildPorts(session.supabase, session.user.id, session.preference),
  };
}

export async function readAgentHistory(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("title, action_url, created_at")
    .eq("user_id", userId)
    .eq("category", "ai")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) return { history: [] as Array<{ title: string; href: string | null; at: string | null }>, historyAvailable: false };
  return {
    historyAvailable: true,
    history: (data ?? []).map((row) => ({
      title: redactAgentText(String(row.title || "Jimvio AI action")),
      href: typeof row.action_url === "string" ? row.action_url : null,
      at: row.created_at,
    })),
  };
}

export async function saveAgentPreference(input: unknown) {
  const session = await openSession();
  if (!session.ok) return session;
  const preference = normalizeAgentPreference(input);
  const { error } = await session.supabase.auth.updateUser({ data: { jimvio_ai: preference } });
  if (error) return { ok: false as const, status: 400, error: "Could not save the Jimvio AI mode." };
  return { ok: true as const, preference };
}
