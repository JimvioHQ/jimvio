export function formatStoreMoney(
  price: number | string | null | undefined,
  currency?: string | null
) {
  const n = Number(price ?? 0);
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

export function salePercent(
  price: number | string | null | undefined,
  compareAt: number | string | null | undefined
): number | null {
  const p = Number(price);
  const c = Number(compareAt);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= p || c <= 0) return null;
  return Math.round(((c - p) / c) * 100);
}
