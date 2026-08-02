"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Loader2, X } from "lucide-react";
import { IdentityButton, IdentityCard } from "@/components/identity/identity-ui";

export function IdentityBookingForm({
  creatorId,
  creatorName,
  onClose,
  inline = false,
}: {
  creatorId: string;
  creatorName: string;
  onClose: () => void;
  /** Render as plain content (no fixed overlay/modal chrome) — for embedding in a tab panel. */
  inline?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give this booking a title.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/identity/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          title: title.trim(),
          message: message.trim() || undefined,
          scheduledAt: scheduledAt || undefined,
          durationMinutes: duration,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send booking request");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send booking request");
    } finally {
      setSubmitting(false);
    }
  }

  const content = (
    <>
        {!inline && (
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Book a slot</p>
              <h3 className="font-[var(--font-identity-serif)] text-[19px] font-medium text-[#161512]">
                Request time with {creatorName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9A9388] hover:bg-black/[0.04] hover:text-[#1C1B19]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#1C8A44]" />
            <p className="text-[14px] font-semibold text-[#1C1B19]">Request sent</p>
            <p className="text-[12.5px] text-[#8B8579]">
              {creatorName} will accept or decline from their booking inbox.
            </p>
            <IdentityButton variant="outline" size="sm" onClick={onClose}>
              Done
            </IdentityButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Field label="What's this about?">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Product launch collab"
                className="identity-input"
                maxLength={160}
              />
            </Field>
            <Field label="Message (optional)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share brief context, budget, or goals…"
                rows={3}
                className="identity-input resize-none"
                maxLength={2000}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preferred date/time">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B9B3A6]" />
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="identity-input pl-8"
                  />
                </div>
              </Field>
              <Field label="Duration">
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="identity-input"
                >
                  {[15, 30, 45, 60, 90].map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {error && <p className="text-[12px] text-[#C23A2F]">{error}</p>}

            <IdentityButton type="submit" className="w-full" loading={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
            </IdentityButton>
          </form>
        )}

        <style jsx global>{`
          .identity-input {
            width: 100%;
            height: 40px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            background: #fff;
            padding: 0 12px;
            font-size: 13.5px;
            color: #1c1b19;
            outline: none;
            transition: border-color 0.15s ease;
          }
          .identity-input:focus {
            border-color: #ff5a1f;
          }
          textarea.identity-input {
            height: auto;
            padding: 10px 12px;
          }
        `}</style>
    </>
  );

  if (inline) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <IdentityCard
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-b-none rounded-t-[24px] p-6 sm:rounded-[24px]"
      >
        {content}
      </IdentityCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-[#7C766B]">{label}</span>
      {children}
    </label>
  );
}
