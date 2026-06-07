"use client";

// components/admin/ugc-submissions-table.tsx

import React, { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Th } from "@/components/ui/admin";

type UGCSubmission = {
    id: string;
    campaign_id: string;
    influencer_id: string;
    post_url: string;
    platform: "tiktok" | "instagram" | "youtube" | "x";
    caption?: string | null;
    status: "pending" | "approved" | "rejected" | "removed";
    rejection_reason?: string | null;
    total_views_earned?: bigint | number | null;
    total_earnings?: any;
    is_suspicious?: boolean | null;
    fraud_score?: any;
    created_at?: string | Date | null;
    ugc_campaigns?: {
        title: string;
        campaign_type: string;
        rate_per_1k_views?: any;
        payment_model?: string | null;
    };
    influencers?: {
        display_name: string;
        profile_image?: string | null;
        profiles?: { email: string } | null;
    };
    ugc_submission_media?: Array<{ url: string; type: string; thumbnail_url?: string | null }>;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatViews(n: bigint | number | null | undefined): string {
    if (!n) return "—";
    const num = typeof n === "bigint" ? Number(n) : n;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
    return String(num);
}

function daysSince(date: string | Date | null | undefined): number {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function truncate(str: string | null | undefined, len = 40): string {
    if (!str) return "—";
    return str.length > len ? str.slice(0, len) + "…" : str;
}

// ─── Platform badge ───────────────────────────────────────────────────────────

const PLATFORM_STYLES: Record<string, string> = {
    tiktok:    "bg-slate-100 text-slate-700 ring-slate-300/60 dark:bg-slate-800 dark:text-slate-300",
    instagram: "bg-pink-50 text-pink-700 ring-pink-300/40 dark:bg-pink-950/30 dark:text-pink-400",
    youtube:   "bg-rose-50 text-rose-700 ring-rose-300/40 dark:bg-rose-950/30 dark:text-rose-400",
    x:         "bg-sky-50 text-sky-700 ring-sky-300/40 dark:bg-sky-950/30 dark:text-sky-400",
};
const PLATFORM_LABELS: Record<string, string> = {
    tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", x: "X",
};

function PlatformBadge({ platform }: { platform: string }) {
    return (
        <span className={cn(
            "inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold capitalize ring-1 ring-inset",
            PLATFORM_STYLES[platform] ?? "bg-slate-100 text-slate-600 ring-slate-300/60",
        )}>
            {PLATFORM_LABELS[platform] ?? platform}
        </span>
    );
}

// ─── Fraud badge ──────────────────────────────────────────────────────────────

function FraudBadge({ score }: { score: number }) {
    if (score < 0.3) return null;
    const high = score >= 0.7;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ring-1 ring-inset",
            high
                ? "bg-rose-50 text-rose-700 ring-rose-300/40 dark:bg-rose-950/30 dark:text-rose-400"
                : "bg-amber-50 text-amber-700 ring-amber-300/40 dark:bg-amber-950/30 dark:text-amber-400",
        )}>
            ⚠ {(score * 100).toFixed(0)}% fraud risk
        </span>
    );
}

// ─── Age badge ────────────────────────────────────────────────────────────────

function AgeBadge({ days }: { days: number }) {
    return (
        <span className={cn(
            "inline-flex px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums ring-1 ring-inset",
            days >= 7
                ? "bg-rose-50 text-rose-700 ring-rose-300/40 dark:bg-rose-950/30 dark:text-rose-400"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] ring-[var(--color-border)]",
        )}>
            {days}d
        </span>
    );
}

// ─── Influencer avatar ────────────────────────────────────────────────────────

function InfluencerAvatar({ src, name }: { src?: string | null; name: string }) {
    const [failed, setFailed] = useState(false);
    if (src && !failed) {
        return (
            <img
                src={src} alt={name}
                onError={() => setFailed(true)}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-[var(--color-border)]"
            />
        );
    }
    return (
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border border-[var(--color-border)]">
            {(name ?? "?")[0].toUpperCase()}
        </div>
    );
}

// ─── Detail field ─────────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1">
                {label}
            </p>
            <div className="text-[12px] text-[var(--color-text-primary)] font-medium">
                {value ?? <span className="text-[var(--color-text-muted)]">—</span>}
            </div>
        </div>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function SubmissionRow({ s }: { s: UGCSubmission }) {
    const [expanded,     setExpanded    ] = useState(false);
    const [rejectOpen,   setRejectOpen  ] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const days       = daysSince(s.created_at);
    const fraudScore = s.fraud_score ? Number(s.fraud_score) : 0;

    return (
        <>
            <tr className={cn(
                "border-b border-[var(--color-border)]/70 transition-colors",
                expanded ? "bg-[var(--color-surface-secondary)]/40" : "hover:bg-[var(--color-surface-secondary)]/30",
            )}>
                {/* Creator + post */}
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                        <InfluencerAvatar src={s.influencers?.profile_image} name={s.influencers?.display_name ?? "?"} />
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate max-w-[150px]">
                                {s.influencers?.display_name ?? "Unknown"}
                            </p>
                            <a
                                href={s.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-orange-500 hover:underline block truncate max-w-[150px]"
                            >
                                {truncate(s.post_url, 38)}
                            </a>
                            {s.is_suspicious && <FraudBadge score={fraudScore} />}
                        </div>
                    </div>
                </td>

                {/* Campaign */}
                <td className="px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate max-w-[130px]">
                        {s.ugc_campaigns?.title ?? "—"}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] capitalize mt-0.5">
                        {s.ugc_campaigns?.campaign_type?.replace(/_/g, " ") ?? ""}
                    </p>
                </td>

                {/* Platform */}
                <td className="px-3 py-2.5">
                    <PlatformBadge platform={s.platform} />
                </td>

                {/* Views */}
                <td className="px-3 py-2.5">
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {formatViews(s.total_views_earned)}
                    </span>
                </td>

                {/* Earned */}
                <td className="px-3 py-2.5">
                    <span className={cn(
                        "text-[12px] font-semibold tabular-nums",
                        s.total_earnings && Number(s.total_earnings) > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-[var(--color-text-muted)]",
                    )}>
                        {s.total_earnings && Number(s.total_earnings) > 0
                            ? `${Number(s.total_earnings).toLocaleString()} RWF`
                            : "—"}
                    </span>
                </td>

                {/* Age */}
                <td className="px-3 py-2.5">
                    <AgeBadge days={days} />
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                        >
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            onClick={() => {/* approveUGCSubmission(s.id) */}}
                            title="Approve"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setRejectOpen(!rejectOpen)}
                            title="Reject"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 transition-colors"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </td>
            </tr>

            {/* Reject reason row */}
            {rejectOpen && (
                <tr className="border-b border-[var(--color-border)]/70 bg-[var(--color-surface-secondary)]/20">
                    <td colSpan={7} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Rejection reason (optional)…"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="flex-1 h-8 px-2.5 text-[12px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                            <button
                                onClick={() => { setRejectOpen(false); setRejectReason(""); }}
                                className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => { setRejectOpen(false); setRejectReason(""); }}
                                className="h-8 px-3 rounded-lg text-[12px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </td>
                </tr>
            )}

            {/* Expanded detail row */}
            {expanded && (
                <tr className="border-b border-[var(--color-border)]/70 bg-[var(--color-surface-secondary)]/40">
                    <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            <Detail label="Post URL" value={
                                <a href={s.post_url} target="_blank" rel="noopener noreferrer"
                                    className="text-orange-500 hover:underline inline-flex items-center gap-1">
                                    Open post <ExternalLink className="h-3 w-3" />
                                </a>
                            } />
                            <Detail label="Submitted" value={s.created_at ? new Date(s.created_at).toLocaleString() : "—"} />
                            <Detail label="Rate / 1K views" value={
                                s.ugc_campaigns?.rate_per_1k_views
                                    ? `${Number(s.ugc_campaigns.rate_per_1k_views)} RWF`
                                    : "—"
                            } />
                            <Detail label="Fraud score" value={fraudScore > 0 ? `${(fraudScore * 100).toFixed(1)}%` : "Clean"} />
                        </div>

                        {s.caption && (
                            <div className="mb-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1.5">
                                    Caption
                                </p>
                                <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                                    {s.caption}
                                </p>
                            </div>
                        )}

                        {s.ugc_submission_media && s.ugc_submission_media.length > 0 && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-2">
                                    Media
                                </p>
                                <div className="flex gap-2">
                                    {s.ugc_submission_media.slice(0, 4).map((m, mi) => (
                                        <a key={mi} href={m.url} target="_blank" rel="noopener noreferrer">
                                            {m.thumbnail_url ? (
                                                <img
                                                    src={m.thumbnail_url} alt=""
                                                    className="w-16 h-16 rounded-lg object-cover border border-[var(--color-border)]"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                                                    {m.type}
                                                </div>
                                            )}
                                        </a>
                                    ))}
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

export function UGCSubmissionsTable({ submissions }: { submissions: UGCSubmission[] }) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60">
                            <Th>Creator / Post</Th>
                            <Th>Campaign</Th>
                            <Th>Platform</Th>
                            <Th>Views</Th>
                            <Th>Earned</Th>
                            <Th>Age</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map((s) => (
                            <SubmissionRow key={s.id} s={s} />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                <p className="text-[11px] text-[var(--color-text-muted)]">
                    {submissions.length} submission{submissions.length !== 1 ? "s" : ""} pending review
                </p>
            </div>
        </div>
    );
}