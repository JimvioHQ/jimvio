"use client";

import React, { useState } from "react";

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

interface UGCSubmissionsTableProps {
    submissions: UGCSubmission[];
}

const PLATFORM_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
    tiktok: { bg: "rgba(0,0,0,0.06)", fg: "#111", label: "TikTok" },
    instagram: { bg: "rgba(214,41,118,0.08)", fg: "#d62976", label: "Instagram" },
    youtube: { bg: "rgba(255,0,0,0.08)", fg: "#ff0000", label: "YouTube" },
    x: { bg: "rgba(29,155,240,0.08)", fg: "#1d9bf0", label: "X" },
};

function PlatformBadge({ platform }: { platform: string }) {
    const p = PLATFORM_COLORS[platform] ?? { bg: "rgba(100,116,139,0.08)", fg: "#475569", label: platform };
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4,
            background: p.bg, color: p.fg, border: `0.5px solid ${p.fg}22`,
            textTransform: "capitalize",
        }}>
            {p.label}
        </span>
    );
}

function FraudBadge({ score }: { score: number }) {
    if (score < 0.3) return null;
    const high = score >= 0.7;
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
            background: high ? "rgba(220,38,38,0.08)" : "rgba(240,180,41,0.1)",
            color: high ? "#dc2626" : "#b45309",
            border: `0.5px solid ${high ? "rgba(220,38,38,0.2)" : "rgba(240,180,41,0.2)"}`,
        }}>
            ⚠ {(score * 100).toFixed(0)}% fraud risk
        </span>
    );
}

function formatViews(n: bigint | number | null | undefined): string {
    if (!n) return "—";
    const num = typeof n === "bigint" ? Number(n) : n;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return String(num);
}

function daysSince(date: string | Date | null | undefined): number {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function truncate(str: string | null | undefined, len = 60): string {
    if (!str) return "—";
    return str.length > len ? str.slice(0, len) + "…" : str;
}

export function UGCSubmissionsTable({ submissions }: UGCSubmissionsTableProps) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "0.5px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 80px 80px 80px 120px",
                gap: 10,
                padding: "8px 16px",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase",
                color: "var(--color-text-muted,#888)",
                background: "var(--color-surface-secondary,#f9f9f9)",
                borderBottom: "0.5px solid var(--color-border)",
            }}>
                <span>Creator / Post</span>
                <span>Campaign</span>
                <span>Platform</span>
                <span>Views</span>
                <span>Earned</span>
                <span>Age</span>
                <span>Actions</span>
            </div>

            {submissions.map((s, i) => {
                const days = daysSince(s.created_at);
                const isOpen = expanded === s.id;
                const fraudScore = s.fraud_score ? Number(s.fraud_score) : 0;
                const isRejectOpen = rejecting === s.id;

                return (
                    <div key={s.id} style={{
                        borderBottom: i < submissions.length - 1 ? "0.5px solid var(--color-border)" : "none",
                        background: isOpen ? "var(--color-surface-secondary,#f9f9f9)" : "var(--color-surface,#fff)",
                    }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1.2fr 1fr 80px 80px 80px 120px",
                            gap: 10,
                            padding: "12px 16px",
                            alignItems: "center",
                        }}>
                            {/* Creator + post */}
                            <div style={{ display: "flex", gap: 9, alignItems: "center", minWidth: 0 }}>
                                {s.influencers?.profile_image ? (
                                    <img src={s.influencers.profile_image} alt="" width={30} height={30}
                                        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }} />
                                ) : (
                                    <div style={{
                                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                                        background: "var(--color-accent-light,#fff3ee)", color: "var(--color-accent,#fd5000)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 11, fontWeight: 700, border: "1px solid var(--color-border)",
                                    }}>
                                        {(s.influencers?.display_name ?? "?")[0].toUpperCase()}
                                    </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {s.influencers?.display_name ?? "Unknown"}
                                    </div>
                                    <a href={s.post_url} target="_blank" rel="noopener noreferrer"
                                        style={{ fontSize: 11, color: "var(--color-accent,#fd5000)", textDecoration: "none", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {truncate(s.post_url, 40)}
                                    </a>
                                    {s.is_suspicious && <FraudBadge score={fraudScore} />}
                                </div>
                            </div>

                            {/* Campaign */}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {s.ugc_campaigns?.title ?? "—"}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--color-text-muted,#888)", textTransform: "capitalize", marginTop: 1 }}>
                                    {s.ugc_campaigns?.campaign_type?.replace("_", " ") ?? ""}
                                </div>
                            </div>

                            {/* Platform */}
                            <PlatformBadge platform={s.platform} />

                            {/* Views */}
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                                {formatViews(s.total_views_earned)}
                            </span>

                            {/* Earned */}
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.total_earnings && Number(s.total_earnings) > 0 ? "#30a46c" : "var(--color-text-muted,#888)" }}>
                                {s.total_earnings && Number(s.total_earnings) > 0
                                    ? `${Number(s.total_earnings).toLocaleString()} RWF`
                                    : "—"}
                            </span>

                            {/* Age */}
                            <span style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                                background: days >= 7 ? "rgba(220,38,38,0.08)" : "rgba(100,116,139,0.07)",
                                color: days >= 7 ? "#dc2626" : "var(--color-text-muted,#888)",
                                border: `0.5px solid ${days >= 7 ? "rgba(220,38,38,0.2)" : "var(--color-border)"}`,
                            }}>
                                {days}d
                            </span>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                                <button
                                    onClick={() => setExpanded(isOpen ? null : s.id)}
                                    style={{
                                        height: 28, padding: "0 9px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                                        border: "0.5px solid var(--color-border)", background: "transparent",
                                        color: "var(--color-text-secondary)", cursor: "pointer",
                                    }}
                                >
                                    {isOpen ? "Hide" : "View"}
                                </button>
                                <button
                                    onClick={() => {/* approveUGCSubmission(s.id) */ }}
                                    style={{
                                        height: 28, width: 28, borderRadius: 5, fontSize: 13, fontWeight: 700,
                                        border: "0.5px solid rgba(48,164,108,0.3)", background: "rgba(48,164,108,0.08)",
                                        color: "#30a46c", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                    title="Approve"
                                >✓</button>
                                <button
                                    onClick={() => setRejecting(isRejectOpen ? null : s.id)}
                                    style={{
                                        height: 28, width: 28, borderRadius: 5, fontSize: 13, fontWeight: 700,
                                        border: "0.5px solid rgba(229,72,77,0.3)", background: "rgba(229,72,77,0.08)",
                                        color: "#e5484d", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                    title="Reject"
                                >✕</button>
                            </div>
                        </div>

                        {/* Reject reason input */}
                        {isRejectOpen && (
                            <div style={{ padding: "0 16px 12px", display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                    type="text"
                                    placeholder="Rejection reason (optional)"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    style={{
                                        flex: 1, height: 32, padding: "0 10px", fontSize: 12,
                                        borderRadius: 6, border: "0.5px solid var(--color-border)",
                                        background: "var(--color-surface,#fff)", color: "var(--color-text-primary)",
                                        outline: "none",
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        // rejectUGCSubmission(s.id, rejectReason)
                                        setRejecting(null);
                                        setRejectReason("");
                                    }}
                                    style={{
                                        height: 32, padding: "0 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                        background: "#e5484d", color: "#fff", border: "none", cursor: "pointer",
                                    }}
                                >
                                    Confirm reject
                                </button>
                                <button
                                    onClick={() => { setRejecting(null); setRejectReason(""); }}
                                    style={{
                                        height: 32, padding: "0 10px", borderRadius: 6, fontSize: 12,
                                        border: "0.5px solid var(--color-border)", background: "transparent",
                                        color: "var(--color-text-secondary)", cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Expanded detail */}
                        {isOpen && (
                            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ height: 1, background: "var(--color-border)", margin: "0 0 4px" }} />
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, fontSize: 12 }}>
                                    <Detail label="Post URL" value={<a href={s.post_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent,#fd5000)" }}>Open post ↗</a>} />
                                    <Detail label="Submitted" value={s.created_at ? new Date(s.created_at).toLocaleString() : "—"} />
                                    <Detail label="Rate/1K views" value={s.ugc_campaigns?.rate_per_1k_views ? `${Number(s.ugc_campaigns.rate_per_1k_views)} RWF` : "—"} />
                                    <Detail label="Fraud score" value={fraudScore > 0 ? `${(fraudScore * 100).toFixed(1)}%` : "Clean"} />
                                </div>
                                {s.caption && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Caption</div>
                                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, maxWidth: 600 }}>{s.caption}</p>
                                    </div>
                                )}
                                {s.ugc_submission_media && s.ugc_submission_media.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Media</div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            {s.ugc_submission_media.slice(0, 4).map((m, mi) => (
                                                <a key={mi} href={m.url} target="_blank" rel="noopener noreferrer">
                                                    {m.thumbnail_url ? (
                                                        <img src={m.thumbnail_url} alt="" width={64} height={64}
                                                            style={{ borderRadius: 6, objectFit: "cover", border: "0.5px solid var(--color-border)" }} />
                                                    ) : (
                                                        <div style={{
                                                            width: 64, height: 64, borderRadius: 6, border: "0.5px solid var(--color-border)",
                                                            background: "var(--color-surface-secondary,#f9f9f9)",
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontSize: 10, color: "var(--color-text-muted,#888)",
                                                        }}>
                                                            {m.type}
                                                        </div>
                                                    )}
                                                </a>
                                            ))}
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

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
        </div>
    );
}