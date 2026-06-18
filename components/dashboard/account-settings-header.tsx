import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccountSettingsHeader({
  title,
  description,
  email,
  backHref = "/dashboard",
}: {
  title: string;
  description: string;
  email?: string | null;
  backHref?: string;
}) {
  return (
    <div className="px-4 py-4 sm:px-5 border-b border-[var(--color-border)]/60">
      <div className="flex items-center gap-2 mb-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]"
        >
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          Account
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)] max-w-2xl">
            {description}
          </p>
        </div>

        {email ? (
          <div className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border)] shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            <span className="truncate max-w-[220px]">{email}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
