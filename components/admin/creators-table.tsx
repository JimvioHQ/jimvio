"use client";

import React, { useState, useTransition } from "react";

type Creator = {
    id: string;
    user_id: string;
    display_name: string;
    niche: string[];
    bio?: string | null;
    profile_image?: string | null;
    total_followers?: bigint | number | null;
    engagement_rate?: any;
    is_verified?: boolean | null;
    is_active?: boolean | null;
    created_at?: string | Date | null;
    guidelines_accepted_at?: string | Date | null;
    social_platforms?: Record<string, any> | null;
    profiles?: {
        email: string;
        username?: string | null;
        full_name?: string | null;
        country?: string | null;
    };
};

interface CreatorsTableProps {
    creators: Creator[];
}

function daysSince(date: string | Date | null | undefined): number {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function formatFollowers(n: bigint | number | null | undefined): string {
    if (!n) return "—";
    const num = typeof n === "bigint" ? Number(n) : n;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return String(num);
}

function AgeBadge({ days }: { days: number }) {
    if (days >= 14)
        return (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "0.5px solid rgba(220,38,38,0.2)" }}>
                {days}d
            </span>
        );
    if (days >= 7)
        return (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "rgba(234,88,12,0.08)", color: "#ea580c", border: "0.5px solid rgba(234,88,12,0.2)" }}>
                {days}d
            </span>
        );
    return (
        <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: "rgba(100,116,139,0.07)", color: "var(--color-text-muted,#888)", border: "0.5px solid var(--color-border)" }}>
            {days}d
        </span>
    );
}

function Avatar({ src, name }: { src?: string | null; name: string }) {
    const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (src)
        return (
            <img
                src={src}
                alt={name}
                width={34}
                height={34}
                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }}
            />
        );
    return (
        <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: "var(--color-accent-light,#fff3ee)", color: "var(--color-accent,#fd5000)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, border: "1px solid var(--color-border)",
        }}>
            {initials}
        </div>
    );
}

const SOCIAL_ICONS: Record<string, string> = {
    tiktok: "T",
    instagram: "IG",
    youtube: "YT",
    x: "X",
    twitter: "X",
};

export function CreatorsTable({ creators }: CreatorsTableProps) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "0.5px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 120px",
                gap: 12,
                padding: "8px 16px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--color-text-muted,#888)",
                background: "var(--color-surface-secondary,#f9f9f9)",
                borderBottom: "0.5px solid var(--color-border)",
            }}>
                <span>Creator</span>
                <span>Followers</span>
                <span>Niche</span>
                <span>Platforms</span>
                <span>Age</span>
                <span>Actions</span>
            </div>

            {creators.map((c, i) => {
                const days = daysSince(c.created_at);
                const isOpen = expanded === c.id;
                const platforms = c.social_platforms ? Object.keys(c.social_platforms).filter((k) => c.social_platforms![k]) : [];

                return (
                    <div key={c.id} style={{
                        borderBottom: i < creators.length - 1 ? "0.5px solid var(--color-border)" : "none",
                        background: isOpen ? "var(--color-surface-secondary,#f9f9f9)" : "var(--color-surface,#fff)",
                    }}>
                        {/* Row */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 120px",
                            gap: 12,
                            padding: "12px 16px",
                            alignItems: "center",
                        }}>
                            {/* Creator info */}
                            <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                                <Avatar src={c.profile_image} name={c.display_name} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {c.display_name}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--color-text-muted,#888)", marginTop: 1 }}>
                                        {c.profiles?.email ?? c.profiles?.username ?? "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Followers */}
                            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                                {formatFollowers(c.total_followers)}
                            </span>

                            {/* Niche */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {(c.niche ?? []).slice(0, 2).map((n) => (
                                    <span key={n} style={{
                                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                                        background: "var(--color-accent-light,#fff3ee)", color: "var(--color-accent,#fd5000)",
                                        border: "0.5px solid rgba(253,80,0,0.15)",
                                        textTransform: "capitalize",
                                    }}>{n}</span>
                                ))}
                                {(c.niche ?? []).length > 2 && (
                                    <span style={{ fontSize: 10, color: "var(--color-text-muted,#888)" }}>+{c.niche.length - 2}</span>
                                )}
                            </div>

                            {/* Platforms */}
                            <div style={{ display: "flex", gap: 4 }}>
                                {platforms.slice(0, 4).map((p) => (
                                    <span key={p} style={{
                                        fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 4,
                                        background: "var(--color-surface-secondary,#f9f9f9)", color: "var(--color-text-secondary)",
                                        border: "0.5px solid var(--color-border)",
                                    }}>
                                        {SOCIAL_ICONS[p.toLowerCase()] ?? p.slice(0, 2).toUpperCase()}
                                    </span>
                                ))}
                                {platforms.length === 0 && <span style={{ fontSize: 11, color: "var(--color-text-muted,#888)" }}>—</span>}
                            </div>

                            {/* Age */}
                            <AgeBadge days={days} />

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <button
                                    onClick={() => setExpanded(isOpen ? null : c.id)}
                                    style={{
                                        height: 28, padding: "0 10px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                                        border: "0.5px solid var(--color-border)", background: "transparent",
                                        color: "var(--color-text-secondary)", cursor: "pointer",
                                    }}
                                >
                                    {isOpen ? "Hide" : "View"}
                                </button>
                                <ActionButtons creatorId={c.id} />
                            </div>
                        </div>

                        {/* Expanded bio */}
                        {isOpen && (
                            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ height: 1, background: "var(--color-border)", margin: "0 0 4px" }} />
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 12 }}>
                                    <Detail label="Full name" value={c.profiles?.full_name ?? "—"} />
                                    <Detail label="Country" value={c.profiles?.country ?? "—"} />
                                    <Detail label="Guidelines accepted" value={c.guidelines_accepted_at ? new Date(c.guidelines_accepted_at).toLocaleDateString() : "Not yet"} />
                                    <Detail label="Engagement rate" value={c.engagement_rate ? `${Number(c.engagement_rate).toFixed(2)}%` : "—"} />
                                    <Detail label="Applied" value={c.created_at ? new Date(c.created_at).toLocaleString() : "—"} />
                                    <Detail label="Status" value={c.is_active ? "Active" : "Inactive"} />
                                </div>
                                {c.bio && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted,#888)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bio</div>
                                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{c.bio}</p>
                                    </div>
                                )}
                                {platforms.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted,#888)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Social platforms</div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                            {platforms.map((p) => {
                                                const url = c.social_platforms?.[p];
                                                return (
                                                    <a key={p} href={typeof url === "string" ? url : "#"} target="_blank" rel="noopener noreferrer"
                                                        style={{
                                                            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 5,
                                                            background: "var(--color-surface,#fff)", color: "var(--color-text-primary)",
                                                            border: "0.5px solid var(--color-border)", textDecoration: "none",
                                                            textTransform: "capitalize",
                                                        }}>
                                                        {p} ↗
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ActionButtons({ creatorId }: { creatorId: string }) {
    const [status, setStatus] = useState<"idle" | "approving" | "rejecting">("idle");

    return (
        <>
            <button
                disabled={status !== "idle"}
                onClick={() => {
                    setStatus("approving");
                    // Call your server action here: approveCreator(creatorId)
                }}
                style={{
                    height: 28, width: 28, borderRadius: 5, fontSize: 13, fontWeight: 700,
                    border: "0.5px solid rgba(48,164,108,0.3)",
                    background: "rgba(48,164,108,0.08)", color: "#30a46c",
                    cursor: status !== "idle" ? "not-allowed" : "pointer",
                    opacity: status === "rejecting" ? 0.4 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="Approve"
            >
                ✓
            </button>
            <button
                disabled={status !== "idle"}
                onClick={() => {
                    setStatus("rejecting");
                    // Call your server action here: rejectCreator(creatorId)
                }}
                style={{
                    height: 28, width: 28, borderRadius: 5, fontSize: 13, fontWeight: 700,
                    border: "0.5px solid rgba(229,72,77,0.3)",
                    background: "rgba(229,72,77,0.08)", color: "#e5484d",
                    cursor: status !== "idle" ? "not-allowed" : "pointer",
                    opacity: status === "approving" ? 0.4 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="Reject"
            >
                ✕
            </button>
        </>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
        </div>
    );
}