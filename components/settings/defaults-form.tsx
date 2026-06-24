"use client";

import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import CustomSelect from "@/components/ui/select-2";
import {
  Divider,
  Field,
  Grid,
  NumInput,
  SaveBar,
  Toast,
  Toggle,
  type ToastMsg,
  useBeforeUnload,
} from "@/components/admin/form-primitive";
import { updatePlatformSettings } from "@/lib/actions/security";
import {
  DEFAULT_PLATFORM_DEFAULTS,
  mergeDefaults,
  type DefaultsSettings,
} from "@/lib/platform-settings-shared";

export function DefaultsForm({ initial }: { initial: Record<string, unknown> }) {
  const initialDefaults = mergeDefaults(
    typeof initial.defaults === "object" && initial.defaults
      ? (initial.defaults as Partial<DefaultsSettings>)
      : {}
  );

  const [defaults, setDefaults] = useState<DefaultsSettings>(initialDefaults);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useBeforeUnload(dirty);

  function setDef<K extends keyof DefaultsSettings>(key: K, value: DefaultsSettings[K]) {
    setDefaults((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePlatformSettings({ defaults });
      if (!result.success) {
        setToast({ msg: result.error, type: "err" });
        return;
      }
      const failed = result.data?.failed ?? [];
      if (failed.length > 0) {
        setToast({ msg: `${failed.length} setting group(s) failed to save`, type: "err" });
        return;
      }
      setToast({ msg: "Defaults saved", type: "ok" });
      setDirty(false);
    });
  }

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="space-y-8">
        <header className="flex items-center gap-3">
          <div
            className="size-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-accent-light)" }}
          >
            <SlidersHorizontal className="size-4" style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Schema defaults</h2>
            <p className="text-[12px] text-muted-foreground">
              Locale, inventory, community, and affiliate tier defaults for new records
            </p>
          </div>
        </header>

        <section>
          <Divider label="Locale" />
          <Grid cols={2}>
            <Field label="Default currency">
              <CustomSelect
                options={["RWF", "USD", "KES", "UGX", "TZS", "EUR", "GBP"].map((c) => ({
                  value: c,
                  label: c,
                }))}
                value={defaults.currency}
                onChange={(v) => setDef("currency", v)}
                className="w-full"
              />
            </Field>
            <Field label="Default timezone">
              <CustomSelect
                options={[
                  "Africa/Kigali",
                  "Africa/Nairobi",
                  "Africa/Dar_es_Salaam",
                  "Africa/Lagos",
                  "UTC",
                ].map((tz) => ({ value: tz, label: tz }))}
                value={defaults.timezone}
                onChange={(v) => setDef("timezone", v)}
                className="w-full"
              />
            </Field>
            <Field label="Exchange rate provider">
              <CustomSelect
                options={[
                  { value: "openexchangerates", label: "Open Exchange Rates" },
                  { value: "fixer", label: "Fixer.io" },
                  { value: "manual", label: "Manual" },
                ]}
                value={defaults.exchange_rate_provider}
                onChange={(v) => setDef("exchange_rate_provider", v)}
                className="w-full"
              />
            </Field>
          </Grid>
        </section>

        <section>
          <Divider label="Inventory" />
          <Grid cols={2}>
            <Field label="Low-stock threshold (units)">
              <NumInput
                value={defaults.low_stock_threshold}
                onChange={(v) => setDef("low_stock_threshold", v ?? DEFAULT_PLATFORM_DEFAULTS.low_stock_threshold)}
                min={0}
              />
            </Field>
            <Field label="Default payout method">
              <CustomSelect
                options={[
                  { value: "mtn", label: "MTN Mobile Money" },
                  { value: "airtel", label: "Airtel Money" },
                  { value: "bank", label: "Bank transfer" },
                  { value: "paypal", label: "PayPal" },
                ]}
                value={defaults.payout_method}
                onChange={(v) => setDef("payout_method", v)}
                className="w-full"
              />
            </Field>
          </Grid>
          <div className="mt-4">
            <Toggle
              checked={defaults.allow_backorder}
              onChange={(v) => setDef("allow_backorder", v)}
              label="Allow backorders by default"
              description="New products may accept orders when out of stock"
            />
          </div>
        </section>

        <section>
          <Divider label="Communities" />
          <Grid cols={2}>
            <Field label="Platform commission rate (%)" hint="Default for new communities">
              <NumInput
                value={defaults.community_platform_commission_rate}
                onChange={(v) =>
                  setDef("community_platform_commission_rate", v ?? DEFAULT_PLATFORM_DEFAULTS.community_platform_commission_rate)
                }
                min={0}
                max={100}
                step={0.5}
              />
            </Field>
            <Field label="Trial days">
              <NumInput
                value={defaults.community_trial_days}
                onChange={(v) => setDef("community_trial_days", v ?? 0)}
                min={0}
                max={90}
              />
            </Field>
          </Grid>
        </section>

        <section>
          <Divider label="Affiliate tiers (RWF)" />
          <Grid cols={2}>
            <Field label="Silver tier minimum">
              <NumInput
                value={defaults.affiliate_silver_threshold}
                onChange={(v) => setDef("affiliate_silver_threshold", v ?? DEFAULT_PLATFORM_DEFAULTS.affiliate_silver_threshold)}
                min={0}
                step={10000}
              />
            </Field>
            <Field label="Gold tier minimum">
              <NumInput
                value={defaults.affiliate_gold_threshold}
                onChange={(v) => setDef("affiliate_gold_threshold", v ?? DEFAULT_PLATFORM_DEFAULTS.affiliate_gold_threshold)}
                min={0}
                step={10000}
              />
            </Field>
          </Grid>
        </section>

        <div className="h-20" />
      </div>

      {dirty && (
        <SaveBar
          pending={pending}
          onSave={handleSave}
          onDiscard={() => {
            setDefaults(initialDefaults);
            setDirty(false);
          }}
        />
      )}
    </>
  );
}
