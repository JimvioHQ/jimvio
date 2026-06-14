"use client"

import { useState } from "react"
import {
    Lock, Smartphone, Eye, EyeOff, ShieldCheck,
    BrickWall,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Field, Grid, Divider, BrandBtn, Toast, type ToastMsg,
} from "@/components/admin/form-primitive"
import { SessionCard } from "./session-card"
import { TwoFAEnabled, NewBackupCodesPanel } from "@/components/security/2fa-enabled"
import { revokeSession, changePassword, revokeAllOtherSessions, type Session } from "@/lib/actions/security"
import { TwoFASetup } from "./2fa-setup"

function PasswordStrength({ password }: { password: string }) {
    let s = 0
    if (password.length >= 8) s++
    if (password.length >= 12) s++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^a-zA-Z0-9]/.test(password)) s++

    const fills = ["#e5484d", "#f0b429", "#f0b429", "#30a46c", "#30a46c"]
    const labels = ["Too short", "Weak", "Fair", "Good", "Strong"]
    const labelColors = [
        "var(--color-danger)", "var(--color-warning)", "var(--color-warning)",
        "var(--color-success)", "var(--color-success)",
    ]

    return (
        <div className="mt-2">
            <div className="flex gap-1 mb-1.5">
                {[0, 1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className="flex-1 h-0.5 rounded-full transition-all duration-300"
                        style={{ background: i < s ? fills[s - 1] : "var(--color-border)" }}
                    />
                ))}
            </div>
            <span className="text-[11px] font-semibold"
                style={{ color: s === 0 ? "var(--color-text-muted)" : labelColors[s - 1] }}>
                {s === 0 ? "Enter a password" : labels[s - 1]}
            </span>
        </div>
    )
}

export function SecurityForm({
    initialTwoFa, initialSessions, sessionsError,
}: {
    initialTwoFa: { enabled: boolean; backupCodesRemaining?: number }
    initialSessions: Session[]
    sessionsError?: string
}) {
    // ── State ──
    const [twoFaEnabled, setTwoFaEnabled] = useState(initialTwoFa.enabled)
    const [backupCodesRemaining, setBackupCodesRemaining] = useState(
        initialTwoFa.backupCodesRemaining ?? 0
    )
    const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null)
    const [showSetup, setShowSetup] = useState(false)

    const [sessions, setSessions] = useState<Session[]>(initialSessions)
    const [revokingId, setRevokingId] = useState<string | null>(null)

    const [currentPw, setCurrentPw] = useState("")
    const [newPw, setNewPw] = useState("")
    const [confirmPw, setConfirmPw] = useState("")
    const [showNewPw, setShowNewPw] = useState(false)
    const [pwSubmitting, setPwSubmitting] = useState(false)

    const [toast, setToast] = useState<ToastMsg | null>(null)
    const notify = (msg: string, type: "ok" | "err" = "ok") => setToast({ msg, type })

    // ── Handlers ──
    const handleChangePassword = async () => {
        if (!currentPw || !newPw || !confirmPw) {
            notify("Fill in all password fields", "err"); return
        }
        if (newPw !== confirmPw) {
            notify("Passwords don't match", "err"); return
        }
        if (newPw.length < 8) {
            notify("New password must be at least 8 characters", "err"); return
        }

        setPwSubmitting(true)
        try {
            const r = await changePassword({ currentPassword: currentPw, newPassword: newPw })
            if (!r.success) {
                notify(r.error ?? "Failed to update password", "err")
                return
            }
            notify("Password updated")
            setCurrentPw(""); setNewPw(""); setConfirmPw("")
        } catch (e) {
            notify((e as Error).message ?? "Failed to update password", "err")
        } finally {
            setPwSubmitting(false)
        }
    }

    const handleRevokeAllOthers = async () => {
        const r = await revokeAllOtherSessions()
        if (!r.success) {
            notify(r.error ?? "Failed to revoke sessions", "err")
            return
        }
        setSessions((s) => s.filter((x) => x.current))
        notify(`Signed out ${r.data?.revokedCount ?? 0} other device(s)`)
    }

    const handleRevokeSession = async (id: string) => {
        setRevokingId(id)
        const r = await revokeSession(id)
        if (r.success) {
            setSessions(s => s.filter(x => x.id !== id))
            notify("That device was signed out and banned from this account")
        } else {
            notify(r.error ?? "Failed to sign out device", "err")
        }
        setRevokingId(null)
    }

    const handleTwoFaSetupComplete = async () => {
        // The server already updated profile.two_factor_enabled and stored the secret
        setTwoFaEnabled(true)
        setShowSetup(false)
        notify("Two-factor authentication enabled")
    }

    const handleTwoFaDisable = () => {
        setTwoFaEnabled(false)
        setBackupCodesRemaining(0)
        setNewBackupCodes(null)
        notify("Two-factor authentication disabled")
    }

    const handleCodesRegenerated = (codes: string[]) => {
        setNewBackupCodes(codes)
        setBackupCodesRemaining(codes.length)
        notify("Backup codes regenerated — save them now!")
    }

    return (
        <>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="space-y-10">

                {/* ─── Two-factor authentication ─── */}
                <section>
                    <SectionHeader
                        icon={<BrickWall className="size-4" />}
                        title="Authenticator App"
                        description="Add an extra layer of security to your account by requiring a code from your phone"
                    />

                    {twoFaEnabled
                        ? <div className="space-y-4">
                            <TwoFAEnabled
                                backupCodesRemaining={backupCodesRemaining}
                                onDisable={handleTwoFaDisable}
                                onRegenerateCodes={handleCodesRegenerated}
                            />
                            {newBackupCodes && (
                                <NewBackupCodesPanel codes={newBackupCodes} onDismiss={() => setNewBackupCodes(null)} />
                            )}
                        </div>
                        : showSetup
                            ? <TwoFASetup onComplete={handleTwoFaSetupComplete} onCancel={() => setShowSetup(false)} />
                            : <div className="flex items-center justify-between p-5"
                                style={{
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface)",
                                }}>
                                <div className="flex items-center gap-4">
                                    <div className="size-9 rounded-lg flex items-center justify-center"
                                        style={{ background: "var(--color-warning-light)" }}>
                                        <ShieldCheck className="size-4" style={{ color: "var(--color-warning)" }} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                                            2FA is not enabled
                                        </div>
                                        <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                                            Use an authenticator app to add a second verification step at sign-in
                                        </div>
                                    </div>
                                </div>
                                <BrandBtn onClick={() => setShowSetup(true)} variant="primary"
                                    icon={<Smartphone className="size-4" />}>
                                    Set up
                                </BrandBtn>
                            </div>
                    }
                </section>

                {/* ─── Password ─── */}
                <section>
                    <SectionHeader
                        icon={<Lock className="size-4" />}
                        title="Password"
                        description="Choose a strong password unique to this account"
                    />

                    <Grid cols={2}>
                        <Field label="Current password">
                            <Input
                                type="password"
                                value={currentPw}
                                onChange={e => setCurrentPw(e.target.value)}
                                placeholder="Enter current password"
                                autoComplete="current-password"
                                className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent,#fd5000)] focus-visible:border-[var(--color-accent,#fd5000)]"
                                style={{ height: 36, fontSize: 13, borderRadius: "var(--radius-sm)" }}
                            />
                        </Field>
                        <div className="hidden md:block" />

                        <Field label="New password">
                            <div className="relative">
                                <Input
                                    type={showNewPw ? "text" : "password"}
                                    value={newPw}
                                    onChange={e => setNewPw(e.target.value)}
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                    className="pr-10 focus-visible:ring-1 focus-visible:ring-[var(--color-accent,#fd5000)] focus-visible:border-[var(--color-accent,#fd5000)]"
                                    style={{ height: 36, fontSize: 13, borderRadius: "var(--radius-sm)" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                                    style={{ color: "var(--color-text-muted)" }}
                                    aria-label={showNewPw ? "Hide password" : "Show password"}
                                >
                                    {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                            {newPw && <PasswordStrength password={newPw} />}
                        </Field>

                        <Field label="Confirm new password">
                            <Input
                                type="password"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder="Repeat new password"
                                autoComplete="new-password"
                                className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent,#fd5000)] focus-visible:border-[var(--color-accent,#fd5000)]"
                                style={{ height: 36, fontSize: 13, borderRadius: "var(--radius-sm)" }}
                            />
                        </Field>
                    </Grid>

                    <div className="mt-4">
                        <BrandBtn
                            onClick={handleChangePassword}
                            loading={pwSubmitting}
                            disabled={pwSubmitting || !currentPw || !newPw || !confirmPw}
                            variant="primary"
                            icon={<Lock className="size-3.5" />}
                        >
                            Update password
                        </BrandBtn>
                    </div>
                </section>

                <Divider />

                {/* ─── Active sessions ─── */}
                <section>
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <SectionHeader
                            icon={<ShieldCheck className="size-4" />}
                            title="Active sessions"
                            description="Devices signed in to your account. Sign out any device except this one."
                            inline
                        />
                        {sessions.filter((s) => !s.current).length > 0 && (
                            <BrandBtn variant="ghost" size="sm" onClick={handleRevokeAllOthers}>
                                Sign out all others
                            </BrandBtn>
                        )}
                    </div>

                    {sessionsError && (
                        <div
                            className="mb-3 rounded-sm px-3 py-2 text-[12px]"
                            style={{
                                border: "1px solid var(--color-danger)",
                                background: "var(--color-danger-light, #fef2f2)",
                                color: "var(--color-danger)",
                            }}
                        >
                            {sessionsError}. Check that `SUPABASE_SERVICE_ROLE_KEY` is set, then sign in again.
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {sessions.length === 0
                            ? <div className="text-sm text-center py-6"
                                style={{
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface-secondary)",
                                    color: "var(--color-text-muted)",
                                }}>
                                No sessions yet. Sign in again or refresh this page to register this device.
                            </div>
                            : sessions.map(s => (
                                <SessionCard
                                    key={s.id}
                                    session={s}
                                    onRevoke={() => handleRevokeSession(s.id)}
                                    isRevoking={revokingId === s.id}
                                />
                            ))
                        }
                    </div>
                </section>
            </div>
        </>
    )
}

function SectionHeader({
    icon, title, description, inline = false,
}: {
    icon: React.ReactNode
    title: string
    description?: string
    inline?: boolean
}) {
    return (
        <div className={inline ? "flex items-center gap-3" : "flex items-center gap-3 mb-4"}>
            <div className="size-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                {icon}
            </div>
            <div>
                <h2 className="text-base font-bold tracking-tight"
                    style={{ color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                    {title}
                </h2>
                {description && (
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {description}
                    </p>
                )}
            </div>
        </div>
    )
}