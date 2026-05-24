"use client"

import React, { useState, useTransition, useEffect, useCallback } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import {
  initiate2FASetup,
  verify2FASetup,
  disable2FA,
  check2FAStatus,
  regenerateBackupCodes,
  getSessions,
  revokeSession,
  type Session,
  type TwoFASetupData,
} from "@/lib/actions/security"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type TrustBarItem = { title: string; desc: string }
type ResolvedPlatformSettings = {
  fees: {
    min_payout_rwf: number
    default_affiliate_commission_percent: number
    shopify_default_platform_commission_percent: number | null
    platform_fee_percent: number
    platform_fee_fixed_rwf: number
    ugc_rate_per_1k_views?: number
    ugc_max_payout_per_sub?: number
    payout_hold_days?: number
    cart_max_quantity?: number
  }
  social_proof: {
    success_rate_display: string
    countries_display: string
    fallback_verified_vendors: string
    fallback_total_products: string
  }
  marketing: {
    affiliate_value_props: string[]
    trust_bar: TrustBarItem[]
    trending_search_keywords: string[]
  }
  contact: {
    support_email: string
    info_email: string
    social_x: string
    social_youtube: string
    social_instagram: string
    social_tiktok: string
    social_facebook?: string
    social_linkedin?: string
    social_whatsapp?: string
    hq_line1: string
    hq_line2: string
  }
  features?: {
    affiliate_enabled: boolean
    influencer_enabled: boolean
    ugc_enabled: boolean
    short_video_enabled: boolean
    community_enabled: boolean
    buying_leads_enabled: boolean
    maintenance_mode: boolean
    review_hold_for_approval: boolean
    vendor_self_registration: boolean
  }
  security?: {
    membership_reactivation_window_minutes: number
    webhook_max_failure_count: number
    digital_access_expiry_days: number | null
  }
  defaults?: {
    currency: string
    timezone: string
    low_stock_threshold: number
    allow_backorder: boolean
    community_trial_days: number
    community_platform_commission_rate: number
    affiliate_silver_threshold: number
    affiliate_gold_threshold: number
    payout_method: string
    exchange_rate_provider: string
  }
  fraud?: {
    ugc_fraud_score_threshold: number
    ugc_max_delta_views_per_day: number
  }
}

type SupplierSourcesSettings = {
  vendor: { enabled: boolean; platform_commission_percent: number }
  shopify: { enabled: boolean; platform_commission_percent: number }
  cj: { enabled: boolean; platform_commission_percent: number; sync_interval_hours?: number }
}

type APIKey = { id: string; name: string; key: string; created: string; lastUsed: string; scope: string }
type LoginEvent = { timestamp: string; device: string; ip: string; location: string; status: "success" | "failed" }

// ─────────────────────────────────────────────
// Demo defaults
// ─────────────────────────────────────────────

const DEMO_INITIAL: ResolvedPlatformSettings = {
  fees: {
    min_payout_rwf: 5000,
    default_affiliate_commission_percent: 10,
    shopify_default_platform_commission_percent: 8,
    platform_fee_percent: 5,
    platform_fee_fixed_rwf: 0,
    ugc_rate_per_1k_views: 3,
    ugc_max_payout_per_sub: 400,
    payout_hold_days: 7,
    cart_max_quantity: 99,
  },
  social_proof: {
    success_rate_display: "98%",
    countries_display: "54+",
    fallback_verified_vendors: "1,200+",
    fallback_total_products: "50,000+",
  },
  marketing: {
    affiliate_value_props: ["Earn up to 20% commission", "Real-time tracking dashboard", "Monthly payouts guaranteed"],
    trust_bar: [
      { title: "Secure payments", desc: "256-bit SSL encryption on every transaction" },
      { title: "Fast delivery", desc: "3–7 day delivery across Rwanda and East Africa" },
    ],
    trending_search_keywords: ["electronics", "fashion", "phones"],
  },
  contact: {
    support_email: "support@example.com",
    info_email: "info@example.com",
    social_x: "https://x.com/example",
    social_youtube: "https://youtube.com/@example",
    social_instagram: "https://instagram.com/example",
    social_tiktok: "https://tiktok.com/@example",
    social_facebook: "",
    social_linkedin: "",
    social_whatsapp: "",
    hq_line1: "KG 7 Ave, Kigali",
    hq_line2: "Rwanda",
  },
  features: {
    affiliate_enabled: true,
    influencer_enabled: true,
    ugc_enabled: true,
    short_video_enabled: true,
    community_enabled: true,
    buying_leads_enabled: true,
    maintenance_mode: false,
    review_hold_for_approval: false,
    vendor_self_registration: true,
  },
  security: {
    membership_reactivation_window_minutes: 10,
    webhook_max_failure_count: 5,
    digital_access_expiry_days: null,
  },
  defaults: {
    currency: "RWF",
    timezone: "Africa/Kigali",
    low_stock_threshold: 5,
    allow_backorder: false,
    community_trial_days: 0,
    community_platform_commission_rate: 15,
    affiliate_silver_threshold: 500000,
    affiliate_gold_threshold: 2000000,
    payout_method: "mtn",
    exchange_rate_provider: "openexchangerates",
  },
  fraud: {
    ugc_fraud_score_threshold: 70,
    ugc_max_delta_views_per_day: 500000,
  },
}

const DEMO_SUPPLIER: SupplierSourcesSettings = {
  vendor: { enabled: true, platform_commission_percent: 10 },
  shopify: { enabled: true, platform_commission_percent: 8 },
  cj: { enabled: true, platform_commission_percent: 12, sync_interval_hours: 6 },
}

// ─────────────────────────────────────────────
// Small shared components
// ─────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground tracking-wide">{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

function NumInput({ value, onChange, min, max, step, placeholder }: {
  value: number | string
  onChange: (v: number | null) => void
  min?: number; max?: number; step?: number; placeholder?: string
}) {
  return (
    <Input
      type="number"
      min={min} max={max} step={step ?? 1} placeholder={placeholder}
      value={value === null || value === undefined ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="tabular-nums"
    />
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
}

function Toggle({ checked, onChange, label, danger }: { checked: boolean; onChange: (v: boolean) => void; label: string; danger?: boolean }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className={cn(danger && checked && "data-[state=checked]:bg-destructive")}
      />
      <span className={cn("text-sm", danger ? "text-muted-foreground" : "text-foreground")}>{label}</span>
    </label>
  )
}

function PasswordStrength({ password }: { password: string }) {
  let strength = 0
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"]
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-primary", "bg-emerald-500"]
  const textColors = ["text-red-500", "text-orange-500", "text-yellow-500", "text-primary", "text-emerald-500"]

  return (
    <div className="mt-2.5">
      <div className="flex gap-1 mb-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              "flex-1 h-[3px] rounded-sm transition-all duration-300",
              i < strength ? colors[strength - 1] : "bg-muted"
            )}
          />
        ))}
      </div>
      <span className={cn("text-[11px] font-medium tracking-wide", textColors[Math.max(0, strength - 1)])}>
        {strength === 0 ? "Enter password" : labels[strength - 1]}
      </span>
    </div>
  )
}

function SessionCard({ session, onRevoke, isRevoking }: { session: Session; onRevoke: () => void; isRevoking: boolean }) {
  return (
    <div className="group rounded-md border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-primary/5">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground tracking-tight">{session.device}</span>
            {session.current && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">{session.ip} &bull; {session.location}</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">Last active {session.lastActivity}</div>
        </div>
        {!session.current && (
          <Button
            variant="outline" size="sm" onClick={onRevoke} disabled={isRevoking}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
          >
            {isRevoking ? <Loader2 className="size-4 animate-spin" /> : "Revoke"}
          </Button>
        )}
      </div>
    </div>
  )
}

function APIKeyItem({ keyData, onCopy, onRevoke }: { keyData: APIKey; onCopy: () => void; onRevoke: () => void }) {
  const [showKey, setShowKey] = useState(false)
  return (
    <div className="group rounded-md border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-primary/5">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground tracking-tight">{keyData.name}</div>
          <div className="text-[11px] text-muted-foreground mt-1.5">Scope: {keyData.scope}</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">Created {keyData.created} &bull; Last used {keyData.lastUsed}</div>
        </div>
        <Button onClick={() => setShowKey(!showKey)} size="sm">
          {showKey ? <EyeOff className="size-4 mr-1.5" /> : <Eye className="size-4 mr-1.5" />}
          {showKey ? "Hide" : "Show"}
        </Button>
      </div>
      {showKey && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-3 flex justify-between items-center gap-3">
          <code className="text-[11px] text-muted-foreground overflow-hidden text-ellipsis">{keyData.key}</code>
          <Button onClick={onCopy} size="sm" variant="secondary"><Copy className="size-3.5 mr-1.5" />Copy</Button>
        </div>
      )}
      <Button onClick={onRevoke} variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50">
        <Trash2 className="size-3.5 mr-1.5" />Delete key
      </Button>
    </div>
  )
}

function LoginEventItem({ event }: { event: LoginEvent }) {
  const isSuccess = event.status === "success"
  return (
    <div className={cn("rounded-md border p-3 transition-all", isSuccess ? "border-l-emerald-500 border-l-[3px]" : "border-l-destructive border-l-[3px]")}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-foreground tracking-tight">{event.timestamp}</div>
          <div className="text-[11px] text-muted-foreground mt-1.5">{event.device} &bull; {event.ip}</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{event.location}</div>
        </div>
        <Badge variant={isSuccess ? "secondary" : "destructive"} className="text-[10px]">
          {isSuccess ? <CheckCircle2 className="size-3 mr-1" /> : <XCircle className="size-3 mr-1" />}
          {isSuccess ? "Success" : "Failed"}
        </Badge>
      </div>
    </div>
  )
}

function Section({ id, title, badge, children, defaultOpen = true }: {
  id: string; title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border bg-card mb-3 overflow-hidden">
      <CollapsibleTrigger className="w-full flex items-center gap-2.5 px-5 py-3.5 hover:bg-primary/5 transition-colors" id={id}>
        <span className="flex-1 text-left text-sm font-medium tracking-tight">{title}</span>
        {badge && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{badge}</Badge>}
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-5 pb-5 pt-2 flex flex-col gap-5 border-t">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function Grid({ cols = 2, children }: { cols?: 1 | 2 | 3; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-4", cols === 1 && "grid-cols-1", cols === 2 && "grid-cols-1 md:grid-cols-2", cols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
      {children}
    </div>
  )
}

function Toast({ message, type, onClose }: { message: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3200)
    return () => clearTimeout(timer)
  }, [onClose])
  return (
    <div className={cn("fixed top-5 right-5 z-50 bg-card border rounded-md px-4 py-3 shadow-lg animate-in slide-in-from-right-2 fade-in-0 duration-200 flex items-center gap-2.5", type === "ok" ? "border-l-emerald-500 border-l-[3px]" : "border-l-destructive border-l-[3px]")}>
      <div className={cn("size-2 rounded-full shrink-0", type === "ok" ? "bg-emerald-500" : "bg-destructive")} />
      <span className="text-sm">{message}</span>
    </div>
  )
}

function SaveBar({ pending, onSave }: { pending: boolean; onSave: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-md px-4 py-2.5 shadow-xl flex items-center gap-4 min-w-[300px]">
      <span className="text-xs text-muted-foreground flex-1">Unsaved changes</span>
      <Button onClick={onSave} disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin mr-2" />}
        {pending ? "Saving..." : "Save all settings"}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────
// 2FA Setup wizard
// ─────────────────────────────────────────────

function TwoFASetup({ onSetupComplete, onCancel }: { onSetupComplete: () => void; onCancel: () => void }) {
  const [step, setStep] = useState<"init" | "verify">("init")
  const [setupData, setSetupData] = useState<TwoFASetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // initiate2FASetup no longer takes an email — it reads from auth.getUser() server-side
  const handleInitSetup = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await initiate2FASetup()
      setSetupData(data)
      setStep("verify")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize 2FA setup. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    handleInitSetup()
  }, [handleInitSetup])

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await verify2FASetup(verificationCode)
      if (result.success) {
        onSetupComplete()
      } else {
        setError(result.error || "Verification failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "init" || !setupData) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-md p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="size-5 text-primary" />
          <span className="font-medium">Setting up 2FA…</span>
        </div>
        {error ? (
          <div className="text-sm text-destructive flex items-center gap-2">
            <XCircle className="size-4" />{error}
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="flex gap-3">
            <Button onClick={handleInitSetup} disabled={isLoading}>Retry</Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-md p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="size-5 text-primary" />
          <span className="font-medium">Setup two-factor authentication</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Step 1: QR code */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">1. Scan this QR code with your authenticator app:</p>
          <div className="bg-white rounded-md p-2 w-fit">
            <Image src={setupData.qrCodeDataUrl} alt="2FA QR Code" width={180} height={180} className="rounded-sm" />
          </div>
        </div>

        {/* Step 2: Enter code */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">2. Enter the 6-digit code from your app to confirm:</p>
          <InputOTP value={verificationCode} onChange={setVerificationCode} maxLength={6}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <div className="text-sm text-destructive flex items-center gap-2">
            <XCircle className="size-4" />{error}
          </div>
        )}

        {/* Backup codes — shown during setup so user can save them */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-2">
            Save these backup codes — you won&apos;t see them again:
          </p>
          <div className="grid grid-cols-2 gap-1">
            {setupData.backupCodes.map((c, i) => (
                <code key={i} className="text-xs text-muted-foreground">{c}</code>
              ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleVerify} disabled={isLoading || verificationCode.length !== 6}>
            {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <ShieldCheck className="size-4 mr-2" />}
            Verify and enable
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 2FA enabled display
// ─────────────────────────────────────────────

function TwoFAEnabled({
  backupCodesRemaining,
  onDisable,
  onRegenerateCodes,
}: {
  backupCodesRemaining: number   // ← number, not array (check2FAStatus returns the count)
  onDisable: () => void
  onRegenerateCodes: (newCodes: string[]) => void
}) {
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [disableCode, setDisableCode] = useState("")
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [regenerateCode, setRegenerateCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetDisable() { setShowDisableConfirm(false); setDisableCode(""); setError(null) }
  function resetRegenerate() { setShowRegenerateConfirm(false); setRegenerateCode(""); setError(null) }

  const handleDisable = async () => {
    if (disableCode.length !== 6) { setError("Please enter a 6-digit code"); return }
    setIsLoading(true); setError(null)
    try {
      const result = await disable2FA(disableCode)
      if (result.success) { onDisable() }
      else { setError(result.error || "Failed to disable 2FA") }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (regenerateCode.length !== 6) { setError("Please enter a 6-digit code"); return }
    setIsLoading(true); setError(null)
    try {
      const result = await regenerateBackupCodes(regenerateCode)
      if (result.success) {
        if (result.data) {
          // Pass new codes up so parent can display them
          onRegenerateCodes(result.data.backupCodes)
          resetRegenerate()
        } else {
          setError("Failed to regenerate codes")
        }
      } else {
        setError(result.error || "Failed to regenerate codes")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate codes. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-5 space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5 text-emerald-500" />
        <span className="font-medium text-emerald-700 dark:text-emerald-400">Two-factor authentication enabled</span>
      </div>

      {!showDisableConfirm && !showRegenerateConfirm && (
        <>
          <p className="text-sm text-muted-foreground">
            {backupCodesRemaining} backup {backupCodesRemaining === 1 ? "code" : "codes"} remaining.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowRegenerateConfirm(true)}>
              <RefreshCw className="size-3.5 mr-1.5" />Regenerate backup codes
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowDisableConfirm(true)}
            >
              <X className="size-3.5 mr-1.5" />Disable 2FA
            </Button>
          </div>
        </>
      )}

      {showDisableConfirm && (
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <span className="text-sm font-medium">Confirm disable 2FA</span>
          </div>
          <p className="text-sm text-muted-foreground">Enter your current 2FA code to confirm:</p>
          <InputOTP value={disableCode} onChange={setDisableCode} maxLength={6}>
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
          {error && <div className="text-sm text-destructive flex items-center gap-2"><XCircle className="size-4" />{error}</div>}
          <div className="flex gap-3">
            <Button variant="destructive" size="sm" onClick={handleDisable} disabled={isLoading || disableCode.length !== 6}>
              {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Disable 2FA
            </Button>
            <Button variant="outline" size="sm" onClick={resetDisable}>Cancel</Button>
          </div>
        </div>
      )}

      {showRegenerateConfirm && (
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            <span className="text-sm font-medium">Regenerate backup codes</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This will invalidate all existing backup codes. Enter your 2FA code to confirm:
          </p>
          <InputOTP value={regenerateCode} onChange={setRegenerateCode} maxLength={6}>
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
          {error && <div className="text-sm text-destructive flex items-center gap-2"><XCircle className="size-4" />{error}</div>}
          <div className="flex gap-3">
            <Button size="sm" onClick={handleRegenerate} disabled={isLoading || regenerateCode.length !== 6}>
              {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-3.5 mr-2" />}
              Regenerate
            </Button>
            <Button variant="outline" size="sm" onClick={resetRegenerate}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main form
// ─────────────────────────────────────────────

export default function AdminPlatformSettingsForm({
  initial = DEMO_INITIAL,
  supplierSourcesInitial = DEMO_SUPPLIER,
}: {
  initial?: ResolvedPlatformSettings
  supplierSourcesInitial?: SupplierSourcesSettings
}) {
  const [fees, setFees] = useState(initial.fees)
  const [social, setSocial] = useState(initial.social_proof)
  const [contact, setContact] = useState(initial.contact)
  const [features, setFeatures] = useState(initial.features ?? DEMO_INITIAL.features!)
  const [defaults, setDefaults] = useState(initial.defaults ?? DEMO_INITIAL.defaults!)
  const [fraud, setFraud] = useState(initial.fraud ?? DEMO_INITIAL.fraud!)
  const [supplier, setSupplier] = useState(supplierSourcesInitial)
  const [trustBar, setTrustBar] = useState<TrustBarItem[]>(initial.marketing.trust_bar)
  const [affiliateBullets, setAffiliateBullets] = useState(initial.marketing.affiliate_value_props.join("\n"))
  const [trendingKw, setTrendingKw] = useState((initial.marketing.trending_search_keywords ?? []).join(", "))

  // ── 2FA state ──
  // twoFaEnabled: whether 2FA is active for the current user
  // backupCodesRemaining: count from check2FAStatus (displayed in the enabled card)
  // newBackupCodes: the freshly generated codes after regeneration (shown once)
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null)
  const [showTwoFaSetup, setShowTwoFaSetup] = useState(false)
  const [twoFaLoading, setTwoFaLoading] = useState(true)

  // ── Password state ──
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // ── Session state ──
  const [sessions, setSessions] = useState<Session[]>([])
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  // ── API keys (demo) ──
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    { id: "1", name: "Production API", key: "sk_live_51234567890abcdefgh", created: "Jan 15, 2025", lastUsed: "Now", scope: "admin:full" },
  ])

  const [loginHistory] = useState<LoginEvent[]>([
    { timestamp: "Today, 09:45 AM", device: "Chrome on macOS", ip: "192.168.1.1", location: "Kigali, Rwanda", status: "success" },
    { timestamp: "Today, 08:30 AM", device: "Safari on iPhone", ip: "192.168.1.2", location: "Kigali, Rwanda", status: "success" },
    { timestamp: "Yesterday, 21:15 PM", device: "Firefox on Windows", ip: "203.0.113.42", location: "Unknown", status: "failed" },
  ])

  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [ipWhitelist, setIpWhitelist] = useState("192.168.1.0/24")
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [pending, startTransition] = useTransition()
  const [dirty, setDirty] = useState(false)

  // ── Load 2FA status and sessions on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const [status, sessionList] = await Promise.all([
          check2FAStatus(),
          getSessions(),
        ])
        setTwoFaEnabled(status.enabled)
        setBackupCodesRemaining(status.backupCodesRemaining ?? 0)
        setSessions(sessionList)
      } catch (err) {
        console.error("Failed to load security data:", err)
      } finally {
        setTwoFaLoading(false)
      }
    }
    load()
  }, [])

  // ── Helpers ──
  function markDirty() { setDirty(true) }
  function showToast(msg: string, type: "ok" | "err") { setToast({ msg, type }) }

  function setF<K extends keyof typeof fees>(k: K, v: (typeof fees)[K]) { setFees(p => ({ ...p, [k]: v })); markDirty() }
  function setS<K extends keyof typeof social>(k: K, v: string) { setSocial(p => ({ ...p, [k]: v })); markDirty() }
  function setC<K extends keyof typeof contact>(k: K, v: string) { setContact(p => ({ ...p, [k]: v })); markDirty() }
  function setFeat<K extends keyof typeof features>(k: K, v: boolean) { setFeatures(p => ({ ...p, [k]: v })); markDirty() }
  function setDef<K extends keyof typeof defaults>(k: K, v: typeof defaults[K]) { setDefaults(p => ({ ...p, [k]: v })); markDirty() }
  function setFrd<K extends keyof typeof fraud>(k: K, v: typeof fraud[K]) { setFraud(p => ({ ...p, [k]: v })); markDirty() }
  function setSup(channel: keyof SupplierSourcesSettings, k: string, v: unknown) {
    setSupplier(p => ({ ...p, [channel]: { ...p[channel], [k]: v } })); markDirty()
  }

  function handleSave() {
    startTransition(async () => {
      await new Promise(r => setTimeout(r, 900))
      setDirty(false)
      showToast("All settings saved successfully", "ok")
    })
  }

  function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) { showToast("Please fill in all password fields", "err"); return }
    if (newPassword !== confirmPassword) { showToast("New passwords do not match", "err"); return }
    showToast("Password changed successfully", "ok")
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
  }

  async function handleRevokeSession(id: string) {
    setRevokingSessionId(id)
    const result = await revokeSession(id)
    if (result.success) {
      setSessions(s => s.filter(ss => ss.id !== id))
      showToast("Session revoked", "ok")
    } else {
      showToast(result.error || "Failed to revoke session", "err")
    }
    setRevokingSessionId(null)
  }

  // Called when TwoFASetup wizard completes successfully
  const handleTwoFaSetupComplete = async () => {
    try {
      const status = await check2FAStatus()
      setTwoFaEnabled(status.enabled)
      setBackupCodesRemaining(status.backupCodesRemaining ?? 0)
    } catch { /* non-fatal */ }
    setShowTwoFaSetup(false)
    showToast("Two-factor authentication enabled", "ok")
  }

  // Called when TwoFAEnabled disables 2FA
  const handleTwoFaDisabled = () => {
    setTwoFaEnabled(false)
    setBackupCodesRemaining(0)
    setNewBackupCodes(null)
    showToast("Two-factor authentication disabled", "ok")
  }

  // Called when TwoFAEnabled regenerates codes — new codes are passed up from the action
  const handleBackupCodesRegenerated = (codes: string[]) => {
    setNewBackupCodes(codes)
    setBackupCodesRemaining(codes.length)
    showToast("Backup codes regenerated — save them now!", "ok")
  }

  function handleGenerateAPIKey() {
    const newKey: APIKey = {
      id: String(apiKeys.length + 1),
      name: "New API key",
      key: "sk_live_" + Math.random().toString(36).substr(2, 24),
      created: new Date().toLocaleDateString(),
      lastUsed: "Never",
      scope: "admin:full",
    }
    setApiKeys([...apiKeys, newKey])
    showToast("API key generated", "ok")
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const navItems = [
    { id: "fees", label: "Fees" },
    { id: "suppliers", label: "Suppliers" },
    { id: "features", label: "Features" },
    { id: "security", label: "Security" },
    { id: "fraud", label: "Fraud" },
    { id: "defaults", label: "Defaults" },
    { id: "social", label: "Social proof" },
    { id: "marketing", label: "Marketing" },
    { id: "contact", label: "Contact" },
  ]

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <nav className="w-[200px] sticky top-0 h-screen border-r flex flex-col gap-0.5 py-7 shrink-0 bg-background">
          <div className="px-5 pb-5 mb-2.5 border-b">
            <div className="text-[11px] tracking-widest text-muted-foreground uppercase">Configuration</div>
          </div>
          {navItems.map(n => (
            <button
              key={n.id}
              className="flex items-center gap-2 px-5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent border-l-2 border-transparent transition-colors text-left"
              onClick={() => scrollTo(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 px-12 py-9 max-w-[860px]">
          <h1 className="text-xl font-medium tracking-tight mb-1">Platform settings</h1>
          <p className="text-sm text-muted-foreground mb-8">Manage fees, features, security, and integrations across your marketplace platform</p>

          {/* Fees */}
          <Section id="fees" title="Fees and commissions">
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Core fees</p>
            <Grid cols={2}>
              <Field label="Minimum payout (RWF)" hint="Wallets below this cannot request withdrawal">
                <NumInput value={fees.min_payout_rwf} onChange={v => setF("min_payout_rwf", v ?? 0)} min={0} />
              </Field>
              <Field label="Platform fee (%)" hint="Applied on top of vendor price at checkout">
                <NumInput value={fees.platform_fee_percent} onChange={v => setF("platform_fee_percent", v ?? 0)} min={0} max={100} step={0.5} />
              </Field>
              <Field label="Platform fixed fee per order (RWF)">
                <NumInput value={fees.platform_fee_fixed_rwf} onChange={v => setF("platform_fee_fixed_rwf", v ?? 0)} min={0} />
              </Field>
              <Field label="Default affiliate commission (%)">
                <NumInput value={fees.default_affiliate_commission_percent} onChange={v => setF("default_affiliate_commission_percent", v ?? 0)} min={0} max={100} step={0.5} />
              </Field>
              <Field label="Shopify platform commission (%)" hint="Default for new Shopify credentials">
                <NumInput value={fees.shopify_default_platform_commission_percent ?? ""} onChange={v => setF("shopify_default_platform_commission_percent", v)} placeholder="8" step={0.5} />
              </Field>
              <Field label="Cart maximum quantity per line" hint="Enforced at add-to-cart">
                <NumInput value={fees.cart_max_quantity ?? 99} onChange={v => setF("cart_max_quantity", v ?? 99)} min={1} max={999} />
              </Field>
            </Grid>
            <div className="h-px bg-border my-1" />
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">UGC and influencer</p>
            <Grid cols={2}>
              <Field label="UGC rate per 1,000 views (RWF)" hint="Default for new campaigns">
                <NumInput value={fees.ugc_rate_per_1k_views ?? 3} onChange={v => setF("ugc_rate_per_1k_views", v ?? 3)} min={0} step={0.5} />
              </Field>
              <Field label="UGC max payout per submission (RWF)">
                <NumInput value={fees.ugc_max_payout_per_sub ?? 400} onChange={v => setF("ugc_max_payout_per_sub", v ?? 400)} min={0} />
              </Field>
            </Grid>
            <div className="h-px bg-border my-1" />
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Payout</p>
            <Grid cols={2}>
              <Field label="Payout hold period (days)" hint="How long before funds release after order completion">
                <NumInput value={fees.payout_hold_days ?? 7} onChange={v => setF("payout_hold_days", v ?? 7)} min={0} max={90} />
              </Field>
            </Grid>
          </Section>

          {/* Suppliers */}
          <Section id="suppliers" title="Supplier channels">
            <Grid cols={3}>
              {(["vendor", "shopify", "cj"] as const).map(ch => (
                <div key={ch} className="bg-accent/50 border rounded-md p-4 flex flex-col gap-3 transition-all hover:border-primary hover:bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{ch === "cj" ? "CJ Dropshipping" : ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
                    <Badge variant="secondary" className="text-[10px]">{ch}</Badge>
                  </div>
                  <Toggle checked={supplier[ch].enabled} onChange={v => setSup(ch, "enabled", v)} label={supplier[ch].enabled ? "Enabled" : "Disabled"} />
                  <Field label="Platform commission (%)">
                    <NumInput value={supplier[ch].platform_commission_percent} onChange={v => setSup(ch, "platform_commission_percent", v ?? 0)} min={0} max={100} step={0.5} />
                  </Field>
                  {ch === "cj" && (
                    <Field label="Sync interval (hours)">
                      <NumInput value={(supplier.cj as { sync_interval_hours?: number }).sync_interval_hours ?? 6} onChange={v => setSup("cj", "sync_interval_hours", v ?? 6)} min={1} max={168} />
                    </Field>
                  )}
                </div>
              ))}
            </Grid>
          </Section>

          {/* Features */}
          <Section id="features" title="Feature flags" badge="Platform-wide">
            <Grid cols={2}>
              <Toggle checked={features.affiliate_enabled} onChange={v => setFeat("affiliate_enabled", v)} label="Affiliate programme" />
              <Toggle checked={features.influencer_enabled} onChange={v => setFeat("influencer_enabled", v)} label="Influencer module" />
              <Toggle checked={features.ugc_enabled} onChange={v => setFeat("ugc_enabled", v)} label="UGC campaigns" />
              <Toggle checked={features.short_video_enabled} onChange={v => setFeat("short_video_enabled", v)} label="Short videos" />
              <Toggle checked={features.community_enabled} onChange={v => setFeat("community_enabled", v)} label="Communities" />
              <Toggle checked={features.buying_leads_enabled} onChange={v => setFeat("buying_leads_enabled", v)} label="Buying leads marketplace" />
              <Toggle checked={features.vendor_self_registration} onChange={v => setFeat("vendor_self_registration", v)} label="Vendor self-registration" />
              <Toggle checked={features.review_hold_for_approval} onChange={v => setFeat("review_hold_for_approval", v)} label="Hold reviews for approval" />
            </Grid>
            <div className="h-px bg-border my-1" />
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-700 dark:text-amber-400">
              <strong className="font-medium">Maintenance mode:</strong> When enabled, all buyer-facing endpoints are disabled. Only admin sessions stay active.
            </div>
            <Toggle checked={features.maintenance_mode} onChange={v => setFeat("maintenance_mode", v)} label="Enable maintenance mode" danger />
          </Section>

          {/* Security */}
          <Section id="security" title="Security and access" badge="Sensitive">

            {/* Password */}
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Password management</p>
            <div className="flex flex-col gap-4">
              <Field label="Current password">
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
              </Field>
              <Field label="New password">
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
                {newPassword && <PasswordStrength password={newPassword} />}
              </Field>
              <Field label="Confirm new password">
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
              </Field>
              <Button onClick={handleChangePassword} className="self-start">Update password</Button>
            </div>

            <div className="h-px bg-border my-1" />

            {/* 2FA */}
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Two-factor authentication</p>
            <div className="flex flex-col gap-4">
              {twoFaLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />Loading 2FA status…
                </div>
              ) : (
                <>
                  {/* Not enabled, not setting up */}
                  {!twoFaEnabled && !showTwoFaSetup && (
                    <div className="flex items-center gap-4">
                      <Toggle
                        checked={false}
                        onChange={() => setShowTwoFaSetup(true)}
                        label="Enable two-factor authentication"
                      />
                    </div>
                  )}

                  {/* Setup wizard */}
                  {showTwoFaSetup && (
                    <TwoFASetup
                      onSetupComplete={handleTwoFaSetupComplete}
                      onCancel={() => setShowTwoFaSetup(false)}
                    />
                  )}

                  {/* Enabled card */}
                  {twoFaEnabled && !showTwoFaSetup && (
                    <>
                      <TwoFAEnabled
                        backupCodesRemaining={backupCodesRemaining}
                        onDisable={handleTwoFaDisabled}
                        onRegenerateCodes={handleBackupCodesRegenerated}
                      />

                      {/* Show newly regenerated codes once, with a dismiss */}
                      {newBackupCodes && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                              New backup codes — save these now, they won&apos;t be shown again:
                            </p>
                            <Button variant="ghost" size="icon" className="size-6" onClick={() => setNewBackupCodes(null)}>
                              <X className="size-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {newBackupCodes.map((c, i) => (
                              <code key={i} className="text-xs text-muted-foreground">{c}</code>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="h-px bg-border my-1" />

            {/* Sessions */}
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Active sessions</p>
            <div className="flex flex-col gap-2.5">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
              ) : (
                sessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onRevoke={() => handleRevokeSession(session.id)}
                    isRevoking={revokingSessionId === session.id}
                  />
                ))
              )}
            </div>

            <div className="h-px bg-border my-1" />

            {/* API Keys */}
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">API keys</p>
            <div className="flex flex-col gap-3">
              {apiKeys.map(key => (
                <APIKeyItem
                  key={key.id}
                  keyData={key}
                  onCopy={() => { navigator.clipboard.writeText(key.key); showToast("API key copied", "ok") }}
                  onRevoke={() => { setApiKeys(ak => ak.filter(k => k.id !== key.id)); showToast("API key deleted", "ok") }}
                />
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={handleGenerateAPIKey}>
                <Plus className="size-4 mr-2" />Generate new API key
              </Button>
            </div>

            <div className="h-px bg-border my-1" />

            {/* Login history */}
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Login history</p>
            <div className="flex flex-col gap-2">
              {loginHistory.map((event, i) => <LoginEventItem key={i} event={event} />)}
            </div>

            <div className="h-px bg-border my-1" />

            {/* Additional security */}
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Additional security</p>
            <Grid cols={2}>
              <Toggle checked={securityAlerts} onChange={v => setSecurityAlerts(v)} label="Email security alerts" />
              <Field label="IP whitelist (CIDR format)">
                <TextInput value={ipWhitelist} onChange={v => setIpWhitelist(v)} placeholder="192.168.1.0/24" />
              </Field>
            </Grid>
          </Section>

          {/* Fraud */}
          <Section id="fraud" title="Fraud and trust" badge="UGC">
            <Grid cols={2}>
              <Field label="Fraud score auto-flag threshold (0–100)" hint="Submissions above this are flagged as suspicious">
                <NumInput value={fraud.ugc_fraud_score_threshold} onChange={v => setFrd("ugc_fraud_score_threshold", v ?? 70)} min={0} max={100} />
              </Field>
              <Field label="Max delta views per day per submission" hint="Sudden spike cap">
                <NumInput value={fraud.ugc_max_delta_views_per_day} onChange={v => setFrd("ugc_max_delta_views_per_day", v ?? 500000)} min={1000} step={1000} />
              </Field>
            </Grid>
          </Section>

          {/* Defaults */}
          <Section id="defaults" title="Schema defaults">
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Locale</p>
            <Grid cols={2}>
              <Field label="Default currency">
                <Select value={defaults.currency} onValueChange={v => setDef("currency", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{["RWF", "USD", "KES", "UGX", "TZS"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Default timezone">
                <Select value={defaults.timezone} onValueChange={v => setDef("timezone", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Africa/Kigali", "Africa/Nairobi", "Africa/Dar_es_Salaam", "UTC"].map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Exchange rate provider">
                <Select value={defaults.exchange_rate_provider} onValueChange={v => setDef("exchange_rate_provider", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openexchangerates">Open Exchange Rates</SelectItem>
                    <SelectItem value="fixer">Fixer.io</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </Grid>
            <div className="h-px bg-border my-1" />
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Inventory</p>
            <Grid cols={2}>
              <Field label="Low-stock threshold (units)">
                <NumInput value={defaults.low_stock_threshold} onChange={v => setDef("low_stock_threshold", v ?? 5)} min={0} />
              </Field>
              <Field label="Default payout method">
                <Select value={defaults.payout_method} onValueChange={v => setDef("payout_method", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                    <SelectItem value="airtel">Airtel Money</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Toggle checked={defaults.allow_backorder} onChange={v => setDef("allow_backorder", v)} label="Allow backorders by default" />
            </Grid>
            <div className="h-px bg-border my-1" />
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Community</p>
            <Grid cols={2}>
              <Field label="Platform commission rate (%)" hint="Default for new communities">
                <NumInput value={defaults.community_platform_commission_rate} onChange={v => setDef("community_platform_commission_rate", v ?? 15)} min={0} max={100} step={0.5} />
              </Field>
              <Field label="Trial days">
                <NumInput value={defaults.community_trial_days} onChange={v => setDef("community_trial_days", v ?? 0)} min={0} max={90} />
              </Field>
            </Grid>
            <div className="h-px bg-border my-1" />
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Affiliate tier thresholds (RWF)</p>
            <Grid cols={2}>
              <Field label="Silver tier minimum">
                <NumInput value={defaults.affiliate_silver_threshold} onChange={v => setDef("affiliate_silver_threshold", v ?? 500000)} min={0} step={10000} />
              </Field>
              <Field label="Gold tier minimum">
                <NumInput value={defaults.affiliate_gold_threshold} onChange={v => setDef("affiliate_gold_threshold", v ?? 2000000)} min={0} step={10000} />
              </Field>
            </Grid>
          </Section>

          {/* Social proof */}
          <Section id="social" title="Social proof">
            <Grid cols={2}>
              <Field label="Success rate label"><TextInput value={social.success_rate_display} onChange={v => setS("success_rate_display", v)} /></Field>
              <Field label="Countries label"><TextInput value={social.countries_display} onChange={v => setS("countries_display", v)} /></Field>
              <Field label="Fallback verified vendors"><TextInput value={social.fallback_verified_vendors} onChange={v => setS("fallback_verified_vendors", v)} /></Field>
              <Field label="Fallback total products"><TextInput value={social.fallback_total_products} onChange={v => setS("fallback_total_products", v)} /></Field>
            </Grid>
          </Section>

          {/* Marketing */}
          <Section id="marketing" title="Marketing">
            <Field label="Affiliate value propositions" hint="One item per line">
              <Textarea value={affiliateBullets} onChange={e => { setAffiliateBullets(e.target.value); markDirty() }} className="text-xs" />
            </Field>
            <Field label="Trending search keywords" hint="Comma-separated">
              <TextInput value={trendingKw} onChange={v => { setTrendingKw(v); markDirty() }} placeholder="electronics, fashion, phones" />
            </Field>
            <div className="h-px bg-border my-1" />
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Trust bar items</p>
            <div className="flex flex-col gap-2.5">
              {trustBar.map((row, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input placeholder="Title" value={row.title} className="flex-[0_0_200px]" onChange={e => { setTrustBar(tb => tb.map((r, j) => j === i ? { ...r, title: e.target.value } : r)); markDirty() }} />
                  <Input placeholder="Description" value={row.desc} className="flex-1" onChange={e => { setTrustBar(tb => tb.map((r, j) => j === i ? { ...r, desc: e.target.value } : r)); markDirty() }} />
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5" onClick={() => { setTrustBar(tb => tb.filter((_, j) => j !== i)); markDirty() }}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={() => { setTrustBar(tb => [...tb, { title: "", desc: "" }]); markDirty() }}>
                <Plus className="size-4 mr-2" />Add trust bar item
              </Button>
            </div>
          </Section>

          {/* Contact */}
          <Section id="contact" title="Contact and social">
            <Grid cols={2}>
              <Field label="Support email"><TextInput value={contact.support_email} onChange={v => setC("support_email", v)} /></Field>
              <Field label="General info email"><TextInput value={contact.info_email} onChange={v => setC("info_email", v)} /></Field>
              <Field label="HQ address line 1"><TextInput value={contact.hq_line1} onChange={v => setC("hq_line1", v)} /></Field>
              <Field label="HQ address line 2"><TextInput value={contact.hq_line2} onChange={v => setC("hq_line2", v)} /></Field>
            </Grid>
            <div className="h-px bg-border my-1" />
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest -mb-2">Social links</p>
            <Grid cols={2}>
              {([
                ["social_x", "X (Twitter)"], ["social_youtube", "YouTube"],
                ["social_instagram", "Instagram"], ["social_tiktok", "TikTok"],
                ["social_facebook", "Facebook"], ["social_linkedin", "LinkedIn"],
                ["social_whatsapp", "WhatsApp URL"],
              ] as const).map(([k, label]) => (
                <Field key={k} label={label}>
                  <TextInput value={(contact as Record<string, string>)[k] ?? ""} onChange={v => setC(k, v)} placeholder="https://" />
                </Field>
              ))}
            </Grid>
          </Section>

          <div className="h-24" />
        </main>
      </div>

      {dirty && <SaveBar pending={pending} onSave={handleSave} />}
    </>
  )
}
