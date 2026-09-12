"use client";

import { useState } from "react";

export function StorefrontNewsletterForm({
  storeHandle,
  sectionId,
  title,
  subhead,
  cta,
}: {
  storeHandle: string;
  sectionId?: string;
  title?: string;
  subhead?: string;
  cta?: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/commerce/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeHandle,
          email,
          sectionId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : "Could not subscribe right now."
        );
        return;
      }
      setMessage("Thanks — you’re on the list.");
      setEmail("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-y border-black/5 bg-white/70 px-4 py-12 text-center sm:px-6">
      <h2 className="text-2xl font-semibold">{title || "Stay in the loop"}</h2>
      {subhead ? <p className="mt-2 text-sm opacity-70">{subhead}</p> : null}
      <form
        onSubmit={submit}
        className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row"
      >
        <label className="sr-only" htmlFor={`newsletter-${sectionId || "main"}`}>
          Email
        </label>
        <input
          id={`newsletter-${sectionId || "main"}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="h-11 flex-1 rounded-[var(--store-btn-radius,9999px)] border border-black/10 bg-white px-4 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-11 rounded-[var(--store-btn-radius,9999px)] px-5 text-sm font-semibold text-[var(--store-btn-text,#fff)] disabled:opacity-50"
          style={{ background: "var(--store-btn, var(--store-primary,#FF5A1F))" }}
        >
          {busy ? "Saving…" : cta || "Notify me"}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
      {message ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">{message}</p>
      ) : null}
    </section>
  );
}
