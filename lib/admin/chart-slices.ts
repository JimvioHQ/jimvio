export const SLICE_COLORS: Record<string, string> = {
    paid: "#16a34a",
    completed: "#16a34a",
    pending: "#d97706",
    processing: "#2563eb",
    failed: "#dc2626",
    refunded: "#64748b",
    cancelled: "#94a3b8",
    confirmed: "#16a34a",
    shipped: "#6366f1",
    delivered: "#059669",
    vendor: "#6366f1",
    cj: "#9333ea",
    shopify: "#16a34a",
    community: "#0891b2",
    other: "#94a3b8",
};

export type ChartSlice = {
    name: string;
    value: number;
    color: string;
};

export function colorForSlice(key: string): string {
    return SLICE_COLORS[key.toLowerCase()] ?? SLICE_COLORS.other;
}

export function buildChartSlices(
    rows: Array<{ key: string; count: number }>,
    merge?: Record<string, string>
): ChartSlice[] {
    const merged = new Map<string, number>();

    for (const row of rows) {
        if (row.count <= 0) continue;
        const label = merge?.[row.key] ?? row.key;
        merged.set(label, (merged.get(label) ?? 0) + row.count);
    }

    return Array.from(merged.entries())
        .map(([name, value]) => ({
            name,
            value,
            color: colorForSlice(name),
        }))
        .sort((a, b) => b.value - a.value);
}
