"use client";

import { useEffect, useState } from "react";
import { Lock, MapPin } from "lucide-react";

type State = { country: string | null; locked: boolean; source: string | null; vpnSuspected: boolean } | null;

function name(code: string | null): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * Read-only country. Jimvio sets it from where the account really is and it
 * cannot be edited, so it can be trusted for campaigns, payouts and prices.
 */
export function LockedCountryField({ fallback, className }: { fallback?: string | null; className?: string }) {
  const [state, setState] = useState<State>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/geo/country", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !cancelled && setState(j))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const code = state?.country ?? fallback ?? null;
  return (
    <div>
      <div
        className={
          className ??
          "flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 text-[13.5px] text-[#161512]"
        }
        aria-readonly="true"
      >
        <MapPin className="h-4 w-4 shrink-0 text-[#9A9388]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{code ? name(code) : "Detecting your country…"}</span>
        <Lock className="h-3.5 w-3.5 shrink-0 text-[#9A9388]" aria-label="Locked" />
      </div>
      <p className="mt-1 text-[11px] text-[#8B8579]">
        {state?.vpnSuspected
          ? "A VPN or proxy was detected. Jimvio keeps your real country."
          : "Set automatically from your real location. It can't be changed. Contact support if it's wrong."}
      </p>
    </div>
  );
}
