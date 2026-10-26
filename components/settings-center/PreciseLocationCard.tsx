"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { PreciseGeocodeState, PreciseLocationSummary } from "@/lib/geo/precise-location";
import { SettingsButton, SettingsCard, SettingsStatus } from "./settings-ui";

type Status = PreciseLocationSummary;

export function PreciseLocationCard({ initial }: { initial: Status }) {
  const [status, setStatus] = useState<Status>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"share" | "decline" | "clear" | null>(null);

  async function send(intent: "share" | "decline" | "clear", extra?: Record<string, number | null>) {
    setPending(intent);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/account/precise-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, ...extra }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not save location");
        return;
      }
      const geocodeState: PreciseGeocodeState = json.geocodeState === "resolved"
        || json.geocodeState === "unconfigured"
        || json.geocodeState === "unavailable"
        || json.geocodeState === "rate_limited"
        || json.geocodeState === "error"
        ? json.geocodeState
        : "not_requested";
      setStatus({
        permission: json.permission === "granted" || json.permission === "denied" ? json.permission : "none",
        capturedAt: typeof json.capturedAt === "string" ? json.capturedAt : null,
        expiresAt: typeof json.expiresAt === "string" ? json.expiresAt : null,
        geocodeState,
      });
      if (intent === "share" && json.geocodeState === "unconfigured") {
        setMessage("Location saved. An address estimate is not available until geocoding is configured.");
      } else if (intent === "share") {
        setMessage("Location saved for authorized admin review. It is not added to your public profile.");
      } else if (intent === "decline") {
        setMessage("You can keep using Jimvio without sharing a precise location.");
      } else {
        setMessage("The shared location was removed.");
      }
    } catch {
      setError("Could not save location");
    } finally {
      setPending(null);
    }
  }

  function share() {
    if (!navigator.geolocation) {
      setError("This browser cannot share a location. You can continue without it.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void send("share", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
      },
      (positionError) => {
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setError("The browser denied location permission. Jimvio will not ask again unless you press Share.");
          void send("decline");
          return;
        }
        setError("The browser could not read a location. You can continue without it.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const shared = status.permission === "granted";
  const declined = status.permission === "denied";

  return (
    <SettingsCard
      title="Precise location"
      icon={<MapPin className="h-4 w-4" />}
      description="Share your location once so authorized Jimvio administrators can review the point you chose. It is not collected in the background, not shown on your public profile, and not used to rank the marketplace. The profile location switch above only controls your city and country."
    >
      <div className="space-y-3">
        <p className="text-[13px] text-[#6B7280]">
          {shared
            ? `You shared a location${status.capturedAt ? ` on ${new Date(status.capturedAt).toLocaleDateString("en-GB")}` : ""}. It is kept for 90 days, then deleted.`
            : declined
              ? "You chose to continue without a precise location."
              : "Not available until you choose to share."}
        </p>
        {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}
        {message ? <SettingsStatus tone="success">{message}</SettingsStatus> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <SettingsButton onClick={share} loading={pending === "share"} disabled={pending != null}>
            Share current location
          </SettingsButton>
          <SettingsButton
            variant="secondary"
            onClick={() => void send("decline")}
            loading={pending === "decline"}
            disabled={pending != null}
          >
            Continue without location
          </SettingsButton>
          {shared ? (
            <SettingsButton
              variant="secondary"
              onClick={() => void send("clear")}
              loading={pending === "clear"}
              disabled={pending != null}
            >
              Remove shared location
            </SettingsButton>
          ) : null}
        </div>
      </div>
    </SettingsCard>
  );
}
