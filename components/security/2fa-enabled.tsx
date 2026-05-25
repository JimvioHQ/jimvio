"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw, X, XCircle, ChevronRight } from "lucide-react"
import { disable2FA, regenerateBackupCodes } from "@/lib/actions/security"
import { BrandBtn } from "@/components/admin/form-primitive"

type Mode = "idle" | "disable" | "regen"

export function TwoFAEnabled({
  backupCodesRemaining,
  onDisable,
  onRegenerateCodes,
  enabledSince,
}: {
  backupCodesRemaining: number
  onDisable: () => void
  onRegenerateCodes: (codes: string[]) => void
  enabledSince?: string
}) {
  const [mode, setMode] = useState<Mode>("idle")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const reset = () => {
    setMode("idle")
    setCode("")
    setErr(null)
  }

  const submit = async () => {
    if (code.length !== 6) {
      setErr("Enter the 6-digit code from your authenticator")
      return
    }
    setLoading(true)
    setErr(null)
    try {
      if (mode === "disable") {
        const r = await disable2FA(code)
        if (r.success) onDisable()
        else setErr(r.error)
      } else {
        const r = await regenerateBackupCodes(code)
        if (r.success) {
          if (r.data) {
            onRegenerateCodes(r.data.backupCodes)
            reset()
          } else {
            setErr("No codes returned")
          }
        } else {
          setErr(r.error)
        }
      }
    } catch (e) {
      setErr((e as Error).message ?? "Failed")
    } finally {
      setLoading(false)
    }
  }

  const lowCodes = backupCodesRemaining > 0 && backupCodesRemaining <= 3
  const isDisable = mode === "disable"

  return (
    <article
      className="relative grid grid-cols-[3px_1fr] overflow-hidden"
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <div aria-hidden style={{ background: "var(--color-success)" }} />

      <div className="px-6 py-5">
        <header className="grid grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--color-success)" }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: "var(--color-success)" }}
                />
                Active
              </span>
              {enabledSince && (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  since {formatDate(enabledSince)}
                </span>
              )}
            </div>

            <h3
              className="mt-1.5 text-[15px] font-semibold leading-snug"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.015em",
              }}
            >
              Authenticator app is set up for sign-in
            </h3>
            <p
              className="mt-1 text-[12.5px] leading-relaxed max-w-[44ch]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Every sign-in will require a code from the app you scanned during
              setup, or one of your backup codes.
            </p>
          </div>

          <div
            className="text-right pl-4"
            style={{ borderLeft: "1px solid var(--color-border)" }}
          >
            <div
              className="tabular-nums text-[24px] font-semibold leading-none"
              style={{
                color: lowCodes ? "var(--color-warning)" : "var(--color-text-primary)",
                letterSpacing: "-0.04em",
              }}
            >
              {backupCodesRemaining}
            </div>
            <div
              className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{
                color: lowCodes ? "var(--color-warning)" : "var(--color-text-muted)",
              }}
            >
              backup {backupCodesRemaining === 1 ? "code" : "codes"} left
            </div>
          </div>
        </header>

        {lowCodes && mode === "idle" && (
          <p
            className="mt-4 text-[12px]"
            style={{ color: "var(--color-warning)" }}
          >
            Running low — regenerate a new set before they're all used.
          </p>
        )}

        {mode === "idle" && (
          <div
            className="mt-5 pt-4 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <button
              type="button"
              onClick={() => setMode("regen")}
              className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <RefreshCw className="size-3.5" />
              Regenerate backup codes
              <ChevronRight className="size-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </button>

            <button
              type="button"
              onClick={() => setMode("disable")}
              className="text-[12.5px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--color-danger)" }}
            >
              Turn off 2FA
            </button>
          </div>
        )}

        {mode !== "idle" && (
          <ConfirmFlow
            isDisable={isDisable}
            code={code}
            err={err}
            loading={loading}
            onCodeChange={v => {
              setCode(v)
              if (err) setErr(null)
            }}
            onSubmit={submit}
            onCancel={reset}
          />
        )}
      </div>
    </article>
  )
}

function ConfirmFlow({
  isDisable, code, err, loading, onCodeChange, onSubmit, onCancel,
}: {
  isDisable: boolean
  code: string
  err: string | null
  loading: boolean
  onCodeChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const heading = isDisable
    ? "Turn off two-factor authentication"
    : "Generate new backup codes"
  const detail = isDisable
    ? "Signing in will only require your password again. We recommend keeping 2FA on."
    : "Your current backup codes will stop working immediately. You'll see the new set once."

  return (
    <section
      className="mt-5 pt-5 grid gap-5"
      style={{ borderTop: "1px dashed var(--color-border)" }}
    >
      <div>
        <h4
          className="text-[13.5px] font-semibold leading-tight"
          style={{
            color: isDisable ? "var(--color-danger)" : "var(--color-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {heading}
        </h4>
        <p
          className="mt-1 text-[12px] leading-relaxed max-w-[48ch]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {detail}
        </p>
      </div>

      <div className="grid gap-3">
        <label
          className="text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ color: "var(--color-text-muted)" }}
        >
          Authenticator code
        </label>

        <OtpSlots
          value={code}
          onChange={onCodeChange}
          onComplete={onSubmit}
          invalid={!!err}
          autoFocus
        />

        {err && (
          <div
            role="alert"
            className="flex items-start gap-1.5 text-[12px]"
            style={{ color: "var(--color-danger)" }}
          >
            <XCircle className="size-3.5 mt-0.5 shrink-0" />
            <span>{err}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isDisable ? (
          <BrandBtn
            onClick={onSubmit}
            disabled={loading || code.length !== 6}
            loading={loading}
            variant="danger"
          >
            Turn off 2FA
          </BrandBtn>
        ) : (
          <BrandBtn
            onClick={onSubmit}
            disabled={loading || code.length !== 6}
            loading={loading}
            variant="primary"
            icon={<RefreshCw className="size-3.5" />}
          >
            Generate new codes
          </BrandBtn>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="text-[12.5px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
        >
          Cancel
        </button>
      </div>
    </section>
  )
}

function OtpSlots({
  value, onChange, onComplete, invalid, autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: () => void
  invalid?: boolean
  autoFocus?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const slots = Array.from({ length: 6 })
  const lastFiredRef = useRef("")

  useEffect(() => {
    if (value.length === 6 && lastFiredRef.current !== value) {
      lastFiredRef.current = value
      onComplete?.()
    }
    if (value.length < 6) lastFiredRef.current = ""
  }, [value, onComplete])

  const handleSlot = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1)
    const arr = value.split("")
    if (digit) {
      arr[i] = digit
      const next = arr.join("").slice(0, 6)
      onChange(next)
      if (i < 5) refs.current[i + 1]?.focus()
    } else {
      arr[i] = ""
      onChange(arr.join(""))
    }
  }

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus()
      const arr = value.split("")
      arr[i - 1] = ""
      onChange(arr.join(""))
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted) {
      e.preventDefault()
      onChange(pasted)
      refs.current[Math.min(pasted.length, 5)]?.focus()
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {slots.map((_, i) => {
        const filled = !!value[i]
        return (
          <input
            key={i}
            ref={el => { refs.current[i] = el }}
            type="tel"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={value[i] ?? ""}
            onChange={e => handleSlot(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={e => e.currentTarget.select()}
            autoFocus={autoFocus && i === 0}
            aria-label={`Digit ${i + 1} of 6`}
            className="font-mono text-center transition-all"
            style={{
              width: 42,
              height: 48,
              fontSize: 18,
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${invalid
                  ? "var(--color-danger)"
                  : filled
                    ? "var(--color-text-primary)"
                    : "var(--color-border)"
                }`,
              background: "var(--color-surface)",
              color: "var(--color-text-primary)",
              outline: "none",
              caretColor: "var(--color-accent)",
            }}
          />
        )
      })}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function NewBackupCodesPanel({
  codes, onDismiss,
}: {
  codes: string[]
  onDismiss: () => void
}) {
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
    <article
      className="relative grid grid-cols-[3px_1fr] overflow-hidden"
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <div aria-hidden style={{ background: "var(--color-warning)" }} />

      <div className="px-6 py-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--color-warning)" }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: "var(--color-warning)" }}
              />
              Save now
            </div>
            <h4
              className="mt-1.5 text-[14px] font-semibold leading-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Your new backup codes
            </h4>
            <p
              className="mt-1 text-[12px] leading-relaxed max-w-[44ch]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Each code works once. Store them in a password manager — we won't
              show them again.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 -mt-1 -mr-2 size-7 rounded-md flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="size-3.5" />
          </button>
        </header>

        <ol className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 tabular-nums">
          {codes.map((c, i) => (
            <li
              key={i}
              className="flex items-baseline gap-3 py-1.5"
              style={{ borderBottom: "1px dotted var(--color-border)" }}
            >
              <span
                className="text-[10px] font-semibold tabular-nums w-4"
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

        <div className="mt-5 flex items-center gap-4">
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
      </div>
    </article>
  )
}