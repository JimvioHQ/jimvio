"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createSuperAppData } from "@/lib/jimvio-super-app";
import { SuperAppContextSync } from "./SuperAppContextSync";

const SuperAppDock = dynamic(() => import("./SuperAppDock").then((m) => ({ default: m.SuperAppDock })), { ssr: false });
const SuperAppPanel = dynamic(() => import("./SuperAppPanel").then((m) => ({ default: m.SuperAppPanel })), { ssr: false });

/** Global Super App layer — universal actions without replacing existing navigation. */
export function JimvioSuperAppLoader() {
  const [ready, setReady] = useState(false);
  const data = useMemo(() => createSuperAppData(), []);

  useEffect(() => {
    const run = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 3200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 1600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <SuperAppContextSync />
      {ready && (
        <>
          <SuperAppDock data={data} />
          <SuperAppPanel data={data} />
        </>
      )}
    </>
  );
}
