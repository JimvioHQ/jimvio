"use client";

import React, { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
import { cn } from "@/lib/utils";

function PortalSheet({
    anchorRef,
    onClose,
    children,
}: {
    anchorRef: React.RefObject<HTMLElement | null>;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

    // Position below anchor on mount + on scroll/resize
    const reposition = useCallback(() => {
        const el = anchorRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setCoords({
            top:   rect.bottom + window.scrollY + 6,
            right: window.innerWidth - rect.right,
        });
    }, [anchorRef]);

    useEffect(() => {
        reposition();
        window.addEventListener("scroll",  reposition, true);
        window.addEventListener("resize",  reposition);
        return () => {
            window.removeEventListener("scroll",  reposition, true);
            window.removeEventListener("resize",  reposition);
        };
    }, [reposition]);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            if (anchorRef.current && anchorRef.current.contains(target)) return;
            onClose();
        }
        // Delay so the button click that opened the sheet doesn't immediately close it
        const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener("mousedown", handleClick);
        };
    }, [anchorRef, onClose]);

    if (!coords) return null;

    return createPortal(
        <div
            style={{
                position:  "absolute",
                top:       coords.top,
                right:     coords.right,
                zIndex:    9999,
                width:     320,
            }}
            // Stop clicks inside the sheet from bubbling to the outside-click handler
            onMouseDown={(e) => e.stopPropagation()}
        >
            {children}
        </div>,
        document.body,
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
    const [sheet,          setSheet         ] = useState<"approve" | "reject" | "suspend" | "commission" | null>(null);
    const [notes,          setNotes         ] = useState("");
    const [commissionRate, setCommissionRate] = useState(Number(vendor.commission_rate ?? 0));
    const [pending,        startTransition  ] = useTransition();

    // Anchor ref — attached to the button row div so the sheet positions below it
    const anchorRef = useRef<HTMLDivElement>(null);

    const name        = vendor.business_name;
    const status      = vendor.verification_status;
    const isPending   = status === "pending";
    const isSuspended = status === "suspended";

    function closeSheet() {
        setSheet(null);
        setNotes("");
    }

    function run(
        action: () => Promise<{ success: boolean; error?: string }>,
        label: string,
        undoFn?: () => void,
    ) {
        startTransition(async () => {
            try {
                const res = await action();
                if (res.success) {
                    toast.success(label, undoFn ? {
                        action: { label: "Undo", onClick: undoFn },
                        duration: 6000,
                    } : undefined);
                    closeSheet();
                    router.refresh();
                } else {
                    toast.error(res.error ?? `Failed: ${label}`);
                }
            } catch (e: any) {
                toast.error(e.message ?? "Something went wrong");
            }
        });
    }

    const SHEET_CFG = {
        approve: {
            title:       `Approve ${name}?`,
            description: "They gain full vendor access immediately.",
            placeholder: "Optional internal note…",
            required:    false,
            btnCls:      "bg-emerald-600 hover:bg-emerald-700",
        },
        reject: {
            title:       `Reject ${name}?`,
            description: "They'll receive your reason and can reapply.",
            placeholder: "Reason for rejection (sent to vendor)…",
            required:    true,
            btnCls:      "bg-rose-600 hover:bg-rose-700",
        },
        suspend: {
            title:       `Suspend ${name}?`,
            description: "Access revoked immediately. Can be re-activated later.",
            placeholder: "Why is this vendor being suspended?",
            required:    true,
            btnCls:      "bg-violet-600 hover:bg-violet-700",
        },
    } as const;

    // Sheet inner content — shared styling
    const sheetCls = "w-80 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/15";

    return (
        <div className="flex flex-col items-end gap-2">

            {/* ── Button row ── this is the portal anchor */}
            <div ref={anchorRef} className="flex items-center gap-1.5 flex-wrap justify-end">

                {/* Featured toggle */}
                <button
                    onClick={() => run(
                        () => toggleVendorFeatured(vendor.id, !vendor.is_featured),
                        vendor.is_featured ? "Removed from featured" : "Marked as featured",
                    )}
                    disabled={pending}
                    title={vendor.is_featured ? "Remove from featured" : "Mark as featured"}
                    className={cn(
                        "h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors",
                        "border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)]",
                        "hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        vendor.is_featured && "text-amber-500 border-amber-400/40 hover:text-amber-600",
                    )}
                >
                    <Star className={cn("h-3.5 w-3.5", vendor.is_featured && "fill-current")} />
                    {vendor.is_featured ? "Featured" : "Feature"}
                </button>

                {/* Commission */}
                <button
                    onClick={() => setSheet(sheet === "commission" ? null : "commission")}
                    disabled={pending}
                    className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Percent className="h-3.5 w-3.5" />
                    Commission
                </button>

                {/* Suspend */}
                {!isSuspended && (
                    <button
                        onClick={() => setSheet(sheet === "suspend" ? null : "suspend")}
                        disabled={pending}
                        className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors border border-violet-400/30 bg-transparent text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ShieldOff className="h-3.5 w-3.5" />
                        Suspend
                    </button>
                )}

                {/* Reject */}
                {!isSuspended && (
                    <button
                        onClick={() => setSheet(sheet === "reject" ? null : "reject")}
                        disabled={pending}
                        className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors border border-rose-400/30 bg-transparent text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                    </button>
                )}

                {/* Approve */}
                {(isPending || status === "rejected") && (
                    <button
                        onClick={() => setSheet(sheet === "approve" ? null : "approve")}
                        disabled={pending}
                        className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {pending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve
                    </button>
                )}

                {/* Re-activate suspended */}
                {isSuspended && (
                    <button
                        onClick={() => run(
                            () => approveVendor(vendor.id, "Re-activated by admin"),
                            `${name} re-activated`,
                        )}
                        disabled={pending}
                        className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {pending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Re-activate
                    </button>
                )}
            </div>

            {/* ── Action sheet portal (approve / reject / suspend) ── */}
            {sheet && sheet !== "commission" && (() => {
                const cfg     = SHEET_CFG[sheet];
                const disabled = pending || (cfg.required && !notes.trim());
                return (
                    <PortalSheet anchorRef={anchorRef} onClose={closeSheet}>
                        <div className={sheetCls}>
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">
                                {cfg.title}
                            </p>
                            <p className="text-[12px] text-[var(--color-text-muted)] mb-3">
                                {cfg.description}
                            </p>
                            <textarea
                                autoFocus
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={cfg.placeholder}
                                rows={3}
                                className="w-full px-2.5 py-2 text-[12px] rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-y outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all box-border"
                            />
                            <div className="flex items-center justify-end gap-2 mt-3">
                                <button
                                    onClick={closeSheet}
                                    className="h-7 px-3 rounded text-[12px] font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={disabled}
                                    onClick={() => {
                                        if (sheet === "approve") {
                                            run(
                                                () => approveVendor(vendor.id, notes),
                                                `${name} approved`,
                                                () => revertVendorApproval(vendor.id).then(() => router.refresh()),
                                            );
                                        } else if (sheet === "reject") {
                                            run(() => rejectVendor(vendor.id, notes), `${name} rejected`);
                                        } else if (sheet === "suspend") {
                                            run(() => suspendVendor(vendor.id, notes), `${name} suspended`);
                                        }
                                    }}
                                    className={cn(
                                        "h-7 px-3 rounded text-[12px] font-semibold text-white inline-flex items-center gap-1.5 transition-opacity",
                                        cfg.btnCls,
                                        disabled && "opacity-40 cursor-not-allowed",
                                    )}
                                >
                                    {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {sheet.charAt(0).toUpperCase() + sheet.slice(1)}
                                </button>
                            </div>
                        </div>
                    </PortalSheet>
                );
            })()}

            {/* ── Commission sheet portal ── */}
            {sheet === "commission" && (
                <PortalSheet anchorRef={anchorRef} onClose={closeSheet}>
                    <div className={sheetCls} style={{ width: 280 }}>
                        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">
                            Platform commission rate
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={commissionRate}
                                onChange={(e) => setCommissionRate(Number(e.target.value))}
                                className="w-20 px-2.5 py-1.5 text-[14px] font-semibold font-mono text-right rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                            <span className="text-[14px] text-[var(--color-text-muted)]">%</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3">
                            <button
                                onClick={closeSheet}
                                className="h-7 px-3 rounded text-[12px] font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={pending}
                                onClick={() => run(
                                    () => updateVendorCommission(vendor.id, commissionRate),
                                    "Commission updated",
                                )}
                                className={cn(
                                    "h-7 px-3 rounded text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-1.5 transition-colors",
                                    pending && "opacity-40 cursor-not-allowed",
                                )}
                            >
                                {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </PortalSheet>
            )}
        </div>
    );
}