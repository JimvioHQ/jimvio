"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CommandCenterShortcuts } from "./CommandCenterShortcuts";

const CommandCenter = dynamic(
  () => import("./CommandCenter").then((m) => ({ default: m.CommandCenter })),
  { ssr: false },
);

const CommandCenterFAB = dynamic(
  () => import("./CommandCenterFAB").then((m) => ({ default: m.CommandCenterFAB })),
  { ssr: false },
);

/** Lazy global command palette — one instance for the entire platform. */
export function CommandCenterLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 1200);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) return <CommandCenterShortcuts />;

  return (
    <>
      <CommandCenterShortcuts />
      <CommandCenter />
      <CommandCenterFAB />
    </>
  );
}
