"use client";

import { useState } from "react";
import { appConfirm } from "@/lib/app-dialog";
import {
  assignDigitalProductReviewer,
  decideDigitalProduct,
  loadDigitalCustomerIssues,
  loadDigitalReviewQueue,
  resolveDigitalCustomerIssue,
  reviewDigitalLicense,
} from "@/lib/actions/digital-product-review";
import type { ReviewQueueRow } from "@/lib/digital-products/trust/service";

const FILTERS = [
  ["all", "All"],
  ["under_review", "In review"],
  ["needs_changes", "Needs changes"],
  ["approved", "Approved"],
  ["quarantined", "Quarantined"],
  ["suspended", "Suspended"],
  ["takedown_pending", "Takedown"],
  ["published", "Published"],
  ["expired", "Expired"],
] as const;

const ACTIONS = [
  ["approve", "Approve"],
  ["request_changes", "Request changes"],
  ["reject", "Reject"],
  ["publish", "Publish"],
  ["suspend", "Suspend"],
  ["takedown", "Takedown"],
  ["quarantine", "Quarantine"],
  ["reinstate", "Reopen review"],
  ["remove", "Remove"],
] as const;

export function DigitalReviewWorkspace({
  initialRows,
  initialTotal,
  initialError,
  initialIssues,
}: {
  initialRows: ReviewQueueRow[];
  initialTotal: number;
  initialError?: string;
  initialIssues: Array<Record<string, unknown>>;
}) {
  const [state, setState] = useState("under_review");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReviewQueueRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [issues, setIssues] = useState<Array<Record<string, unknown>>>(initialIssues);
  const [selected, setSelected] = useState<ReviewQueueRow | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rights, setRights] = useState({
    commercialSale: false,
    marketplaceDistribution: false,
    digitalDelivery: false,
    territories: "worldwide",
  });

  async function refresh(nextPage = page, nextState = state, nextQ = q) {
    setLoading(true);
    setError(null);
    const [queue, issueResult] = await Promise.all([
      loadDigitalReviewQueue({ state: nextState, q: nextQ, page: nextPage }),
      loadDigitalCustomerIssues(),
    ]);
    if (!queue.ok) setError(queue.error || "You do not have access to this queue.");
    setRows(queue.rows);
    setTotal(queue.total);
    setIssues(issueResult.ok ? issueResult.rows as Array<Record<string, unknown>> : []);
    setLoading(false);
  }

  async function apply(action: (typeof ACTIONS)[number][0]) {
    if (!selected) return;
    const consequential = ["reject", "suspend", "takedown", "quarantine", "remove", "publish"].includes(action);
    if (reason.trim().length < 8) {
      setError("Enter a reason of at least 8 characters.");
      return;
    }
    if (consequential) {
      const confirmed = await appConfirm({
        title: "Confirm decision",
        description: `This will ${action.replaceAll("_", " ")} “${selected.name}”. The reason is stored in the review history.`,
        confirmLabel: "Confirm",
      });
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    const result = await decideDigitalProduct({
      productId: selected.id,
      action,
      expectedState: selected.verificationState || "",
      reason,
      caseType: action === "takedown" ? "copyright" : action === "quarantine" ? "malware" : null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReason("");
    await refresh();
  }

  async function assignSelected() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const result = await assignDigitalProductReviewer(selected.id);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else await refresh();
  }

  async function saveRights(accept: boolean) {
    if (!selected) return;
    setBusy(true);
    const result = await reviewDigitalLicense({
      productId: selected.id,
      accept,
      rationale: reason,
      rights: {
        commercialSale: rights.commercialSale,
        marketplaceDistribution: rights.marketplaceDistribution,
        digitalDelivery: rights.digitalDelivery,
        territories: rights.territories.split(",").map((item) => item.trim()).filter(Boolean),
        expiresAt: null,
        allowsModification: null,
        allowsBundling: null,
        allowsSublicense: null,
      },
    });
    setBusy(false);
    if (!result.ok) setError(result.error);
    else await refresh();
  }

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Digital products</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Verification review</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
          Publication requires accepted rights, a passing scan when a file is hosted, and an authorized human decision. An unconfigured scanner never counts as clean.
        </p>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setPage(1); void refresh(1, state, q); }}>
        <label className="flex-1 text-xs text-[var(--color-text-muted)]">
          Search
          <input value={q} onChange={(e) => setQ(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)]" />
        </label>
        <label className="text-xs text-[var(--color-text-muted)]">
          State
          <select value={state} onChange={(e) => setState(e.target.value)} className="mt-1 h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm">
            {FILTERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <button type="submit" className="h-10 self-end rounded-md bg-[#fd5000] px-4 text-sm font-semibold text-white">Apply</button>
      </form>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {loading && <p className="text-sm text-[var(--color-text-muted)]">Loading the queue…</p>}
      {!loading && rows.length === 0 && <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-sm text-[var(--color-text-muted)]">No digital submissions match this filter.</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">License</th>
                <th className="px-3 py-2">Scan</th>
                <th className="px-3 py-2">State</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-3">
                    <button type="button" className="text-left font-medium text-[var(--color-text-primary)] hover:text-[#fd5000]" onClick={() => { setSelected(row); setError(null); }}>
                      {row.name}
                    </button>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{row.vendorName || "Vendor"} · {row.vendorVerification || "unverified"}</p>
                  </td>
                  <td className="px-3 py-3 text-[12px]">{(row.acquisitionModel || "—").replaceAll("_", " ")}</td>
                  <td className="px-3 py-3 text-[12px]">{row.licenseStatus || "—"}</td>
                  <td className="px-3 py-3 text-[12px]">{row.scanStatus || "—"}</td>
                  <td className="px-3 py-3 text-[12px]">{(row.verificationState || "—").replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4" aria-live="polite">
          {!selected && <p className="text-sm text-[var(--color-text-muted)]">Select a submission to review rights, scan status, and the next decision.</p>}
          {selected && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{selected.name}</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Reviewer: {selected.assigneeId ? "Assigned" : "Unassigned"}</p>
              <button type="button" disabled={busy} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs" onClick={() => void assignSelected()}>Assign to me</button>
              <p className="text-xs text-[var(--color-text-muted)]">Rightsholder: {selected.rightsholder || "Not recorded"}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Fulfillment: {(selected.fulfillmentMode || "download").replaceAll("_", " ")}</p>
              <p className="text-xs text-[var(--color-text-muted)]">License expires: {selected.licenseExpiresAt ? new Date(selected.licenseExpiresAt).toLocaleDateString() : "No end date"}</p>
              <fieldset className="space-y-1 text-xs">
                <legend className="mb-1 font-medium text-[var(--color-text-primary)]">Rights the reviewer confirms</legend>
                {[
                  ["commercialSale", "Commercial sale"],
                  ["marketplaceDistribution", "Marketplace distribution"],
                  ["digitalDelivery", "Digital delivery"],
                ].map(([key, label]) => (
                  <label key={key} className="flex gap-2">
                    <input type="checkbox" checked={rights[key as "commercialSale"]} onChange={(e) => setRights((current) => ({ ...current, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
                <label className="block">Territories
                  <input className="mt-1 h-9 w-full rounded-md border border-[var(--color-border)] px-2" value={rights.territories} onChange={(e) => setRights((current) => ({ ...current, territories: e.target.value }))} />
                </label>
              </fieldset>
              <label className="block text-xs">Reason
                <textarea className="mt-1 min-h-24 w-full rounded-md border border-[var(--color-border)] px-2 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs" onClick={() => void saveRights(true)}>Accept rights</button>
                <button type="button" disabled={busy} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs" onClick={() => void saveRights(false)}>Reject rights</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map(([id, label]) => (
                  <button key={id} type="button" disabled={busy} className="rounded-md bg-[#fd5000] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" onClick={() => void apply(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button type="button" disabled={page <= 1} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40" onClick={() => { const next = page - 1; setPage(next); void refresh(next); }}>Previous</button>
        <span className="text-[var(--color-text-muted)]">Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} className="rounded-md border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40" onClick={() => { const next = page + 1; setPage(next); void refresh(next); }}>Next</button>
      </div>

      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Customer issues</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Resolving an issue does not refund a payment.</p>
        <div className="mt-3 space-y-3">
          {issues.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No customer issues.</p>}
          {issues.map((issue) => (
            <article key={String(issue.id)} className="rounded-md border border-[var(--color-border)] p-3">
              <p className="text-sm text-[var(--color-text-primary)]">{String(issue.issue_type).replaceAll("_", " ")} · {String(issue.status)}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{String(issue.details)}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-[#fd5000]"
                onClick={() => void resolveDigitalCustomerIssue({ issueId: String(issue.id), status: "resolved", resolution: "Reviewed without a payment action." })}
              >
                Mark resolved
              </button>
              <button
                type="button"
                className="mt-2 ml-3 text-xs font-semibold text-[var(--color-text-primary)]"
                onClick={() => void resolveDigitalCustomerIssue({
                  issueId: String(issue.id),
                  status: "resolved",
                  resolution: "Download access revoked after a recorded support decision. No payment was refunded.",
                  revokeAccess: true,
                })}
              >
                Revoke download access
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
