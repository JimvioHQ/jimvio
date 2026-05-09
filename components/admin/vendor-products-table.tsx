// components/admin/vendor-products-table.tsx
"use client";

import React from "react";

const statusColors: Record<string, { bg: string; fg: string }> = {
    active: { bg: "rgba(22,163,74,0.08)", fg: "#16a34a" },
    draft: { bg: "rgba(100,116,139,0.08)", fg: "#475569" },
    paused: { bg: "rgba(217,119,6,0.08)", fg: "#d97706" },
    archived: { bg: "rgba(100,116,139,0.08)", fg: "#64748b" },
};

export function VendorProductsTable({ products }: { products: any[] }) {
    if (products.length === 0) {
        return <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>No products yet.</p>;
    }

    const th: React.CSSProperties = {
        padding: "7px 10px", textAlign: "left",
        fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
        textTransform: "uppercase", color: "var(--color-text-muted, #888)",
        borderBottom: "0.5px solid var(--color-border)",
        whiteSpace: "nowrap",
    };
    const td: React.CSSProperties = {
        padding: "9px 10px", fontSize: 12,
        borderBottom: "0.5px solid var(--color-border)",
        color: "var(--color-text-primary)",
    };

    return (
        <div style={{ overflowX: "auto", margin: "0 -2px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                    <col style={{ width: "35%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                    <tr>
                        <th style={th}>Product</th>
                        <th style={th}>Type</th>
                        <th style={th}>Status</th>
                        <th style={{ ...th, textAlign: "right" }}>Price</th>
                        <th style={{ ...th, textAlign: "right" }}>Sales</th>
                        <th style={{ ...th, textAlign: "right" }}>Views</th>
                        <th style={{ ...th, textAlign: "right" }}>Rating</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p) => {
                        const sc = statusColors[p.status] ?? statusColors.draft;
                        const img = Array.isArray(p.images) ? p.images[0] : null;
                        return (
                            <tr key={p.id}>
                                <td style={td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                                            background: "var(--color-surface, #f0f0f0)",
                                            overflow: "hidden", border: "0.5px solid var(--color-border)",
                                        }}>
                                            {img && typeof img === "object" && img.url
                                                ? <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                : null}
                                        </div>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                                            {p.name}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ ...td, color: "var(--color-text-muted, #888)", textTransform: "capitalize" }}>
                                    {p.product_type}
                                </td>
                                <td style={td}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                                        background: sc.bg, color: sc.fg, textTransform: "capitalize",
                                    }}>
                                        {p.status}
                                    </span>
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {Number(p.price).toLocaleString()}
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {(p.sale_count ?? 0).toLocaleString()}
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                    {(p.view_count ?? 0).toLocaleString()}
                                </td>
                                <td style={{ ...td, textAlign: "right" }}>
                                    {p.review_count > 0 ? `${Number(p.rating).toFixed(1)} (${p.review_count})` : "—"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// components/admin/vendor-orders-table.tsx
// ─────────────────────────────────────────────────────────────────────────────

const orderStatusColors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "rgba(217,119,6,0.08)", fg: "#d97706" },
    confirmed: { bg: "rgba(59,130,246,0.08)", fg: "#3b82f6" },
    processing: { bg: "rgba(59,130,246,0.08)", fg: "#3b82f6" },
    shipped: { bg: "rgba(99,102,241,0.08)", fg: "#6366f1" },
    delivered: { bg: "rgba(22,163,74,0.08)", fg: "#16a34a" },
    completed: { bg: "rgba(22,163,74,0.08)", fg: "#16a34a" },
    cancelled: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626" },
    refunded: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626" },
};
const paymentStatusColors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "rgba(217,119,6,0.08)", fg: "#d97706" },
    processing: { bg: "rgba(59,130,246,0.08)", fg: "#3b82f6" },
    completed: { bg: "rgba(22,163,74,0.08)", fg: "#16a34a" },
    paid: { bg: "rgba(22,163,74,0.08)", fg: "#16a34a" },
    failed: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626" },
    refunded: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626" },
    cancelled: { bg: "rgba(100,116,139,0.08)", fg: "#64748b" },
};

export function VendorOrdersTable({ orders }: { orders: any[] }) {
    if (orders.length === 0) {
        return <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>No orders yet.</p>;
    }

    const th: React.CSSProperties = {
        padding: "7px 10px", textAlign: "left",
        fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
        textTransform: "uppercase", color: "var(--color-text-muted, #888)",
        borderBottom: "0.5px solid var(--color-border)",
        whiteSpace: "nowrap",
    };
    const td: React.CSSProperties = {
        padding: "9px 10px", fontSize: 12,
        borderBottom: "0.5px solid var(--color-border)",
        color: "var(--color-text-primary)",
    };

    return (
        <div style={{ overflowX: "auto", margin: "0 -2px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th style={th}>Order #</th>
                        <th style={th}>Buyer</th>
                        <th style={th}>Status</th>
                        <th style={th}>Payment</th>
                        <th style={{ ...th, textAlign: "right" }}>Total</th>
                        <th style={th}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((o) => {
                        const osc = orderStatusColors[o.status] ?? { bg: "transparent", fg: "var(--color-text-muted)" };
                        const psc = paymentStatusColors[o.payment_status] ?? { bg: "transparent", fg: "var(--color-text-muted)" };
                        const buyer = o.profiles as any;
                        return (
                            <tr key={o.id}>
                                <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontWeight: 600, fontSize: 11 }}>
                                    {o.order_number}
                                </td>
                                <td style={{ ...td, color: "var(--color-text-muted, #888)" }}>
                                    {buyer?.full_name || buyer?.email || "—"}
                                </td>
                                <td style={td}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                                        background: osc.bg, color: osc.fg, textTransform: "capitalize",
                                    }}>
                                        {o.status}
                                    </span>
                                </td>
                                <td style={td}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                                        background: psc.bg, color: psc.fg, textTransform: "capitalize",
                                    }}>
                                        {o.payment_status}
                                    </span>
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                                    {Number(o.total_amount).toLocaleString()} {o.currency}
                                </td>
                                <td style={{ ...td, color: "var(--color-text-muted, #888)", whiteSpace: "nowrap", fontSize: 11 }}>
                                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// components/admin/vendor-reviews-list.tsx
// ─────────────────────────────────────────────────────────────────────────────

export function VendorReviewsList({ reviews }: { reviews: any[] }) {
    if (reviews.length === 0) {
        return <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>No reviews yet.</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.map((r) => {
                const buyer = r.profiles as any;
                return (
                    <div key={r.id} style={{
                        padding: "10px 12px", borderRadius: 6,
                        border: "0.5px solid var(--color-border)",
                        background: "var(--color-surface, #fafaf9)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                            <div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                                    {buyer?.full_name || buyer?.email || "Anonymous"}
                                </span>
                                {r.is_verified_purchase && (
                                    <span style={{
                                        marginLeft: 6, fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                                        background: "rgba(22,163,74,0.08)", color: "#16a34a",
                                    }}>
                                        Verified
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <StarRating rating={r.rating} />
                                <span style={{ fontSize: 11, color: "var(--color-text-muted, #888)" }}>
                                    {new Date(r.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        {r.title && (
                            <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px", color: "var(--color-text-primary)" }}>
                                {r.title}
                            </p>
                        )}
                        {r.body && (
                            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                                {r.body}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div style={{ display: "flex", gap: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{
                    fontSize: 11,
                    color: i <= rating ? "#f59e0b" : "var(--color-border)",
                }}>★</span>
            ))}
        </div>
    );
}