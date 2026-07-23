"use client";

import { useEffect, useState } from "react";

/**
 * False on the server and on the hydration pass; true after mount.
 * Gate Zustand-persist (and other client-only) reads so SSR HTML matches
 * the first client paint — preventing React #418 when localStorage
 * rehydrates before React attaches.
 *
 * Intentionally uses useEffect+setState (not useSyncExternalStore with
 * true/false snapshots): a true client snapshot during hydration would
 * diverge from the server snapshot and reintroduce #418.
 */
export function useClientReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Intentional: first paint must stay `false` to match SSR (React #418).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount latch
    setReady(true);
  }, []);
  return ready;
}
