import React from "react";
import { cn } from "@/lib/utils";
export { Tile } from "@/components/ui/admin-tile";

export function StatusPill({
    status, size = "sm",
}: { status: string; size?: "sm" | "md" }) {
    const map: Record<string, string> = {
        pending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        processing: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400",
        completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        shipped: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/30 dark:text-indigo-400",
        checkout_direct: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/30 dark:text-violet-400",
        failed: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
        refunded: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
        cancelled: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
        received: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400",
        resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        held: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        released: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        verified: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        rejected: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
        suspended: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
        active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
        inactive: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
        draft: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        paused: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
        archived: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
        banned: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
    };

    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset tabular-nums capitalize",
            size === "md" ? "px-2.5 py-1 text-[11.5px]" : "px-2 py-0.5 text-[10.5px]",
            map[status] ?? map.pending,
        )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {status.replace(/_/g, " ")}
        </span>
    );
}

export function PageHeader({
    eyebrow, title, subtitle, actions, border = true,
}: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    border?: boolean;
}) {
    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4",
            border && "border-b border-[var(--color-border)]/60",
        )}>
            <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
                    {eyebrow}
                </p>
                <h1 className="text-[22px] font-medium tracking-tight text-[var(--color-text-primary)] leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-[13px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}

export function EmptyState({
    icon: Icon, title, message, action,
}: {
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-[var(--color-border)] rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center mb-3.5">
                {Icon}
            </div>
            <p className="text-[14px] font-medium text-[var(--color-text-primary)] mb-1.5">
                {title}
            </p>
            <p className="text-[12.5px] text-[var(--color-text-muted)] text-center max-w-[260px] leading-relaxed">
                {message}
            </p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
    return (
        <th className={cn(
            "font-medium text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] px-3 py-3",
            align === "right" ? "text-right" : "text-left",
        )}>{children}</th>
    );
}