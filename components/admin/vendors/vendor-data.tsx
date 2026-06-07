"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/vendors/vendor-data.tsx
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Package, Star, Users, TrendingUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RowArrow } from "@/components/ui/admin";

export function VendorRow({ v, last }: { v: any; last: boolean }) {
    const logo        = v.business_logo ?? null;
    const ownerAvatar = v.owner_avatar  ?? null;
    const displayImage = logo ?? ownerAvatar ?? null;
    const initials    = (v.business_name ?? "?").slice(0, 2).toUpperCase();

    const joined = v.created_at ? new Date(v.created_at) : null;
    const joinedStr = joined
        ? joined.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

    function fmt(n: number) {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
        return String(n);
    }

    return (
        <tr className="group hover:bg-[var(--color-surface-secondary)]/40 transition-colors duration-100">

            {/* ── Store ── */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                    <VendorAvatar logo={displayImage} initials={initials} isFeatured={v.is_featured} />
                    <div className="min-w-0">
                        <Link
                            href={`/admin/vendors/${v.id}`}
                            className="text-[13px] font-semibold text-[var(--color-text-primary)] hover:text-orange-500 transition-colors truncate block max-w-[160px]"
                        >
                            {v.business_name ?? "—"}
                        </Link>
                        {(v.business_country || v.business_type) && (
                            <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[160px]">
                                {[v.business_country, v.business_type].filter(Boolean).join(" · ")}
                            </p>
                        )}
                    </div>
                </div>
            </td>

            {/* ── Owner ── */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <OwnerAvatar avatar={ownerAvatar} name={v.owner_name} />
                    <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">
                            {v.owner_name ?? "—"}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[120px]">
                            {v.owner_email ?? ""}
                        </p>
                    </div>
                </div>
            </td>

            {/* ── Products ── */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                    <Package className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {v.products_count ?? 0}
                    </span>
                </div>
            </td>

            {/* ── Revenue ── */}
            <td className="px-3 py-2.5">
                <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                    {fmt(Number(v.total_revenue ?? 0))}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)]">RWF</p>
            </td>

            {/* ── Sales ── */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {fmt(Number(v.total_sales ?? 0))}
                    </span>
                </div>
            </td>

            {/* ── Rating ── */}
            <td className="px-3 py-2.5">
                {v.rating && Number(v.rating) > 0 ? (
                    <div className="flex items-center gap-1.5">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                            {Number(v.rating).toFixed(1)}
                        </span>
                        {v.follower_count > 0 && (
                            <span className="text-[10.5px] text-[var(--color-text-muted)] flex items-center gap-0.5">
                                · <Users className="h-2.5 w-2.5 inline" /> {fmt(v.follower_count)}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-[12px] text-[var(--color-text-muted)]">—</span>
                )}
            </td>

            {/* ── Status ── */}
            <td className="px-3 py-2.5">
                <VerificationBadge status={v.verification_status} isActive={v.is_active} />
            </td>

            {/* ── Joined ── */}
            <td className="px-3 py-2.5">
                <span className="text-[11.5px] text-[var(--color-text-muted)] whitespace-nowrap tabular-nums">
                    {joinedStr}
                </span>
            </td>

            {/* ── Arrow ── */}
            <td className="px-3 py-2.5 text-right">
                <RowArrow href={`/admin/vendors/${v.id}`} />
            </td>
        </tr>
    );
}

// ── Avatar sub-components ─────────────────────────────────────────────────────

function VendorAvatar({ logo, initials, isFeatured }: {
    logo: string | null; initials: string; isFeatured: boolean;
}) {
    const [failed, setFailed] = useState(false);
    return (
        <div className="relative shrink-0">
            {logo && !failed ? (
                <img
                    src={logo}
                    alt=""
                    width={34}
                    height={34}
                    className="w-[34px] h-[34px] rounded-full object-cover border border-[var(--color-border)] block"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11px] font-bold bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200/60 shrink-0">
                    {initials}
                </div>
            )}
            {isFeatured && (
                <span className="absolute -bottom-1 -right-1 w-[14px] h-[14px] rounded-full bg-amber-400 ring-2 ring-[var(--color-surface)] flex items-center justify-center">
                    <Sparkles className="h-2 w-2 text-white" />
                </span>
            )}
        </div>
    );
}

function OwnerAvatar({ avatar, name }: { avatar: string | null; name: string | null }) {
    const [failed, setFailed] = useState(false);
    const initial = (name ?? "?").slice(0, 1).toUpperCase();
    if (avatar && !failed) {
        return (
            <img
                src={avatar}
                alt=""
                width={22}
                height={22}
                className="w-[22px] h-[22px] rounded-full object-cover border border-[var(--color-border)] shrink-0"
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <div className="w-[22px] h-[22px] rounded-full shrink-0 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[9px] font-bold text-[var(--color-text-muted)]">
            {initial}
        </div>
    );
}

// ── Verification badge ────────────────────────────────────────────────────────

const VERIFY_STYLES: Record<string, string> = {
    verified:  "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
    pending:   "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
    rejected:  "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
    suspended: "bg-slate-100 text-slate-600 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
};

function VerificationBadge({ status, isActive }: { status: string; isActive: boolean }) {
    const s = VERIFY_STYLES[status] ?? VERIFY_STYLES.pending;
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium ring-1 ring-inset whitespace-nowrap",
            s,
        )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
            {label}
            {!isActive && status === "verified" && (
                <span className="opacity-50 font-normal">· off</span>
            )}
        </span>
    );
}