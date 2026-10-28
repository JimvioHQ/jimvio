"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { FINANCIAL_RISK_NOTICE } from "@/lib/compliance/financial-risk";

/** Static inline notice (store pages). */
export function FinancialRiskNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] leading-snug text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold">Risk notice:</strong> {FINANCIAL_RISK_NOTICE}
      </span>
    </div>
  );
}

const storageKey = (communityId: string) => `jv:risk-notice:${communityId}`;

function readSeen(communityId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(communityId)) === "1";
  } catch {
    return false;
  }
}

function writeSeen(communityId: string) {
  try {
    window.localStorage.setItem(storageKey(communityId), "1");
  } catch {
    /* storage unavailable — server record still applies */
  }
}

/**
 * Financial risk notice for trading / investing communities, shown once per
 * member per community as a dismissible notification. Signed-in members are
 * recorded server-side (any device); visitors are remembered on this device.
 */
export function FinancialRiskToast({ communityId }: { communityId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!communityId || readSeen(communityId)) return;
    let cancelled = false;
    fetch("/api/c/notices/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId, notice: "financial-risk" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res: { signedIn?: boolean; firstTime?: boolean | null } | null) => {
        if (cancelled) return;
        writeSeen(communityId);
        // Already acknowledged on another device → stay hidden.
        if (res?.signedIn && res.firstTime === false) return;
        setOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        writeSeen(communityId);
        setOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[60] mx-auto max-w-md animate-in fade-in slide-in-from-bottom-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white p-3.5 shadow-[0_12px_32px_rgba(17,24,39,0.16)] dark:border-amber-900/60 dark:bg-[var(--color-surface)]">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Risk notice</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-text-secondary)]">{FINANCIAL_RISK_NOTICE}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-amber-600"
          >
            I understand
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close risk notice"
          className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary,#F3F4F6)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
