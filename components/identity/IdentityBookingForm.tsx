"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { IdentityButton, IdentityCard } from "@/components/identity/identity-ui";

const REQUEST_TYPES = [
  { value: "booking", label: "Booking" },
  { value: "collaboration", label: "Collaboration" },
  { value: "service", label: "Service inquiry" },
  { value: "business", label: "Business inquiry" },
  { value: "general", label: "General contact" },
] as const;

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
  const [requestType, setRequestType] = useState<(typeof REQUEST_TYPES)[number]["value"]>("booking");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please add a subject for your request.");
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
          requestType,
          title: title.trim(),
          message: message.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send request");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  }

  const content = (
    <>
      {!inline && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
              Services & contact
            </p>
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
            {creatorName} will review your request and respond from their booking inbox.
          </p>
          {!inline ? (
            <IdentityButton variant="outline" size="sm" onClick={onClose}>
              Done
            </IdentityButton>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Request type">
            <select
              value={requestType}
              onChange={(e) =>
                setRequestType(e.target.value as (typeof REQUEST_TYPES)[number]["value"])
              }
              className="identity-input"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What would you like to discuss?">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product launch collaboration"
              className="identity-input"
              maxLength={160}
              required
            />
          </Field>
          <Field label="Message / project details (optional)">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share brief context, goals, or how we can help…"
              rows={3}
              className="identity-input resize-none"
              maxLength={2000}
            />
          </Field>

          {error && <p className="text-[12px] text-[#C23A2F]">{error}</p>}

          <IdentityButton type="submit" className="w-full" loading={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Request"}
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
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
