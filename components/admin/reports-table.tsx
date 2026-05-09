"use client";

import React, { useState } from "react";

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
        ugc_campaigns?: {
            title: string;
        };
    } | null;
};

interface ReportsTableProps {
    reports: UGCReport[];
}

const REASON_COLORS: Record<string, { bg: string; fg: string }> = {
    spam: { bg: "rgba(100,116,139,0.08)", fg: "#475569" },
    fraud: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626" },
    fake_views: { bg: "rgba(220,38,38,0.08)", fg: "#dc2626" },
    inappropriate: { bg: "rgba(234,88,12,0.08)", fg: "#ea580c" },
    copyright: { bg: "rgba(217,119,6,0.08)", fg: "#d97706" },
    misinformation: { bg: "rgba(234,88,12,0.08)", fg: "#ea580c" },
    off_topic: { bg: "rgba(100,116,139,0.08)", fg: "#475569" },
};

function ReasonBadge({ reason }: { reason: string }) {
    const key = reason.toLowerCase().replace(/\s+/g, "_");
    const colors = REASON_COLORS[key] ?? { bg: "rgba(100,116,139,0.08)", fg: "#475569" };
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 4,
            background: colors.bg, color: colors.fg,
            border: `0.5px solid ${colors.fg}33`,
            textTransform: "capitalize",
            whiteSpace: "nowrap",
        }}>
            {reason.replace(/_/g, " ")}
        </span>
    );
}

function daysSince(date: string | Date | null | undefined): number {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

const PLATFORM_LABELS: Record<string, string> = {
    tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", x: "X",
};

export function ReportsTable({ reports }: ReportsTableProps) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [actioning, setActioning] = useState<string | null>(null);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "0.5px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 1fr 80px 130px",
                gap: 10,
                padding: "8px 16px",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase",
                color: "var(--color-text-muted,#888)",
                background: "var(--color-surface-secondary,#f9f9f9)",
                borderBottom: "0.5px solid var(--color-border)",
            }}>
                <span>Reported Content</span>
                <span>Reporter</span>
                <span>Reason</span>
                <span>Age</span>
                <span>Actions</span>
            </div>

            {reports.map((r, i) => {
                const days = daysSince(r.created_at);
                const isOpen = expanded === r.id;
                const reporter = r.profiles_ugc_reports_reporter_idToprofiles;
                const sub = r.ugc_submissions;

                return (
                    <div key={r.id} style={{
                        borderBottom: i < reports.length - 1 ? "0.5px solid var(--color-border)" : "none",
                        background: isOpen ? "var(--color-surface-secondary,#f9f9f9)" : "var(--color-surface,#fff)",
                    }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1.5fr 1fr 80px 130px",
                            gap: 10,
                            padding: "12px 16px",
                            alignItems: "center",
                        }}>
                            {/* Reported content */}
                            <div style={{ minWidth: 0 }}>
                                {sub ? (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                            {sub.influencers?.profile_image ? (
                                                <img src={sub.influencers.profile_image} alt="" width={22} height={22}
                                                    style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }} />
                                            ) : null}
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                                                {sub.influencers?.display_name ?? "Unknown creator"}
                                            </span>
                                            {sub.platform && (
                                                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "var(--color-surface-secondary,#f9f9f9)", border: "0.5px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                                                    {PLATFORM_LABELS[sub.platform] ?? sub.platform}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--color-text-muted,#888)" }}>
                                            {sub.ugc_campaigns?.title && <span style={{ marginRight: 6 }}>Campaign: {sub.ugc_campaigns.title}</span>}
                                            <a href={sub.post_url} target="_blank" rel="noopener noreferrer"
                                                style={{ color: "var(--color-accent,#fd5000)", textDecoration: "none" }}>
                                                View post ↗
                                            </a>
                                        </div>
                                        {sub.is_suspicious && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginTop: 3, display: "inline-block",
                                                background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "0.5px solid rgba(220,38,38,0.2)",
                                            }}>
                                                ⚠ Flagged as suspicious
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span style={{ fontSize: 12, color: "var(--color-text-muted,#888)" }}>
                                        Submission #{r.submission_id?.slice(0, 8) ?? "—"}
                                    </span>
                                )}
                            </div>

                            {/* Reporter */}
                            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                                {reporter?.avatar_url ? (
                                    <img src={reporter.avatar_url} alt="" width={24} height={24}
                                        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" }} />
                                ) : (
                                    <div style={{
                                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                        background: "var(--color-surface-secondary,#f9f9f9)", border: "0.5px solid var(--color-border)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 10, fontWeight: 700, color: "var(--color-text-muted,#888)",
                                    }}>
                                        {(reporter?.full_name ?? reporter?.email ?? "?")[0].toUpperCase()}
                                    </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {reporter?.full_name ?? reporter?.username ?? "Unknown"}
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--color-text-muted,#888)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {reporter?.email}
                                    </div>
                                </div>
                            </div>

                            {/* Reason */}
                            <ReasonBadge reason={r.reason} />

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
                                    onClick={() => setExpanded(isOpen ? null : r.id)}
                                    style={{
                                        height: 28, padding: "0 9px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                                        border: "0.5px solid var(--color-border)", background: "transparent",
                                        color: "var(--color-text-secondary)", cursor: "pointer",
                                    }}
                                >
                                    {isOpen ? "Hide" : "View"}
                                </button>

                                {/* Dismiss */}
                                <button
                                    disabled={actioning === r.id}
                                    onClick={() => {
                                        setActioning(r.id);
                                        // dismissReport(r.id)
                                    }}
                                    style={{
                                        height: 28, padding: "0 9px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                                        border: "0.5px solid rgba(48,164,108,0.3)", background: "rgba(48,164,108,0.08)",
                                        color: "#30a46c", cursor: actioning === r.id ? "not-allowed" : "pointer",
                                        opacity: actioning === r.id ? 0.5 : 1,
                                    }}
                                    title="Dismiss report"
                                >
                                    Dismiss
                                </button>

                                {/* Remove content */}
                                <button
                                    disabled={actioning === r.id}
                                    onClick={() => {
                                        setActioning(r.id);
                                        // removeSubmission(r.submission_id, r.id)
                                    }}
                                    style={{
                                        height: 28, padding: "0 9px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                                        border: "0.5px solid rgba(229,72,77,0.3)", background: "rgba(229,72,77,0.08)",
                                        color: "#e5484d", cursor: actioning === r.id ? "not-allowed" : "pointer",
                                        opacity: actioning === r.id ? 0.5 : 1,
                                        whiteSpace: "nowrap",
                                    }}
                                    title="Remove submission"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>

                        {/* Expanded detail */}
                        {isOpen && (
                            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ height: 1, background: "var(--color-border)", margin: "0 0 4px" }} />
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, fontSize: 12 }}>
                                    <DetailItem label="Report ID" value={r.id.slice(0, 12) + "…"} />
                                    <DetailItem label="Submitted" value={r.created_at ? new Date(r.created_at).toLocaleString() : "—"} />
                                    <DetailItem label="Submission ID" value={r.submission_id ? r.submission_id.slice(0, 12) + "…" : "—"} />
                                </div>

                                {r.details && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                            Reporter's details
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, maxWidth: 640, padding: "8px 12px", borderRadius: 6, background: "var(--color-surface,#fff)", border: "0.5px solid var(--color-border)" }}>
                                            {r.details}
                                        </p>
                                    </div>
                                )}

                                {sub?.caption && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                            Post caption
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, maxWidth: 640 }}>
                                            {sub.caption}
                                        </p>
                                    </div>
                                )}

                                {sub?.fraud_score && Number(sub.fraud_score) > 0 && (
                                    <div style={{
                                        padding: "8px 12px", borderRadius: 6,
                                        background: "rgba(220,38,38,0.05)", border: "0.5px solid rgba(220,38,38,0.15)",
                                        display: "flex", alignItems: "center", gap: 8,
                                    }}>
                                        <span style={{ fontSize: 16 }}>⚠️</span>
                                        <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
                                            System fraud score: <strong>{(Number(sub.fraud_score) * 100).toFixed(1)}%</strong>. This submission has been auto-flagged.
                                        </span>
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

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted,#888)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
        </div>
    );
}