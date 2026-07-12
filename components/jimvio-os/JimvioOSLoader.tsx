"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { OsShortcuts } from "./OsShortcuts";
import { OsContextSync } from "./OsContextSync";

const OsShell = dynamic(() => import("./OsShell").then((m) => ({ default: m.OsShell })), { ssr: false });
const OsQuickCreate = dynamic(() => import("./OsQuickCreate").then((m) => ({ default: m.OsQuickCreate })), { ssr: false });
const OsLauncher = dynamic(() => import("./OsLauncher").then((m) => ({ default: m.OsLauncher })), { ssr: false });

/** Lazy Jimvio OS shell — dashboard overlay, does not replace existing navigation. */
export function JimvioOSLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <OsShortcuts />
      <OsContextSync />
      {ready && (
        <>
          <OsShell />
          <OsQuickCreate />
          <OsLauncher />
        </>
      )}
    </>
  );
}
