"use client"

import { useRef, useState, useTransition } from "react"
import { ShieldCheck, KeyRound, XCircle, Loader2, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OtpInput, type OtpInputHandle } from "@/components/ui/otp-input"
import { verify2FAAndLogin } from "@/lib/auth/actions"
import { rethrowIfNextRedirect } from "@/lib/auth/redirect-error"


type Mode = "totp" | "backup"

export function TwoFALoginForm({ next }: { next: string }) {
    const [mode, setMode] = useState<Mode>("totp")
    const [token, setToken] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const otpRef = useRef<OtpInputHandle>(null)
    const backupRef = useRef<HTMLInputElement>(null)
    const lastSubmittedRef = useRef("")

    const isTotp = /^\d{6}$/.test(token)
    const isBackupCode = /^[A-Z0-9-]{8,}$/i.test(token)
    const isValid = mode === "totp" ? isTotp : isBackupCode

    function submitToken(value: string) {
        if (lastSubmittedRef.current === value || pending) return
        lastSubmittedRef.current = value
        setError(null)

        const fd = new FormData()
        fd.set("token", value)
        fd.set("next", next)

        startTransition(async () => {
            try {
                const result = await verify2FAAndLogin(fd)
                if (result?.error) {
                    setError(result.error)
                    lastSubmittedRef.current = ""
                    requestAnimationFrame(() => {
                        if (mode === "totp") otpRef.current?.clear()
                        else {
                            backupRef.current?.focus()
                            backupRef.current?.select()
                        }
                    })
                }
            } catch (err) {
                rethrowIfNextRedirect(err)
                console.error("2FA verify error:", err)
                setError(err instanceof Error ? err.message : "Verification failed")
                lastSubmittedRef.current = ""
                requestAnimationFrame(() => {
                    if (mode === "totp") otpRef.current?.clear()
                    else {
                        backupRef.current?.focus()
                        backupRef.current?.select()
                    }
                })
            }
        })
    }

    function handleOtpChange(otp: string) {
        setToken(otp)
        if (error) setError(null)
    }

    function handleOtpComplete(otp: string) {
        if (lastSubmittedRef.current !== otp) {
            submitToken(otp)
        }
    }

    function handleBackupChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, "")
            .slice(0, 16)
        setToken(value)
        if (error) setError(null)
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!isValid || pending) {
            setError(
                mode === "totp"
                    ? "Enter the 6-digit code from your authenticator"
                    : "Enter your backup code",
            )
            return
        }
        submitToken(token)
    }

    function switchMode(nextMode: Mode) {
        setMode(nextMode)
        setToken("")
        setError(null)
        lastSubmittedRef.current = ""
        requestAnimationFrame(() => {
            if (nextMode === "totp") otpRef.current?.focus()
            else backupRef.current?.focus()
        })
    }

    return (
        <div className="w-full max-w-md">
            <header className="mb-8">
                <div
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--color-accent)" }}
                >
                    <LockKeyhole className="size-3" />
                    <span>Security check</span>
                </div>
                <h1
                    className="mt-2 text-[26px] font-bold leading-tight"
                    style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.025em",
                    }}
                >
                    {mode === "totp"
                        ? "Enter your verification code"
                        : "Enter a backup code"}
                </h1>
                <p
                    className="mt-2 text-[13px] leading-relaxed"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    {mode === "totp"
                        ? "Open your authenticator app and enter the 6-digit code for this account."
                        : "Use one of the backup codes you saved when you turned on two-factor authentication."}
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
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
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <div className="space-y-2.5">
                    <label
                        className="text-[10px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        {mode === "totp" ? "Authenticator code" : "Backup code"}
                    </label>

                    {mode === "totp" ? (
                        <div className="relative">
                            <OtpInput
                                ref={otpRef}
                                value={token}
                                onChange={handleOtpChange}
                                onComplete={handleOtpComplete}
                                invalid={!!error}
                                disabled={pending}
                                autoFocus
                            />
                            {pending && (
                                <div
                                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-8"
                                    aria-label="Verifying"
                                >
                                    <Loader2
                                        className="size-4 animate-spin"
                                        style={{ color: "var(--color-text-muted)" }}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <Input
                                ref={backupRef}
                                value={token}
                                onChange={handleBackupChange}
                                placeholder="XXXX-XXXX"
                                disabled={pending}
                                autoFocus
                                autoComplete="one-time-code"
                                aria-label="Backup code"
                                aria-invalid={!!error}
                                className="font-mono text-center tracking-[0.2em] uppercase"
                                style={{
                                    height: 52,
                                    fontSize: 18,
                                    fontWeight: 600,
                                    borderRadius: "var(--radius-sm)",
                                    background: "var(--color-surface)",
                                    color: "var(--color-text-primary)",
                                    borderColor: error ? "var(--color-danger)" : undefined,
                                }}
                            />
                            {pending && (
                                <Loader2
                                    className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin"
                                    style={{ color: "var(--color-text-muted)" }}
                                />
                            )}
                        </div>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={pending || !isValid}
                    className="w-full font-semibold transition-opacity disabled:opacity-50"
                    style={{
                        height: 48,
                        background: "var(--color-text-primary)",
                        color: "var(--color-surface)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 14,
                        letterSpacing: "-0.005em",
                    }}
                >
                    {pending
                        ? "Verifying…"
                        : !token
                            ? mode === "totp"
                                ? "Enter your code"
                                : "Enter your backup code"
                            : !isValid
                                ? mode === "totp"
                                    ? "Enter 6 digits"
                                    : "Enter at least 8 characters"
                                : "Continue"}
                </Button>
            </form>

            <div
                className="mt-6 pt-5 flex items-center justify-between gap-3"
                style={{ borderTop: "1px solid var(--color-border)" }}
            >
                <button
                    type="button"
                    onClick={() => switchMode(mode === "totp" ? "backup" : "totp")}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    <KeyRound className="size-3.5" />
                    {mode === "totp"
                        ? "Use a backup code instead"
                        : "Use your authenticator app"}
                </button>

                <a
                    href="/support/2fa-recovery"
                    className="text-[12.5px] font-medium transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Need help?
                </a>
            </div>
        </div>
    )
}