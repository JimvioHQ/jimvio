"use client";

/**
 * Region-aware cookie/consent banner (GDPR · LGPD · CCPA/CPRA · default).
 *
 * - GDPR/LGPD: prior opt-in. Non-essential storage stays OFF until "Accept".
 * - CCPA/CPRA: opt-out. Exposes "Do Not Sell or Share My Personal Information".
 * - Default: informational, dismissible.
 *
 * Non-essential analytics/personalization/marketing are gated by
 * `ConsentGatedAnalytics`; this component only collects the decision.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useConsent } from "@/context/ConsentContext";
import type { ConsentState } from "@/lib/compliance/regions";

const TOGGLES: Array<{ key: keyof ConsentState; label: string; desc: string }> = [
  {
    key: "analytics",
    label: "Analytics & performance",
    desc: "Helps us understand usage and improve reliability (Vercel Analytics, Speed Insights, product metrics).",
  },
  {
    key: "personalization",
    label: "Personalization",
    desc: "Tailors recommendations and remembers preferences to improve your experience.",
  },
  {
    key: "marketing",
    label: "Marketing",
    desc: "Measures campaigns and supports promotional features.",
  },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong,var(--color-border))]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function PreferencesDialog() {
  const { consent, regime, save, rejectAll, acceptAll, closePreferences } = useConsent();
  const [draft, setDraft] = useState<ConsentState>(consent);

  useEffect(() => {
    setDraft(consent);
  }, [consent]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePreferences} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">
            Privacy preferences
          </h2>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                Strictly necessary
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                Required for sign-in, security, currency and core functionality. Always on.
              </p>
            </div>
            <span className="mt-0.5 shrink-0 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
              Always on
            </span>
          </div>

          {TOGGLES.map((t) => (
            <div
              key={t.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-[var(--color-border)] p-3"
            >
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{t.label}</p>
                <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{t.desc}</p>
              </div>
              <div className="pt-0.5">
                <Toggle
                  checked={draft[t.key]}
                  label={t.label}
                  onChange={(v) => setDraft((d) => ({ ...d, [t.key]: v }))}
                />
              </div>
            </div>
          ))}

          {regime === "ccpa" && (
            <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              California residents: turning these off exercises your right to opt out of the sale
              or sharing of personal information under the CCPA/CPRA.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={rejectAll}
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[12.5px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={() => save(draft)}
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[12.5px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
          >
            Save choices
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="h-9 rounded-lg bg-[var(--color-accent)] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[var(--color-accent-hover,var(--color-accent))]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComplianceBanner() {
  const { showBanner, preferencesOpen, regime, acceptAll, rejectAll, doNotSell, openPreferences } =
    useConsent();

  if (!showBanner && !preferencesOpen) return null;

  const optIn = regime === "gdpr" || regime === "lgpd";

  return (
    <>
      {showBanner && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                We value your privacy
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
                We use strictly necessary cookies to run Jimvio, plus optional analytics,
                personalization and marketing cookies.{" "}
                {optIn
                  ? "Non-essential cookies stay off until you accept."
                  : "You can opt out at any time."}{" "}
                <a href="/cookies" className="font-semibold text-[var(--color-accent)] hover:underline">
                  Learn more
                </a>
                .
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {regime === "ccpa" && (
                <button
                  type="button"
                  onClick={doNotSell}
                  className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                >
                  Do Not Sell or Share
                </button>
              )}
              <button
                type="button"
                onClick={openPreferences}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              >
                Manage
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="h-9 rounded-lg bg-[var(--color-accent)] px-3.5 text-[12px] font-semibold text-white hover:bg-[var(--color-accent-hover,var(--color-accent))]"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}

      {preferencesOpen && <PreferencesDialog />}
    </>
  );
}
