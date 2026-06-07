"use client";

// components/admin/reports-table.tsx

import React, { useState } from "react";
import { CheckCircle2, Trash2, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Th } from "@/components/ui/admin";

type UGCReport = {
    id: string;
    reporter_id: string;
    submission_id?: string | null;
    reason: string;
    details?: string | null;
    status?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | Date | null;
    created_at?: string | Date | null;
    profiles_ugc_reports_reporter_idToprofiles?: {
        email: string;
        username?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
    };
    ugc_submissions?: {
        post_url: string;
        platform: string;
        caption?: string | null;
        is_suspicious?: boolean | null;
        fraud_score?: any;
        influencers?: {
            display_name: string;
            profile_image?: string | null;
        };
        ugc_campaigns?: { title: string };
    } | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysSince(date: string | Date | null | undefined): number {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

const PLATFORM_LABELS: Record<string, string> = {
    tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", x: "X",
};

// ─── Reason badge ─────────────────────────────────────────────────────────────

const REASON_STYLES: Record<string, string> = {
    spam:           "bg-slate-100 text-slate-600 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-300",
    fraud:          "bg-rose-50 text-rose-700 ring-rose-300/40 dark:bg-rose-950/30 dark:text-rose-400",
    fake_views:     "bg-rose-50 text-rose-700 ring-rose-300/40 dark:bg-rose-950/30 dark:text-rose-400",
    inappropriate:  "bg-orange-50 text-orange-700 ring-orange-300/40 dark:bg-orange-950/30 dark:text-orange-400",
    copyright:      "bg-amber-50 text-amber-700 ring-amber-300/40 dark:bg-amber-950/30 dark:text-amber-400",
    misinformation: "bg-orange-50 text-orange-700 ring-orange-300/40 dark:bg-orange-950/30 dark:text-orange-400",
    off_topic:      "bg-slate-100 text-slate-600 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-300",
};

function ReasonBadge({ reason }: { reason: string }) {
    const key = reason.toLowerCase().replace(/\s+/g, "_");
    return (
        <span className={cn(
            "inline-flex px-2 py-0.5 rounded text-[10.5px] font-semibold capitalize ring-1 ring-inset whitespace-nowrap",
            REASON_STYLES[key] ?? "bg-slate-100 text-slate-600 ring-slate-300/50",
        )}>
            {reason.replace(/_/g, " ")}
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

// ─── Avatars ──────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = "sm" }: { src?: string | null; name: string; size?: "sm" | "md" }) {
    const [failed, setFailed] = useState(false);
    const dim = size === "md" ? "w-8 h-8 text-[12px]" : "w-6 h-6 text-[10px]";
    if (src && !failed) {
        return (
            <img src={src} alt={name} onError={() => setFailed(true)}
                className={cn("rounded-full object-cover shrink-0 border border-[var(--color-border)]", dim)} />
        );
    }
    return (
        <div className={cn(
            "rounded-full shrink-0 flex items-center justify-center font-bold bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]",
            dim,
        )}>
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

function ReportRow({ r }: { r: UGCReport }) {
    const [expanded,  setExpanded ] = useState(false);
    const [actioning, setActioning] = useState(false);

    const days     = daysSince(r.created_at);
    const reporter = r.profiles_ugc_reports_reporter_idToprofiles;
    const sub      = r.ugc_submissions;

    return (
        <>
            <tr className={cn(
                "border-b border-[var(--color-border)]/70 transition-colors",
                expanded
                    ? "bg-[var(--color-surface-secondary)]/40"
                    : "hover:bg-[var(--color-surface-secondary)]/30",
            )}>
                {/* Reported content */}
                <td className="px-3 py-2.5">
                    {sub ? (
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                {sub.influencers?.profile_image && (
                                    <Avatar src={sub.influencers.profile_image} name={sub.influencers.display_name ?? ""} />
                                )}
                                <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                                    {sub.influencers?.display_name ?? "Unknown creator"}
                                </span>
                                {sub.platform && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                                        {PLATFORM_LABELS[sub.platform] ?? sub.platform}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                                {sub.ugc_campaigns?.title && (
                                    <span>{sub.ugc_campaigns.title}</span>
                                )}
                                <a href={sub.post_url} target="_blank" rel="noopener noreferrer"
                                    className="text-orange-500 hover:underline inline-flex items-center gap-0.5">
                                    View post <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                            </div>
                            {sub.is_suspicious && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                    <AlertTriangle className="h-3 w-3" /> Flagged as suspicious
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-[12px] text-[var(--color-text-muted)]">
                            Submission #{r.submission_id?.slice(0, 8) ?? "—"}
                        </span>
                    )}
                </td>

                {/* Reporter */}
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={reporter?.avatar_url} name={reporter?.full_name ?? reporter?.email ?? "?"} size="md" />
                        <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">
                                {reporter?.full_name ?? reporter?.username ?? "Unknown"}
                            </p>
                            <p className="text-[10.5px] text-[var(--color-text-muted)] truncate max-w-[120px]">
                                {reporter?.email}
                            </p>
                        </div>
                    </div>
                </td>

                {/* Reason */}
                <td className="px-3 py-2.5">
                    <ReasonBadge reason={r.reason} />
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
                            disabled={actioning}
                            onClick={() => setActioning(true) /* dismissReport(r.id) */}
                            title="Dismiss report"
                            className={cn(
                                "h-7 px-2 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1",
                                "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60",
                                "dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40 transition-colors",
                                actioning && "opacity-40 cursor-not-allowed",
                            )}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Dismiss
                        </button>
                        <button
                            disabled={actioning}
                            onClick={() => setActioning(true) /* removeSubmission(r.submission_id, r.id) */}
                            title="Remove submission"
                            className={cn(
                                "h-7 px-2 rounded-lg text-[11.5px] font-medium inline-flex items-center gap-1",
                                "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60",
                                "dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40 transition-colors whitespace-nowrap",
                                actioning && "opacity-40 cursor-not-allowed",
                            )}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                        </button>
                    </div>
                </td>
            </tr>

            {/* Expanded detail */}
            {expanded && (
                <tr className="border-b border-[var(--color-border)]/70 bg-[var(--color-surface-secondary)]/40">
                    <td colSpan={5} className="px-4 py-4 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Detail label="Report ID"     value={r.id.slice(0, 12) + "…"} />
                            <Detail label="Submitted"     value={r.created_at ? new Date(r.created_at).toLocaleString() : "—"} />
                            <Detail label="Submission ID" value={r.submission_id ? r.submission_id.slice(0, 12) + "…" : "—"} />
                        </div>

                        {r.details && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1.5">
                                    Reporter's details
                                </p>
                                <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed max-w-xl px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                                    {r.details}
                                </p>
                            </div>
                        )}

                        {sub?.caption && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1.5">
                                    Post caption
                                </p>
                                <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                                    {sub.caption}
                                </p>
                            </div>
                        )}

                        {sub?.fraud_score && Number(sub.fraud_score) > 0 && (
                            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/30">
                                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                                <span className="text-[12px] text-rose-700 dark:text-rose-400 font-medium">
                                    System fraud score:{" "}
                                    <strong>{(Number(sub.fraud_score) * 100).toFixed(1)}%</strong>.
                                    This submission has been auto-flagged.
                                </span>
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function ReportsTable({ reports }: { reports: UGCReport[] }) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60">
                            <Th>Reported content</Th>
                            <Th>Reporter</Th>
                            <Th>Reason</Th>
                            <Th>Age</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((r) => (
                            <ReportRow key={r.id} r={r} />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                <p className="text-[11px] text-[var(--color-text-muted)]">
                    {reports.length} report{reports.length !== 1 ? "s" : ""} pending review
                </p>
            </div>
        </div>
    );
}