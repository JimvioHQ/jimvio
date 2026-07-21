"use client";

import { useState } from "react";
import { Bug, Lightbulb, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "feedback" | "bug" | "feature";

const categories: Array<{ id: Category; label: string; icon: typeof Bug }> = [
  { id: "feedback", label: "Feedback", icon: MessageSquarePlus },
  { id: "bug", label: "Bug", icon: Bug },
  { id: "feature", label: "Idea", icon: Lightbulb },
];

type ProductFeedbackFormProps = {
  className?: string;
  title?: string;
  description?: string;
};

/** Embeddable product feedback form (NPS-style notes, bugs, feature requests). No floating UI. */
export function ProductFeedbackForm({
  className,
  title = "Send feedback",
  description = "Report a bug, share an idea, or tell us what feels off. We read every note.",
}: ProductFeedbackFormProps) {
  const [category, setCategory] = useState<Category>("feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
        {description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
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
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold",
                active
                  ? "border-[#fd5000] bg-orange-50 text-[#fd5000] dark:bg-orange-950/30"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
      <form onSubmit={submit} className="space-y-2">
        <label className="sr-only" htmlFor="product-feedback-message">
          Feedback message
        </label>
        <textarea
          id="product-feedback-message"
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
          {status === "sending"
            ? "Sending…"
            : status === "sent"
              ? "Thanks!"
              : status === "error"
                ? "Try again"
                : "Send feedback"}
        </button>
      </form>
    </div>
  );
}

/**
 * @deprecated Floating soft-launch FAB removed. Use ProductFeedbackForm in Settings or Help.
 * Kept as an alias so existing imports resolve to the embeddable form.
 */
export function ProductFeedbackWidget(props: ProductFeedbackFormProps) {
  return <ProductFeedbackForm {...props} />;
}
