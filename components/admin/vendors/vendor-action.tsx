"use client";

import React, { useState, useTransition } from "react";
import { Loader2, CheckCircle2, XCircle, ShieldOff, Star, Percent } from "lucide-react";
import {
    approveVendor,
    rejectVendor,
    suspendVendor,
    revertVendorApproval,
    toggleVendorFeatured,
    updateVendorCommission,
} from "@/lib/actions/admin-vendors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
    vendor: {
        id: string;
        business_name: string;
        verification_status: string | null;
        is_featured: boolean | null;
        commission_rate: any;
    };
}

export function VendorActions({ vendor }: Props) {
    const router = useRouter();
    const [sheet, setSheet] = useState<"approve" | "reject" | "suspend" | "commission" | null>(null);
    const [notes, setNotes] = useState("");
    const [commissionRate, setCommissionRate] = useState(Number(vendor.commission_rate ?? 0));
    const [pending, startTransition] = useTransition();

    const name = vendor.business_name;
    const status = vendor.verification_status;
    const isPending = status === "pending";
    const isVerified = status === "verified";
    const isSuspended = status === "suspended";

    function run(action: () => Promise<{ success: boolean; error?: string }>, label: string, undoFn?: () => void) {
        startTransition(async () => {
            try {
                const res = await action();
                if (res.success) {
                    toast.success(label, undoFn ? {
                        action: { label: "Undo", onClick: undoFn },
                        duration: 6000,
                    } : undefined);
                    setSheet(null);
                    setNotes("");
                    router.refresh();
                } else {
                    toast.error(res.error ?? `Failed: ${label}`);
                }
            } catch (e: any) {
                toast.error(e.message ?? "Something went wrong");
            }
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", position: "relative" }}>
            {/* Primary action row */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {/* Featured toggle */}
                <button
                    onClick={() => run(
                        () => toggleVendorFeatured(vendor.id, !vendor.is_featured),
                        vendor.is_featured ? "Removed from featured" : "Marked as featured"
                    )}
                    disabled={pending}
                    style={outlineBtn}
                    title={vendor.is_featured ? "Remove from featured" : "Mark as featured"}
                >
                    <Star size={12} fill={vendor.is_featured ? "currentColor" : "none"} />
                    {vendor.is_featured ? "Featured" : "Feature"}
                </button>

                {/* Commission */}
                <button
                    onClick={() => setSheet(sheet === "commission" ? null : "commission")}
                    disabled={pending}
                    style={outlineBtn}
                >
                    <Percent size={12} />
                    Commission
                </button>

                {/* Suspend — always available for active/verified vendors */}
                {!isSuspended && (
                    <button
                        onClick={() => setSheet(sheet === "suspend" ? null : "suspend")}
                        disabled={pending}
                        style={{ ...outlineBtn, color: "#9333ea", borderColor: "rgba(147,51,234,0.3)" }}
                    >
                        <ShieldOff size={12} />
                        Suspend
                    </button>
                )}

                {/* Reject */}
                {!isSuspended && (
                    <button
                        onClick={() => setSheet(sheet === "reject" ? null : "reject")}
                        disabled={pending}
                        style={{ ...outlineBtn, color: "#dc2626", borderColor: "rgba(220,38,38,0.3)" }}
                    >
                        <XCircle size={12} />
                        Reject
                    </button>
                )}

                {/* Approve — show for pending or rejected */}
                {(isPending || status === "rejected") && (
                    <button
                        onClick={() => setSheet(sheet === "approve" ? null : "approve")}
                        disabled={pending}
                        style={{ ...outlineBtn, background: "#16a34a", color: "#fff", border: "none", fontWeight: 600 }}
                    >
                        {pending ? <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> : <CheckCircle2 size={12} />}
                        Approve
                    </button>
                )}

                {/* Re-activate suspended */}
                {isSuspended && (
                    <button
                        onClick={() => run(
                            () => approveVendor(vendor.id, "Re-activated by admin"),
                            `${name} re-activated`
                        )}
                        disabled={pending}
                        style={{ ...outlineBtn, background: "#16a34a", color: "#fff", border: "none", fontWeight: 600 }}
                    >
                        {pending ? <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> : <CheckCircle2 size={12} />}
                        Re-activate
                    </button>
                )}
            </div>

            {/* Action sheet */}
            {sheet && sheet !== "commission" && (
                <div style={sheetStyle}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 2px", color: "var(--color-text-primary)" }}>
                        {sheet === "approve" ? `Approve ${name}?` : sheet === "reject" ? `Reject ${name}?` : `Suspend ${name}?`}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: "0 0 10px" }}>
                        {sheet === "approve" ? "They gain full vendor access immediately."
                            : sheet === "reject" ? "They'll receive your reason and can reapply."
                                : "Access revoked immediately. They can be re-activated later."}
                    </p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={
                            sheet === "approve" ? "Optional internal note…"
                                : sheet === "reject" ? "Reason for rejection (sent to vendor)…"
                                    : "Why is this vendor being suspended?"
                        }
                        rows={3}
                        style={textareaStyle}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
                        <button onClick={() => { setSheet(null); setNotes(""); }} style={ghostBtn}>Cancel</button>
                        <button
                            disabled={pending || (sheet !== "approve" && !notes.trim())}
                            onClick={() => {
                                if (sheet === "approve") {
                                    run(
                                        () => approveVendor(vendor.id, notes),
                                        `${name} approved`,
                                        () => revertVendorApproval(vendor.id).then(() => router.refresh())
                                    );
                                } else if (sheet === "reject") {
                                    run(() => rejectVendor(vendor.id, notes), `${name} rejected`);
                                } else if (sheet === "suspend") {
                                    run(() => suspendVendor(vendor.id, notes), `${name} suspended`);
                                }
                            }}
                            style={{
                                ...primaryBtn,
                                background: sheet === "approve" ? "#16a34a" : sheet === "suspend" ? "#9333ea" : "#dc2626",
                                opacity: pending || (sheet !== "approve" && !notes.trim()) ? 0.5 : 1,
                            }}
                        >
                            {pending ? <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> : null}
                            {sheet.charAt(0).toUpperCase() + sheet.slice(1)}
                        </button>
                    </div>
                </div>
            )}

            {/* Commission sheet */}
            {sheet === "commission" && (
                <div style={sheetStyle}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 10px", color: "var(--color-text-primary)" }}>
                        Platform commission rate
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(Number(e.target.value))}
                            style={{
                                width: 80, padding: "6px 10px", fontSize: 14, fontWeight: 600,
                                borderRadius: 6, border: "0.5px solid var(--color-border)",
                                fontFamily: "ui-monospace, monospace", textAlign: "right",
                                background: "var(--color-surface, #fafaf9)", color: "var(--color-text-primary)",
                            }}
                        />
                        <span style={{ fontSize: 14, color: "var(--color-text-muted, #888)" }}>%</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
                        <button onClick={() => setSheet(null)} style={ghostBtn}>Cancel</button>
                        <button
                            disabled={pending}
                            onClick={() => run(() => updateVendorCommission(vendor.id, commissionRate), "Commission updated")}
                            style={{ ...primaryBtn, background: "#1d4ed8" }}
                        >
                            {pending ? <Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} /> : null}
                            Save
                        </button>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const outlineBtn: React.CSSProperties = {
    height: 30, padding: "0 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
    border: "0.5px solid var(--color-border)", background: "transparent",
    color: "var(--color-text-secondary)", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 5,
};
const ghostBtn: React.CSSProperties = {
    height: 28, padding: "0 12px", borderRadius: 5, fontSize: 12, fontWeight: 500,
    border: "0.5px solid var(--color-border)", background: "transparent",
    color: "var(--color-text-secondary)", cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
    height: 28, padding: "0 14px", borderRadius: 5, fontSize: 12, fontWeight: 600,
    border: "none", color: "#fff", display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer",
};
const sheetStyle: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
    width: 320, padding: 14, borderRadius: 8,
    background: "var(--color-bg, #fff)",
    border: "0.5px solid var(--color-border)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
};
const textareaStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12,
    border: "0.5px solid var(--color-border)", resize: "vertical",
    fontFamily: "inherit", color: "var(--color-text-primary)",
    background: "var(--color-surface, #fafaf9)", outline: "none",
    boxSizing: "border-box",
};