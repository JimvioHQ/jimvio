"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PRIMARY_NAV_ITEMS } from "@/lib/navigation/primary-nav";

const TARGETS = ["/", ...PRIMARY_NAV_ITEMS.map((i) => i.href)];
const REFRESH_MS = 4 * 60 * 1000;

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/**
 * Warms the main Jimvio sections in the background so a click on
 * Marketplace, Communities, Commerce, Affiliates or UGC opens at once.
 * Runs when the browser is idle, one route at a time, and again every few
 * minutes while the tab is visible so the cached pages stay fresh.
 * Skipped on data-saver and very slow connections.
 */
export function SectionPrefetcher() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return;

    let cancelled = false;
    const timers: number[] = [];
    const idle = (cb: () => void) => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 3000 });
      else timers.push(window.setTimeout(cb, 1500));
    };

    const warm = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      TARGETS.filter((href) => href !== pathname).forEach((href, i) => {
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) router.prefetch(href);
          }, i * 400),
        );
      });
    };

    idle(warm);
    const interval = window.setInterval(warm, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") idle(warm);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Re-warm only when the section changes, not on every sub-route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname.split("/")[1]]);

  return null;
}
