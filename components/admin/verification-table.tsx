"use client";


import React, { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
    CheckCircle2, XCircle, Loader2, ExternalLink,
    Globe, ShieldOff, Store, Phone, MapPin,
    FileText, Link2, ChevronDown, ChevronUp,
} from "lucide-react";
import { approveVendor, rejectVendor, suspendVendor } from "@/lib/actions/admin-vendors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Th } from "@/components/ui/admin";

// ─── Portal sheet ─────────────────────────────────────────────────────────────

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

    const reposition = useCallback(() => {
        const el = anchorRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setCoords({
            top: rect.bottom + window.scrollY + 6,
            right: window.innerWidth - rect.right,
        });
    }, [anchorRef]);

    useEffect(() => {
        reposition();
        window.addEventListener("scroll", reposition, true);
        window.addEventListener("resize", reposition);
        return () => {
            window.removeEventListener("scroll", reposition, true);
            window.removeEventListener("resize", reposition);
        };
    }, [reposition]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            if (anchorRef.current?.contains(target)) return;
            onClose();
        }
        const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener("mousedown", handleClick);
        };
    }, [anchorRef, onClose]);

    if (!coords) return null;

    return createPortal(
        <div
            style={{ position: "absolute", top: coords.top, right: coords.right, zIndex: 9999 }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {children}
        </div>,
        document.body,
    );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function VendorAvatar({ name, avatarUrl, logo }: {
    name?: string; avatarUrl?: string; logo?: string;
}) {
    const [failed, setFailed] = useState(false);
    const src = logo || avatarUrl;
    const initial = name?.charAt(0)?.toUpperCase() ?? "?";
    const hue = (name ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

    if (src && !failed) {
        return (
            <img
                src={src} alt={name ?? ""}
                onError={() => setFailed(true)}
                className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
            />
        );
    }
    return (
        <div
            className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[14px] font-bold border border-[var(--color-border)]"
            style={{ background: `hsl(${hue} 45% 92%)`, color: `hsl(${hue} 45% 32%)` }}
        >
            {initial}
        </div>
    );
}

// ─── Trust checklist ──────────────────────────────────────────────────────────

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
    const filled = checks.filter((c) => c.ok).length;
    const tone = filled >= 5 ? "text-emerald-600 dark:text-emerald-400" : filled >= 3 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
    const barColor = filled >= 5 ? "bg-emerald-500" : filled >= 3 ? "bg-amber-500" : "bg-rose-500";

    return (
        <div className="inline-flex items-center gap-2">
            <div className="flex gap-0.5">
                {checks.map((c, i) => (
                    <span key={i} title={`${c.label}: ${c.ok ? "provided" : "missing"}`}
                        className={cn("w-1 h-3.5 rounded-[2px]", c.ok ? barColor : "bg-[var(--color-border)]")} />
                ))}
            </div>
            <span className={cn("text-[11px] font-semibold tabular-nums", tone)}>
                {filled}/{checks.length}
            </span>
        </div>
    );
}

// ─── Action sheet content ─────────────────────────────────────────────────────

function ActionSheetContent({ action, vendorName, onConfirm, onCancel, loading }: {
    action: "approve" | "reject" | "suspend";
    vendorName: string;
    onConfirm: (notes: string) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [notes, setNotes] = useState("");
    const cfg = {
        approve: { btnCls: "bg-emerald-600 hover:bg-emerald-700", title: "Approve", description: "They gain full vendor access right away.", placeholder: "Optional internal note (visible to admins only)…", required: false },
        reject: { btnCls: "bg-rose-600 hover:bg-rose-700", title: "Reject", description: "They'll see your reason and can reapply.", placeholder: "Reason for rejection — sent to vendor.", required: true },
        suspend: { btnCls: "bg-violet-600 hover:bg-violet-700", title: "Suspend", description: "Access revoked immediately. Can be re-activated later.", placeholder: "Why is this vendor being suspended?", required: true },
    }[action];

    const disabled = loading || (cfg.required && !notes.trim());

    return (
        <div className="w-80 p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/15">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">
                {cfg.title} {vendorName}?
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mb-2.5">
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
            <div className="flex items-center justify-end gap-2 mt-2.5">
                <button
                    onClick={onCancel}
                    className="h-7 px-3 rounded text-[12px] font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onConfirm(notes)}
                    disabled={disabled}
                    className={cn(
                        "h-7 px-3 rounded text-[12px] font-semibold text-white inline-flex items-center gap-1.5 transition-opacity",
                        cfg.btnCls,
                        disabled && "opacity-40 cursor-not-allowed",
                    )}
                >
                    {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                    {cfg.title}
                </button>
            </div>
        </div>
    );
}

// ─── Detail field ─────────────────────────────────────────────────────────────

function DetailField({ icon: Icon, label, value, mono }: {
    icon: React.ElementType; label: string; value: React.ReactNode; mono?: boolean;
}) {
    return (
        <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1">
                <Icon className="h-3 w-3" /> {label}
            </div>
            <div className={cn("text-[12px] text-[var(--color-text-primary)] break-words", mono && "font-mono")}>
                {value || <span className="text-[var(--color-text-muted)]">—</span>}
            </div>
        </div>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function VendorRow({ v, onDone }: { v: any; onDone: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [sheet, setSheet] = useState<"approve" | "reject" | "suspend" | null>(null);
    const [pending, startTransition] = useTransition();

    // Anchor for the portal — attached to the actions cell div
    const anchorRef = useRef<HTMLDivElement>(null);

    const name = v.business_name || "Unnamed store";
    const email = v.profiles?.email ?? v.owner_email ?? "—";
    const country = v.business_country || "—";
    const date = v.created_at ? new Date(v.created_at) : null;
    const daysAgo = date ? Math.floor((Date.now() - date.getTime()) / 86_400_000) : 0;

    const ageCls =
        daysAgo >= 14 ? "text-rose-600 font-semibold dark:text-rose-400" :
            daysAgo >= 7 ? "text-orange-600 font-semibold dark:text-orange-400" :
                daysAgo >= 3 ? "text-amber-600 dark:text-amber-400" :
                    "text-[var(--color-text-muted)]";

    function closeSheet() { setSheet(null); }

    function handleAction(action: "approve" | "reject" | "suspend", notes: string) {
        startTransition(async () => {
            try {
                const fn = action === "approve" ? approveVendor : action === "reject" ? rejectVendor : suspendVendor;
                const res = await fn(v.id, notes);
                if (res?.success) {
                    toast.success(`${name} ${action}d`, { duration: 5000 });
                    onDone(v.id);
                } else {
                    toast.error(res?.error || `Failed to ${action}`);
                }
            } catch (err: any) {
                toast.error(err.message || "Something went wrong");
            } finally {
                closeSheet();
            }
        });
    }

    return (
        <>
            <tr
                className="border-b border-[var(--color-border)]/70 hover:bg-[var(--color-surface-secondary)]/30 transition-colors cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Vendor */}
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                        <VendorAvatar name={name} logo={v.business_logo} avatarUrl={v.profiles?.avatar_url} />
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate max-w-[180px]">{name}</p>
                            <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[180px]">{email}</p>
                        </div>
                    </div>
                </td>

                {/* Country */}
                <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                        <Globe className="h-3 w-3 opacity-50 shrink-0" />
                        {country}
                    </span>
                </td>

                {/* Trust */}
                <td className="px-3 py-2.5">
                    <TrustChecklist v={v} />
                </td>

                {/* Waiting */}
                <td className="px-3 py-2.5">
                    <span className={cn("text-[12px] tabular-nums", ageCls)}>
                        {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
                    </span>
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {/* anchorRef lives here so the portal positions below this cell */}
                    <div ref={anchorRef} className="inline-flex items-center gap-1">

                        {/* Expand toggle */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                            className="w-6 h-6 rounded inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                        >
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {/* Profile link */}
                        <Link
                            href={`/admin/vendors/${v.id}`}
                            title="Open vendor profile"
                            onClick={(e) => e.stopPropagation()}
                            className="w-6 h-6 rounded inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-orange-500 hover:bg-[var(--color-surface-secondary)] transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>

                        {/* Suspend */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setSheet(sheet === "suspend" ? null : "suspend"); }}
                            disabled={pending}
                            title="Suspend"
                            className="w-6 h-6 rounded inline-flex items-center justify-center text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors disabled:opacity-40"
                        >
                            <ShieldOff className="h-3.5 w-3.5" />
                        </button>

                        {/* Reject */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setSheet(sheet === "reject" ? null : "reject"); }}
                            disabled={pending}
                            className="h-7 px-2.5 rounded text-[12px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 border border-rose-300/40 dark:border-rose-800/40 transition-colors disabled:opacity-40 inline-flex items-center gap-1"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                        </button>

                        {/* Approve */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setSheet(sheet === "approve" ? null : "approve"); }}
                            disabled={pending}
                            className="h-7 px-2.5 rounded text-[12px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
                        >
                            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Approve
                        </button>
                    </div>

                    {/* Portal sheet — renders into document.body */}
                    {sheet && (
                        <PortalSheet anchorRef={anchorRef} onClose={closeSheet}>
                            <ActionSheetContent
                                action={sheet}
                                vendorName={name}
                                loading={pending}
                                onConfirm={(notes) => handleAction(sheet, notes)}
                                onCancel={closeSheet}
                            />
                        </PortalSheet>
                    )}
                </td>
            </tr>

            {/* Expanded detail row */}
            {expanded && (
                <tr className="border-b border-[var(--color-border)]/70 bg-[var(--color-surface-secondary)]/40">
                    <td colSpan={5} className="px-5 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <DetailField icon={FileText} label="Description" value={v.business_description} />
                            <DetailField icon={Phone} label="Phone" value={v.business_phone} />
                            <DetailField icon={MapPin} label="Address" value={v.business_address} />
                            <DetailField icon={FileText} label="Tax ID" value={v.tax_id} mono />
                            <DetailField icon={Store} label="Type" value={v.business_type} />
                            <DetailField icon={Link2} label="Website" value={
                                v.website
                                    ? <a href={v.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">{v.website}</a>
                                    : null
                            } />
                        </div>
                        {v.business_banner && (
                            <img src={v.business_banner} alt="Banner"
                                className="mt-3 w-full max-h-24 object-cover rounded border border-[var(--color-border)]" />
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function VerificationTable({ vendors }: { vendors: any[] }) {
    const [list, setList] = useState(vendors);
    const handleDone = (id: string) => setList((prev) => prev.filter((v) => v.id !== id));

    if (list.length === 0) return null;

    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="overflow-x-auto rounded-t-xl">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60">
                            <Th>Vendor</Th>
                            <Th>Country</Th>
                            <Th>Trust signals</Th>
                            <Th>Waiting</Th>
                            <Th align="right">Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((v) => (
                            <VendorRow key={v.id} v={v} onDone={handleDone} />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
                <p className="text-[11px] text-[var(--color-text-muted)]">
                    {list.length} vendor{list.length !== 1 ? "s" : ""} pending review
                </p>
            </div>
        </div>
    );
}