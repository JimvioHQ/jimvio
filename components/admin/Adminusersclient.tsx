"use client";

import React, { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users, ShieldCheck, Store, UserCircle2,
    TrendingUp, BadgeCheck, ShieldAlert, CheckCircle2,
    XCircle, KeyRound,
} from "lucide-react";
import {
    PageHeader,
    Th,
    EmptyState,
    OrderFilterToolbar,
    RowArrow,
    StatusPill,
    type FilterSelectGroup,
} from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-tile";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/components/ui/select-2";
import { AdminUserRow } from "@/services/admin/getAdminUsers";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, email, avatarUrl }: { name: string | null; email: string; avatarUrl: string | null }) {
    const [imgFailed, setImgFailed] = useState(false);
    const initials = name
        ? name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
        : email.slice(0, 2).toUpperCase();
    const hue = [...email].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

    if (avatarUrl && !imgFailed) {
        return (
            <img
                src={avatarUrl}
                alt={name ?? email}
                onError={() => setImgFailed(true)}
                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-black/8"
            />
        );
    }

    return (
        <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold shrink-0 select-none"
            style={{ background: `hsl(${hue} 55% 92%)`, color: `hsl(${hue} 45% 38%)` }}
        >
            {initials}
        </span>
    );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, {
    label: string;
    icon: React.ElementType;
    color: string;
}> = {
    admin: {
        label: "Admin",
        icon: ShieldCheck,
        color: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
    },
    vendor: {
        label: "Vendor",
        icon: Store,
        color: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-950/30 dark:text-indigo-400",
    },
    affiliate: {
        label: "Affiliate",
        icon: TrendingUp,
        color: "bg-violet-50 text-violet-700 ring-1 ring-violet-600/20 dark:bg-violet-950/30 dark:text-violet-400",
    },
    influencer: {
        label: "Influencer",
        icon: TrendingUp,
        color: "bg-pink-50 text-pink-700 ring-1 ring-pink-600/20 dark:bg-pink-950/30 dark:text-pink-400",
    },
    community_owner: {
        label: "Community",
        icon: UserCircle2,
        color: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
    },
    buyer: {
        label: "Buyer",
        icon: UserCircle2,
        color: "bg-slate-100 text-slate-600 ring-1 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
    },
};

function RoleBadge({ role }: { role: string }) {
    const cfg = ROLE_CONFIG[role.toLowerCase()] ?? ROLE_CONFIG.buyer;
    const Icon = cfg.icon;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium",
            cfg.color,
        )}>
            <Icon className="h-3 w-3 shrink-0" />
            {cfg.label}
        </span>
    );
}

// ─── Vendor status ────────────────────────────────────────────────────────────

function VendorStatus({ status }: { status: string }) {
    return <StatusPill status={status} size="sm" />;
}

// ─── Boolean pill ─────────────────────────────────────────────────────────────

function BoolPill({ value, trueLabel, falseLabel }: {
    value: boolean;
    trueLabel?: string;
    falseLabel?: string;
}) {
    return value ? (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {trueLabel ?? "Yes"}
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--color-text-muted)]">
            <XCircle className="h-3 w-3 opacity-40" />
            {falseLabel ?? "No"}
        </span>
    );
}

// ─── Filter options ───────────────────────────────────────────────────────────

const ROLE_OPTIONS: SelectOption<string>[] = [
    { value: "", label: "All roles" },
    { value: "admin", label: "Admin" },
    { value: "vendor", label: "Vendor" },
    { value: "affiliate", label: "Affiliate" },
    { value: "influencer", label: "Influencer" },
    { value: "community_owner", label: "Community owner" },
    { value: "buyer", label: "Buyer only" },
];

const STATUS_OPTIONS: SelectOption<string>[] = [
    { value: "", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "verified", label: "Verified" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminUsersClientProps {
    users: AdminUserRow[];
    total: number;
    initialQ?: string;
    initialRole?: string;
    initialStatus?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminUsersClient({
    users,
    total,
    initialQ = "",
    initialRole = "",
    initialStatus = "",
}: AdminUsersClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState(initialQ);
    const [role, setRole] = useState(initialRole);
    const [status, setStatus] = useState(initialStatus);
    const [, startTransition] = useTransition();

    const push = useCallback((q: string, r: string, s: string) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (r) params.set("role", r);
        if (s) params.set("status", s);
        startTransition(() => router.push(`/admin/users?${params.toString()}`));
    }, [router]);

    const filterGroups: FilterSelectGroup[] = [
        {
            key: "role",
            label: "Role",
            options: ROLE_OPTIONS,
            value: role,
            onChange: (v) => { setRole(v); push(search, v, status); },
            placeholder: "All roles",
            minWidth: "160px",
        },
        {
            key: "status",
            label: "Status",
            options: STATUS_OPTIONS,
            value: status,
            onChange: (v) => { setStatus(v); push(search, role, v); },
            placeholder: "All statuses",
            minWidth: "150px",
        },
    ];

    const handleReset = () => {
        setSearch(""); setRole(""); setStatus("");
        push("", "", "");
    };

    // summary counts from current result set
    const counts = {
        vendors: users.filter((u) => u.roles.includes("vendor")).length,
        affiliates: users.filter((u) => u.roles.includes("affiliate")).length,
        influencers: users.filter((u) => u.roles.includes("influencer")).length,
        verified: users.filter((u) => u.is_verified).length,
        twoFa: users.filter((u) => u.two_factor_enabled).length,
    };

    return (
        <div className="space-y-5">
            <PageHeader
                eyebrow="Platform"
                title="Users"
                subtitle={`${total.toLocaleString()} registered user${total !== 1 ? "s" : ""}`}
            />

            {/* ── Summary KPIs (same Tile style as admin/orders) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Tile label="Vendors" value={counts.vendors.toLocaleString()} sublabel="In results" icon={Store} />
                <Tile label="Affiliates" value={counts.affiliates.toLocaleString()} sublabel="In results" icon={TrendingUp} />
                <Tile label="Influencers" value={counts.influencers.toLocaleString()} sublabel="In results" icon={UserCircle2} tone="default" />
                <Tile label="Verified" value={counts.verified.toLocaleString()} sublabel="Email verified" icon={BadgeCheck} tone="success" />
                <Tile label="2FA enabled" value={counts.twoFa.toLocaleString()} sublabel="Security on" icon={KeyRound} tone={counts.twoFa > 0 ? "success" : "default"} />
            </div>

            <OrderFilterToolbar
                search={search}
                onSearchChange={setSearch}
                onSearchSubmit={() => push(search, role, status)}
                filterGroups={filterGroups}
                defaultValues={{ role: "", status: "" }}
                onReset={handleReset}
                searchPlaceholder="Email or name…"
            />

            {users.length === 0 ? (
                <EmptyState
                    icon={<Users className="h-5 w-5 text-[var(--color-text-muted)]" />}
                    title="No users found"
                    message="Try adjusting your search or filter criteria."
                />
            ) : (
                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60">
                                    <Th>User</Th>
                                    <Th>Roles</Th>
                                    <Th>Vendor</Th>
                                    <Th>Affiliate code</Th>
                                    <Th>Verified</Th>
                                    <Th>2FA</Th>
                                    <Th>Country</Th>
                                    <Th>Joined</Th>
                                    <Th align="right"> </Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]/60">
                                {users.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="group hover:bg-[var(--color-surface-secondary)]/40 transition-colors duration-100"
                                    >
                                        {/* User */}
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar
                                                    name={u.full_name}
                                                    email={u.email}
                                                    avatarUrl={u.avatar_url}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-medium text-[var(--color-text-primary)] leading-tight truncate max-w-[170px]">
                                                        {u.full_name || (
                                                            <span className="text-[var(--color-text-muted)] italic font-normal">No name</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[190px]">
                                                        {u.email}
                                                    </p>
                                                    {!u.is_active && (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                                                            <ShieldAlert className="h-2.5 w-2.5" />
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Roles */}
                                        <td className="px-3 py-2.5">
                                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                {u.roles.map((r) => (
                                                    <RoleBadge key={r} role={r} />
                                                ))}
                                            </div>
                                        </td>

                                        {/* Vendor */}
                                        <td className="px-3 py-2.5">
                                            {u.vendor_name ? (
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate max-w-[130px]">
                                                        {u.vendor_name}
                                                    </p>
                                                    {u.vendor_status && (
                                                        <VendorStatus status={u.vendor_status} />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[11.5px] text-[var(--color-text-muted)]">—</span>
                                            )}
                                        </td>

                                        {/* Affiliate code */}
                                        <td className="px-3 py-2.5">
                                            {u.affiliate_code ? (
                                                <span
                                                    className="font-mono text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-1.5 py-0.5 rounded select-all cursor-default"
                                                    title={u.affiliate_code}
                                                >
                                                    {u.affiliate_code}
                                                </span>
                                            ) : (
                                                <span className="text-[11.5px] text-[var(--color-text-muted)]">—</span>
                                            )}
                                        </td>

                                        {/* Verified */}
                                        <td className="px-3 py-2.5">
                                            <BoolPill value={u.is_verified} trueLabel="Yes" falseLabel="No" />
                                        </td>

                                        {/* 2FA */}
                                        <td className="px-3 py-2.5">
                                            <BoolPill value={u.two_factor_enabled} trueLabel="On" falseLabel="Off" />
                                        </td>

                                        {/* Country */}
                                        <td className="px-3 py-2.5">
                                            <span className="text-[12px] text-[var(--color-text-muted)] uppercase tracking-wider">
                                                {u.country ?? "—"}
                                            </span>
                                        </td>

                                        {/* Joined */}
                                        <td className="px-3 py-2.5">
                                            <span className="text-[12px] text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
                                                {u.created_at
                                                    ? new Date(u.created_at).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })
                                                    : "—"}
                                            </span>
                                        </td>

                                        {/* Arrow */}
                                        <td className="px-3 py-2.5 text-right">
                                            <RowArrow href={`/admin/users/${u.id}`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Footer count ── */}
                    <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                            Showing {users.length} of {total} user{total !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}