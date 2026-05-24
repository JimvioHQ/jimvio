"use client"

import { X } from "lucide-react"
import { BrandBtn } from "@/components/admin/form-primitive"
import type { Session } from "@/lib/actions/security"

export function SessionCard({
    session, onRevoke, isRevoking,
}: {
    session: Session
    onRevoke: () => void
    isRevoking: boolean
}) {
    return (
        <div
            className="flex items-center justify-between p-4"
            style={{
                borderRadius: "var(--radius-sm)",
                border: session.current
                    ? "1px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                background: session.current ? "var(--color-accent-light)" : "var(--color-surface)",
            }}
        >
            <div className="flex items-center gap-3.5">
                <div
                    className="size-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{
                        background: session.current ? "var(--color-accent)" : "var(--color-surface-secondary)",
                        color: session.current ? "#fff" : "var(--color-text-muted)",
                    }}
                >
                    {session.device[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {session.device}
                        </span>
                        {session.current && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                style={{ background: "var(--color-accent)", color: "#fff" }}
                            >
                                <span className="size-1.5 rounded-full bg-white animate-pulse" />Active
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {session.ip} · {session.location} · {session.lastActivity}
                    </div>
                </div>
            </div>
            {!session.current && (
                <BrandBtn
                    onClick={onRevoke}
                    disabled={isRevoking}
                    loading={isRevoking}
                    variant="ghost"
                    size="sm"
                    icon={<X className="size-3" />}
                >
                    <span style={{ color: "var(--color-danger)" }}>Revoke</span>
                </BrandBtn>
            )}
        </div>
    )
}