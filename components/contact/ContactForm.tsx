"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const CONTACT_TOPICS = [
  { value: "general", label: "General inquiry" },
  { value: "support", label: "Customer support" },
  { value: "business", label: "Business inquiry" },
  { value: "partnerships", label: "Partnership inquiry" },
  { value: "creator", label: "Creator inquiry" },
  { value: "vendor", label: "Vendor / seller inquiry" },
  { value: "press", label: "Press / media inquiry" },
  { value: "investors", label: "Investor inquiry" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export function normalizeContactTopic(raw: string | null | undefined): ContactTopic {
  const match = CONTACT_TOPICS.find((t) => t.value === raw);
  return match?.value ?? "general";
}

export function ContactForm({ initialTopic = "general" }: { initialTopic?: ContactTopic }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fallbackEmail, setFallbackEmail] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFallbackEmail(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            topic,
            message,
            company: honeypot,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          fallbackEmail?: string;
          ok?: boolean;
        };

        if (!res.ok) {
          setError(data.error || "Unable to send your message.");
          if (data.fallbackEmail) setFallbackEmail(data.fallbackEmail);
          return;
        }

        setSuccess(true);
        setName("");
        setEmail("");
        setMessage("");
      } catch {
        setError("Network error. Please try again or email us directly.");
      }
    });
  }

  if (success) {
    return (
      <div
        className="rounded-[16px] border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.06)] p-8"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
              Message sent
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Thanks — your note reached the Jimvio team. We will reply to the email you provided.
            </p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="mt-5 text-sm font-bold text-[#C2410C] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="contact-name" className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Full name
          </label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-12 rounded-[12px] border-2 focus-visible:ring-[#FF5A1F]"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="contact-email" className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Email address
          </label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 rounded-[12px] border-2 focus-visible:ring-[#FF5A1F]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-topic" className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Topic
        </label>
        <select
          id="contact-topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(normalizeContactTopic(e.target.value))}
          className={cn(
            "h-12 w-full rounded-[12px] border-2 border-input bg-white px-4 text-sm font-medium outline-none",
            "focus:border-[#FF5A1F] focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
            "dark:bg-[var(--color-surface)]",
          )}
        >
          {CONTACT_TOPICS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-message" className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Message
        </label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="min-h-[150px] rounded-[12px] border-2 focus-visible:ring-[#FF5A1F]"
        />
      </div>

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {error && (
        <div
          className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          <p>{error}</p>
          {fallbackEmail && (
            <p className="mt-1">
              You can also email{" "}
              <a className="font-bold underline" href={`mailto:${fallbackEmail}`}>
                {fallbackEmail}
              </a>
              .
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#FF5A1F] px-5 text-sm font-bold text-white",
          "transition hover:bg-[#e04e18] disabled:cursor-not-allowed disabled:opacity-70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            Send message
            <Send className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
