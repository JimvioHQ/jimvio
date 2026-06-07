"use client";

// components/admin/creators-table.tsx

import React, { useState, useTransition } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Th } from "@/components/ui/admin";
import { toast } from "sonner";

type Creator = {
    id: string;
    user_id: string;
    display_name: string;
    niche?: string[] | null;
    bio?: string | null;
    profile_image?: string | null;
    total_followers?: bigint | number | null;
    engagement_rate?: any;
    is_verified?: boolean | null;
    is_active?: boolean | null;
    created_at?: string | Date | null;
    guidelines_accepted_at?: string | Date | null;
    social_platforms?: any;
    profiles?: {
        email: string;
        username?: string | null;
        full_name?: string | null;
        country?: string | null;
    };
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysSince(date: string | Date | null | undefined): number {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function formatFollowers(n: bigint | number | null | undefined): string {
    if (!n) return "—";
    const num = typeof n === "bigint" ? Number(n) : n;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
    return String(num);
}

const SOCIAL_LABELS: Record<string, string> = {
    tiktok: "TT", instagram: "IG", youtube: "YT", x: "X", twitter: "X",
};

// ─── Age badge ────────────────────────────────────────────────────────────────

function AgeBadge({ days }: { days: number }) {
    return (
        <span className={cn(
            "inline-flex px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums ring-1 ring-inset",
            days >= 14
                ? "bg-rose-50 text-rose-700 ring-rose-300/40 dark:bg-rose-950/30 dark:text-rose-400"
                : days >= 7
                    ? "bg-orange-50 text-orange-700 ring-orange-300/40 dark:bg-orange-950/30 dark:text-orange-400"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
        )}>
            {days}d
        </span>
    );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name }: { src?: string | null; name: string }) {
    const [failed, setFailed] = useState(false);
    const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (src && !failed) {
        return (
            <img src={src} alt={name} onError={() => setFailed(true)}
                className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--color-border)]" />
        );
    }
    return (
        <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border border-[var(--color-border)]">
            {initials}
        </div>
    );
}

// ─── Detail field ─────────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1">
                {label}
            </p>
            <p className="text-[12px] text-[var(--color-text-primary)] font-medium">
                {value || <span className="text-[var(--color-text-muted)]">—</span>}
            </p>
        </div>
    );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionButtons({ creatorId, onDone }: { creatorId: string; onDone: (id: string) => void }) {
    const [pending, startTransition] = useTransition();
    const [rejectOpen, setRejectOpen] = useState(false);
    const [reason, setReason] = useState("");

    function approve() {
        startTransition(async () => {
            try {
                // await approveCreator(creatorId);
                toast.success("Creator approved");
                onDone(creatorId);
            } catch (e: any) {
                toast.error(e.message ?? "Failed to approve");
            }
        });
    }

    function reject() {
        startTransition(async () => {
            try {
                // await rejectCreator(creatorId, reason);
                toast.success("Creator rejected");
                setRejectOpen(false);
                setReason("");
                onDone(creatorId);
            } catch (e: any) {
                toast.error(e.message ?? "Failed to reject");
            }
        });
    }

    return (
        <div className="flex items-center gap-1.5">
            {/* Reject — labeled text button, rose */}
            <button
                disabled={pending}
                onClick={() => setRejectOpen(!rejectOpen)}
                className={cn(
                    "h-7 px-2.5 inline-flex items-center gap-1 rounded text-[12px] font-medium transition-colors",
                    "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30",
                    "border border-rose-300/40 dark:border-rose-800/40",
                    pending && "opacity-40 cursor-not-allowed",
                )}
            >
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                Reject
            </button>

            {/* Approve — filled, emerald */}
            <button
                disabled={pending}
                onClick={approve}
                className={cn(
                    "h-7 px-2.5 inline-flex items-center gap-1 rounded text-[12px] font-semibold transition-colors",
                    "bg-emerald-600 hover:bg-emerald-700 text-white",
                    pending && "opacity-40 cursor-not-allowed",
                )}
            >
                {pending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                }
                Approve
            </button>

            {/* Reject inline input — rendered as a separate row via the parent */}
        </div>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function CreatorRow({ c, onDone }: { c: Creator; onDone: (id: string) => void }) {
    const [expanded,   setExpanded  ] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [reason,     setReason    ] = useState("");
    const [pending,    startTransition] = useTransition();

    const days      = daysSince(c.created_at);
    const platforms = c.social_platforms
        ? Object.keys(c.social_platforms).filter((k) => c.social_platforms![k])
        : [];

    function approve() {
        startTransition(async () => {
            try {
                // await approveCreator(c.id);
                toast.success(`${c.display_name} approved`);
                onDone(c.id);
            } catch (e: any) {
                toast.error(e.message ?? "Failed");
            }
        });
    }

    function reject() {
        startTransition(async () => {
            try {
                // await rejectCreator(c.id, reason);
                toast.success(`${c.display_name} rejected`);
                setRejectOpen(false);
                setReason("");
                onDone(c.id);
            } catch (e: any) {
                toast.error(e.message ?? "Failed");
            }
        });
    }

    return (
        <>
            <tr className={cn(
                "border-b border-[var(--color-border)]/70 transition-colors",
                expanded
                    ? "bg-[var(--color-surface-secondary)]/40"
                    : "hover:bg-[var(--color-surface-secondary)]/30",
            )}>

                {/* Creator */}
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                        <Avatar src={c.profile_image} name={c.display_name} />
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate max-w-[160px]">
                                {c.display_name}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[160px]">
                                {c.profiles?.email ?? c.profiles?.username ?? "—"}
                            </p>
                        </div>
                    </div>
                </td>

                {/* Followers */}
                <td className="px-3 py-2.5">
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {formatFollowers(c.total_followers)}
                    </span>
                </td>

                {/* Niche */}
                <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                        {(c.niche ?? []).slice(0, 2).map((n) => (
                            <span key={n} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 ring-1 ring-inset ring-orange-200/60 dark:ring-orange-800/40">
                                {n}
                            </span>
                        ))}
                        {(c.niche ?? []).length > 2 && (
                            <span className="text-[10.5px] text-[var(--color-text-muted)]">+{(c.niche ?? []).length - 2}</span>
                        )}
                        {(c.niche ?? []).length === 0 && (
                            <span className="text-[11.5px] text-[var(--color-text-muted)]">—</span>
                        )}
                    </div>
                </td>

                {/* Platforms */}
                <td className="px-3 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                        {platforms.slice(0, 4).map((p) => (
                            <span key={p} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                                {SOCIAL_LABELS[p.toLowerCase()] ?? p.slice(0, 2).toUpperCase()}
                            </span>
                        ))}
                        {platforms.length === 0 && <span className="text-[11.5px] text-[var(--color-text-muted)]">—</span>}
                    </div>
                </td>

                {/* Age */}
                <td className="px-3 py-2.5">
                    <AgeBadge days={days} />
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                        {/* Expand toggle */}
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                        >
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {/* Reject */}
                        <button
                            disabled={pending}
                            onClick={() => setRejectOpen(!rejectOpen)}
                            className={cn(
                                "h-7 px-2.5 inline-flex items-center gap-1 rounded text-[12px] font-medium transition-colors",
                                "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30",
                                "border border-rose-300/40 dark:border-rose-800/40",
                                pending && "opacity-40 cursor-not-allowed",
                            )}
                        >
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            Reject
                        </button>

                        {/* Approve */}
                        <button
                            disabled={pending}
                            onClick={approve}
                            className={cn(
                                "h-7 px-2.5 inline-flex items-center gap-1 rounded text-[12px] font-semibold transition-colors",
                                "bg-emerald-600 hover:bg-emerald-700 text-white",
                                pending && "opacity-40 cursor-not-allowed",
                            )}
                        >
                            {pending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            }
                            Approve
                        </button>
                    </div>
                </td>
            </tr>

            {/* Reject reason row */}
            {rejectOpen && (
                <tr className="border-b border-[var(--color-border)]/70 bg-rose-50/30 dark:bg-rose-950/10">
                    <td colSpan={6} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Rejection reason — sent to creator…"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && reason.trim() && reject()}
                                className="flex-1 h-8 px-2.5 text-[12px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                            />
                            <button
                                disabled={pending || !reason.trim()}
                                onClick={reject}
                                className={cn(
                                    "h-8 px-3 rounded text-[12px] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors inline-flex items-center gap-1.5",
                                    (pending || !reason.trim()) && "opacity-40 cursor-not-allowed",
                                )}
                            >
                                {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                                Confirm
                            </button>
                            <button
                                onClick={() => { setRejectOpen(false); setReason(""); }}
                                className="h-8 px-3 rounded text-[12px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </td>
                </tr>
            )}

            {/* Expanded detail */}
            {expanded && (
                <tr className="border-b border-[var(--color-border)]/70 bg-[var(--color-surface-secondary)]/40">
                    <td colSpan={6} className="px-4 py-4 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Detail label="Full name"           value={c.profiles?.full_name ?? "—"} />
                            <Detail label="Country"             value={c.profiles?.country ?? "—"} />
                            <Detail label="Guidelines accepted" value={c.guidelines_accepted_at ? new Date(c.guidelines_accepted_at).toLocaleDateString() : "Not yet"} />
                            <Detail label="Engagement rate"     value={c.engagement_rate ? `${Number(c.engagement_rate).toFixed(2)}%` : "—"} />
                            <Detail label="Applied"             value={c.created_at ? new Date(c.created_at).toLocaleString() : "—"} />
                            <Detail label="Status"              value={c.is_active ? "Active" : "Inactive"} />
                        </div>

                        {c.bio && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1.5">Bio</p>
                                <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed max-w-xl">{c.bio}</p>
                            </div>
                        )}

                        {platforms.length > 0 && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-2">Social platforms</p>
                                <div className="flex flex-wrap gap-2">
                                    {platforms.map((p) => {
                                        const url = c.social_platforms?.[p];
                                        return (
                                            <a
                                                key={p}
                                                href={typeof url === "string" ? url : "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold capitalize border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:text-orange-500 hover:border-orange-300 transition-colors"
                                            >
                                                {p} ↗
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function CreatorsTable({ creators }: { creators: Creator[] }) {
    const [list, setList] = useState(creators);
    const handleDone = (id: string) => setList((prev) => prev.filter((c) => c.id !== id));

    if (list.length === 0) return null;

    return (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60">
                            <Th>Creator</Th>
                            <Th>Followers</Th>
                            <Th>Niche</Th>
                            <Th>Platforms</Th>
                            <Th>Age</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((c) => (
                            <CreatorRow key={c.id} c={c} onDone={handleDone} />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                <p className="text-[11px] text-[var(--color-text-muted)]">
                    {list.length} creator{list.length !== 1 ? "s" : ""} pending review
                </p>
            </div>
        </div>
    );
}