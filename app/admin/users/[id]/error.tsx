"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminUserDetailError({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    const digest = error instanceof Error && "digest" in error ? String(error.digest ?? "") : "";
    console.error("[admin-user-detail]", error instanceof Error ? error.name : "Error", digest);
  }, [error]);

  const digest = error instanceof Error && "digest" in error && error.digest
    ? String(error.digest)
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All users
      </Link>
      <div
        role="alert"
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      >
        <h1 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
          This user profile could not be loaded
        </h1>
        <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
          The account record is still there. Retry this page, or return to the user list.
        </p>
        {digest ? (
          <p className="mt-2 font-mono text-[11px] text-[var(--color-text-muted)]">Ref: {digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => (retry ?? reset ?? (() => window.location.reload()))()}
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--color-text-primary)] px-3 text-[12.5px] font-medium text-[var(--color-surface)]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
