// components/admin/verification-tabs.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Store, Users, Video, Flag } from "lucide-react";

type TabKey = "vendors" | "creators" | "ugc" | "reports";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { key: "vendors", label: "Vendors", icon: Store },
    { key: "creators", label: "Creators", icon: Users },
    { key: "ugc", label: "UGC", icon: Video },
    { key: "reports", label: "Reports", icon: Flag },
];

export function VerificationTabs({
    current,
    counts,
}: {
    current: string;
    counts: Record<TabKey, number>;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    function go(tab: TabKey) {
        const params = new URLSearchParams(sp);
        params.set("tab", tab);
        // Reset filters when changing tabs — they're tab-specific
        params.delete("q");
        params.delete("country");
        params.delete("age");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div
            role="tablist"
            style={{
                display: "flex",
                gap: 2,
                borderBottom: "0.5px solid var(--color-border)",
                marginBottom: -1,
            }}
        >
            {TABS.map(({ key, label, icon: Icon }) => {
                const active = current === key;
                const count = counts[key] ?? 0;
                return (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={active}
                        onClick={() => go(key)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "10px 14px",
                            fontSize: 13,
                            fontWeight: active ? 600 : 500,
                            color: active ? "var(--color-text-primary)" : "var(--color-text-muted, #888)",
                            background: "transparent",
                            border: "none",
                            borderBottom: `2px solid ${active ? "var(--color-accent, #fd5000)" : "transparent"}`,
                            cursor: "pointer",
                            transition: "color 120ms",
                        }}
                    >
                        <Icon size={13} />
                        {label}
                        {count > 0 && (
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: "1px 6px",
                                    borderRadius: 999,
                                    background: active ? "rgba(253,80,0,0.1)" : "var(--color-surface, #f1f1f0)",
                                    color: active ? "var(--color-accent, #fd5000)" : "var(--color-text-muted, #888)",
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}