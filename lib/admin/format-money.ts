import { formatCurrency, formatWalletMoney } from "@/lib/utils";

type MoneyInput = number | string | null | undefined;

export const ADMIN_PRIMARY_CURRENCY = "RWF";

export type AdminMoneyRow = {
    amount: MoneyInput;
    currency?: string | null;
};

function toAmount(amount: MoneyInput): number {
    const n = Number(amount ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function normalizeCurrency(currency: string | null | undefined, fallback: string): string {
    return (currency || fallback).toUpperCase();
}

/** Format one amount with the correct admin formatter for its currency. */
export function formatAdminAmount(amount: MoneyInput, currency?: string | null, fallback = "USD"): string {
    const c = normalizeCurrency(currency, fallback);
    if (c === "RWF") return formatAdminWalletMoney(amount, c);
    return formatAdminMoney(amount, c);
}

/** Platform KPIs and mixed admin totals (defaults to USD). */
export function formatAdminMoney(amount: MoneyInput, currency?: string | null): string {
    return formatCurrency(toAmount(amount), normalizeCurrency(currency, "USD"));
}

/** Wallet, vendor ledger, and payout rows when currency may be absent (defaults to RWF). */
export function formatAdminWalletMoney(amount: MoneyInput, currency?: string | null): string {
    return formatWalletMoney(toAmount(amount), currency);
}

/** Sum rows that may use different currencies — shows one part per currency. */
export function formatAdminMoneyTotals(rows: AdminMoneyRow[], defaultCurrency = "USD"): string {
    const map = new Map<string, number>();
    for (const row of rows) {
        const c = normalizeCurrency(row.currency, defaultCurrency);
        map.set(c, (map.get(c) ?? 0) + toAmount(row.amount));
    }
    const entries = [...map.entries()].filter(([, amount]) => amount > 0.005);
    if (entries.length === 0) return formatAdminAmount(0, defaultCurrency, defaultCurrency);
    return entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([c, amount]) => formatAdminAmount(amount, c, defaultCurrency))
        .join(" · ");
}

/** Sum paid amounts grouped by currency code. */
export function sumAdminMoneyByCurrency(
    rows: AdminMoneyRow[],
    defaultCurrency = "RWF"
): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
        const c = normalizeCurrency(row.currency, defaultCurrency);
        map.set(c, (map.get(c) ?? 0) + toAmount(row.amount));
    }
    return map;
}

export function sumAdminMoneyForCurrency(
    rows: AdminMoneyRow[],
    currency: string,
    defaultCurrency = "RWF"
): number {
    return sumAdminMoneyByCurrency(rows, defaultCurrency).get(currency.toUpperCase()) ?? 0;
}

function formatSignedPercent(current: number, prior: number): string | null {
    if (prior <= 0) return null;
    const pct = ((current - prior) / prior) * 100;
    const capped = Math.max(-999, Math.min(999, pct));
    const decimals = Math.abs(capped) >= 100 ? 0 : 1;
    const formatted = `${capped >= 0 ? "+" : ""}${capped.toFixed(decimals)}%`;
    return Math.abs(pct) > 999 ? `${formatted}+` : formatted;
}

/** Month-over-month delta for chart hover cards; skips misleading % when prior is tiny. */
export function formatAdminMoMDelta(
    current: number,
    prior: number,
    options:
        | { type: "money"; currency?: string; minPriorForPercent?: number }
        | { type: "count"; unit?: string; minPriorForPercent?: number }
): { primary: string; secondary: string | null; positive: boolean | null } {
    const diff = current - prior;
    if (diff === 0 && prior > 0) {
        return { primary: "No change", secondary: "(0%)", positive: null };
    }

    if (options.type === "money") {
        const currency = (options.currency ?? ADMIN_PRIMARY_CURRENCY).toUpperCase();
        const minPrior = options.minPriorForPercent ?? 1000;
        const sign = diff >= 0 ? "+" : "−";
        const primary =
            prior <= 0
                ? "New revenue"
                : `${sign}${formatAdminAmount(Math.abs(diff), currency, currency)} revenue`;
        const usePercent = prior >= minPrior && prior >= current * 0.05;
        const pct = usePercent ? formatSignedPercent(current, prior) : null;
        return {
            primary,
            secondary: pct ? `(${pct})` : null,
            positive: prior <= 0 ? true : diff >= 0,
        };
    }

    const unit = options.unit ?? "orders";
    const minPrior = options.minPriorForPercent ?? 3;
    const sign = diff >= 0 ? "+" : "";
    const primary = `${sign}${diff} ${unit}`;
    const usePercent = prior >= minPrior;
    const pct = usePercent ? formatSignedPercent(current, prior) : null;
    return {
        primary,
        secondary: pct ? `(${pct})` : null,
        positive: diff >= 0,
    };
}

/** Human-readable period-over-period change; avoids nonsense % when prior period is tiny. */
export function formatAdminPeriodChange(
    current: number,
    prior: number,
    options?: { currency?: string; periodLabel?: string; minPriorForPercent?: number }
): { label: string; positive: boolean | null } {
    const periodLabel = options?.periodLabel ?? "prior 30d";
    const currency = (options?.currency ?? "RWF").toUpperCase();
    const minPrior = options?.minPriorForPercent ?? 1000;

    if (current <= 0 && prior <= 0) {
        return { label: `No revenue · ${periodLabel}`, positive: null };
    }
    if (prior <= 0) {
        return { label: `New revenue · vs ${periodLabel}`, positive: true };
    }

    const diff = current - prior;
    const useAbsolute = prior < minPrior || prior < current * 0.05;
    if (useAbsolute) {
        const sign = diff >= 0 ? "+" : "−";
        return {
            label: `${sign}${formatAdminAmount(Math.abs(diff), currency, currency)} vs ${periodLabel}`,
            positive: diff >= 0,
        };
    }

    const pct = ((current - prior) / prior) * 100;
    const capped = Math.max(-999, Math.min(999, pct));
    const decimals = Math.abs(capped) >= 100 ? 0 : 1;
    const formatted = `${capped >= 0 ? "+" : ""}${capped.toFixed(decimals)}%`;
    const suffix = Math.abs(pct) > 999 ? "+" : "";
    return {
        label: `${formatted}${suffix} vs ${periodLabel}`,
        positive: pct >= 0,
    };
}

/** Average amount per row, grouped by currency when mixed. */
export function formatAdminAverageMoney(rows: AdminMoneyRow[], defaultCurrency = "USD"): string {
    const map = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
        const c = normalizeCurrency(row.currency, defaultCurrency);
        const entry = map.get(c) ?? { sum: 0, count: 0 };
        entry.sum += toAmount(row.amount);
        entry.count += 1;
        map.set(c, entry);
    }
    if (map.size === 0) return formatAdminAmount(0, defaultCurrency, defaultCurrency);
    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([c, { sum, count }]) =>
            formatAdminAmount(count > 0 ? sum / count : 0, c, defaultCurrency)
        )
        .join(" · ");
}

/** Numeric rate with currency suffix (e.g. FX lines). */
export function formatAdminRate(rate: MoneyInput, currency?: string | null): string {
    const c = normalizeCurrency(currency, "USD");
    return `${toAmount(rate).toLocaleString("en-US")} ${c}`;
}

