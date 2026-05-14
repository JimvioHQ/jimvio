// app/admin/vendors/[id]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    getVendorById,
    getAdminVendorOrders,
    getVendorProducts,
    getVendorReviews,
} from "@/services/db";
import { VendorActions } from "@/components/admin/vendors/vendor-action";
import { VendorOrdersTable, VendorProductsTable, VendorReviewsList } from "@/components/admin/vendor-products-table";

export const dynamic = "force-dynamic";

export default async function AdminVendorProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [vendor, orders, products, reviews] = await Promise.all([
        getVendorById(id).catch(() => null),
        getAdminVendorOrders(id),
        getVendorProducts(id),
        getVendorReviews(id),
    ]);

    if (!vendor) notFound();

    const p = vendor.profiles as any;
    const shopify = vendor.shopify_credentials as any;
    const statusColors: Record<string, { bg: string; fg: string; border: string }> = {
        pending: { bg: "rgba(217,119,6,0.08)", fg: "#d97706", border: "rgba(217,119,6,0.2)" },
        verified: { bg: "rgba(22,163,74,0.08)", fg: "#16a34a", border: "rgba(22,163,74,0.2)" },
        rejected: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626", border: "rgba(220,38,38,0.2)" },
        suspended: { bg: "rgba(147,51,234,0.08)", fg: "#9333ea", border: "rgba(147,51,234,0.2)" },
    };
    const sc = statusColors[vendor.verification_status ?? "pending"];

    const totalRevenue = Number(vendor.total_revenue ?? 0);
    const rating = Number(vendor.rating ?? 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>
            {/* Breadcrumb */}
            <nav style={{ fontSize: 13, color: "var(--color-text-muted, #888)", display: "flex", gap: 6, alignItems: "center" }}>
                <Link href="/admin/verifications" style={{ color: "inherit", textDecoration: "none" }}>
                    Review queue
                </Link>
                <span>/</span>
                <span style={{ color: "var(--color-text-primary)" }}>{vendor.business_name}</span>
            </nav>

            {/* ── Header card ─────────────────────────────────────────────────── */}
            <div style={{
                border: "0.5px solid var(--color-border)",
                borderRadius: 10, overflow: "hidden",
                background: "var(--color-bg, #fff)",
            }}>
                {/* Banner */}
                {vendor.business_banner ? (
                    <div style={{ height: 140, overflow: "hidden" }}>
                        <img src={vendor.business_banner} alt="Banner"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                ) : (
                    <div style={{ height: 80, background: "var(--color-surface, #fafaf9)" }} />
                )}

                <div style={{ padding: "0 24px 24px", display: "flex", gap: 20, alignItems: "flex-end", marginTop: -28, flexWrap: "wrap" }}>
                    {/* Logo */}
                    <div style={{
                        width: 64, height: 64, borderRadius: 10, flexShrink: 0,
                        border: "2px solid var(--color-bg, #fff)",
                        background: "var(--color-surface, #fafaf9)",
                        overflow: "hidden", position: "relative",
                    }}>
                        {vendor.business_logo ? (
                            <img src={vendor.business_logo} alt={vendor.business_name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <div style={{
                                width: "100%", height: "100%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 22, fontWeight: 700,
                                color: "var(--color-text-muted, #888)",
                            }}>
                                {vendor.business_name?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                                {vendor.business_name}
                            </h1>
                            <span style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                                background: sc.bg, color: sc.fg, border: `0.5px solid ${sc.border}`,
                                textTransform: "capitalize",
                            }}>
                                {vendor.verification_status}
                            </span>
                            {vendor.is_featured && (
                                <span style={{
                                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                                    background: "rgba(59,130,246,0.08)", color: "#3b82f6",
                                    border: "0.5px solid rgba(59,130,246,0.2)",
                                }}>
                                    Featured
                                </span>
                            )}
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-muted, #888)" }}>
                            {p?.email} · /{vendor.business_slug}
                        </p>
                    </div>

                    {/* Actions */}
                    <VendorActions vendor={vendor} />
                </div>
            </div>

            {/* ── Stats row ────────────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                {[
                    { label: "Total sales", value: (vendor.total_sales ?? 0).toLocaleString() },
                    { label: "Revenue", value: `${totalRevenue.toLocaleString()} RWF` },
                    { label: "Rating", value: rating > 0 ? `${rating.toFixed(1)} / 5` : "No ratings" },
                    { label: "Followers", value: (vendor.follower_count ?? 0).toLocaleString() },
                    { label: "Products", value: products.length.toLocaleString() },
                    { label: "Commission", value: `${Number(vendor.commission_rate ?? 0)}%` },
                ].map((s) => (
                    <div key={s.label} style={{
                        background: "var(--color-surface, #fafaf9)", borderRadius: 8,
                        border: "0.5px solid var(--color-border)", padding: "12px 16px",
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted, #888)", marginBottom: 4 }}>
                            {s.label}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                            {s.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Two-col layout ───────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

                {/* Left — main content */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Business details */}
                    <Section title="Business information">
                        <FieldGrid fields={[
                            { label: "Business name", value: vendor.business_name },
                            { label: "Slug", value: `/${vendor.business_slug}`, mono: true },
                            { label: "Type", value: vendor.business_type || "—" },
                            { label: "Email", value: vendor.business_email || "—" },
                            { label: "Phone", value: vendor.business_phone || "—" },
                            { label: "Country", value: vendor.business_country || "—" },
                            { label: "Address", value: vendor.business_address || "—" },
                            { label: "Tax ID", value: vendor.tax_id || "—", mono: true, sensitive: true },
                            { label: "Website", value: vendor.website, link: vendor.website || undefined },
                            { label: "Categories", value: vendor.product_categories || "—" },
                            { label: "Payout method", value: vendor.payout_method || "—" },
                            { label: "Payout account", value: vendor.payout_account || "—", mono: true, sensitive: true },
                        ]} />
                        {vendor.business_description && (
                            <div style={{ marginTop: 16 }}>
                                <FieldLabel>Description</FieldLabel>
                                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                    {vendor.business_description}
                                </p>
                            </div>
                        )}
                    </Section>

                    {/* Shopify */}
                    {shopify && (
                        <Section title="Shopify integration">
                            <FieldGrid fields={[
                                { label: "Shop domain", value: shopify.shop_domain, mono: true },
                                { label: "API version", value: shopify.api_version },
                                { label: "Commission", value: `${shopify.platform_commission_rate}%` },
                                { label: "Status", value: shopify.is_active ? "Active" : "Inactive" },
                                { label: "Connected", value: shopify.connected_at ? new Date(shopify.connected_at).toLocaleDateString() : "—" },
                                { label: "Last synced", value: shopify.last_synced_at ? new Date(shopify.last_synced_at).toLocaleString() : "Never" },
                            ]} />
                        </Section>
                    )}

                    {/* Products */}
                    <Section title={`Products (${products.length})`}>
                        <VendorProductsTable products={products} />
                    </Section>

                    {/* Orders */}
                    <Section title="Recent orders">
                        <VendorOrdersTable orders={orders} />
                    </Section>

                    {/* Reviews */}
                    {reviews.length > 0 && (
                        <Section title={`Reviews (${reviews.length})`}>
                            <VendorReviewsList reviews={reviews} />
                        </Section>
                    )}
                </div>

                {/* Right — sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Owner profile */}
                    <Section title="Account owner">
                        {p ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                                        background: "var(--color-surface, #f0f0f0)",
                                        overflow: "hidden", display: "flex", alignItems: "center",
                                        justifyContent: "center", fontSize: 15, fontWeight: 700,
                                        color: "var(--color-text-muted, #888)",
                                    }}>
                                        {p.avatar_url
                                            ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            : (p.full_name?.charAt(0) ?? p.email?.charAt(0) ?? "?")}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)" }}>
                                            {p.full_name || "—"}
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--color-text-muted, #888)" }}>
                                            @{p.username || "no username"}
                                        </div>
                                    </div>
                                </div>
                                {[
                                    { label: "Email", value: p.email },
                                    { label: "Phone", value: p.phone || "—" },
                                    { label: "Country", value: p.country || "—" },
                                    { label: "City", value: p.city || "—" },
                                    { label: "Joined", value: p.created_at ? new Date(p.created_at).toLocaleDateString() : "—" },
                                    { label: "2FA", value: p.two_factor_enabled ? "Enabled" : "Disabled" },
                                ].map((f) => (
                                    <div key={f.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                        <span style={{ color: "var(--color-text-muted, #888)" }}>{f.label}</span>
                                        <span style={{ color: "var(--color-text-primary)", fontWeight: 500, textAlign: "right", maxWidth: 160, wordBreak: "break-all" }}>
                                            {f.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>No profile data</p>
                        )}
                    </Section>

                    {/* Affiliate settings */}
                    <Section title="Affiliate settings">
                        {[
                            { label: "Affiliate enabled", value: vendor.affiliate_enabled ? "Yes" : "No" },
                            { label: "Commission rate", value: `${Number(vendor.affiliate_commission_rate ?? 10)}%` },
                        ].map((f) => (
                            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                                <span style={{ color: "var(--color-text-muted, #888)" }}>{f.label}</span>
                                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{f.value}</span>
                            </div>
                        ))}
                    </Section>

                    {/* Verification notes */}
                    {vendor.verification_notes && (
                        <Section title="Verification notes">
                            <p style={{ fontSize: 12, color: "var(--color-text-primary)", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                {vendor.verification_notes}
                            </p>
                        </Section>
                    )}

                    {/* Timestamps */}
                    <Section title="Timestamps">
                        {[
                            { label: "Applied", value: vendor.created_at ? new Date(vendor.created_at).toLocaleString() : "—" },
                            { label: "Updated", value: vendor.updated_at ? new Date(vendor.updated_at).toLocaleString() : "—" },
                            { label: "Verified at", value: (vendor as any).verified_at ? new Date((vendor as any).verified_at).toLocaleString() : "Not yet" },
                        ].map((f) => (
                            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                                <span style={{ color: "var(--color-text-muted, #888)" }}>{f.label}</span>
                                <span style={{ color: "var(--color-text-primary)", fontWeight: 500, fontSize: 11 }}>{f.value}</span>
                            </div>
                        ))}
                    </Section>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{
            border: "0.5px solid var(--color-border)",
            borderRadius: 8, background: "var(--color-bg, #fff)",
            overflow: "hidden",
        }}>
            <div style={{
                padding: "10px 16px",
                borderBottom: "0.5px solid var(--color-border)",
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.05em", color: "var(--color-text-muted, #888)",
            }}>
                {title}
            </div>
            <div style={{ padding: "14px 16px" }}>
                {children}
            </div>
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
            color: "var(--color-text-muted, #888)", marginBottom: 3,
        }}>
            {children}
        </div>
    );
}

function FieldGrid({ fields }: {
    fields: {
        label: string;
        value?: string | null;
        mono?: boolean;
        sensitive?: boolean;
        link?: string;
    }[];
}) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px 20px" }}>
            {fields.map((f) => (
                <div key={f.label}>
                    <FieldLabel>{f.label}</FieldLabel>
                    <div
                        style={{ fontSize: 12 }}
                        className={`${f.mono ? "font-mono" : ""} ${f.sensitive ? "text-muted" : "text-primary"} break-all`}
                    >
                        {f.link
                            ? <a href={f.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent, #fd5000)" }}>{f.value}</a>
                            : (f.value || "—")}
                    </div>
                </div>
            ))}
        </div>
    );
}
