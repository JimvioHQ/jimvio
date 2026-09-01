import Link from "next/link";
import { cn } from "@/lib/utils";

/** Shared shell for desktop feed sidebar widgets. */
export function FeedSidebarCard({
  title,
  titleAccent,
  viewAllHref,
  viewAllLabel = "View all",
  children,
  className,
}: {
  title: string;
  titleAccent?: "live" | "orange";
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-[var(--color-border,#e5e7eb)] bg-[var(--color-surface,#fff)] shadow-[0_1px_3px_rgba(17,24,39,0.04)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border,#e5e7eb)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {titleAccent === "live" ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-red-500 motion-safe:animate-pulse motion-reduce:animate-none"
              aria-hidden
            />
          ) : titleAccent === "orange" ? (
            <span
              className="h-3.5 w-0.5 shrink-0 rounded-full bg-[#FF5A1F]"
              aria-hidden
            />
          ) : null}
          <h3 className="truncate text-[12px] font-bold text-[var(--color-text-primary,#111827)]">
            {title}
          </h3>
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="shrink-0 text-[11px] font-semibold text-[#FF5A1F] transition-opacity hover:opacity-80"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function FeedSidebarSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 motion-reduce:animate-none" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--color-surface-secondary,#f3f4f6)] motion-reduce:animate-none" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-24 animate-pulse rounded bg-[var(--color-surface-secondary,#f3f4f6)] motion-reduce:animate-none" />
            <div className="h-2 w-32 animate-pulse rounded bg-[var(--color-surface-secondary,#f3f4f6)] motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
