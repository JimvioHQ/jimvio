import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminUserNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All users
      </Link>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h1 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
          User not found
        </h1>
        <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
          This user id is not a Jimvio account.
        </p>
      </div>
    </div>
  );
}
