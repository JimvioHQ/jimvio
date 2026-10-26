import Link from "next/link";

export function PublicInfoPage({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-text-secondary">{lede}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-7 text-text-secondary">{children}</div>
      </article>
    </div>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export function InfoLinkList({
  items,
}: {
  items: { href: string; label: string; detail?: string }[];
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {items.map((item) => (
        <li key={`${item.href}-${item.label}`}>
          <Link
            href={item.href}
            className="block px-4 py-3 transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <span className="font-medium text-text-primary">{item.label}</span>
            {item.detail ? (
              <span className="mt-0.5 block text-sm leading-5 text-text-muted">{item.detail}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
