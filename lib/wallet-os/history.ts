/**
 * Balance history from the real ledger (no invented points).
 * Works backwards from today's total: the balance at the start of a day is
 * the balance at its end minus that day's money in, plus that day's money out.
 */

export type HistoryEntry = {
  amount: number;
  direction: "credit" | "debit";
  status: string;
  createdAt: string;
  surface: string;
};

export type BalancePoint = { date: string; balance: number };

const IGNORED = new Set(["failed", "cancelled", "canceled", "rejected", "reversed", "expired"]);

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const round = (n: number) => Math.round(n * 100) / 100;

export function counts(e: HistoryEntry): boolean {
  return !IGNORED.has(String(e.status ?? "").toLowerCase()) && Number.isFinite(e.amount) && e.amount !== 0;
}

/** One point per day for the last `days` days, ending with today = currentTotal. */
export function buildBalanceSeries(currentTotal: number, entries: HistoryEntry[], days: number, now = new Date()): BalancePoint[] {
  const net = new Map<string, number>();
  for (const e of entries) {
    if (!counts(e)) continue;
    const k = dayKey(new Date(e.createdAt));
    const signed = e.direction === "credit" ? Math.abs(e.amount) : -Math.abs(e.amount);
    net.set(k, (net.get(k) ?? 0) + signed);
  }
  const points: BalancePoint[] = [];
  let balance = currentTotal;
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCHours(12, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const k = dayKey(d);
    points.push({ date: k, balance: round(Math.max(0, balance)) });
    balance -= net.get(k) ?? 0;
  }
  return points.reverse();
}

/** Money in, by where it came from (UGC, community, marketplace…). */
export function incomeBySource(entries: HistoryEntry[]): { surface: string; amount: number }[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (!counts(e) || e.direction !== "credit") continue;
    m.set(e.surface, (m.get(e.surface) ?? 0) + Math.abs(e.amount));
  }
  return [...m.entries()].map(([surface, amount]) => ({ surface, amount: round(amount) })).sort((a, b) => b.amount - a.amount);
}
