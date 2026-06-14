import { formatCurrency, formatWalletMoney } from "@/lib/utils";

type MoneyInput = number | string | null | undefined;

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
    if (map.size === 0) return formatAdminAmount(0, defaultCurrency, defaultCurrency);
    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([c, amount]) => formatAdminAmount(amount, c, defaultCurrency))
        .join(" · ");
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
