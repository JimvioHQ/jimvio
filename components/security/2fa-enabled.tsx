"use client"

import { useState } from "react"
import {
  ShieldCheck, RefreshCw, X, AlertTriangle, XCircle, Key,
} from "lucide-react"
import { disable2FA, regenerateBackupCodes } from "@/lib/actions/security"
import { BrandBtn } from "@/components/admin/form-primitive"

export function TwoFAEnabled({
  backupCodesRemaining, onDisable, onRegenerateCodes,
}: {
  backupCodesRemaining: number
  onDisable: () => void
  onRegenerateCodes: (codes: string[]) => void
}) {
  const [mode, setMode] = useState<"idle" | "disable" | "regen">("idle")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const reset = () => { setMode("idle"); setCode(""); setErr(null) }

  const submit = async () => {
    if (code.length !== 6) { setErr("Enter the 6-digit code"); return }
    setLoading(true); setErr(null)
    try {
      if (mode === "disable") {
        const r = await disable2FA(code)
        if (r.success) onDisable(); else setErr(r.error ?? "Failed")
      } else {
        const r = await regenerateBackupCodes(code)
        if (r.success && r.data) {
          onRegenerateCodes(r.data.backupCodes)
          reset()
        } else {
          setErr(r.error ?? "Failed")
        }
      }
    } catch (e) {
      setErr((e as Error).message ?? "Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="p-5 space-y-4"
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-success)",
        background: "var(--color-success-light)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(48, 164, 108, 0.15)" }}>
            <ShieldCheck className="size-4" style={{ color: "var(--color-success)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
              Two-factor authentication is on
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {backupCodesRemaining} backup {backupCodesRemaining === 1 ? "code" : "codes"} remaining
            </div>
          </div>
        </div>

        {mode === "idle" && (
          <div className="flex items-center gap-2">
            <BrandBtn
              onClick={() => setMode("regen")}
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="size-3" />}
            >
              New codes
            </BrandBtn>
            <BrandBtn
              onClick={() => setMode("disable")}
              variant="ghost"
              size="sm"
              icon={<X className="size-3" />}
            >
              <span style={{ color: "var(--color-danger)" }}>Disable</span>
            </BrandBtn>
          </div>
        )}
      </div>

      {mode !== "idle" && (
        <div className="pt-4 space-y-4" style={{ borderTop: "1px solid rgba(48, 164, 108, 0.2)" }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold"
            style={{ color: mode === "disable" ? "var(--color-danger)" : "var(--color-warning)" }}>
            <AlertTriangle className="size-4" />
            {mode === "disable"
              ? "Confirm by entering your current 6-digit code"
              : "Existing backup codes will be invalidated"}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={e => { if (e.key === "Enter" && code.length === 6) submit() }}
              className="font-mono"
              style={{
                width: 140,
                height: 42,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textAlign: "center",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${err ? "var(--color-danger)" : "var(--color-border)"}`,
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
                padding: "0 12px",
                outline: "none",
              }}
              autoFocus
            />
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              From your authenticator app
            </span>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-danger)" }}>
              <XCircle className="size-3.5 shrink-0" />{err}
            </div>
          )}

          <div className="flex gap-3">
            {mode === "disable"
              ? <BrandBtn onClick={submit} disabled={loading || code.length !== 6} loading={loading} variant="danger">
                  Disable 2FA
                </BrandBtn>
              : <BrandBtn onClick={submit} disabled={loading || code.length !== 6} loading={loading} variant="primary"
                  icon={<RefreshCw className="size-3.5" />}>
                  Regenerate
                </BrandBtn>
            }
            <BrandBtn onClick={reset} variant="ghost">Cancel</BrandBtn>
          </div>
        </div>
      )}
    </div>
  )
}

export function NewBackupCodesPanel({
  codes, onDismiss,
}: {
  codes: string[]
  onDismiss: () => void
}) {
  return (
    <div className="rounded-lg p-4 space-y-3"
      style={{ background: "var(--color-warning-light)", border: "1px solid var(--color-warning)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="size-3.5" style={{ color: "var(--color-warning)" }} />
          <div className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-warning)" }}>
            New backup codes — save now
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-text-muted)" }}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {codes.map((c, i) => (
          <code key={i}
            className="text-[11px] font-mono px-3 py-1.5 rounded-md select-all"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}>
            {c}
          </code>
        ))}
      </div>
    </div>
  )
}