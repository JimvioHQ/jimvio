"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLiveDestinations } from "@/hooks/live/useLiveDestinations";
import { LiveDestinationsPanel } from "@/components/community/hub/live/LiveDestinationsPanel";

/**
 * Settings → Live Destinations management surface (legacy).
 * Primary entry is Live → Settings. This client remains for deep links/OAuth.
 */
export function IdentityLiveDestinationsClient() {
  const dest = useLiveDestinations(null);
  const [flashConnected, setFlashConnected] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("dest_connected");
    const destError = params.get("dest_error");
    if (connected) {
      setFlashConnected(connected);
      void dest.refreshList();
    }
    if (destError) {
      setFlashError(destError);
    }
    if (connected || destError) {
      params.delete("dest_connected");
      params.delete("dest_error");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot URL flash
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <Link
        href="/identity/settings"
        className="mb-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#8B8579] hover:text-[#D6480F]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Settings
      </Link>

      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          Live Studio
        </p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Live Destinations
        </h1>
        <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[#8B8579]">
          Connect and manage the platforms where you want to broadcast your Jimvio
          Live sessions. Jimvio Live always stays on — external destinations fan
          out without interrupting your studio.
        </p>
      </div>

      {flashConnected ? (
        <p
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800"
          role="status"
        >
          {flashConnected} connected successfully.
        </p>
      ) : null}
      {flashError ? (
        <p
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
          role="alert"
        >
          {flashError}
        </p>
      ) : null}

      <LiveDestinationsPanel dest={dest} variant="settings" />
    </div>
  );
}
