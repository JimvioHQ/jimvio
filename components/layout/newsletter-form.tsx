"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--color-success-light)] border border-[var(--color-success)] text-[var(--color-success)] text-xs font-medium">
        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
        You&apos;re subscribed. Check your inbox.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-stretch sm:items-center w-full sm:max-w-[280px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 focus-within:border-[var(--color-accent)] transition-[box-shadow,border-color]"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="h-9 flex-1 min-w-0 sm:w-auto px-3 py-2 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-9 shrink-0 inline-flex items-center justify-center gap-1.5 px-4 bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Subscribe <ArrowRight className="h-3.5 w-3.5" />
          </>
        )}
      </button>
    </form>
  );
}
