"use client"

import { useState, useTransition } from "react"
import { Coins } from "lucide-react"
import {
    Field, NumInput, Grid, Divider, SaveBar, Toast,
    type ToastMsg, useBeforeUnload,
} from "@/components/admin/form-primitive"
import { updatePlatformSettings } from "@/lib/actions/security"

type Fees = {
    min_payout_rwf: number
    default_affiliate_commission_percent: number
    shopify_default_platform_commission_percent: number | null
    platform_fee_percent: number
    platform_fee_fixed_rwf: number
    ugc_rate_per_1k_views: number
    ugc_max_payout_per_sub: number
    payout_hold_days: number
    cart_max_quantity: number
}

const DEFAULT_FEES: Fees = {
    min_payout_rwf: 5000,
    default_affiliate_commission_percent: 10,
    shopify_default_platform_commission_percent: 8,
    platform_fee_percent: 5,
    platform_fee_fixed_rwf: 0,
    ugc_rate_per_1k_views: 3,
    ugc_max_payout_per_sub: 400,
    payout_hold_days: 7,
    cart_max_quantity: 99,
}

export function CommerceForm({
    initial,
}: {
    initial: Record<string, unknown>
}) {
    const initialFees = (initial.fees as Fees | undefined) ?? DEFAULT_FEES

    const [fees, setFees] = useState<Fees>(initialFees)
    const [dirty, setDirty] = useState(false)
    const [pending, startTransition] = useTransition()
    const [toast, setToast] = useState<ToastMsg | null>(null)

    useBeforeUnload(dirty)

    const setF = <K extends keyof Fees>(k: K, v: Fees[K]) => {
        setFees(p => ({ ...p, [k]: v }))
        setDirty(true)
    }

    const handleSave = () => {
        startTransition(async () => {
            const r = await updatePlatformSettings({ fees })
            if (r.success) {
                const failed = r.data?.failed ?? []
                if (failed.length > 0) {
                    setToast({ msg: `${failed.length} setting(s) failed to save`, type: "err" })
                } else {
                    setToast({ msg: "Commerce settings saved", type: "ok" })
                    setDirty(false)
                }
            } else {
                setToast({ msg: r.error, type: "err" })
            }
        })
    }

    return (
        <>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="space-y-10">
                <header className="flex items-center gap-3">
                    <div className="size-9 rounded-lg flex items-center justify-center"
                        style={{ background: "var(--color-accent-light)" }}>
                        <Coins className="size-4" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">Commerce</h2>
                        <p className="text-[12px] text-muted-foreground">
                            Fees, commissions, and pricing defaults across the marketplace
                        </p>
                    </div>
                </header>

                <section>
                    <Divider label="Core fees" />
                    <Grid cols={2}>
                        <Field label="Minimum payout (RWF)"
                            hint="Wallets below this cannot withdraw">
                            <NumInput value={fees.min_payout_rwf}
                                onChange={v => setF("min_payout_rwf", v ?? 0)} min={0} />
                        </Field>
                        <Field label="Platform fee (%)"
                            hint="Added on top of vendor price at checkout">
                            <NumInput value={fees.platform_fee_percent}
                                onChange={v => setF("platform_fee_percent", v ?? 0)}
                                min={0} max={100} step={0.5} />
                        </Field>
                        <Field label="Platform fixed fee per order (RWF)">
                            <NumInput value={fees.platform_fee_fixed_rwf}
                                onChange={v => setF("platform_fee_fixed_rwf", v ?? 0)} min={0} />
                        </Field>
                        <Field label="Default affiliate commission (%)">
                            <NumInput value={fees.default_affiliate_commission_percent}
                                onChange={v => setF("default_affiliate_commission_percent", v ?? 0)}
                                min={0} max={100} step={0.5} />
                        </Field>
                        <Field label="Shopify platform commission (%)"
                            hint="Default for new Shopify credentials">
                            <NumInput value={fees.shopify_default_platform_commission_percent ?? ""}
                                onChange={v => setF("shopify_default_platform_commission_percent", v)}
                                placeholder="8" step={0.5} />
                        </Field>
                        <Field label="Cart max quantity per line"
                            hint="Enforced at add-to-cart">
                            <NumInput value={fees.cart_max_quantity}
                                onChange={v => setF("cart_max_quantity", v ?? 99)}
                                min={1} max={999} />
                        </Field>
                    </Grid>
                </section>

                <section>
                    <Divider label="UGC and influencer" />
                    <Grid cols={2}>
                        <Field label="UGC rate per 1,000 views (RWF)">
                            <NumInput value={fees.ugc_rate_per_1k_views}
                                onChange={v => setF("ugc_rate_per_1k_views", v ?? 3)}
                                min={0} step={0.5} />
                        </Field>
                        <Field label="UGC max payout per submission (RWF)">
                            <NumInput value={fees.ugc_max_payout_per_sub}
                                onChange={v => setF("ugc_max_payout_per_sub", v ?? 400)} min={0} />
                        </Field>
                    </Grid>
                </section>

                <section>
                    <Divider label="Payout" />
                    <Grid cols={2}>
                        <Field label="Payout hold period (days)"
                            hint="How long before funds release after order completion">
                            <NumInput value={fees.payout_hold_days}
                                onChange={v => setF("payout_hold_days", v ?? 7)}
                                min={0} max={90} />
                        </Field>
                    </Grid>
                </section>

                <div className="h-20" />
            </div>

            {dirty && (
                <SaveBar
                    pending={pending}
                    onSave={handleSave}
                    onDiscard={() => { setFees(initialFees); setDirty(false) }}
                />
            )}
        </>
    )
}