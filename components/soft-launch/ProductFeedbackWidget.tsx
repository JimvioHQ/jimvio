"use client";

import { useEffect, useState } from "react";
import { Bug, Lightbulb, MessageSquarePlus, X } from "lucide-react";

type Category = "feedback" | "bug" | "feature";

const categories: Array<{ id: Category; label: string; icon: typeof Bug }> = [
  { id: "feedback", label: "Feedback", icon: MessageSquarePlus },
  { id: "bug", label: "Bug", icon: Bug },
  { id: "feature", label: "Idea", icon: Lightbulb },
];

export function ProductFeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    fetch("/api/growth/onboarding")
      .then((r) => setAuthed(r.status !== 401))
      .catch(() => setAuthed(false));
  }, []);

  if (!authed) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 3) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          pagePath: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setMessage("");
      window.setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-[60] sm:bottom-6 sm:right-6">
      {open ? (
        <div
          role="dialog"
          aria-label="Send product feedback"
          className="mb-3 w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Help improve Jimvio</p>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-[#fd5000]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-3 flex gap-1.5">
            {categories.map((item) => {
              const Icon = item.icon;
              const active = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
                    active
                      ? "border-[#fd5000] bg-orange-50 text-[#fd5000] dark:bg-orange-950/30"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <form onSubmit={submit} className="space-y-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={4000}
              required
              placeholder={
                category === "bug"
                  ? "What went wrong? Include steps if you can."
                  : category === "feature"
                    ? "What would make Jimvio more useful for you?"
                    : "Tell us what worked or what felt off."
              }
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[#fd5000]"
            />
            <button
              type="submit"
              disabled={status === "sending" || message.trim().length < 3}
              className="w-full rounded-xl bg-[#fd5000] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : status === "sent" ? "Thanks!" : status === "error" ? "Try again" : "Send"}
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-md hover:border-[#fd5000]"
        aria-expanded={open}
      >
        <MessageSquarePlus className="h-4 w-4 text-[#fd5000]" />
        Feedback
      </button>
    </div>
  );
}
