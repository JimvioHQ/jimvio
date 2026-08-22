"use client";

/**
 * Mounts non-essential analytics ONLY after the user's consent allows it.
 *
 * Replaces the previously-unconditional mounting of Vercel Analytics /
 * Speed Insights / first-party soft-launch analytics in the root layout, so
 * no analytics run before consent in opt-in (GDPR/LGPD) regions.
 */

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SoftLaunchProviders } from "@/components/soft-launch/SoftLaunchProviders";
import { useConsent } from "@/context/ConsentContext";

export function ConsentGatedAnalytics() {
  const { ready, consent } = useConsent();

  if (!ready || !consent.analytics) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <SoftLaunchProviders />
    </>
  );
}
