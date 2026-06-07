"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    BadgeCheck,
    ShieldCheck,
    Store,
    TrendingUp,
    KeyRound,
    Globe,
    Phone,
    Mail,
    MapPin,
    Clock,
    Languages,
    ShieldAlert,
    ExternalLink,
    Wallet,
    Receipt,
    Bell,
    Star,
    Users,
    MousePointerClick,
    CircleDollarSign,
    BarChart3,
} from "lucide-react";
import {
    PageHeader,
    StatusPill,
    ProviderLogo,
    Th,
    EmptyState,
} from "@/components/ui/admin";
import { AdminUserDetail } from "@/services/admin/getAdminUsers";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, currency = "RWF") {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(n);
}

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

function fmtNum(n: number) {
    return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, email, avatarUrl, size = "lg" }: {
    name: string | null; email: string;
    avatarUrl: string | null; size?: "sm" | "lg";
}) {
    const [failed, setFailed] = useState(false);
    const initials = name
        ? name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
        : email.slice(0, 2).toUpperCase();
    const hue = [...email].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    const dim = size === "lg" ? "w-14 h-14 text-xl" : "w-8 h-8 text-sm";

    if (avatarUrl && !failed) {
        return (
            <img
                src={avatarUrl}
                alt={name ?? email}
                onError={() => setFailed(true)}
                className={cn("rounded-full object-cover ring-2 ring-[var(--color-border)] shrink-0", dim)}
            />
        );
    }
    return (
        <span
            className={cn("inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none", dim)}
            style={{ background: `hsl(${hue} 55% 92%)`, color: `hsl(${hue} 45% 38%)` }}
        >
            {initials}
        </span>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, className }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden", className)}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
    return (
        <div className="px-4 py-3.5 border-r border-[var(--color-border)] last:border-r-0">
            <p className="text-[10.5px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-[18px] font-semibold text-[var(--color-text-primary)] leading-none tabular-nums">{value}</p>
            {sub && <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1">{sub}</p>}
        </div>
    );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: {
    icon: React.ElementType; label: string; value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
            <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
            <span className="text-[11.5px] text-[var(--color-text-muted)] w-28 shrink-0">{label}</span>
            <span className="text-[12.5px] text-[var(--color-text-primary)] font-medium leading-tight min-w-0 break-all">{value || "—"}</span>
        </div>
    );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_CFG: Record<string, { color: string; icon: React.ElementType }> = {
    admin: { color: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400", icon: ShieldCheck },
    vendor: { color: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-950/30 dark:text-indigo-400", icon: Store },
    affiliate: { color: "bg-violet-50 text-violet-700 ring-1 ring-violet-600/20 dark:bg-violet-950/30 dark:text-violet-400", icon: TrendingUp },
    influencer: { color: "bg-pink-50 text-pink-700 ring-1 ring-pink-600/20 dark:bg-pink-950/30 dark:text-pink-400", icon: TrendingUp },
    community_owner: { color: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400", icon: Users },
    buyer: { color: "bg-slate-100 text-slate-600 ring-1 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300", icon: Users },
};

function RoleBadge({ role, isActive }: { role: string; isActive: boolean }) {
    const cfg = ROLE_CFG[role] ?? ROLE_CFG.buyer;
    const Icon = cfg.icon;
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium capitalize",
            cfg.color,
            !isActive && "opacity-40 line-through",
        )}>
            <Icon className="h-3 w-3 shrink-0" />
            {role.replace(/_/g, " ")}
        </span>
    );
}

// ─── Vendor verification badge ────────────────────────────────────────────────

const VVERIFY: Record<string, string> = {
    verified: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    pending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
    rejected: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
    suspended: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminUserDetailClient({ user }: { user: AdminUserDetail }) {
    const displayName = user.full_name || user.email;

    return (
        <div className="space-y-5 pb-10">

            {/* Back + header */}
            <div>
                <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-3 transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All users
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-[var(--color-border)]/60">
                    <UserAvatar
                        name={user.full_name}
                        email={user.email}
                        avatarUrl={user.avatar_url}
                        size="lg"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <h1 className="text-[22px] font-medium tracking-tight text-[var(--color-text-primary)] leading-tight">
                                {displayName}
                            </h1>
                            {user.is_verified && (
                                <BadgeCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                            )}
                            {!user.is_active && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full ring-1 ring-rose-600/20">
                                    <ShieldAlert className="h-3 w-3" /> Inactive
                                </span>
                            )}
                            {user.two_factor_enabled && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-orange-700 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full ring-1 ring-orange-600/20 dark:text-orange-400">
                                    <KeyRound className="h-3 w-3" /> 2FA
                                </span>
                            )}
                            {user.unread_notifications > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full ring-1 ring-blue-600/20 dark:text-blue-400">
                                    <Bell className="h-3 w-3" /> {user.unread_notifications} unread
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] text-[var(--color-text-muted)]">{user.email}</p>
                        {user.username && (
                            <p className="text-[12px] text-[var(--color-text-muted)]">@{user.username}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {user.roles.map((r) => (
                                <RoleBadge key={r.role} role={r.role} isActive={r.is_active} />
                            ))}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10.5px] text-[var(--color-text-muted)] uppercase tracking-wider">Joined</p>
                        <p className="text-[13px] font-medium text-[var(--color-text-primary)] mt-0.5">{fmtDate(user.created_at)}</p>
                        <p className="text-[10.5px] text-[var(--color-text-muted)] mt-0.5">Updated {fmtDate(user.updated_at)}</p>
                    </div>
                </div>
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── LEFT COLUMN ── */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Profile */}
                    <Section title="Profile" icon={Users}>
                        <div className="px-4 py-1">
                            <InfoRow icon={Mail} label="Email" value={user.email} />
                            <InfoRow icon={Phone} label="Phone" value={user.phone} />
                            <InfoRow icon={MapPin} label="Location" value={[user.city, user.country].filter(Boolean).join(", ")} />
                            <InfoRow icon={Globe} label="Website" value={
                                user.website ? (
                                    <a href={user.website} target="_blank" rel="noopener noreferrer"
                                        className="text-orange-500 hover:underline inline-flex items-center gap-1">
                                        {user.website.replace(/^https?:\/\//, "")}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                ) : null
                            } />
                            <InfoRow icon={Clock} label="Timezone" value={user.timezone} />
                            <InfoRow icon={Languages} label="Language" value={user.language?.toUpperCase()} />
                            {user.bio && (
                                <div className="py-2.5 text-[12px] text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)]/50">
                                    {user.bio}
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Wallet */}
                    {user.wallet && (
                        <Section title="Wallet" icon={Wallet}>
                            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)]">
                                <Stat label="Available" value={fmt(user.wallet.available_balance, user.wallet.currency)} />
                                <Stat label="Pending" value={fmt(user.wallet.pending_balance, user.wallet.currency)} />
                                <Stat label="Total earned" value={fmt(user.wallet.total_earned, user.wallet.currency)} />
                                <Stat label="Total paid" value={fmt(user.wallet.total_paid, user.wallet.currency)} />
                            </div>
                        </Section>
                    )}

                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Vendor */}
                    {user.vendor && (
                        <Section title="Vendor account" icon={Store}>
                            <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                                            {user.vendor.business_name}
                                        </p>
                                        <p className="text-[11.5px] text-[var(--color-text-muted)]">/{user.vendor.business_slug}</p>
                                    </div>
                                    <span className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium ring-1 ring-inset capitalize",
                                        VVERIFY[user.vendor.verification_status] ?? VVERIFY.pending,
                                    )}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                        {user.vendor.verification_status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-border)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                                    <Stat label="Sales" value={fmtNum(user.vendor.total_sales)} />
                                    <Stat label="Revenue" value={fmt(user.vendor.total_revenue)} />
                                    <Stat label="Rating" value={
                                        <span className="flex items-center gap-1">
                                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                            {user.vendor.rating.toFixed(1)}
                                        </span>
                                    } />
                                    <Stat label="Followers" value={fmtNum(user.vendor.follower_count)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[12px]">
                                    <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                        <span className="font-medium text-[var(--color-text-primary)]">Commission:</span>
                                        {user.vendor.commission_rate}%
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                        <span className="font-medium text-[var(--color-text-primary)]">Affiliate rate:</span>
                                        {user.vendor.affiliate_commission_rate}%
                                    </div>
                                    {user.vendor.payout_method && (
                                        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                            <span className="font-medium text-[var(--color-text-primary)]">Payout:</span>
                                            {user.vendor.payout_method}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                        <span className="font-medium text-[var(--color-text-primary)]">Featured:</span>
                                        {user.vendor.is_featured ? "Yes" : "No"}
                                    </div>
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Affiliate */}
                    {user.affiliate && (
                        <Section title="Affiliate account" icon={TrendingUp}>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <code className="text-[12px] font-mono bg-[var(--color-surface-secondary)] px-2 py-1 rounded text-[var(--color-text-primary)] select-all">
                                            {user.affiliate.affiliate_code}
                                        </code>
                                        <span className={cn(
                                            "text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
                                            user.affiliate.tier === "gold" && "bg-amber-100 text-amber-700",
                                            user.affiliate.tier === "silver" && "bg-slate-100 text-slate-600",
                                            user.affiliate.tier === "bronze" && "bg-orange-50 text-orange-700",
                                            !["gold", "silver", "bronze"].includes(user.affiliate.tier) && "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                                        )}>
                                            {user.affiliate.tier}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-[10.5px] font-medium",
                                        user.affiliate.is_active ? "text-emerald-600" : "text-rose-500",
                                    )}>
                                        {user.affiliate.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-border)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                                    <Stat label="Clicks" value={fmtNum(user.affiliate.total_clicks)} />
                                    <Stat label="Conversions" value={fmtNum(user.affiliate.total_conversions)} />
                                    <Stat label="Conv. rate" value={`${user.affiliate.conversion_rate.toFixed(1)}%`} />
                                    <Stat label="Earned" value={fmt(user.affiliate.total_earnings)} />
                                </div>
                                <div className="flex gap-4 text-[12px]">
                                    <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                        <CircleDollarSign className="h-3.5 w-3.5" />
                                        <span className="font-medium text-[var(--color-text-primary)]">Available:</span>
                                        {fmt(user.affiliate.available_balance)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                                        <span className="font-medium text-[var(--color-text-primary)]">Pending:</span>
                                        {fmt(user.affiliate.pending_earnings)}
                                    </div>
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Influencer */}
                    {user.influencer && (
                        <Section title="Influencer account" icon={BarChart3}>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                                        {user.influencer.display_name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {user.influencer.is_verified && (
                                            <BadgeCheck className="h-4 w-4 text-emerald-500" />
                                        )}
                                        {user.influencer.is_featured && (
                                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-border)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                                    <Stat label="Followers" value={fmtNum(user.influencer.total_followers)} />
                                    <Stat label="Engagement" value={`${user.influencer.engagement_rate.toFixed(1)}%`} />
                                    <Stat label="Campaigns" value={user.influencer.total_campaigns} />
                                    <Stat label="Earned" value={fmt(user.influencer.total_earnings)} />
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Recent orders */}
                    <Section title="Recent orders" icon={Receipt}>
                        {user.recent_orders.length === 0 ? (
                            <div className="py-8 text-center text-[12px] text-[var(--color-text-muted)]">No orders yet</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                                            <Th>Order</Th>
                                            <Th>Status</Th>
                                            <Th>Payment</Th>
                                            <Th align="right">Amount</Th>
                                            <Th>Date</Th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]/60">
                                        {user.recent_orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-[var(--color-surface-secondary)]/30 transition-colors">
                                                <td className="px-3 py-2.5">
                                                    <Link
                                                        href={`/admin/orders/${o.id}`}
                                                        className="font-mono text-[11.5px] text-orange-500 hover:underline"
                                                    >
                                                        {o.order_number}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <StatusPill status={o.status} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <StatusPill status={o.payment_status} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-medium text-[13px] tabular-nums">
                                                    {fmt(o.total_amount, o.currency)}
                                                </td>
                                                <td className="px-3 py-2.5 text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">
                                                    {fmtDate(o.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="px-4 py-2 border-t border-[var(--color-border)]/50">
                            <Link
                                href={`/admin/orders?buyer=${user.id}`}
                                className="text-[11.5px] text-orange-500 hover:underline"
                            >
                                View all orders →
                            </Link>
                        </div>
                    </Section>

                    {/* Recent transactions */}
                    <Section title="Recent transactions" icon={CircleDollarSign}>
                        {user.recent_transactions.length === 0 ? (
                            <div className="py-8 text-center text-[12px] text-[var(--color-text-muted)]">No transactions yet</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                                            <Th>Type</Th>
                                            <Th>Provider</Th>
                                            <Th>Status</Th>
                                            <Th align="right">Amount</Th>
                                            <Th>Date</Th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]/60">
                                        {user.recent_transactions.map((t) => (
                                            <tr key={t.id} className="hover:bg-[var(--color-surface-secondary)]/30 transition-colors">
                                                <td className="px-3 py-2.5">
                                                    <span className={cn(
                                                        "text-[11.5px] font-medium capitalize",
                                                        t.direction === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                                                    )}>
                                                        {t.direction === "credit" ? "+" : "−"} {t.type.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    {t.provider ? (
                                                        <ProviderLogo provider={t.provider} size="sm" showLabel />
                                                    ) : (
                                                        <span className="text-[11.5px] text-[var(--color-text-muted)]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <StatusPill status={t.status} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-medium text-[13px] tabular-nums">
                                                    <span className={t.direction === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                                        {t.direction === "credit" ? "+" : "−"}{fmt(t.amount, t.currency)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">
                                                    {fmtDate(t.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="px-4 py-2 border-t border-[var(--color-border)]/50">
                            <Link
                                href={`/admin/transactions?user=${user.id}`}
                                className="text-[11.5px] text-orange-500 hover:underline"
                            >
                                View all transactions →
                            </Link>
                        </div>
                    </Section>

                </div>
            </div>
        </div>
    );
}