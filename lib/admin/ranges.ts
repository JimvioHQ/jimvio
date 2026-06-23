export type AdminRangeKey = "today" | "7d" | "30d" | "mtd" | "qtd" | "ytd" | "all";

export const ADMIN_RANGES: Record<AdminRangeKey, { label: string; start: () => Date | null }> = {
  today: { label: "Today", start: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; } },
  "7d": { label: "Last 7 days", start: () => new Date(Date.now() - 7 * 86400_000) },
  "30d": { label: "Last 30 days", start: () => new Date(Date.now() - 30 * 86400_000) },
  mtd: { label: "This month", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); } },
  qtd: { label: "This quarter", start: () => { const d = new Date(); return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); } },
  ytd: { label: "Year to date", start: () => new Date(new Date().getFullYear(), 0, 1) },
  all: { label: "All time", start: () => null },
};

export function resolveAdminRange(input: string | undefined): AdminRangeKey {
  if (input && Object.prototype.hasOwnProperty.call(ADMIN_RANGES, input)) {
    return input as AdminRangeKey;
  }
  return "mtd";
}
