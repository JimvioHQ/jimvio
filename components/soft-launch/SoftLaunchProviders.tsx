"use client";

import dynamic from "next/dynamic";

const ProductFeedbackWidget = dynamic(
  () => import("./ProductFeedbackWidget").then((m) => m.ProductFeedbackWidget),
  { ssr: false },
);
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

/** Soft-launch instrumentation + feedback surface for signed-in product users. */
export function SoftLaunchProviders() {
  return (
    <>
      <SessionAnalytics />
      <CrashAnalytics />
      <PerformanceAnalytics />
      <ProductFeedbackWidget />
    </>
  );
}
