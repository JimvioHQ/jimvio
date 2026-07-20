"use client";

import { useEffect, useState } from "react";

const storageKey = "jimvio:nps-captured";

export function NpsCapture() {
  const [visible, setVisible] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(storageKey));
    } catch {
      // Storage access is optional.
    }
  }, []);

  async function submit(score: number) {
    setSent(true);
    try {
      await fetch("/api/growth/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventName: "growth.nps_score", properties: { score } }),
      });
      localStorage.setItem(storageKey, new Date().toISOString());
    } finally {
      window.setTimeout(() => setVisible(false), 900);
    }
  }

  if (!visible) return null;
  return (
    <section className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">How likely are you to recommend Jimvio?</p>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="NPS rating from 0 to 10">
        {Array.from({ length: 11 }, (_, score) => (
          <button key={score} type="button" onClick={() => submit(score)} disabled={sent} className="h-8 w-8 rounded-md border border-[var(--color-border)] text-xs font-semibold hover:border-[#fd5000] disabled:opacity-50">
            {score}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">{sent ? "Thanks for your feedback." : "0 = not likely, 10 = very likely"}</p>
    </section>
  );
}
