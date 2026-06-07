"use client";
import React, { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
    RefreshCw, Send, RotateCcw, ChevronDown, ChevronUp, Loader2, Package,
    ExternalLink, AlertTriangle,
} from "lucide-react";
import {
    retryCJSubmission,
    sendToCJNow,
    syncOneCJOrder,
    getCJLogsForOrder,
} from "@/lib/actions/admin-cj";
import { toast } from "sonner";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    waiting_for_submission: { label: "Waiting",    cls: "bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300" },
    submitting:             { label: "Submitting", cls: "bg-blue-50 text-blue-700 ring-blue-400/30 dark:bg-blue-950/30 dark:text-blue-400" },
    submitted:              { label: "Submitted",  cls: "bg-indigo-50 text-indigo-700 ring-indigo-400/30 dark:bg-indigo-950/30 dark:text-indigo-400" },
    accepted:               { label: "Accepted",   cls: "bg-cyan-50 text-cyan-700 ring-cyan-400/30 dark:bg-cyan-950/30 dark:text-cyan-400" },
    processing:             { label: "Processing", cls: "bg-blue-50 text-blue-700 ring-blue-400/30 dark:bg-blue-950/30 dark:text-blue-400" },
    shipped:                { label: "Shipped",    cls: "bg-violet-50 text-violet-700 ring-violet-400/30 dark:bg-violet-950/30 dark:text-violet-400" },
    delivered:              { label: "Delivered",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-400" },
    cancelled:              { label: "Cancelled",  cls: "bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300" },
    failed:                 { label: "Failed",     cls: "bg-rose-50 text-rose-700 ring-rose-400/30 dark:bg-rose-950/30 dark:text-rose-400" },
    unfulfilled:            { label: "Unfulfilled",cls: "bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300" },
};

const ACTION_LOG_CLS: Record<string, string> = {
    enqueue:          "text-blue-500",
    enqueue_skip:     "text-slate-400",
    submit_attempt:   "text-amber-500",
    submit_ok:        "text-emerald-500",
    submit_fail:      "text-rose-500",
    failed:           "text-rose-600",
    retry_scheduled:  "text-orange-500",
    skipped:          "text-slate-400",
    sync_updated:     "text-cyan-500",
    sync_error:       "text-rose-400",
    admin_retry:      "text-violet-500",
    admin_force:      "text-violet-500",
    admin_sync:       "text-violet-500",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CJLog {
    id: string;
    action: string;
    message: string;
    error: string | null;
    created_at: string;
}

interface Props {
    orderId:              string;
    cjOrderId:            string | null;
    cjOrderNum:           string | null;
    cjFulfillmentStatus:  string | null;
    trackingNumber:       string | null;
    cjShippingMethod:     string | null;
    cjSubmitTime:         string | null;
    cjLastSync:           string | null;
    hasCJItems:           boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CJOrderPanel({
    orderId,
    cjOrderId,
    cjOrderNum,
    cjFulfillmentStatus,
    trackingNumber,
    cjShippingMethod,
    cjSubmitTime,
    cjLastSync,
    hasCJItems,
}: Props) {
    const [pending,  startTransition] = useTransition();
    const [logsOpen, setLogsOpen    ] = useState(false);
    const [logs,     setLogs        ] = useState<CJLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    if (!hasCJItems) return null;

    const status  = cjFulfillmentStatus ?? "unfulfilled";
    const cfg     = STATUS_CFG[status] ?? STATUS_CFG.unfulfilled;
    const isFinal = ["delivered", "cancelled"].includes(status);
    const isFailed = status === "failed";
    const isNotSubmitted = !cjOrderId;

    function run(
        action: () => Promise<{ success: boolean; error?: string }>,
        label: string,
    ) {
        startTransition(async () => {
            const res = await action();
            if (res.success) toast.success(label);
            else toast.error(res.error ?? `Failed: ${label}`);
        });
    }

    async function loadLogs() {
        if (logsOpen) { setLogsOpen(false); return; }
        setLogsLoading(true);
        try {
            const data = await getCJLogsForOrder(orderId);
            setLogs(data as CJLog[]);
        } finally {
            setLogsLoading(false);
            setLogsOpen(true);
        }
    }

    function fmtDate(d: string | null) {
        if (!d) return "—";
        return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }

    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                        CJ Dropshipping
                    </span>
                </div>
                <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold ring-1 ring-inset",
                    cfg.cls,
                )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {cfg.label}
                </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3.5">
                <InfoCell label="CJ Order ID"    value={cjOrderId} mono />
                <InfoCell label="CJ Order Ref"   value={cjOrderNum} mono />
                <InfoCell label="Shipping"        value={cjShippingMethod} />
                <InfoCell label="Tracking"        value={trackingNumber} mono />
                <InfoCell label="Submitted"       value={fmtDate(cjSubmitTime)} />
                <InfoCell label="Last sync"       value={fmtDate(cjLastSync)} />
            </div>

            {/* Tracking link */}
            {trackingNumber && (
                <div className="px-4 pb-3">
                    <a
                        href={`https://t.17track.net/en#nums=${trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] text-orange-500 hover:underline"
                    >
                        Track shipment <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30">

                {/* Retry failed */}
                {(isFailed || isNotSubmitted) && (
                    <ActionBtn
                        icon={RotateCcw}
                        label="Retry submission"
                        loading={pending}
                        onClick={() => run(() => retryCJSubmission(orderId), "Submission queued for retry")}
                    />
                )}

                {/* Force submit now */}
                {isNotSubmitted && (
                    <ActionBtn
                        icon={Send}
                        label="Send to CJ now"
                        loading={pending}
                        primary
                        onClick={() => run(() => sendToCJNow(orderId), "Submitted to CJ")}
                    />
                )}

                {/* Sync status */}
                {cjOrderId && !isFinal && (
                    <ActionBtn
                        icon={RefreshCw}
                        label="Sync CJ status"
                        loading={pending}
                        onClick={() => run(() => syncOneCJOrder(orderId), "CJ status synced")}
                    />
                )}

                {/* View logs */}
                <button
                    onClick={loadLogs}
                    disabled={logsLoading}
                    className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded text-[12px] font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors ml-auto"
                >
                    {logsLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : logsOpen
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                    }
                    {logsOpen ? "Hide logs" : "View logs"}
                </button>
            </div>

            {/* Logs panel */}
            {logsOpen && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/20">
                    {logs.length === 0 ? (
                        <p className="px-4 py-4 text-[12px] text-[var(--color-text-muted)]">No logs yet.</p>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]/50 max-h-64 overflow-y-auto">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                                    <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums whitespace-nowrap mt-0.5 shrink-0">
                                        {fmtDate(log.created_at)}
                                    </span>
                                    <span className={cn(
                                        "text-[10.5px] font-semibold shrink-0 uppercase tracking-wider",
                                        ACTION_LOG_CLS[log.action] ?? "text-[var(--color-text-muted)]",
                                    )}>
                                        {log.action.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-[12px] text-[var(--color-text-secondary)] leading-snug min-w-0 break-words">
                                        {log.message}
                                        {log.error && (
                                            <span className="flex items-center gap-1 text-rose-500 text-[11px] mt-0.5">
                                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                                {log.error}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCell({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-0.5">{label}</p>
            <p className={cn(
                "text-[12px] text-[var(--color-text-primary)] font-medium break-all",
                mono && "font-mono text-[11px]",
                !value && "text-[var(--color-text-muted)] font-normal",
            )}>
                {value ?? "—"}
            </p>
        </div>
    );
}

function ActionBtn({ icon: Icon, label, loading, primary, onClick }: {
    icon: React.ElementType;
    label: string;
    loading: boolean;
    primary?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            disabled={loading}
            onClick={onClick}
            className={cn(
                "h-7 px-2.5 inline-flex items-center gap-1.5 rounded text-[12px] font-medium transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                primary
                    ? "bg-[var(--color-accent)] text-white hover:opacity-90"
                    : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]",
            )}
        >
            {loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                : <Icon className="h-3.5 w-3.5 shrink-0" />
            }
            {label}
        </button>
    );
}