import { cn } from "@/lib/utils";

export function TabCountBadge({
    count,
    active = false,
    warn = false,
}: {
    count: number;
    active?: boolean;
    warn?: boolean;
}) {
    if (count <= 0) return null;

    return (
        <span
            className={cn(
                "inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
                active
                    ? warn
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        : "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                    : warn
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            )}
        >
            {count > 999 ? "999+" : count}
        </span>
    );
}
