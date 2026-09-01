"use client";

/**
 * Lightweight UGC notification center panel — reused on creator dashboard.
 * Full archive lives at /settings/notifications (existing route).
 */

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export type UGCNotifItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  category?: string | null;
  created_at?: string | null;
  action_url?: string | null;
  is_read?: boolean | null;
};

const EXAMPLE_HINTS = [
  "Campaign approved",
  "Submission rejected",
  "Payment received",
  "New campaign",
  "Funding completed",
  "Brand message",
];

function labelFor(n: UGCNotifItem): string {
  return n.title || n.message || "Update";
}

export function UGCNotificationCenter({
  items,
  className,
}: {
  items: UGCNotifItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_18px_rgba(17,24,39,0.04)]",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#111827]">
          <Bell className="h-4 w-4 text-[#FF5A1F]" />
          Notification center
        </h2>
        <Link href="/settings/notifications" className="text-[12px] font-semibold text-[#FF5A1F]">
          Open inbox
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-[#FAFAFA] px-3 py-5 text-center">
          <p className="text-[12px] font-medium text-[#6B7280]">You&apos;re all caught up.</p>
          <p className="mt-2 text-[11px] text-[#9CA3AF]">
            Expect updates for: {EXAMPLE_HINTS.slice(0, 3).join(" · ")}…
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const inner = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[#111827] line-clamp-1">
                    {labelFor(n)}
                  </p>
                  {!n.is_read ? (
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5A1F]" />
                  ) : null}
                </div>
                {n.message && n.title ? (
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[#6B7280]">{n.message}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-[#9CA3AF]">
                  {(n.category ?? n.type ?? "update").replace(/_/g, " ")}
                  {n.created_at ? ` · ${new Date(n.created_at).toLocaleString()}` : ""}
                </p>
              </>
            );
            return (
              <li key={n.id}>
                {n.action_url ? (
                  <Link
                    href={n.action_url}
                    className="block rounded-xl border border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2.5 transition hover:border-[#FFE4D6] hover:bg-[#FFF8F5]"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="rounded-xl border border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2.5">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
