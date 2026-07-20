import { getAdminDB } from "@/services/base";

type TimestampRow = { user_id?: string | null; created_at?: string | null };
type AmountRow = { total_amount?: number | string | null; creator_earnings?: number | string | null; commission_amount?: number | string | null; created_at?: string | null };

export type GrowthKpis = {
  dau: number; wau: number; mau: number;
  postsToday: number; messagesToday: number; liveSessionsToday: number;
  gmvToday: number; creatorRevenueToday: number; affiliateCommissionsToday: number;
  nps: number | null;
  npsResponses: number;
  funnel: Record<string, number>;
};

export function windowStart(days: number, now = new Date()): string {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString();
}

export function distinctUsersSince(rows: TimestampRow[], since: string): number {
  return new Set(rows.filter((row) => row.user_id && row.created_at && row.created_at >= since).map((row) => row.user_id)).size;
}

export async function getGrowthKpis(now = new Date()): Promise<GrowthKpis> {
  const db = getAdminDB() as any;
  const today = windowStart(1, now);
  const mauStart = windowStart(30, now);
  const safe = async <T,>(query: PromiseLike<{ data?: T[] | null }>): Promise<T[]> => {
    try { return (await query).data ?? []; } catch { return []; }
  };
  const countSince = async (table: string, since: string, extra?: (q: any) => any) => {
    try {
      let q = db.from(table).select("id", { count: "exact", head: true }).gte("created_at", since);
      if (extra) q = extra(q);
      const result = await q;
      return result.count ?? 0;
    } catch { return 0; }
  };

  const [events, postsToday, messagesToday, liveSessionsToday, paidOrders, completedPayments, commissions] = await Promise.all([
    safe<TimestampRow & { event_name?: string; properties?: { score?: number } }>(
      db.from("growth_events").select("user_id, event_name, properties, created_at").gte("created_at", mauStart),
    ),
    countSince("community_posts", today, (q) => q.eq("is_published", true)),
    countSince("community_messages", today, (q) => q.eq("is_deleted", false)),
    countSince("live_sessions", today),
    safe<AmountRow>(db.from("orders").select("total_amount, paid_at").eq("payment_status", "paid").gte("paid_at", today)),
    safe<AmountRow>(db.from("community_payments").select("creator_earnings, created_at").eq("status", "completed").gte("created_at", today)),
    safe<AmountRow>(db.from("affiliate_commissions").select("commission_amount, created_at").gte("created_at", today)),
  ]);

  const sum = (rows: AmountRow[], field: keyof AmountRow) => rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
  const eventRows = events as Array<TimestampRow & { event_name?: string; properties?: { score?: number } }>;
  const funnelNames = [
    "growth.welcome_intent_selected",
    "growth.welcome_completed",
    "growth.welcome_email_sent",
    "growth.checklist_completed",
    "growth.nps_score",
    "growth.feedback_submitted",
    "growth.session_start",
    "growth.client_error",
    "growth.web_vital_lcp",
    "growth.experiment_exposure",
  ];

  const npsScores = eventRows
    .filter((row) => row.event_name === "growth.nps_score")
    .map((row) => Number(row.properties?.score))
    .filter((score) => Number.isFinite(score) && score >= 0 && score <= 10);
  const promoters = npsScores.filter((score) => score >= 9).length;
  const detractors = npsScores.filter((score) => score <= 6).length;
  const nps =
    npsScores.length > 0
      ? Math.round(((promoters - detractors) / npsScores.length) * 100)
      : null;

  return {
    dau: distinctUsersSince(eventRows, today),
    wau: distinctUsersSince(eventRows, windowStart(7, now)),
    mau: distinctUsersSince(eventRows, mauStart),
    postsToday,
    messagesToday,
    liveSessionsToday,
    gmvToday: sum(paidOrders, "total_amount"),
    creatorRevenueToday: sum(completedPayments, "creator_earnings"),
    affiliateCommissionsToday: sum(commissions, "commission_amount"),
    nps,
    npsResponses: npsScores.length,
    funnel: Object.fromEntries(funnelNames.map((name) => [name, eventRows.filter((row) => row.event_name === name).length])),
  };
}
