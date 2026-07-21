"use client";

import dynamic from "next/dynamic";

const SessionAnalytics = dynamic(
  () => import("./SessionAnalytics").then((m) => m.SessionAnalytics),
  { ssr: false },
);
const CrashAnalytics = dynamic(
  () => import("./CrashAnalytics").then((m) => m.CrashAnalytics),
  { ssr: false },
);
const PerformanceAnalytics = dynamic(
  () => import("./PerformanceAnalytics").then((m) => m.PerformanceAnalytics),
  { ssr: false },
);

/** Soft-launch instrumentation for signed-in product users (no floating UI). */
export function SoftLaunchProviders() {
  return (
    <>
      <SessionAnalytics />
      <CrashAnalytics />
      <PerformanceAnalytics />
    </>
  );
}
