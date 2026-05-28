"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import {
    QrCode, KeyRound, Copy, CheckCircle2, XCircle, ShieldCheck,
    Loader2, X, AlertTriangle, ChevronRight, ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { initiate2FASetup, verify2FASetup } from "@/lib/actions/security"
import type { TwoFASetupData } from "@/lib/actions/security"
import { BrandBtn } from "@/components/admin/form-primitive"
import { OtpInput, type OtpInputHandle } from "@/components/ui/otp-input"

type Step = "loading" | "method" | "verify" | "backup"
type Method = "qr" | "manual"

const STEPS: { id: Step; label: string }[] = [
    { id: "method", label: "Add account" },
    { id: "verify", label: "Verify" },
    { id: "backup", label: "Save codes" },
]

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

    const load = useCallback(async () => {
        setInitErr(null)
        setStep("loading")
        try {
            const data = await initiate2FASetup()
            setSetupData(data)
            setStep("method")
        } catch (e) {
            setInitErr((e as Error).message ?? "Failed to initialise 2FA")
            setStep("method")
        }
    }, [])

    useEffect(() => { load() }, [load])

    return (
        <Shell step={step} onCancel={onCancel}>
            {step === "loading" && <LoadingState />}

            {initErr && setupData == null && (
                <ErrorState message={initErr} onRetry={load} onCancel={onCancel} />
            )}

            {step === "method" && setupData && (
                <MethodPickerStep
                    setupData={setupData}
                    method={method}
                    onMethodChange={setMethod}
                    onContinue={() => setStep("verify")}
                />
            )}

            {step === "verify" && setupData && (
                <VerifyStep
                    method={method}
                    onBack={() => setStep("method")}
                    onVerified={() =>
                        setupData.backupCodes.length > 0 ? setStep("backup") : onComplete()
                    }
                />
            )}

            {step === "backup" && setupData && (
                <BackupCodesStep codes={setupData.backupCodes} onDone={onComplete} />
            )}
        </Shell>
    )
}

// ─────────────────────────────────────────────
// Shell — frame + progress + close button
// ─────────────────────────────────────────────

function Shell({
    step, onCancel, children,
}: {
    step: Step
    onCancel: () => void
    children: React.ReactNode
}) {
    return (
        <article
            className="relative grid grid-cols-[3px_1fr] overflow-hidden"
            style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
            }}
        >
            <div aria-hidden style={{ background: "var(--color-accent)" }} />

            <div>
                {/* Header bar: label + steps + close */}
                <header
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                            style={{ color: "var(--color-accent)" }}
                        >
                            <ShieldCheck className="size-3" />
                            Two-factor setup
                        </div>
                        <StepIndicator step={step} />
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Cancel setup"
                        className="size-7 rounded-md flex items-center justify-center transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        <X className="size-4" />
                    </button>
                </header>

                {/* Body */}
                <div className="px-6 py-6">{children}</div>
            </div>
        </article>
    )
}

function StepIndicator({ step }: { step: Step }) {
    const currentIdx = STEPS.findIndex(s => s.id === step)
    if (currentIdx < 0) return null

    return (
        <ol className="hidden sm:flex items-center gap-2">
            {STEPS.map((s, i) => {
                const isPast = i < currentIdx
                const isCurrent = i === currentIdx
                return (
                    <li key={s.id} className="flex items-center gap-2">
                        <span
                            className="inline-flex items-center gap-1.5 text-[11px]"
                            style={{
                                color: isCurrent
                                    ? "var(--color-text-primary)"
                                    : "var(--color-text-muted)",
                                fontWeight: isCurrent ? 600 : 500,
                            }}
                        >
                            <span
                                className="tabular-nums text-[10px] font-bold"
                                style={{
                                    color: isPast
                                        ? "var(--color-success)"
                                        : isCurrent
                                            ? "var(--color-accent)"
                                            : "var(--color-text-muted)",
                                }}
                            >
                                {isPast ? "✓" : String(i + 1).padStart(2, "0")}
                            </span>
                            {s.label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <span
                                aria-hidden
                                className="w-4 h-px"
                                style={{ background: "var(--color-border)" }}
                            />
                        )}
                    </li>
                )
            })}
        </ol>
    )
}

// ─────────────────────────────────────────────
// Loading / error states
// ─────────────────────────────────────────────

function LoadingState() {
    return (
        <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-5 animate-spin" style={{ color: "var(--color-accent)" }} />
            <span className="text-[12.5px]" style={{ color: "var(--color-text-muted)" }}>
                Generating your authenticator key…
            </span>
        </div>
    )
}

function ErrorState({
    message, onRetry, onCancel,
}: {
    message: string
    onRetry: () => void
    onCancel: () => void
}) {
    return (
        <div className="space-y-4">
            <div
                role="alert"
                className="flex items-start gap-2 px-3.5 py-2.5 text-[12.5px]"
                style={{
                    color: "var(--color-danger)",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--color-danger)",
                    background: "color-mix(in srgb, var(--color-danger) 7%, transparent)",
                }}
            >
                <XCircle className="size-4 mt-0.5 shrink-0" />
                <span className="font-medium">{message}</span>
            </div>
            <div className="flex gap-3">
                <BrandBtn onClick={onRetry} variant="primary">Try again</BrandBtn>
                <BrandBtn onClick={onCancel} variant="ghost">Cancel</BrandBtn>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Step 1 — Method picker
// ─────────────────────────────────────────────

function MethodPickerStep({
    setupData, method, onMethodChange, onContinue,
}: {
    setupData: TwoFASetupData
    method: Method
    onMethodChange: (m: Method) => void
    onContinue: () => void
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2
                    className="text-[18px] font-semibold leading-tight"
                    style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Add this account to your authenticator
                </h2>
                <p
                    className="mt-1.5 text-[12.5px] leading-relaxed max-w-[52ch]"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    You'll need an authenticator app like Google Authenticator, Authy,
                    1Password, or Microsoft Authenticator. Pick how you want to add the
                    account.
                </p>
            </div>

            <div
                role="tablist"
                aria-label="Add method"
                className="grid grid-cols-2 gap-1 p-1"
                style={{
                    background: "var(--color-surface-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                }}
            >
                <MethodTab
                    active={method === "qr"}
                    onClick={() => onMethodChange("qr")}
                    icon={<QrCode className="size-3.5" />}
                    label="Scan QR"
                    hint="Easiest"
                />
                <MethodTab
                    active={method === "manual"}
                    onClick={() => onMethodChange("manual")}
                    icon={<KeyRound className="size-3.5" />}
                    label="Type setup key"
                    hint="No camera"
                />
            </div>

            {method === "qr" ? (
                <QRPanel setupData={setupData} onSwitchToManual={() => onMethodChange("manual")} />
            ) : (
                <ManualPanel setupData={setupData} onSwitchToQR={() => onMethodChange("qr")} />
            )}

            <div
                className="pt-4 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--color-border)" }}
            >
                <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                    Added the account in your app?
                </span>
                <BrandBtn
                    onClick={onContinue}
                    variant="primary"
                    icon={<ChevronRight className="size-4" />}
                >
                    Verify your code
                </BrandBtn>
            </div>
        </div>
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
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 text-[12.5px] font-semibold transition-all",
            )}
            style={{
                borderRadius: "calc(var(--radius-sm) - 2px)",
                background: active ? "var(--color-surface)" : "transparent",
                color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
                border: active ? "1px solid var(--color-border)" : "1px solid transparent",
                boxShadow: active ? "var(--shadow-sm)" : undefined,
            }}
        >
            {icon}
            <span>{label}</span>
            {hint && (
                <span
                    className="text-[9.5px] uppercase tracking-[0.1em] font-bold"
                    style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
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

function QRPanel({
    setupData, onSwitchToManual,
}: {
    setupData: TwoFASetupData
    onSwitchToManual: () => void
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-start">
            <ol className="space-y-3">
                <Instruction
                    num={1}
                    body="Open your authenticator app on your phone."
                />
                <Instruction
                    num={2}
                    body={
                        <>
                            Tap <Inline>+</Inline> or <Inline>Add account</Inline>, then choose <Inline>Scan QR code</Inline>.
                        </>
                    }
                />
                <Instruction
                    num={3}
                    body="Point your camera at the code on the right."
                />
            </ol>

            <div className="flex flex-col items-center gap-3">
                <div
                    className="p-3"
                    style={{
                        background: "#fff",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        boxShadow: "var(--shadow-sm)",
                    }}
                >
                    <Image
                        src={setupData.qrCodeDataUrl}
                        alt={`QR code for ${setupData.account}`}
                        width={160}
                        height={160}
                        unoptimized
                    />
                </div>
                <button
                    type="button"
                    onClick={onSwitchToManual}
                    className="text-[11.5px] font-medium underline-offset-2 hover:underline transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Can't scan? Type the key instead
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Manual panel
// ─────────────────────────────────────────────

function ManualPanel({
    setupData, onSwitchToQR,
}: {
    setupData: TwoFASetupData
    onSwitchToQR: () => void
}) {
    const [copied, setCopied] = useState(false)
    const formatted = setupData.secret.match(/.{1,4}/g)?.join(" ") ?? setupData.secret

    const copy = () => {
        navigator.clipboard.writeText(setupData.secret)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-5">
            <ol className="space-y-3">
                <Instruction num={1} body="Open your authenticator app." />
                <Instruction
                    num={2}
                    body={
                        <>
                            Tap <Inline>+</Inline> or <Inline>Add account</Inline>, then choose <Inline>Enter setup key</Inline>.
                        </>
                    }
                />
                <Instruction num={3} body="Type or paste these details:" />
            </ol>

            <dl
                className="grid gap-0 overflow-hidden"
                style={{
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-secondary)",
                }}
            >
                <Row label="Account name" value={setupData.account} />
                <Row label="Issuer" value={setupData.issuer} />
                <div className="px-4 py-3.5 space-y-2.5">
                    <dt
                        className="text-[10px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        Setup key
                    </dt>
                    <dd className="flex items-center gap-2">
                        <code
                            className="flex-1 font-mono text-[14px] tracking-[0.08em] px-3 py-2 overflow-x-auto select-all"
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                                borderRadius: "calc(var(--radius-sm) - 2px)",
                            }}
                        >
                            {formatted}
                        </code>
                        <button
                            type="button"
                            onClick={copy}
                            aria-label={copied ? "Copied" : "Copy setup key"}
                            className="shrink-0 size-9 flex items-center justify-center transition-all"
                            style={{
                                background: copied
                                    ? "color-mix(in srgb, var(--color-success) 12%, transparent)"
                                    : "var(--color-surface)",
                                border: `1px solid ${copied ? "var(--color-success)" : "var(--color-border)"
                                    }`,
                                color: copied ? "var(--color-success)" : "var(--color-text-primary)",
                                borderRadius: "calc(var(--radius-sm) - 2px)",
                            }}
                        >
                            {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                        </button>
                    </dd>
                </div>
            </dl>

            <details className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                <summary
                    className="cursor-pointer font-medium hover:opacity-70 transition-opacity"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    Advanced: TOTP parameters
                </summary>
                <div className="mt-2 pl-3 space-y-1 leading-relaxed"
                    style={{ borderLeft: "1px solid var(--color-border)" }}>
                    <div>Type: <code className="font-mono">Time-based (TOTP)</code></div>
                    <div>Algorithm: <code className="font-mono">SHA-1</code></div>
                    <div>Digits: <code className="font-mono">6</code></div>
                    <div>Interval: <code className="font-mono">30s</code></div>
                </div>
            </details>

            <button
                type="button"
                onClick={onSwitchToQR}
                className="text-[11.5px] font-medium underline-offset-2 hover:underline transition-opacity hover:opacity-70"
                style={{ color: "var(--color-text-muted)" }}
            >
                ← Use QR code instead
            </button>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div
            className="px-4 py-3 grid grid-cols-[100px_1fr] gap-3 items-baseline"
            style={{ borderBottom: "1px solid var(--color-border)" }}
        >
            <dt
                className="text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: "var(--color-text-muted)" }}
            >
                {label}
            </dt>
            <dd
                className="font-mono text-[13px] select-all"
                style={{ color: "var(--color-text-primary)" }}
            >
                {value}
            </dd>
        </div>
    )
}

function Instruction({ num, body }: { num: number; body: React.ReactNode }) {
    return (
        <li className="flex items-baseline gap-3">
            <span
                className="shrink-0 tabular-nums text-[11px] font-bold"
                style={{ color: "var(--color-accent)" }}
            >
                {String(num).padStart(2, "0")}
            </span>
            <span
                className="text-[12.5px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
            >
                {body}
            </span>
        </li>
    )
}

function Inline({ children }: { children: React.ReactNode }) {
    return (
        <code
            className="font-mono text-[12px] px-1.5 py-0.5 mx-0.5"
            style={{
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "calc(var(--radius-sm) - 4px)",
                color: "var(--color-text-primary)",
            }}
        >
            {children}
        </code>
    )
}

// ─────────────────────────────────────────────
// Step 2 — Verify
// ─────────────────────────────────────────────

function VerifyStep({
    method, onBack, onVerified,
}: {
    method: Method
    onBack: () => void
    onVerified: () => void
}) {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState<string | null>(null)
    const otpRef = useRef<OtpInputHandle>(null)
    const lastSubmittedRef = useRef("")

    const submit = useCallback(
        async (value: string) => {
            if (value.length !== 6 || lastSubmittedRef.current === value || loading) return
            lastSubmittedRef.current = value
            setLoading(true)
            setErr(null)
            try {
                const r = await verify2FASetup(value)
                if (r.success) {
                    onVerified()
                } else {
                    setErr(r.error ?? "Verification failed")
                    lastSubmittedRef.current = ""
                    requestAnimationFrame(() => otpRef.current?.clear())
                }
            } catch (e) {
                setErr((e as Error).message ?? "Failed to verify")
                lastSubmittedRef.current = ""
                requestAnimationFrame(() => otpRef.current?.clear())
            } finally {
                setLoading(false)
            }
        },
        [loading, onVerified],
    )

    return (
        <div className="space-y-6">
            <div>
                <h2
                    className="text-[18px] font-semibold leading-tight"
                    style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Enter the code from your app
                </h2>
                <p
                    className="mt-1.5 text-[12.5px] leading-relaxed max-w-[52ch]"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Open your authenticator app and type the 6-digit code shown for this
                    account. It refreshes every 30 seconds.
                </p>
            </div>

            {err && (
                <div
                    role="alert"
                    className="flex items-start gap-2 px-3.5 py-2.5 text-[12.5px]"
                    style={{
                        color: "var(--color-danger)",
                        borderRadius: "var(--radius-sm)",
                        borderLeft: "3px solid var(--color-danger)",
                        background: "color-mix(in srgb, var(--color-danger) 7%, transparent)",
                    }}
                >
                    <XCircle className="size-4 mt-0.5 shrink-0" />
                    <span className="font-medium">{err}</span>
                </div>
            )}

            <div className="space-y-2.5">
                <label
                    className="text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Verification code
                </label>
                <div className="flex items-center gap-3">
                    <OtpInput
                        ref={otpRef}
                        value={code}
                        onChange={v => {
                            setCode(v)
                            if (err) setErr(null)
                        }}
                        onComplete={submit}
                        invalid={!!err}
                        disabled={loading}
                        autoFocus
                    />
                    {loading && (
                        <Loader2
                            className="size-4 animate-spin"
                            style={{ color: "var(--color-text-muted)" }}
                        />
                    )}
                </div>
            </div>

            <div
                className="pt-4 flex items-center justify-between gap-3"
                style={{ borderTop: "1px solid var(--color-border)" }}
            >
                <button
                    type="button"
                    onClick={onBack}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    <ArrowLeft className="size-3.5" />
                    Back to {method === "qr" ? "QR code" : "setup key"}
                </button>
                <BrandBtn
                    onClick={() => submit(code)}
                    disabled={loading || code.length !== 6}
                    loading={loading}
                    variant="primary"
                    icon={<ShieldCheck className="size-4" />}
                >
                    Verify and continue
                </BrandBtn>
            </div>
        </div>
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
        a.download = `backup-codes-${new Date().toISOString().split("T")[0]}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6">
            <div>
                <div
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
                    style={{ color: "var(--color-warning)" }}
                >
                    <span className="size-1.5 rounded-full" style={{ background: "var(--color-warning)" }} />
                    One-time view
                </div>
                <h2
                    className="text-[18px] font-semibold leading-tight"
                    style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Save your backup codes
                </h2>
                <p
                    className="mt-1.5 text-[12.5px] leading-relaxed max-w-[52ch]"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Each code works once and lets you sign in without your authenticator
                    app. Store them somewhere safe — we won't show them again.
                </p>
            </div>

            <div
                className="flex items-start gap-2 px-3.5 py-2.5 text-[12px]"
                style={{
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--color-warning)",
                    background: "color-mix(in srgb, var(--color-warning) 8%, transparent)",
                    color: "var(--color-text-secondary)",
                }}
            >
                <AlertTriangle
                    className="size-4 mt-0.5 shrink-0"
                    style={{ color: "var(--color-warning)" }}
                />
                <span>
                    <strong style={{ color: "var(--color-text-primary)" }}>
                        Save them now.
                    </strong>{" "}
                    We can't show them again — losing both your app and these codes will
                    lock you out.
                </span>
            </div>

            <ol
                className="grid grid-cols-2 gap-x-6 gap-y-1 tabular-nums px-4 py-3"
                style={{
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-secondary)",
                }}
            >
                {codes.map((c, i) => (
                    <li
                        key={i}
                        className="flex items-baseline gap-3 py-2"
                        style={{
                            borderBottom:
                                i < codes.length - 1 && i < codes.length - 2
                                    ? "1px dotted var(--color-border)"
                                    : i < codes.length - 1 && i % 2 === 0
                                        ? "1px dotted var(--color-border)"
                                        : "none",
                        }}
                    >
                        <span
                            className="text-[10px] font-semibold tabular-nums w-5"
                            style={{ color: "var(--color-text-muted)" }}
                        >
                            {String(i + 1).padStart(2, "0")}
                        </span>
                        <code
                            className="font-mono text-[13px] tracking-[0.04em] select-all flex-1"
                            style={{ color: "var(--color-text-primary)" }}
                        >
                            {c}
                        </code>
                    </li>
                ))}
            </ol>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={copyAll}
                    className="text-[12.5px] font-semibold transition-opacity hover:opacity-70"
                    style={{
                        color: copied ? "var(--color-success)" : "var(--color-text-primary)",
                    }}
                >
                    {copied ? "Copied to clipboard" : "Copy all"}
                </button>
                <span aria-hidden style={{ color: "var(--color-border)" }}>·</span>
                <button
                    type="button"
                    onClick={downloadTxt}
                    className="text-[12.5px] font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-primary)" }}
                >
                    Download .txt
                </button>
            </div>

            <div
                className="pt-4 space-y-4"
                style={{ borderTop: "1px solid var(--color-border)" }}
            >
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={e => setConfirmed(e.target.checked)}
                        className="mt-0.5 size-4 cursor-pointer"
                        style={{ accentColor: "var(--color-accent)" }}
                    />
                    <span className="text-[12.5px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                        I've saved my backup codes in a password manager or another safe place
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
        </div>
    )
}