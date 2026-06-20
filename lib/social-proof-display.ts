/** Format real counts for UI — returns empty string when there is nothing to show. */
export function formatPublicCount(n: number): string {
  if (!n || n < 1) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K+`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  return `${n}+`;
}

export function formatPublicMoneyUsd(amount: number): string {
  if (!amount || amount < 1) return "";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (amount >= 1_000) return `$${Math.round(amount / 1000)}K+`;
  return `$${Math.round(amount)}+`;
}

export function formatPublicCountPlain(n: number): string {
  if (!n || n < 1) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
