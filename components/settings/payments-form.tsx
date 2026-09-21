"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import {
  Card,
  Divider,
  SaveBar,
  Toast,
  Toggle,
  type ToastMsg,
  useBeforeUnload,
} from "@/components/admin/form-primitive";
import { updatePlatformSettings } from "@/lib/actions/security";
import {
  DEFAULT_PAYMENT_PROVIDERS,
  mergePaymentProviders,
  type PaymentProviderId,
  type PaymentProvidersSettings,
} from "@/lib/platform-settings-shared";

const PROVIDER_LABELS: Record<PaymentProviderId, string> = {
  flutterwave: "Flutterwave",
  nowpayments: "NOWPayments (Crypto)",
  binancepay: "Binance Pay",
};

export function PaymentsSettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const initialPayments = mergePaymentProviders(
    typeof initial.payment_providers === "object" && initial.payment_providers
      ? (initial.payment_providers as Partial<PaymentProvidersSettings>)
      : {}
  );

  const [settings, setSettings] = useState<PaymentProvidersSettings>(initialPayments);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useBeforeUnload(dirty);

  function setProvider(id: PaymentProviderId, enabled: boolean) {
    setSettings((prev) => ({
      ...prev,
      providers: { ...prev.providers, [id]: { enabled } },
    }));
    setDirty(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePlatformSettings({ payment_providers: settings });
      if (!result.success) {
        setToast({ msg: result.error, type: "err" });
        return;
      }
      const failed = result.data?.failed ?? [];
      if (failed.length > 0) {
        setToast({ msg: `${failed.length} setting group(s) failed to save`, type: "err" });
        return;
      }
      setToast({ msg: "Payment settings saved", type: "ok" });
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
            <CreditCard className="size-4" style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Payment providers</h2>
            <p className="text-[12px] text-muted-foreground">
              Enable checkout methods for buyers. API keys stay in server environment variables.
            </p>
          </div>
        </header>

        <Card>
          <Toggle
            checked={settings.sandbox_mode}
            onChange={(v) => {
              setSettings((p) => ({ ...p, sandbox_mode: v }));
              setDirty(true);
            }}
            label="Sandbox / test mode"
            description="Use provider test endpoints where supported (requires test credentials in env)"
          />
        </Card>

        <Divider label="Checkout methods" />

        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PROVIDER_LABELS) as PaymentProviderId[]).map((id) => (
            <Card key={id}>
              <Toggle
                checked={settings.providers[id]?.enabled ?? DEFAULT_PAYMENT_PROVIDERS.providers[id].enabled}
                onChange={(v) => setProvider(id, v)}
                label={PROVIDER_LABELS[id]}
                description={
                  settings.providers[id]?.enabled
                    ? "Shown at checkout when configured in env"
                    : "Hidden from checkout"
                }
              />
            </Card>
          ))}
        </div>

        <p                 className="text-[12px] text-muted-foreground">
          Configure secrets in <code className="text-[11px]">.env</code> — not in this panel. Webhook logs live under{" "}
          <a href="/admin/payments/webhooks" className="text-[var(--color-accent)] hover:underline">
            Payments → Webhooks
          </a>
          .
        </p>

        <div className="h-20" />
      </div>

      {dirty && (
        <SaveBar
          pending={pending}
          onSave={handleSave}
          onDiscard={() => {
            setSettings(initialPayments);
            setDirty(false);
          }}
        />
      )}
    </>
  );
}
