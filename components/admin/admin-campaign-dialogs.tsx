"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
];

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-5 shadow-xl ring-1 ring-[var(--color-border)]">
        <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Admin confirms money received outside checkout; the campaign goes live. */
export function MarkFundedDialog({
  campaign,
  onClose,
  onDone,
}: {
  campaign: { id: string; title: string; total_budget: number; heldUsd?: number };
  onClose: () => void;
  onDone: (json: Record<string, unknown>) => void;
}) {
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const gap = Math.max(0, campaign.total_budget - (campaign.heldUsd ?? 0));

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ugc/campaigns/${campaign.id}/mark-funded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, reference, reason: note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Could not mark as funded.");
        return;
      }
      toast.success(json.idempotent ? "Already fully funded." : `Funded. ${usd(campaign.total_budget)} is held and the campaign is live.`);
      onDone(json);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={`Mark “${campaign.title}” as funded?`}>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        Only confirm money that really arrived. Jimvio records the full budget ({usd(campaign.total_budget)}
        {gap < campaign.total_budget ? `, ${usd(gap)} more than now` : ""}) as held escrow and the campaign goes live. Creators are
        paid from this money.
      </p>
      <label className="mt-4 block text-[12px] font-medium text-[var(--color-text-secondary)]">
        How was the money received?
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px]"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-[12px] font-medium text-[var(--color-text-secondary)]">
        Payment reference (optional)
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. bank ref or MoMo transaction ID"
          className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px]"
        />
      </label>
      <label className="mt-3 block text-[12px] font-medium text-[var(--color-text-secondary)]">
        Note (optional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={300}
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px]"
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="h-9 rounded-md border border-[var(--color-border)] px-3 text-[12px] font-semibold">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Confirm funding
        </button>
      </div>
    </Shell>
  );
}

/** Permanent delete, confirmed by typing the title. */
export function DeleteCampaignDialog({
  campaign,
  onClose,
  onDone,
}: {
  campaign: { id: string; title: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const match = typed.trim() === campaign.title.trim();

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ugc/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTitle: typed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Could not delete.");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Delete campaign permanently?">
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        This removes “{campaign.title}”, its submissions, participants, chat and escrow records. It cannot be undone. Campaigns
        with creator payouts can't be deleted — cancel them instead.
      </p>
      <label className="mt-4 block text-[12px] font-medium text-[var(--color-text-secondary)]">
        Type the campaign title to confirm
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={campaign.title}
          className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px]"
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="h-9 rounded-md border border-[var(--color-border)] px-3 text-[12px] font-semibold">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!match || busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Delete forever
        </button>
      </div>
    </Shell>
  );
}
