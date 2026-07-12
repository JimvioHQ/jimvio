"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CopilotContextSync } from "./CopilotContextSync";

const JimvioCopilot = dynamic(
  () => import("./JimvioCopilot").then((m) => ({ default: m.JimvioCopilot })),
  { ssr: false },
);

/** Lazy global copilot — mounted once for the entire platform. */
export function JimvioCopilotLoader() {
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

  if (!ready) return null;

  return (
    <>
      <CopilotContextSync />
      <JimvioCopilot />
    </>
  );
}
