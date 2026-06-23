"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateAdminDispute } from "@/lib/actions/admin-moderation";
import { adminBtnGhost, adminBtnPrimary, adminInputClass } from "@/lib/admin/ui";
import { StatusPill, RowArrow } from "@/components/ui/admin";
import type { AdminDisputeRow } from "@/services/admin/getAdminDisputes";

function DisputeTypeLabel({ type }: { type: AdminDisputeRow["dispute_type"] }) {
  const map = {
    cj: "CJ dispute",
    refund: "Refund",
    cancelled: "Paid · cancelled",
  };
  return (
    <span className="inline-flex rounded-md bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
      {map[type]}
    </span>
  );
}

function DisputeRowActions({ row }: { row: AdminDisputeRow }) {
  const [note, setNote] = useState(row.admin_note ?? "");
  const [pending, start] = useTransition();

  function save(status: "open" | "resolved") {
    start(async () => {
      const res = await updateAdminDispute(row.id, { status, note });
      if (!res.success) {
        toast.error(res.error ?? "Could not update dispute.");
        return;
      }
      toast.success(status === "resolved" ? "Marked resolved." : "Reopened dispute.");
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Internal note"
        className={`${adminInputClass} h-9 min-w-[160px] flex-1 text-[12px]`}
      />
      {row.admin_status === "open" ? (
        <button type="button" disabled={pending} onClick={() => save("resolved")} className={adminBtnPrimary}>
          Resolve
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => save("open")} className={adminBtnGhost}>
          Reopen
        </button>
      )}
    </div>
  );
}

export function AdminDisputesTable({ rows }: { rows: AdminDisputeRow[] }) {
  if (!rows.length) {
    return (
      <p className="px-4 py-10 text-center text-[12px] text-[var(--color-text-muted)]">
        No disputes match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="bg-[var(--color-surface-secondary)]/50 text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <th className="px-3 py-2.5 font-medium">Order</th>
            <th className="px-3 py-2.5 font-medium">Parties</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium text-right">Amount</th>
            <th className="px-3 py-2.5 font-medium">Admin</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--color-border)]/60 align-top hover:bg-[var(--color-surface-secondary)]/30">
              <td className="px-3 py-3">
                <p className="font-semibold text-[var(--color-text-primary)]">{row.order_number}</p>
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  {new Date(row.created_at).toLocaleDateString()}
                </p>
                {row.cj_dispute_id && (
                  <p className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                    CJ {row.cj_dispute_id.slice(0, 12)}…
                  </p>
                )}
              </td>
              <td className="px-3 py-3">
                <p className="text-[var(--color-text-primary)]">{row.buyer_name}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">{row.vendor_name ?? "—"}</p>
              </td>
              <td className="px-3 py-3">
                <DisputeTypeLabel type={row.dispute_type} />
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                  <StatusPill status={row.payment_status} />
                  <StatusPill status={row.status} />
                </div>
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">{row.amount_display}</td>
              <td className="px-3 py-3 min-w-[220px]">
                <StatusPill status={row.admin_status === "resolved" ? "resolved" : "pending"} />
                <div className="mt-2">
                  <DisputeRowActions row={row} />
                </div>
              </td>
              <td className="px-3 py-3">
                <RowArrow href={`/admin/orders/${row.id}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
