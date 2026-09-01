import Link from "next/link";

export function DashboardSectionHeader({
  title,
  href,
  linkLabel = "View all",
  icon: Icon,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <span className="grid size-7 place-items-center rounded-md bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
            <Icon className="size-3.5" />
          </span>
        )}
        <h2 className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function DashboardPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function DashboardEmptyState({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">{title}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
      {href && linkLabel && (
        <Link
          href={href}
          className="mt-3 inline-block text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export const SECTION_LINKS = {
  marketplace: "/marketplace",
  orders: "/orders",
  products: "/marketplace",
  inventory: "/ugc/campaign-center",
  customers: "/ugc/campaign-center/orders",
  revenue: "/wallet",
  analytics: "/",
  messages: "/messages",
  notifications: "/settings/notifications",
  communities: "/owner/communities",
  store: "/ugc/campaign-center/store",
} as const;
