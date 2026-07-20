"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function track(eventName: string, properties: Record<string, unknown> = {}) {
  void fetch("/api/growth/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Lightweight first-party session + page analytics for soft launch KPIs. */
export function SessionAnalytics() {
  const pathname = usePathname();
  const sessionStarted = useRef(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}`;
    try {
      sessionStorage.setItem("jimvio:session_id", sessionId);
    } catch {
      // optional
    }
    track("growth.session_start", {
      sessionId,
      path: window.location.pathname,
      referrer: document.referrer || null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
  }, []);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    let sessionId: string | null = null;
    try {
      sessionId = sessionStorage.getItem("jimvio:session_id");
    } catch {
      sessionId = null;
    }
    track("growth.page_view", { path: pathname, sessionId });
  }, [pathname]);

  return null;
}
