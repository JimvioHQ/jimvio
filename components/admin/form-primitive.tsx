"use client"

import { ReactNode, useEffect, CSSProperties, MouseEventHandler } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle2, XCircle, X, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────
// Field — label + hint + input slot
// ─────────────────────────────────────────────

export function Field({
    label, hint, children, required,
}: {
    label: string
    hint?: string
    children: ReactNode
    required?: boolean
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label
                className="text-[11px] font-semibold uppercase tracking-[0.07em]"
                style={{ color: "var(--color-text-secondary)" }}
            >
                {label}
                {required && <span className="ml-1" style={{ color: "var(--color-accent)" }}>*</span>}
            </Label>
            {hint && (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                    {hint}
                </p>
            )}
            {children}
        </div>
    )
}

// ─────────────────────────────────────────────
// Inputs
// ─────────────────────────────────────────────

const baseInputStyle: CSSProperties = {
    height: 36,
    fontSize: 13,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
}

export function NumInput({
    value, onChange, min, max, step = 1, placeholder,
}: {
    value: number | string | null
    onChange: (v: number | null) => void
    min?: number; max?: number; step?: number; placeholder?: string
}) {
    return (
        <Input
            type="number" min={min} max={max} step={step} placeholder={placeholder}
            value={value ?? ""}
            onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
            className="tabular-nums focus-visible:ring-1 focus-visible:ring-[var(--color-accent,#fd5000)] focus-visible:border-[var(--color-accent,#fd5000)]"
            style={baseInputStyle}
        />
    )
}

export function TextInput({
    value, onChange, placeholder, type = "text",
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    type?: string
}) {
    return (
        <Input
            type={type} value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent,#fd5000)] focus-visible:border-[var(--color-accent,#fd5000)]"
            style={baseInputStyle}
        />
    )
}

export function SelectInput({
    value, onChange, options,
}: {
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger
                className="focus:ring-1 focus:ring-[var(--color-accent,#fd5000)] focus:border-[var(--color-accent,#fd5000)]"
                style={baseInputStyle}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
                {options.map(o => (
                    <SelectItem key={o.value} value={o.value} style={{ fontSize: 13 }}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// ─────────────────────────────────────────────
// Toggle
// ─────────────────────────────────────────────

export function Toggle({
    checked, onChange, label, description, danger,
}: {
    checked: boolean
    onChange: (v: boolean) => void
    label: string
    description?: string
    danger?: boolean
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer select-none group">
            <Switch
                checked={checked}
                onCheckedChange={onChange}
                className={cn(
                    "mt-0.5 shrink-0",
                    checked && !danger && "data-[state=checked]:bg-[var(--color-accent,#fd5000)]",
                    checked && danger && "data-[state=checked]:bg-[var(--color-danger,#e5484d)]"
                )}
            />
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {label}
                </span>
                {description && (
                    <span className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                        {description}
                    </span>
                )}
            </div>
        </label>
    )
}

// ─────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────

export function Grid({ cols = 2, children }: { cols?: 1 | 2 | 3; children: ReactNode }) {
    return (
        <div className={cn(
            "grid gap-5",
            cols === 1 && "grid-cols-1",
            cols === 2 && "grid-cols-1 md:grid-cols-2",
            cols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
            {children}
        </div>
    )
}

export function Divider({ label }: { label?: string }) {
    return (
        <div className="flex items-center gap-3 my-2">
            {label && (
                <span
                    className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    {label}
                </span>
            )}
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>
    )
}

export function Card({
    children, accent, padding = "lg",
}: {
    children: ReactNode
    accent?: "default" | "success" | "warning" | "danger"
    padding?: "sm" | "md" | "lg"
}) {
    const borderColor = {
        default: "var(--color-border)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
    }[accent ?? "default"]

    const bgColor = {
        default: "var(--color-surface)",
        success: "var(--color-success-light)",
        warning: "var(--color-warning-light)",
        danger: "var(--color-danger-light)",
    }[accent ?? "default"]

    const pad = { sm: "12px 16px", md: "16px 20px", lg: "20px 24px" }[padding]

    return (
        <div style={{
            borderRadius: "var(--radius-md)",
            border: `1px solid ${borderColor}`,
            background: bgColor,
            padding: pad,
        }}>
            {children}
        </div>
    )
}

// ─────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────

export function BrandBtn({
    onClick, disabled, loading, icon, children,
    variant = "primary", size = "md", type = "button",
}: {
    onClick?: MouseEventHandler<HTMLButtonElement>
    disabled?: boolean
    loading?: boolean
    icon?: ReactNode
    children: ReactNode
    variant?: "primary" | "secondary" | "danger" | "ghost"
    size?: "sm" | "md"
    type?: "button" | "submit"
}) {
    const sizeStyles = {
        sm: { height: 30, fontSize: 12, padding: "0 12px" },
        md: { height: 36, fontSize: 13, padding: "0 16px" },
    }[size]

    const variants: Record<string, CSSProperties> = {
        primary: { background: "var(--color-accent)", color: "#fff" },
        secondary: {
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
        },
        danger: { background: "var(--color-danger)", color: "#fff" },
        ghost: {
            background: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
        },
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                transition: "all 0.15s",
                outline: "none",
                border: "none",
                ...sizeStyles,
                ...variants[variant],
            }}
        >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
            {children}
        </button>
    )
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────

export type ToastMsg = { msg: string; type: "ok" | "err" }

export function Toast({
    message, type, onClose,
}: {
    message: string
    type: "ok" | "err"
    onClose: () => void
}) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500)
        return () => clearTimeout(t)
    }, [onClose])

    const ok = type === "ok"

    return (
        <div
            className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 text-sm font-medium animate-in slide-in-from-top-2 fade-in-0 duration-300"
            style={{
                background: "var(--color-surface)",
                border: `1px solid ${ok ? "var(--color-success)" : "var(--color-danger)"}`,
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                minWidth: 280,
            }}
        >
            <div
                className="size-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: ok ? "var(--color-success-light)" : "var(--color-danger-light)" }}
            >
                {ok
                    ? <CheckCircle2 className="size-3.5" style={{ color: "var(--color-success)" }} />
                    : <XCircle className="size-3.5" style={{ color: "var(--color-danger)" }} />
                }
            </div>
            <span style={{ color: "var(--color-text-primary)", flex: 1 }}>{message}</span>
            <button
                type="button"
                onClick={onClose}
                className="hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Dismiss notification"
            >
                <X className="size-3.5" />
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────
// SaveBar — per-tab save dock
// ─────────────────────────────────────────────

export function SaveBar({
    pending, onSave, onDiscard,
}: {
    pending: boolean
    onSave: () => void
    onDiscard?: () => void
}) {
    return (
        <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 animate-in slide-in-from-bottom-4 fade-in-0 duration-200"
            style={{
                background: "#0a0a0a",
                border: "1px solid #1f1f1f",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-xl)",
            }}
        >
            <Zap className="size-4 shrink-0" style={{ color: "var(--color-accent)" }} />
            <span className="text-xs" style={{ color: "#888" }}>You have unsaved changes</span>
            {onDiscard && (
                <button
                    type="button"
                    onClick={onDiscard}
                    disabled={pending}
                    className="text-xs font-medium"
                    style={{ color: "#888" }}
                >
                    Discard
                </button>
            )}
            <BrandBtn onClick={onSave} disabled={pending} loading={pending} variant="primary">
                {pending ? "Saving…" : "Save changes"}
            </BrandBtn>
        </div>
    )
}

// ─────────────────────────────────────────────
// useBeforeUnload — warn on dirty navigation
// ─────────────────────────────────────────────

export function useBeforeUnload(dirty: boolean) {
    useEffect(() => {
        if (!dirty) return
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ""
        }
        window.addEventListener("beforeunload", handler)
        return () => window.removeEventListener("beforeunload", handler)
    }, [dirty])
}