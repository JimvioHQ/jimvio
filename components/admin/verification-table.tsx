// components/admin/verification-table.tsx
"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
    CheckCircle2, XCircle, Loader2, ExternalLink,
    Globe, Calendar, AlertTriangle, ShieldOff, Store,
    Phone, MapPin, FileText, Link2,
} from "lucide-react";
import { approveVendor, rejectVendor, suspendVendor } from "@/lib/actions/admin-vendors";
import { toast } from "sonner";

// ─── Avatar ─────────────────────────────────────────────────────────
function VendorAvatar({ name, avatarUrl, logo }: { name?: string; avatarUrl?: string; logo?: string }) {
    const [failed, setFailed] = useState(false);
    const src = logo || avatarUrl;
    const initial = name?.charAt(0)?.toUpperCase() ?? "?";
    const hue = (name ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

    if (src && !failed) {
        return <img src={src} alt={name ?? ""} onError={() => setFailed(true)}
            style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: "0.5px solid var(--color-border)", flexShrink: 0 }} />;
    }
    return (
        <div style={{
            width: 36, height: 36, borderRadius: 6, flexShrink: 0,
            background: `hsl(${hue},45%,92%)`, color: `hsl(${hue},45%,32%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, border: "0.5px solid var(--color-border)",
        }}>
            {initial}
        </div>
    );
}

// ─── Trust signals — what's actually filled in ──────────────────────
function TrustChecklist({ v }: { v: any }) {
    const checks = [
        { ok: !!v.business_logo, label: "Logo" },
        { ok: !!v.business_phone, label: "Phone" },
        { ok: !!v.business_address, label: "Address" },
        { ok: !!v.tax_id, label: "Tax ID" },
        { ok: !!v.website, label: "Website" },
        { ok: !!v.business_description, label: "Bio" },
        { ok: !!v.shopify_credentials, label: "Shopify" },
    ];
    const filled = checks.filter(c => c.ok).length;
    const tone = filled >= 5 ? "#16a34a" : filled >= 3 ? "#d97706" : "#dc2626";
    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 2 }}>
                {checks.map((c, i) => (
                    <span key={i} title={`${c.label}: ${c.ok ? "provided" : "missing"}`}
                        style={{
                            width: 4, height: 14, borderRadius: 1,
                            background: c.ok ? tone : "var(--color-border)",
                        }} />
                ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: tone, fontVariantNumeric: "tabular-nums" }}>
                {filled}/{checks.length}
            </span>
        </div>
    );
}

// ─── Action sheet (replaces popover — captures notes) ───────────────
function ActionSheet({
    action, vendorName, onConfirm, onCancel, loading,
}: {
    action: "approve" | "reject" | "suspend";
    vendorName: string;
    onConfirm: (notes: string) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [notes, setNotes] = useState("");
    const config = {
        approve: {
            color: "#16a34a", title: "Approve", verb: "approve",
            placeholder: "Optional internal note (visible to other admins only)…", required: false
        },
        reject: {
            color: "#dc2626", title: "Reject", verb: "reject",
            placeholder: "Reason for rejection — sent to vendor.", required: true
        },
        suspend: {
            color: "#9333ea", title: "Suspend", verb: "suspend",
            placeholder: "Why is this vendor being suspended?", required: true
        },
    }[action];

    return (
        <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", right: 0, zIndex: 50,
            width: 320, padding: 14, borderRadius: 8,
            background: "var(--color-bg, #fff)",
            border: "0.5px solid var(--color-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
        }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", color: "var(--color-text-primary)" }}>
                {config.title} {vendorName}?
            </p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: "0 0 10px" }}>
                {action === "reject" ? "They'll see your reason and can reapply." :
                    action === "suspend" ? "Access revoked immediately." :
                        "They gain full vendor access right away."}
            </p>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={config.placeholder}
                rows={3}
                style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12,
                    border: "0.5px solid var(--color-border)", resize: "vertical",
                    fontFamily: "inherit", color: "var(--color-text-primary)",
                    background: "var(--color-surface, #fafaf9)", outline: "none",
                }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
                <button onClick={onCancel} style={ghostBtn}>Cancel</button>
                <button
                    onClick={() => onConfirm(notes)}
                    disabled={loading || (config.required && !notes.trim())}
                    style={{
                        ...primaryBtn, background: config.color,
                        opacity: loading || (config.required && !notes.trim()) ? 0.5 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}>
                    {loading ? <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> : null}
                    {config.title}
                </button>
            </div>
        </div>
    );
}

const ghostBtn: React.CSSProperties = {
    height: 28, padding: "0 12px", borderRadius: 5, fontSize: 12, fontWeight: 500,
    border: "0.5px solid var(--color-border)", background: "transparent",
    color: "var(--color-text-secondary)", cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
    height: 28, padding: "0 12px", borderRadius: 5, fontSize: 12, fontWeight: 600,
    border: "none", color: "#fff", display: "inline-flex", alignItems: "center", gap: 5,
};

// ─── Row ────────────────────────────────────────────────────────────
function VendorRow({ v, onDone }: { v: any; onDone: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [sheet, setSheet] = useState<"approve" | "reject" | "suspend" | null>(null);
    const [pending, startTransition] = useTransition();

    const name = v.business_name || "Unnamed store";
    const email = v.profiles?.email ?? v.owner_email ?? "—";
    const country = v.business_country || "—";
    const date = v.created_at ? new Date(v.created_at) : null;
    const daysAgo = date ? Math.floor((Date.now() - date.getTime()) / 86_400_000) : 0;
    const ageColor = daysAgo >= 14 ? "#dc2626" : daysAgo >= 7 ? "#ea580c" : daysAgo >= 3 ? "#d97706" : "var(--color-text-muted, #888)";

    function handleAction(action: "approve" | "reject" | "suspend", notes: string) {
        startTransition(async () => {
            try {
                const fn = action === "approve" ? approveVendor : action === "reject" ? rejectVendor : suspendVendor;
                const res = await fn(v.id, notes);
                if (res?.success) {
                    // Undo toast — no confirm popover needed
                    toast(`${name} ${action}d`, {
                        action: { label: "Undo", onClick: () => {/* call revert action */ } },
                        duration: 5000,
                    });
                    onDone(v.id);
                } else {
                    toast.error(res?.error || `Failed to ${action}`);
                }
            } catch (err: any) {
                toast.error(err.message || "Something went wrong");
            } finally {
                setSheet(null);
            }
        });
    }

    return (
        <>
            <tr
                onClick={() => setExpanded(!expanded)}
                style={{
                    borderBottom: "0.5px solid var(--color-border)",
                    cursor: "pointer", position: "relative",
                }}
            >
                <td style={{ padding: "10px 14px", width: 280 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <VendorAvatar name={name} logo={v.business_logo} avatarUrl={v.profiles?.avatar_url} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                                fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            }}>
                                {name}
                            </div>
                            <div style={{
                                fontSize: 11, color: "var(--color-text-muted, #888)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                            }}>
                                {email}
                            </div>
                        </div>
                    </div>
                </td>

                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Globe size={11} style={{ opacity: 0.5 }} /> {country}
                    </span>
                </td>

                <td style={{ padding: "10px 14px" }}>
                    <TrustChecklist v={v} />
                </td>

                <td style={{ padding: "10px 14px", fontSize: 12, fontVariantNumeric: "tabular-nums", color: ageColor, fontWeight: daysAgo >= 7 ? 600 : 400 }}>
                    {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
                </td>

                <td style={{ padding: "10px 14px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, position: "relative" }}>
                        <Link href={`/admin/vendors/${v.id}`} title="Open profile"
                            style={{
                                width: 26, height: 26, borderRadius: 5, display: "inline-flex",
                                alignItems: "center", justifyContent: "center",
                                color: "var(--color-text-muted, #888)", textDecoration: "none",
                            }}>
                            <ExternalLink size={12} />
                        </Link>
                        <button onClick={() => setSheet(sheet === "suspend" ? null : "suspend")}
                            disabled={pending} title="Suspend"
                            style={{ ...iconBtn, color: "#9333ea" }}>
                            <ShieldOff size={12} />
                        </button>
                        <button onClick={() => setSheet(sheet === "reject" ? null : "reject")}
                            disabled={pending}
                            style={{ ...textBtn, color: "#dc2626" }}>
                            Reject
                        </button>
                        <button onClick={() => setSheet(sheet === "approve" ? null : "approve")}
                            disabled={pending}
                            style={{ ...textBtn, background: "#16a34a", color: "#fff", fontWeight: 600 }}>
                            {pending ? <Loader2 size={11} style={{ animation: "spin 0.7s linear infinite" }} /> : <CheckCircle2 size={11} />}
                            Approve
                        </button>

                        {sheet && (
                            <ActionSheet action={sheet} vendorName={name} loading={pending}
                                onConfirm={(notes) => handleAction(sheet, notes)}
                                onCancel={() => setSheet(null)} />
                        )}
                    </div>
                </td>
            </tr>

            {/* Expanded row — shows the actual data admins need to verify */}
            {expanded && (
                <tr style={{ background: "var(--color-surface, #fafaf9)", borderBottom: "0.5px solid var(--color-border)" }}>
                    <td colSpan={5} style={{ padding: "14px 18px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                            <DetailField icon={<FileText size={11} />} label="Description" value={v.business_description || "—"} />
                            <DetailField icon={<Phone size={11} />} label="Phone" value={v.business_phone || "—"} />
                            <DetailField icon={<MapPin size={11} />} label="Address" value={v.business_address || "—"} />
                            <DetailField icon={<FileText size={11} />} label="Tax ID" value={v.tax_id || "—"} mono />
                            <DetailField icon={<Store size={11} />} label="Type" value={v.business_type || "—"} />
                            <DetailField icon={<Link2 size={11} />} label="Website"
                                value={v.website ? <a href={v.website} target="_blank" rel="noopener noreferrer"
                                    style={{ color: "var(--color-accent, #fd5000)" }}>{v.website}</a> : "—"} />
                        </div>
                        {v.business_banner && (
                            <img src={v.business_banner} alt="Banner"
                                style={{ marginTop: 12, width: "100%", maxHeight: 100, objectFit: "cover", borderRadius: 6, border: "0.5px solid var(--color-border)" }} />
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

const iconBtn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 5, border: "none", background: "transparent",
    display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
const textBtn: React.CSSProperties = {
    height: 26, padding: "0 10px", borderRadius: 5, fontSize: 12,
    border: "none", background: "transparent",
    display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer",
};

function DetailField({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: any; mono?: boolean }) {
    return (
        <div>
            <div style={{
                display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted, #888)", marginBottom: 3
            }}>
                {icon} {label}
            </div>
            <div style={{
                fontSize: 12, color: "var(--color-text-primary)",
                fontFamily: mono ? "ui-monospace, monospace" : "inherit",
                wordBreak: "break-word"
            }}>
                {value}
            </div>
        </div>
    );
}

// ─── Table ──────────────────────────────────────────────────────────
export function VerificationTable({ vendors }: { vendors: any[] }) {
    const [list, setList] = useState(vendors);
    const handleDone = (id: string) => setList(prev => prev.filter(v => v.id !== id));

    if (list.length === 0) return null;

    const th: React.CSSProperties = {
        padding: "8px 14px", textAlign: "left",
        fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
        textTransform: "uppercase", color: "var(--color-text-muted, #888)",
        borderBottom: "0.5px solid var(--color-border)",
    };

    return (
        <>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ border: "0.5px solid var(--color-border)", borderRadius: 8, overflow: "hidden", background: "var(--color-bg, #fff)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={th}>Vendor</th>
                            <th style={th}>Country</th>
                            <th style={th}>Trust signals</th>
                            <th style={th}>Waiting</th>
                            <th style={{ ...th, textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map(v => <VendorRow key={v.id} v={v} onDone={handleDone} />)}
                    </tbody>
                </table>
            </div>
        </>
    );
}