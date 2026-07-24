"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { OwnerJoinRequest } from "@/lib/community/owner-console/members";

export function JoinRequestsPanel({
  requests,
  onReview,
}: {
  requests: OwnerJoinRequest[];
  onReview: (ids: string[], action: "approve" | "reject") => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-muted)]">
        No pending join requests.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-2">
          <span className="text-[12px] font-semibold">
            {selected.length} selected
          </span>
          <Button
            size="sm"
            onClick={() => {
              onReview(selected, "approve");
              setSelected([]);
            }}
          >
            Bulk Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onReview(selected, "reject");
              setSelected([]);
            }}
          >
            Bulk Reject
          </Button>
        </div>
      )}

      <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {requests.map((req) => (
          <li key={req.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={selected.includes(req.id)}
              onChange={() => toggle(req.id)}
              aria-label={`Select ${req.displayName}`}
            />
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
              {req.avatarUrl ? (
                <Image
                  src={req.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold">
                  {req.displayName[0]}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">
                {req.displayName}
                {req.username ? (
                  <span className="ml-1 font-normal text-[var(--color-text-muted)]">
                    @{req.username}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Requested {new Date(req.createdAt).toLocaleString()}
                {req.referralCode ? ` · Referral ${req.referralCode}` : ""}
                {req.referredByName ? ` · via ${req.referredByName}` : ""}
              </p>
              {req.reason && (
                <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                  {req.reason}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => onReview([req.id], "approve")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReview([req.id], "reject")}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
