"use client";

import { useEffect } from "react";

const KEY = "jimvio-country-signal-at";
const EVERY_MS = 6 * 60 * 60 * 1000;

/** Sends the device clock to Jimvio a few times a day for real country checks. */
export function CountrySignalBeacon() {
  useEffect(() => {
    let last = 0;
    try {
      last = Number(window.localStorage.getItem(KEY) ?? 0);
    } catch {
      /* storage blocked */
    }
    if (Date.now() - last < EVERY_MS) return;
    const timer = window.setTimeout(() => {
      const body = JSON.stringify({
        offsetMinutes: -new Date().getTimezoneOffset(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      });
      fetch("/api/geo/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
        .then((res) => {
          // Signed out (204): look again in 30 minutes instead of 6 hours.
          const at = res.status === 200 ? Date.now() : Date.now() - EVERY_MS + 30 * 60 * 1000;
          try {
            window.localStorage.setItem(KEY, String(at));
          } catch {
            /* storage blocked */
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
