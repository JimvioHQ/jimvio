"use client"

import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import {
    QrCode, KeyRound, Smartphone, Copy, CheckCircle2, XCircle,
    ShieldCheck, Loader2, X, Key, AlertTriangle, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { initiate2FASetup, verify2FASetup } from "@/lib/actions/security"
import type { TwoFASetupData } from "@/lib/actions/security"
import { BrandBtn, Card } from "@/components/admin/form-primitive"

type Step = "loading" | "method" | "verify" | "backup"
type Method = "qr" | "manual"

export function TwoFASetup({
    onComplete, onCancel,
}: {
    onComplete: () => void
    onCancel: () => void
}) {
    const [step, setStep] = useState<Step>("loading")
    const [method, setMethod] = useState<Method>("qr")
    const [setupData, setSetupData] = useState<TwoFASetupData | null>(null)
    const [initErr, setInitErr] = useState<string | null>(null)

    // ── Init on mount ──
    const load = useCallback(async () => {
        setInitErr(null)
        setStep("loading")
        try {
            const data = await initiate2FASetup()
            setSetupData(data)
            setStep("method")
        } catch (e) {
            setInitErr((e as Error).message ?? "Failed to initialise 2FA")
            setStep("method") // show error UI on the method step
        }
    }, [])

    useEffect(() => { load() }, [load])

    if (step === "loading") {
        return (
            <Card>
                <div className="flex items-center gap-3 py-6 justify-center">
                    <Loader2 className="size-5 animate-spin" style={{ color: "var(--color-accent)" }} />
                    <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        Generating secure key…
                    </span>
                </div>
            </Card>
        )
    }

    if (initErr || !setupData) {
        return (
            <Card>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-danger)" }}>
                        <XCircle className="size-4 shrink-0" />{initErr ?? "Setup failed"}
                    </div>
                    <div className="flex gap-3">
                        <BrandBtn onClick={load} variant="primary">Retry</BrandBtn>
                        <BrandBtn onClick={onCancel} variant="ghost">Cancel</BrandBtn>
                    </div>
                </div>
            </Card>
        )
    }

    if (step === "backup") {
        return <BackupCodesStep codes={setupData.backupCodes} onDone={onComplete} />
    }

    if (step === "verify") {
        return (
            <VerifyStep
                method={method}
                setupData={setupData}
                onBack={() => setStep("method")}
                onVerified={() => setStep("backup")}
                onCancel={onCancel}
            />
        )
    }

    // step === "method"
    return (
        <MethodPickerStep
            setupData={setupData}
            method={method}
            onMethodChange={setMethod}
            onContinue={() => setStep("verify")}
            onCancel={onCancel}
        />
    )
}

// ─────────────────────────────────────────────
// Step 1 — Pick method (QR or manual) and follow instructions
// ─────────────────────────────────────────────

function MethodPickerStep({
    setupData, method, onMethodChange, onContinue, onCancel,
}: {
    setupData: TwoFASetupData
    method: Method
    onMethodChange: (m: Method) => void
    onContinue: () => void
    onCancel: () => void
}) {
    const [copied, setCopied] = useState(false)

    const copySecret = () => {
        navigator.clipboard.writeText(setupData.secret)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Card>
            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg flex items-center justify-center"
                            style={{ background: "var(--color-accent-light)" }}>
                            <Smartphone className="size-4" style={{ color: "var(--color-accent)" }} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                Set up authenticator app
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                Works with Google Authenticator, Authy, 1Password, Microsoft Authenticator
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Cancel setup"
                        className="size-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Method tabs */}
                <div
                    className="grid grid-cols-2 gap-1 p-1 rounded-lg"
                    style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                >
                    <MethodTab
                        active={method === "qr"}
                        onClick={() => onMethodChange("qr")}
                        icon={<QrCode className="size-3.5" />}
                        label="Scan QR code"
                        hint="Easiest"
                    />
                    <MethodTab
                        active={method === "manual"}
                        onClick={() => onMethodChange("manual")}
                        icon={<KeyRound className="size-3.5" />}
                        label="Enter key manually"
                        hint="No camera"
                    />
                </div>

                {/* Content for selected method */}
                {method === "qr"
                    ? <QRPanel setupData={setupData} />
                    : <ManualPanel setupData={setupData} copied={copied} onCopy={copySecret} />
                }

                {/* Footer */}
                <div className="flex items-center justify-between pt-3"
                    style={{ borderTop: "1px solid var(--color-border)" }}>
                    <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        Already added to your app?
                    </span>
                    <BrandBtn
                        onClick={onContinue}
                        variant="primary"
                        icon={<ChevronRight className="size-4" />}
                    >
                        Continue to verify
                    </BrandBtn>
                </div>
            </div>
        </Card>
    )
}

function MethodTab({
    active, onClick, icon, label, hint,
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
    hint?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-[12px] font-semibold transition-all",
                active ? "shadow-sm" : "hover:bg-white/40"
            )}
            style={{
                background: active ? "var(--color-surface)" : "transparent",
                color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
                border: active ? "1px solid var(--color-border)" : "1px solid transparent",
            }}
        >
            {icon}
            <span>{label}</span>
            {hint && (
                <span
                    className="text-[10px] uppercase tracking-wide font-bold rounded-full px-1.5 py-0.5"
                    style={{
                        background: active ? "var(--color-accent-light)" : "transparent",
                        color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                >
                    {hint}
                </span>
            )}
        </button>
    )
}

// ─────────────────────────────────────────────
// QR panel
// ─────────────────────────────────────────────

function QRPanel({ setupData }: { setupData: TwoFASetupData }) {
    return (
        <div className="space-y-4">
            <ol className="space-y-2 text-[12px] pl-1" style={{ color: "var(--color-text-secondary)" }}>
                <li className="flex gap-2">
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>1.</span>
                    Open your authenticator app
                </li>
                <li className="flex gap-2">
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>2.</span>
                    Tap <strong style={{ color: "var(--color-text-primary)" }}>+</strong> or <strong style={{ color: "var(--color-text-primary)" }}>Add account</strong>, then <strong style={{ color: "var(--color-text-primary)" }}>Scan QR code</strong>
                </li>
                <li className="flex gap-2">
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>3.</span>
                    Point your camera at the code below
                </li>
            </ol>

            <div
                className="flex items-center justify-center p-6 rounded-lg"
                style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
            >
                <div
                    className="p-3 rounded-md"
                    style={{ background: "#fff", boxShadow: "var(--shadow-md)" }}
                >
                    <Image
                        src={setupData.qrCodeDataUrl}
                        alt={`QR code for ${setupData.account}`}
                        width={180}
                        height={180}
                        unoptimized // data URL — already optimized
                    />
                </div>
            </div>

            <div
                className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-md"
                style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
            >
                <KeyRound className="size-3.5 shrink-0" />
                <span>Can't scan? <button
                    type="button"
                    className="underline font-semibold hover:opacity-70"
                    onClick={() => {
                        // The parent's onMethodChange isn't directly accessible here,
                        // but we can dispatch a custom event or lift state. For simplicity,
                        // tell the user how to switch.
                    }}>Use manual entry instead</button> using the tab above</span>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Manual entry panel
// ─────────────────────────────────────────────

function ManualPanel({
    setupData, copied, onCopy,
}: {
    setupData: TwoFASetupData
    copied: boolean
    onCopy: () => void
}) {
    // Format the secret into 4-char groups: JBSW Y3DP EHPK 3PXP
    const formatted = setupData.secret.match(/.{1,4}/g)?.join(" ") ?? setupData.secret

    return (
        <div className="space-y-4">
            <ol className="space-y-2 text-[12px] pl-1" style={{ color: "var(--color-text-secondary)" }}>
                <li className="flex gap-2">
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>1.</span>
                    Open your authenticator app
                </li>
                <li className="flex gap-2">
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>2.</span>
                    Tap <strong style={{ color: "var(--color-text-primary)" }}>+</strong> or <strong style={{ color: "var(--color-text-primary)" }}>Add account</strong>, then <strong style={{ color: "var(--color-text-primary)" }}>Enter setup key</strong>
                </li>
                <li className="flex gap-2">
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>3.</span>
                    Enter the account name and key shown below
                </li>
            </ol>

            <div
                className="rounded-lg p-4 space-y-4"
                style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
            >
                {/* Account name */}
                <FieldRow
                    label="Account name"
                    value={setupData.account}
                    hint={`Some apps call this "username" or "email"`}
                />

                <div className="h-px" style={{ background: "var(--color-border)" }} />

                {/* Issuer */}
                <FieldRow
                    label="Issuer"
                    value={setupData.issuer}
                    hint={`Sometimes labeled "service" or "site"`}
                />

                <div className="h-px" style={{ background: "var(--color-border)" }} />

                {/* Secret key */}
                <div>
                    <div
                        className="text-[10px] font-bold uppercase tracking-widest mb-2"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        Setup key (secret)
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="flex-1 rounded-md px-3 py-2.5 font-mono text-[13px] tracking-widest overflow-x-auto select-all"
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                            }}
                        >
                            {formatted}
                        </div>
                        <button
                            type="button"
                            onClick={onCopy}
                            aria-label="Copy setup key"
                            className="shrink-0 size-10 rounded-md flex items-center justify-center transition-all"
                            style={{
                                background: copied ? "var(--color-success-light)" : "var(--color-accent-light)",
                                border: `1px solid ${copied ? "var(--color-success)" : "var(--color-accent)"}`,
                                color: copied ? "var(--color-success)" : "var(--color-accent)",
                            }}
                        >
                            {copied
                                ? <CheckCircle2 className="size-4" />
                                : <Copy className="size-4" />
                            }
                        </button>
                    </div>
                </div>

                {/* Type hint */}
                <div
                    className="flex items-start gap-2 rounded-md px-3 py-2 text-[11px]"
                    style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
                >
                    <KeyRound className="size-3.5 mt-0.5 shrink-0" />
                    <div className="leading-relaxed">
                        When prompted, select: <strong>Time-based (TOTP)</strong>, <strong>SHA-1</strong>, <strong>6 digits</strong>, <strong>30s interval</strong>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FieldRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: "var(--color-text-muted)" }}>
                {label}
            </div>
            <code className="text-[13px] font-mono select-all"
                style={{ color: "var(--color-text-primary)" }}>
                {value}
            </code>
            {hint && (
                <div className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                    {hint}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// Step 2 — Verify
// ─────────────────────────────────────────────

function VerifyStep({
    method, setupData, onBack, onVerified, onCancel,
}: {
    method: Method
    setupData: TwoFASetupData
    onBack: () => void
    onVerified: () => void
    onCancel: () => void
}) {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    const submit = async () => {
        if (code.length !== 6) { setErr("Enter the 6-digit code from your app"); return }
        setLoading(true); setErr(null)
        try {
            const r = await verify2FASetup(code)
            if (r.success) {
                if (setupData.backupCodes.length > 0) onVerified()
                else onCancel() // shouldn't happen but be safe
            } else {
                setErr(r.error ?? "Verification failed")
            }
        } catch (e) {
            setErr((e as Error).message ?? "Failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg flex items-center justify-center"
                            style={{ background: "var(--color-accent-light)" }}>
                            <ShieldCheck className="size-4" style={{ color: "var(--color-accent)" }} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                Enter verification code
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                Type the 6-digit code from your authenticator app
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Cancel setup"
                        className="size-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Code input */}
                <div className="space-y-3">
                    <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={7} // 6 digits + space
                        placeholder="000 000"
                        value={code.match(/.{1,3}/g)?.join(" ") ?? code}
                        onChange={e => setCode(e.target.value.replace(/\D|\s/g, "").slice(0, 6))}
                        onKeyDown={e => { if (e.key === "Enter" && code.length === 6) submit() }}
                        className="font-mono"
                        style={{
                            width: 180,
                            height: 52,
                            fontSize: 22,
                            fontWeight: 700,
                            textAlign: "center",
                            letterSpacing: "0.3em",
                            borderRadius: "var(--radius-sm)",
                            border: `1px solid ${err ? "var(--color-danger)" : code.length === 6 ? "var(--color-success)" : "var(--color-border)"}`,
                            outline: "none",
                            background: "var(--color-surface)",
                            color: "var(--color-text-primary)",
                            padding: "0 12px",
                            transition: "border-color 0.15s",
                        }}
                        autoFocus
                    />

                    {err && (
                        <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-danger)" }}>
                            <XCircle className="size-3.5 shrink-0" />{err}
                        </div>
                    )}

                    <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        Used method: <strong>{method === "qr" ? "QR scan" : "Manual entry"}</strong>
                        <button
                            type="button"
                            onClick={onBack}
                            className="ml-2 underline hover:opacity-70 font-semibold"
                        >
                            Switch method
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
                    <BrandBtn
                        onClick={submit}
                        disabled={loading || code.length !== 6}
                        loading={loading}
                        variant="primary"
                        icon={<ShieldCheck className="size-4" />}
                    >
                        Verify and enable
                    </BrandBtn>
                    <BrandBtn onClick={onBack} variant="ghost">Back</BrandBtn>
                </div>
            </div>
        </Card>
    )
}

// ─────────────────────────────────────────────
// Step 3 — Backup codes
// ─────────────────────────────────────────────

function BackupCodesStep({
    codes, onDone,
}: {
    codes: string[]
    onDone: () => void
}) {
    const [confirmed, setConfirmed] = useState(false)
    const [copied, setCopied] = useState(false)

    const copyAll = () => {
        navigator.clipboard.writeText(codes.join("\n"))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const downloadTxt = () => {
        const blob = new Blob([codes.join("\n")], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "jimvio-backup-codes.txt"
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Card accent="warning">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(240, 180, 41, 0.15)" }}>
                        <Key className="size-4" style={{ color: "var(--color-warning)" }} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            Save your backup codes
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                            Use one of these if you lose access to your authenticator app
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-2 text-[12px] p-3 rounded-md"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-warning)" }}>
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: "var(--color-warning)" }} />
                    <div style={{ color: "var(--color-text-secondary)" }}>
                        <strong style={{ color: "var(--color-text-primary)" }}>Save these now.</strong> Each code can be used once.
                        You won't be able to see them again unless you regenerate.
                    </div>
                </div>

                <div
                    className="grid grid-cols-2 gap-2 p-4 rounded-lg"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                    {codes.map((c, i) => (
                        <code
                            key={i}
                            className="text-[13px] font-mono px-3 py-2 rounded text-center select-all"
                            style={{
                                background: "var(--color-surface-secondary)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                                letterSpacing: "0.05em",
                            }}
                        >
                            {c}
                        </code>
                    ))}
                </div>

                <div className="flex gap-2">
                    <BrandBtn onClick={copyAll} variant="secondary" size="sm"
                        icon={copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}>
                        {copied ? "Copied" : "Copy all"}
                    </BrandBtn>
                    <BrandBtn onClick={downloadTxt} variant="secondary" size="sm">
                        Download .txt
                    </BrandBtn>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none pt-2"
                    style={{ borderTop: "1px solid var(--color-border)" }}>
                    <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={e => setConfirmed(e.target.checked)}
                        className="size-4 rounded accent-[var(--color-accent,#fd5000)]"
                    />
                    <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                        I've saved my backup codes in a safe place
                    </span>
                </label>

                <BrandBtn
                    onClick={onDone}
                    disabled={!confirmed}
                    variant="primary"
                    icon={<ShieldCheck className="size-4" />}
                >
                    Finish setup
                </BrandBtn>
            </div>
        </Card>
    )
}