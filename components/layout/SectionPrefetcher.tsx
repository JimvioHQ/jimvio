"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PRIMARY_NAV_ITEMS } from "@/lib/navigation/primary-nav";

const TARGETS = new Set(["/", ...PRIMARY_NAV_ITEMS.map((i) => i.href)]);
const REUSE_MS = 60_000;

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/**
 * Loads a main Jimvio section the moment someone shows intent to open it
 * (pointer over, finger down, or keyboard focus on its link), so the click
 * lands on a ready page. Section skeletons are already prefetched by Next.js;
 * this fetches the full page only on intent, so the database is not loaded
 * by pages nobody opens. Skipped on data-saver and 2G.
 */
export function SectionPrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return;
    const last = new Map<string, number>();

    const onIntent = (event: Event) => {
      const a = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.origin !== window.location.origin) return;
      const href = a.pathname;
      if (!TARGETS.has(href) || href === window.location.pathname) return;
      const now = Date.now();
      if (now - (last.get(href) ?? 0) < REUSE_MS) return;
      last.set(href, now);
      router.prefetch(href);
    };

    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    return () => {
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("touchstart", onIntent);
      document.removeEventListener("focusin", onIntent);
    };
  }, [router]);

  return null;
}
