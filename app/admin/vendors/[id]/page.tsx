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
import { ArrowLeft, BadgeCheck, ExternalLink, KeyRound, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const totalRevenue = Number(vendor.total_revenue ?? 0);
    const rating = Number(vendor.rating ?? 0);

    const VERIFY_CLS: Record<string, string> = {
        verified: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        pending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        rejected: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
        suspended: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/30 dark:text-violet-400",
    };

    return (
        <div className="space-y-5 max-w-[1500px] pb-10">

            {/* ── Breadcrumb ── */}
            <nav className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
                <Link
                    href="/admin/verifications"
                    className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Review queue
                </Link>
                <span>/</span>
                <span className="text-[var(--color-text-primary)] font-medium">{vendor.business_name}</span>
            </nav>

            {/* ── Header card ── */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                {/* Banner */}
                {vendor.business_banner ? (
                    <div className="h-36 overflow-hidden">
                        <img
                            src={vendor.business_banner}
                            alt="Banner"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="h-16 bg-gradient-to-r from-orange-50 via-orange-50/30 to-[var(--color-surface-secondary)] dark:from-orange-950/20 dark:via-orange-950/10" />
                )}

                <div className="px-6 pb-6 flex flex-wrap gap-5 items-end -mt-8">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-xl border-2 border-[var(--color-surface)] bg-[var(--color-surface-secondary)] overflow-hidden shrink-0 flex items-center justify-center relative">
                        {vendor.business_logo ? (
                            <img
                                src={vendor.business_logo}
                                alt={vendor.business_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-[22px] font-bold text-[var(--color-text-muted)]">
                                {vendor.business_name?.charAt(0)?.toUpperCase()}
                            </span>
                        )}
                        {vendor.is_featured && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 ring-2 ring-[var(--color-surface)] flex items-center justify-center">
                                <Sparkles className="h-2.5 w-2.5 text-white" />
                            </span>
                        )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0 pb-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <h1 className="text-[20px] font-semibold tracking-tight text-[var(--color-text-primary)] leading-tight">
                                {vendor.business_name}
                            </h1>
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium ring-1 ring-inset capitalize",
                                VERIFY_CLS[vendor.verification_status ?? "pending"] ?? VERIFY_CLS.pending,
                            )}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                {vendor.verification_status}
                            </span>
                        </div>
                        <p className="text-[12.5px] text-[var(--color-text-muted)]">
                            {p?.email}
                            {vendor.business_slug && (
                                <span className="ml-2 opacity-60">/{vendor.business_slug}</span>
                            )}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                        <VendorActions vendor={vendor} />
                    </div>
                </div>
            </div>

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                    { label: "Total sales", value: (vendor.total_sales ?? 0).toLocaleString() },
                    { label: "Revenue", value: `${totalRevenue.toLocaleString()} RWF` },
                    { label: "Rating", value: rating > 0 ? `${rating.toFixed(1)} / 5` : "No ratings" },
                    { label: "Followers", value: (vendor.follower_count ?? 0).toLocaleString() },
                    { label: "Products", value: products.length.toLocaleString() },
                    { label: "Commission", value: `${Number(vendor.commission_rate ?? 0)}%` },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="px-4 py-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
                    >
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1">
                            {s.label}
                        </p>
                        <p className="text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)] tabular-nums leading-none">
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Two-col body ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">

                {/* ── Left ── */}
                <div className="space-y-4">

                    {/* Business details */}
                    <Section title="Business information">
                        <FieldGrid fields={[
                            { label: "Business name", value: vendor.business_name },
                            { label: "Slug", value: `/${vendor.business_slug}`, mono: true },
                            { label: "Type", value: vendor.business_type },
                            { label: "Email", value: vendor.business_email },
                            { label: "Phone", value: vendor.business_phone },
                            { label: "Country", value: vendor.business_country },
                            { label: "Address", value: vendor.business_address },
                            { label: "Tax ID", value: vendor.tax_id, mono: true },
                            { label: "Website", value: vendor.website, link: vendor.website ?? undefined },
                            { label: "Categories", value: vendor.product_categories },
                            { label: "Payout method", value: vendor.payout_method },
                            { label: "Payout account", value: vendor.payout_account, mono: true },
                        ]} />
                        {vendor.business_description && (
                            <div className="mt-4 pt-4 border-t border-[var(--color-border)]/60">
                                <FieldLabel>Description</FieldLabel>
                                <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap mt-1">
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

                {/* ── Right sidebar ── */}
                <div className="space-y-3">

                    {/* Owner */}
                    <Section title="Account owner">
                        {p ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-[var(--color-surface-secondary)] flex items-center justify-center text-[15px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                        {p.avatar_url
                                            ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                            : (p.full_name?.charAt(0) ?? p.email?.charAt(0) ?? "?")}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] leading-tight truncate">
                                            {p.full_name || "—"}
                                        </p>
                                        <p className="text-[11.5px] text-[var(--color-text-muted)]">
                                            @{p.username || "no username"}
                                        </p>
                                    </div>
                                    {p.two_factor_enabled && (
                                        <KeyRound className="h-3.5 w-3.5 text-orange-500 shrink-0 ml-auto" />
                                    )}
                                </div>

                                <div className="space-y-0 divide-y divide-[var(--color-border)]/50">
                                    {[
                                        { label: "Email", value: p.email },
                                        { label: "Phone", value: p.phone || "—" },
                                        { label: "Country", value: p.country || "—" },
                                        { label: "City", value: p.city || "—" },
                                        { label: "Joined", value: p.created_at ? new Date(p.created_at).toLocaleDateString() : "—" },
                                        { label: "2FA", value: p.two_factor_enabled ? "Enabled" : "Disabled" },
                                    ].map((f) => (
                                        <div key={f.label} className="flex items-start justify-between gap-3 py-2">
                                            <span className="text-[11.5px] text-[var(--color-text-muted)] shrink-0">{f.label}</span>
                                            <span className="text-[11.5px] text-[var(--color-text-primary)] font-medium text-right break-all">
                                                {f.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    href={`/admin/users/${vendor.user_id}`}
                                    className="inline-flex items-center gap-1.5 text-[11.5px] text-orange-500 hover:underline mt-1"
                                >
                                    View full profile <ExternalLink className="h-3 w-3" />
                                </Link>
                            </div>
                        ) : (
                            <p className="text-[13px] text-[var(--color-text-muted)]">No profile data</p>
                        )}
                    </Section>

                    {/* Affiliate settings */}
                    <Section title="Affiliate settings">
                        <div className="divide-y divide-[var(--color-border)]/50">
                            {[
                                { label: "Affiliate enabled", value: vendor.affiliate_enabled ? "Yes" : "No" },
                                { label: "Commission rate", value: `${Number(vendor.affiliate_commission_rate ?? 10)}%` },
                            ].map((f) => (
                                <div key={f.label} className="flex items-center justify-between py-2">
                                    <span className="text-[11.5px] text-[var(--color-text-muted)]">{f.label}</span>
                                    <span className="text-[11.5px] text-[var(--color-text-primary)] font-medium">{f.value}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Verification notes */}
                    {vendor.verification_notes && (
                        <Section title="Verification notes">
                            <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                                {vendor.verification_notes}
                            </p>
                        </Section>
                    )}

                    {/* Timestamps */}
                    <Section title="Timestamps">
                        <div className="divide-y divide-[var(--color-border)]/50">
                            {[
                                { label: "Applied", value: vendor.created_at ? new Date(vendor.created_at).toLocaleString() : "—" },
                                { label: "Updated", value: vendor.updated_at ? new Date(vendor.updated_at).toLocaleString() : "—" },
                                { label: "Verified at", value: (vendor as any).verified_at ? new Date((vendor as any).verified_at).toLocaleString() : "Not yet" },
                            ].map((f) => (
                                <div key={f.label} className="flex items-start justify-between gap-3 py-2">
                                    <span className="text-[11.5px] text-[var(--color-text-muted)] shrink-0">{f.label}</span>
                                    <span className="text-[11px] text-[var(--color-text-primary)] font-medium text-right tabular-nums">
                                        {f.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                    {title}
                </span>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1">
            {children}
        </p>
    );
}

function FieldGrid({ fields }: {
    fields: {
        label: string;
        value?: string | null;
        mono?: boolean;
        link?: string;
    }[];
}) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3.5">
            {fields.map((f) => (
                <div key={f.label}>
                    <FieldLabel>{f.label}</FieldLabel>
                    <div className={cn(
                        "text-[12.5px] text-[var(--color-text-primary)] break-all leading-snug",
                        f.mono && "font-mono text-[11.5px]",
                    )}>
                        {f.link
                            ? (
                                <a
                                    href={f.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-500 hover:underline inline-flex items-center gap-1"
                                >
                                    {f.value}
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                            )
                            : (f.value || <span className="text-[var(--color-text-muted)]">—</span>)
                        }
                    </div>
                </div>
            ))}
        </div>
    );
}
