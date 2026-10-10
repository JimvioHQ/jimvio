"use client";

import { useState } from "react";

export function ArticleFeedback({ slug }: { slug: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send(helpful: boolean) {
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/support/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, helpful }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Feedback was not saved.");
      else setMessage("Thanks. Your feedback was saved.");
    } catch {
      setError("Feedback was not saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-medium">Was this article helpful?</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={pending} onClick={() => send(true)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">
          Yes
        </button>
        <button type="button" disabled={pending} onClick={() => send(false)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">
          No
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-[#374151]">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
