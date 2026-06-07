"use client";

// components/admin/verification-tabs.tsx

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Store, Users, Video, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "vendors" | "creators" | "ugc" | "reports";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "vendors",  label: "Vendors",  icon: Store },
    { key: "creators", label: "Creators", icon: Users },
    { key: "ugc",      label: "UGC",      icon: Video },
    { key: "reports",  label: "Reports",  icon: Flag  },
];

export function VerificationTabs({
    current,
    counts,
}: {
    current: string;
    counts: Record<TabKey, number>;
}) {
    const router   = useRouter();
    const pathname = usePathname();
    const sp       = useSearchParams();

    function go(tab: TabKey) {
        const params = new URLSearchParams(sp);
        params.set("tab", tab);
        params.delete("q");
        params.delete("country");
        params.delete("age");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div
            role="tablist"
            className="flex gap-0 border-b border-[var(--color-border)]"
        >
            {TABS.map(({ key, label, icon: Icon }) => {
                const active = current === key;
                const count  = counts[key] ?? 0;
                return (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={active}
                        onClick={() => go(key)}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px",
                            active
                                ? "border-[var(--color-accent)] text-[var(--color-text-primary)] font-semibold"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                        )}
                    >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                        {count > 0 && (
                            <span className={cn(
                                "inline-flex items-center justify-center h-4 min-w-4 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
                                active
                                    ? "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}