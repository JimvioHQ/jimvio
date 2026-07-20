"use client";

import { useEffect, useState } from "react";

const storageKey = "jimvio:nps-last";
const MIN_ACCOUNT_AGE_MS = 2 * 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 45 * 24 * 60 * 60 * 1000;

export function NpsCapture() {
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const last = localStorage.getItem(storageKey);
        if (last && Date.now() - new Date(last).getTime() < COOLDOWN_MS) return;

        const response = await fetch("/api/growth/onboarding");
        if (!response.ok) return;
        const onboarding = await response.json();
        const welcomeAt = onboarding?.welcome_completed_at
          ? new Date(onboarding.welcome_completed_at).getTime()
          : 0;
        if (!welcomeAt || Date.now() - welcomeAt < MIN_ACCOUNT_AGE_MS) return;
        if (!cancelled) setVisible(true);
      } catch {
        // optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(finalScore: number) {
    setSent(true);
    try {
      await fetch("/api/growth/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventName: "growth.nps_score",
          properties: {
            score: finalScore,
            comment: comment.trim().slice(0, 1000) || null,
            bucket: finalScore >= 9 ? "promoter" : finalScore >= 7 ? "passive" : "detractor",
          },
        }),
      });
      localStorage.setItem(storageKey, new Date().toISOString());
    } finally {
      window.setTimeout(() => setVisible(false), 1000);
    }
  }

  if (!visible) return null;

  return (
    <section className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        How likely are you to recommend Jimvio?
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="NPS rating from 0 to 10">
        {Array.from({ length: 11 }, (_, value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScore(value)}
            disabled={sent}
            className={`h-8 w-8 rounded-md border text-xs font-semibold disabled:opacity-50 ${
              score === value
                ? "border-[#fd5000] bg-orange-50 text-[#fd5000] dark:bg-orange-950/30"
                : "border-[var(--color-border)] hover:border-[#fd5000]"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      {score !== null ? (
        <div className="mt-3 space-y-2">
          <label className="block text-[11px] text-[var(--color-text-muted)]" htmlFor="nps-comment">
            Optional — what is the main reason for your score?
          </label>
          <textarea
            id="nps-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
            disabled={sent}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[#fd5000]"
          />
          <button
            type="button"
            disabled={sent}
            onClick={() => submit(score)}
            className="rounded-lg bg-[#fd5000] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {sent ? "Thanks!" : "Submit"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">0 = not likely, 10 = very likely</p>
      )}
    </section>
  );
}
