"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_CATEGORIES } from "@/lib/support/types";

const ISSUES = [
  ["question", "Question"],
  ["problem", "Problem"],
  ["billing", "Billing"],
  ["order", "Order"],
  ["account", "Account"],
  ["bug", "Bug"],
  ["feature", "Feature request"],
] as const;

export function SupportTicketForm({
  defaultEmail = "",
  defaultName = "",
  requireContact = false,
  heading = "Create a support ticket",
}: {
  defaultEmail?: string;
  defaultName?: string;
  requireContact?: boolean;
  heading?: string;
}) {
  const router = useRouter();
  function idempotencyKey() {
    const existing = window.sessionStorage.getItem("jimvio-support-idempotency");
    if (existing) return existing;
    const next = crypto.randomUUID().replace(/-/g, "");
    window.sessionStorage.setItem("jimvio-support-idempotency", next);
    return next;
  }
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ public_ref: string; status: string; emailed?: boolean } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          subject: form.get("subject"),
          category: form.get("category"),
          issueType: form.get("issueType"),
          priority: form.get("priority"),
          referenceCode: form.get("referenceCode"),
          description: form.get("description"),
          company: form.get("company"),
          idempotencyKey: idempotencyKey(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "The ticket was not saved.");
        return;
      }
      if (data.ticket?.public_ref) {
        window.sessionStorage.removeItem("jimvio-support-idempotency");
        setDone({ ...data.ticket, emailed: data.email?.sent === true });
      } else {
        setDone({ public_ref: "received", status: "open" });
      }
    } catch {
      setError("The ticket was not saved. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done?.public_ref && done.public_ref !== "received") {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6" role="status">
        <h2 className="text-xl font-semibold">Ticket saved</h2>
        <p className="mt-2 text-sm text-[#374151]">
          Reference <span className="font-semibold">{done.public_ref}</span> is {done.status}. This
          confirmation is shown because the server stored the ticket.
          {done.emailed ? " A copy was emailed." : ""}
        </p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white"
          onClick={() => router.push(`/help/tickets/${done.public_ref}`)}
        >
          View ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Do not include passwords, authenticator codes, full card numbers, or private keys.
        </p>
      </div>
      {requireContact ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="name" defaultValue={defaultName} required />
          <Field label="Email" name="email" type="email" defaultValue={defaultEmail} required />
        </div>
      ) : (
        <Field label="Email" name="email" type="email" defaultValue={defaultEmail} />
      )}
      <Field label="Subject" name="subject" required />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Category
          <select name="category" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2">
            {SUPPORT_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Issue type
          <select name="issueType" required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2">
            {ISSUES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Priority
          <select name="priority" defaultValue="normal" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <Field label="Order, wallet, or campaign reference" name="referenceCode" />
      <label className="block text-sm font-medium">
        Description
        <textarea name="description" required minLength={10} rows={6} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" />
      </label>
      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Submit ticket"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 font-normal"
      />
    </label>
  );
}
