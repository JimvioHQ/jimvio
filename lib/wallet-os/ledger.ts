import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { surfaceForTransactionType } from "@/lib/wallet-os/surfaces";
import type { LedgerEntry, LedgerPage, LedgerQuery } from "@/lib/wallet-os/types";
import { WITHDRAWALS_ONLY_FILTER } from "@/lib/wallet-os/payout-kinds";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function prettify(value: string | null | undefined): string {
  const words = String(value ?? "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.length ? words.join(" ") : "Transaction";
}

async function fetchTransactionEntries(
  db: ServiceClient,
  userId: string,
  fetchLimit: number,
  cursor?: string | null,
): Promise<LedgerEntry[]> {
  let query = db
    .from("transactions")
    .select("id, type, amount, currency, status, reference, description, direction, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) {
    console.error("ledger: transactions fetch failed", error);
    return [];
  }

  return (data ?? []).map((row: {
    id: string;
    type: string;
    amount: number | string;
    currency: string | null;
    status: string | null;
    reference: string | null;
    description: string | null;
    direction: string | null;
    created_at: string;
  }) => {
    const amount = Number(row.amount ?? 0);
    const dirRaw = String(row.direction ?? "").toLowerCase();
    const direction =
      dirRaw === "debit" || dirRaw === "credit"
        ? dirRaw
        : amount < 0
          ? "debit"
          : "credit";
    return {
      id: `tx_${row.id}`,
      source: "transaction",
      surface: surfaceForTransactionType(row.type),
      type: row.type,
      title: row.description?.trim() ? row.description : prettify(row.type),
      amount: Math.round(Math.abs(amount) * 100) / 100,
      direction,
      currency: row.currency ?? "USD",
      status: String(row.status ?? "completed"),
      reference: row.reference ?? null,
      createdAt: String(row.created_at),
    } satisfies LedgerEntry;
  });
}

async function fetchWithdrawalEntries(
  db: ServiceClient,
  userId: string,
  fetchLimit: number,
  cursor?: string | null,
): Promise<LedgerEntry[]> {
  let query = db
    .from("payouts")
    .select("id, type, amount, currency, status, payout_method, provider_reference, created_at")
    .eq("user_id", userId)
    .or(WITHDRAWALS_ONLY_FILTER)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) {
    console.error("ledger: payouts fetch failed", error);
    return [];
  }

  return (data ?? []).map((row: {
    id: string;
    type: string | null;
    amount: number | string;
    currency: string | null;
    status: string | null;
    payout_method: string | null;
    provider_reference: string | null;
    created_at: string;
  }) => ({
    id: `payout_${row.id}`,
    source: "payout",
    surface: "withdrawals",
    type: row.type ?? "withdrawal",
    title: `Withdrawal via ${row.payout_method ?? "bank"}`,
    amount: Math.round(Math.abs(Number(row.amount ?? 0)) * 100) / 100,
    direction: "debit",
    currency: row.currency ?? "USD",
    status: String(row.status ?? "pending"),
    reference: row.provider_reference ?? row.id,
    createdAt: String(row.created_at),
  } satisfies LedgerEntry));
}

async function fetchUgcPayoutEntries(
  db: ServiceClient,
  userId: string,
  fetchLimit: number,
  cursor: string | null | undefined,
  defaultCurrency: string,
): Promise<LedgerEntry[]> {
  try {
    const { data: influencer } = await db.from("influencers").select("id").eq("user_id", userId).maybeSingle();
    if (!influencer?.id) return [];

    let query = db
      .from("ugc_payouts")
      .select("id, submission_id, amount, status, paid_at, created_at")
      .eq("influencer_id", influencer.id)
      .order("created_at", { ascending: false })
      .limit(fetchLimit);
    if (cursor) query = query.lt("created_at", cursor);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: {
      id: string;
      submission_id: string | null;
      amount: number | string;
      status: string | null;
      paid_at: string | null;
      created_at: string;
    }) => ({
      id: `ugc_payout_${row.id}`,
      source: "ugc_payout",
      surface: "ugc",
      type: "ugc_payout",
      title: "UGC campaign payout",
      amount: Math.round(Math.abs(Number(row.amount ?? 0)) * 100) / 100,
      direction: "credit",
      currency: defaultCurrency,
      status: String(row.status ?? "pending"),
      reference: row.submission_id ?? row.id,
      createdAt: String(row.paid_at ?? row.created_at),
    } satisfies LedgerEntry));
  } catch (err) {
    console.error("ledger: ugc_payouts fetch failed", err);
    return [];
  }
}

async function fetchDepositEntries(
  db: ServiceClient,
  userId: string,
  fetchLimit: number,
  cursor?: string | null,
): Promise<LedgerEntry[]> {
  let query = db
    .from("wallet_deposits")
    .select("id, amount, currency, method, status, reference, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) {
    console.error("ledger: wallet_deposits fetch failed", error);
    return [];
  }

  return (data ?? []).map((row: {
    id: string;
    amount: number | string;
    currency: string | null;
    method: string | null;
    status: string | null;
    reference: string | null;
    created_at: string;
  }) => ({
    id: `deposit_${row.id}`,
    source: "deposit",
    surface: "deposits",
    type: "deposit",
    title: `Deposit via ${row.method ?? "manual"}`,
    amount: Math.round(Math.abs(Number(row.amount ?? 0)) * 100) / 100,
    direction: "credit",
    currency: row.currency ?? "USD",
    status: String(row.status ?? "pending"),
    reference: row.reference ?? null,
    createdAt: String(row.created_at),
  } satisfies LedgerEntry));
}

async function fetchRewardEntries(
  db: ServiceClient,
  userId: string,
  fetchLimit: number,
  cursor?: string | null,
): Promise<LedgerEntry[]> {
  let query = db
    .from("wallet_rewards")
    .select("id, amount, currency, reward_type, title, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) {
    console.error("ledger: wallet_rewards fetch failed", error);
    return [];
  }

  return (data ?? []).map((row: {
    id: string;
    amount: number | string;
    currency: string | null;
    reward_type: string | null;
    title: string | null;
    status: string | null;
    created_at: string;
  }) => ({
    id: `reward_${row.id}`,
    source: "reward",
    surface: "rewards",
    type: row.reward_type ?? "reward",
    title: row.title?.trim() ? row.title : prettify(row.reward_type),
    amount: Math.round(Math.abs(Number(row.amount ?? 0)) * 100) / 100,
    direction: "credit",
    currency: row.currency ?? "USD",
    status: String(row.status ?? "credited"),
    reference: row.id,
    createdAt: String(row.created_at),
  } satisfies LedgerEntry));
}

async function fetchSubscriptionEntries(
  db: ServiceClient,
  userId: string,
  fetchLimit: number,
  cursor?: string | null,
): Promise<LedgerEntry[]> {
  try {
    let query = db
      .from("community_subscription_events")
      .select("id, event_type, amount, currency, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(fetchLimit);
    if (cursor) query = query.lt("created_at", cursor);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? [])
      .filter((row: { amount: number | string | null }) => row.amount !== null)
      .map((row: {
        id: string;
        event_type: string;
        amount: number | string | null;
        currency: string | null;
        created_at: string;
      }) => ({
        id: `sub_${row.id}`,
        source: "subscription_event",
        surface: "subscriptions",
        type: row.event_type,
        title: `Community subscription — ${prettify(row.event_type)}`,
        amount: Math.round(Math.abs(Number(row.amount ?? 0)) * 100) / 100,
        direction: "debit",
        currency: row.currency ?? "USD",
        status: "completed",
        reference: row.id,
        createdAt: String(row.created_at),
      } satisfies LedgerEntry));
  } catch (err) {
    console.error("ledger: community_subscription_events fetch failed (may be unreadable)", err);
    return [];
  }
}

/**
 * Unified ledger — merges `transactions`, `payouts`, `ugc_payouts`,
 * `wallet_deposits`, `wallet_rewards`, and `community_subscription_events`
 * into one sorted, filterable, searchable feed. Read-only; never mutates
 * any source table.
 */
export async function getWalletOsLedger(userId: string, query: LedgerQuery = {}): Promise<LedgerPage> {
  const db = createServiceRoleClient();
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const cursor = query.cursor ?? null;
  const hasFilters = Boolean(query.surface || query.q);
  const fetchLimit = hasFilters ? limit * 4 + 40 : limit + 20;

  const { data: walletRow } = await db.from("wallets").select("currency").eq("user_id", userId).maybeSingle();
  const defaultCurrency = walletRow?.currency ?? "USD";

  const [transactions, withdrawals, ugcPayouts, deposits, rewards, subscriptions] = await Promise.all([
    fetchTransactionEntries(db, userId, fetchLimit, cursor),
    fetchWithdrawalEntries(db, userId, fetchLimit, cursor),
    fetchUgcPayoutEntries(db, userId, fetchLimit, cursor, defaultCurrency),
    fetchDepositEntries(db, userId, fetchLimit, cursor),
    fetchRewardEntries(db, userId, fetchLimit, cursor),
    fetchSubscriptionEntries(db, userId, fetchLimit, cursor),
  ]);

  let merged: LedgerEntry[] = [
    ...transactions,
    ...withdrawals,
    ...ugcPayouts,
    ...deposits,
    ...rewards,
    ...subscriptions,
  ];

  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  if (query.surface) {
    merged = merged.filter((entry) => entry.surface === query.surface);
  }

  const q = (query.q ?? "").trim().toLowerCase();
  if (q) {
    merged = merged.filter(
      (entry) =>
        entry.type.toLowerCase().includes(q) ||
        (entry.reference ?? "").toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q),
    );
  }

  const page = merged.slice(0, limit);
  const nextCursor = merged.length > limit ? page[page.length - 1]?.createdAt ?? null : null;

  return { entries: page, nextCursor };
}
