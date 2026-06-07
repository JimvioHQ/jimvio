"use client";

// components/admin/vendors/AdminVendorDetailClient.tsx

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Star, Users, Package, TrendingUp,
    Globe, Mail, Phone, MapPin, ExternalLink,
    BadgeCheck, Sparkles, ShieldAlert, KeyRound,
    Store, Receipt, CircleDollarSign, Tag,
    ShoppingBag, Percent, Clock, Layers,
} from "lucide-react";
import {
    StatusPill,
    Th,
    EmptyState,
} from "@/components/ui/admin";
import { VendorActions } from "@/components/admin/vendors/vendor-action";

// ─── Type ─────────────────────────────────────────────────────────────────────

export interface AdminVendorDetail {
    id: string;
    user_id: string;
    business_name: string;
    business_slug: string;
    business_description: string | null;
    business_logo: string | null;
    business_banner: string | null;
    business_email: string | null;
    business_phone: string | null;
    business_address: string | null;
    business_country: string | null;
    business_type: string | null;
    product_categories: string | null;
    tax_id: string | null;
    website: string | null;
    verification_status: string;
    verification_notes: string | null;
    verified_at: string | null;
    rating: number;
    total_sales: number;
    total_revenue: number;
    commission_rate: number;
    affiliate_enabled: boolean;
    affiliate_commission_rate: number;
    payout_method: string | null;
    payout_account: string | null;
    is_featured: boolean;
    is_active: boolean;
    follower_count: number;
    response_time: string | null;
    created_at: string | null;
    updated_at: string | null;
    owner_name: string | null;
    owner_email: string | null;
    owner_avatar: string | null;
    owner_two_factor: boolean;
    owner_is_verified: boolean;
    products_count: number;
    active_products_count: number;
    draft_products_count: number;
    shopify_connected: boolean;
    shopify_domain: string | null;
    shopify_last_synced: string | null;
    recent_orders: Array<{
        id: string;
        order_number: string;
        status: string;
        payment_status: string;
        total_amount: number;
        currency: string;
        created_at: string | null;
    }>;
    recent_products: Array<{
        id: string;
        name: string;
        status: string;
        price: number;
        currency: string;
        sale_count: number;
        rating: number;
        product_type: string;
        created_at: string | null;
    }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, currency = "RWF") {
    return new Intl.NumberFormat("en-US", {
        style: "currency", currency, maximumFractionDigits: 0,
    }).format(n);
}

function fmtNum(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, action }: {
    title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{title}</span>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
    return (
        <div className="px-4 py-3.5">
            <p className="text-[10.5px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-[19px] font-semibold leading-none tabular-nums", accent ? "text-orange-500" : "text-[var(--color-text-primary)]")}>
                {value}
            </p>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
            <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
            <span className="text-[11.5px] text-[var(--color-text-muted)] w-28 shrink-0">{label}</span>
            <span className="text-[12.5px] text-[var(--color-text-primary)] font-medium leading-tight min-w-0 break-all">{value || "—"}</span>
        </div>
    );
}

const VVERIFY: Record<string, string> = {
    verified:  "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    pending:   "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
    rejected:  "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
    suspended: "bg-slate-100 text-slate-600 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
};

function ProductTypeBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        physical:     "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
        digital:      "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
        subscription: "bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400",
        course:       "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    };
    return (
        <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize", colors[type] ?? "bg-slate-100 text-slate-600")}>
            {type}
        </span>
    );
}

function ProductStatusDot({ status }: { status: string }) {
    const c: Record<string, string> = { active: "bg-emerald-500", draft: "bg-slate-400", paused: "bg-amber-500", archived: "bg-rose-400" };
    return <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", c[status] ?? "bg-slate-400")} />;
}

function VendorLogo({ logo, name }: { logo: string | null; name: string }) {
    const [failed, setFailed] = useState(false);
    if (logo && !failed) {
        return <img src={logo} alt={name} onError={() => setFailed(true)} className="w-14 h-14 rounded-full object-cover ring-2 ring-[var(--color-border)] shrink-0" />;
    }
    return (
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold shrink-0 select-none bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 ring-2 ring-orange-200/60">
            {name.slice(0, 2).toUpperCase()}
        </span>
    );
}

function OwnerAvatar({ avatar, name }: { avatar: string | null; name: string | null }) {
    const [failed, setFailed] = useState(false);
    if (avatar && !failed) {
        return <img src={avatar} alt={name ?? ""} onError={() => setFailed(true)} className="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--color-border)] shrink-0" />;
    }
    return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold shrink-0 bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
            {(name ?? "?").slice(0, 1).toUpperCase()}
        </span>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminVendorDetailClient({ vendor }: { vendor: AdminVendorDetail }) {
    return (
        <div className="space-y-5 pb-10">

            <Link href="/admin/vendors" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                All vendors
            </Link>

            {/* Header */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                {vendor.business_banner ? (
                    <div className="h-28 w-full overflow-hidden">
                        <img src={vendor.business_banner} alt="" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="h-16 w-full bg-gradient-to-r from-orange-50 via-orange-50/50 to-[var(--color-surface-secondary)] dark:from-orange-950/20 dark:via-orange-950/10" />
                )}

                <div className="px-5 pb-5">
                    <div className="flex items-end justify-between gap-4 -mt-7 mb-4">
                        <div className="flex items-end gap-3">
                            <div className="relative">
                                <VendorLogo logo={vendor.business_logo} name={vendor.business_name} />
                                {vendor.is_featured && (
                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 ring-2 ring-[var(--color-surface)] flex items-center justify-center">
                                        <Sparkles className="h-2.5 w-2.5 text-white" />
                                    </span>
                                )}
                            </div>
                            <div className="mb-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-[20px] font-semibold tracking-tight text-[var(--color-text-primary)] leading-tight">
                                        {vendor.business_name}
                                    </h1>
                                    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium ring-1 ring-inset capitalize", VVERIFY[vendor.verification_status] ?? VVERIFY.pending)}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                        {vendor.verification_status}
                                    </span>
                                    {!vendor.is_active && (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full ring-1 ring-rose-600/20">
                                            <ShieldAlert className="h-3 w-3" /> Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                                    /{vendor.business_slug}
                                    {vendor.business_country && <span className="ml-2 uppercase tracking-wider">{vendor.business_country}</span>}
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 self-start mt-8">
                            <VendorActions vendor={{ id: vendor.id, business_name: vendor.business_name, verification_status: vendor.verification_status, is_featured: vendor.is_featured, commission_rate: vendor.commission_rate }} />
                        </div>
                    </div>

                    {vendor.business_description && (
                        <p className="text-[12.5px] text-[var(--color-text-muted)] leading-relaxed max-w-2xl mb-4">
                            {vendor.business_description}
                        </p>
                    )}

                    <Link href={`/admin/users/${vendor.user_id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 hover:bg-[var(--color-surface-secondary)] transition-colors">
                        <OwnerAvatar avatar={vendor.owner_avatar} name={vendor.owner_name} />
                        <div>
                            <p className="text-[12px] font-medium text-[var(--color-text-primary)] leading-none">{vendor.owner_name ?? "—"}</p>
                            <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5 leading-none">{vendor.owner_email ?? ""}</p>
                        </div>
                        {vendor.owner_is_verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 ml-1" />}
                        {vendor.owner_two_factor  && <KeyRound   className="h-3 w-3 text-orange-500 ml-0.5" />}
                        <ExternalLink className="h-3 w-3 text-[var(--color-text-muted)] ml-1" />
                    </Link>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                    { label: "Total revenue", value: fmt(vendor.total_revenue),     icon: CircleDollarSign, color: "text-emerald-500" },
                    { label: "Total sales",   value: fmtNum(vendor.total_sales),    icon: TrendingUp,       color: "text-blue-500" },
                    { label: "Products",      value: String(vendor.products_count), icon: Package,          color: "text-violet-500" },
                    { label: "Followers",     value: fmtNum(vendor.follower_count), icon: Users,            color: "text-orange-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <Icon className={cn("h-4 w-4 shrink-0", color)} />
                        <div>
                            <p className="text-[19px] font-semibold text-[var(--color-text-primary)] leading-none tabular-nums">{value}</p>
                            <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Left */}
                <div className="lg:col-span-1 space-y-4">
                    <Section title="Business info" icon={Store}>
                        <div className="px-4 py-1">
                            <InfoRow icon={Mail}        label="Email"      value={vendor.business_email} />
                            <InfoRow icon={Phone}       label="Phone"      value={vendor.business_phone} />
                            <InfoRow icon={MapPin}      label="Address"    value={vendor.business_address} />
                            <InfoRow icon={Globe}       label="Website"    value={vendor.website ? (
                                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline inline-flex items-center gap-1">
                                    {vendor.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                                </a>
                            ) : null} />
                            <InfoRow icon={Tag}         label="Type"       value={vendor.business_type} />
                            <InfoRow icon={Layers}      label="Categories" value={vendor.product_categories} />
                            <InfoRow icon={ShoppingBag} label="Tax ID"     value={vendor.tax_id} />
                            <InfoRow icon={Clock}       label="Verified"   value={fmtDate(vendor.verified_at)} />
                        </div>
                        {vendor.verification_notes && (
                            <div className="mx-4 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
                                <p className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Verification notes</p>
                                <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">{vendor.verification_notes}</p>
                            </div>
                        )}
                    </Section>

                    <Section title="Commission & payouts" icon={Percent}>
                        <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
                            <Stat label="Platform cut"   value={`${vendor.commission_rate}%`} />
                            <Stat label="Affiliate rate" value={`${vendor.affiliate_commission_rate}%`} />
                        </div>
                        <div className="px-4 py-1">
                            <InfoRow icon={CircleDollarSign} label="Payout via" value={vendor.payout_method} />
                            <InfoRow icon={Tag}              label="Account"    value={vendor.payout_account} />
                            <InfoRow icon={Star}             label="Rating"     value={vendor.rating > 0 ? (
                                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{vendor.rating.toFixed(2)}</span>
                            ) : "No ratings yet"} />
                            <InfoRow icon={Clock}   label="Response"  value={vendor.response_time} />
                            <InfoRow icon={Package} label="Affiliate" value={vendor.affiliate_enabled ? "Enabled" : "Disabled"} />
                        </div>
                    </Section>

                    <Section title="Catalogue" icon={Package}>
                        <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]">
                            <Stat label="Total"  value={vendor.products_count} />
                            <Stat label="Active" value={vendor.active_products_count} accent />
                            <Stat label="Draft"  value={vendor.draft_products_count} />
                        </div>
                    </Section>

                    {vendor.shopify_domain && (
                        <Section title="Shopify" icon={Store}>
                            <div className="px-4 py-1">
                                <InfoRow icon={Globe} label="Store" value={
                                    <a href={`https://${vendor.shopify_domain}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline inline-flex items-center gap-1">
                                        {vendor.shopify_domain} <ExternalLink className="h-3 w-3" />
                                    </a>
                                } />
                                <InfoRow icon={Clock}      label="Last sync" value={fmtDate(vendor.shopify_last_synced)} />
                                <InfoRow icon={BadgeCheck} label="Status"    value={
                                    <span className={cn("text-[12px] font-medium", vendor.shopify_connected ? "text-emerald-600" : "text-slate-500")}>
                                        {vendor.shopify_connected ? "Connected" : "Disconnected"}
                                    </span>
                                } />
                            </div>
                        </Section>
                    )}
                </div>

                {/* Right */}
                <div className="lg:col-span-2 space-y-4">
                    <Section title="Recent orders" icon={Receipt} action={<Link href={`/admin/orders?vendor=${vendor.id}`} className="text-[11px] text-orange-500 hover:underline">View all →</Link>}>
                        {vendor.recent_orders.length === 0 ? (
                            <div className="py-10 text-center text-[12px] text-[var(--color-text-muted)]">No orders yet</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                                            <Th>Order</Th><Th>Status</Th><Th>Payment</Th><Th align="right">Amount</Th><Th>Date</Th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]/60">
                                        {vendor.recent_orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-[var(--color-surface-secondary)]/30 transition-colors">
                                                <td className="px-3 py-2.5"><Link href={`/admin/orders/${o.id}`} className="font-mono text-[11.5px] text-orange-500 hover:underline">{o.order_number}</Link></td>
                                                <td className="px-3 py-2.5"><StatusPill status={o.status} /></td>
                                                <td className="px-3 py-2.5"><StatusPill status={o.payment_status} /></td>
                                                <td className="px-3 py-2.5 text-right font-medium text-[13px] tabular-nums">{fmt(o.total_amount, o.currency)}</td>
                                                <td className="px-3 py-2.5 text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">{fmtDate(o.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>

                    <Section title="Recent products" icon={Package} action={<Link href={`/admin/products?vendor=${vendor.id}`} className="text-[11px] text-orange-500 hover:underline">View all →</Link>}>
                        {vendor.recent_products.length === 0 ? (
                            <div className="py-10 text-center text-[12px] text-[var(--color-text-muted)]">No products yet</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                                            <Th>Product</Th><Th>Type</Th><Th align="right">Price</Th><Th align="right">Sales</Th><Th>Date</Th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]/60">
                                        {vendor.recent_products.map((p) => (
                                            <tr key={p.id} className="hover:bg-[var(--color-surface-secondary)]/30 transition-colors">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <ProductStatusDot status={p.status} />
                                                        <Link href={`/admin/products/${p.id}`} className="text-[12.5px] font-medium text-[var(--color-text-primary)] hover:text-orange-500 transition-colors truncate max-w-[200px]">
                                                            {p.name}
                                                        </Link>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5"><ProductTypeBadge type={p.product_type} /></td>
                                                <td className="px-3 py-2.5 text-right text-[12.5px] font-medium tabular-nums">{fmt(p.price, p.currency)}</td>
                                                <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-[var(--color-text-muted)]">{fmtNum(p.sale_count)}</td>
                                                <td className="px-3 py-2.5 text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">{fmtDate(p.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>
                </div>
            </div>
        </div>
    );
}