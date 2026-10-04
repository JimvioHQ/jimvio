import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Info,
  Scale,
  Shield,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableRow, TableRow4 } from "@/lib/legal/content-data";

export function LegalEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-black uppercase tracking-[0.22em] text-[#FF5A1F]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function LegalSection({
  id,
  index,
  title,
  children,
  className,
}: {
  id: string;
  index?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-28 mb-12 last:mb-0", className)}
      aria-labelledby={`${id}-heading`}
    >
      <div className="mb-4 flex items-start gap-3 border-b border-[var(--color-border)] pb-3.5">
        {index ? (
          <span
            className="mt-0.5 inline-flex h-9 min-w-9 items-center justify-center rounded-[10px] border border-[rgba(255,90,31,0.35)] bg-[rgba(255,90,31,0.08)] px-2 text-[12px] font-bold tabular-nums text-[#C2410C]"
            aria-hidden="true"
          >
            {index}
          </span>
        ) : null}
        <h2
          id={`${id}-heading`}
          className="text-xl font-bold tracking-tight text-[#111827] dark:text-[var(--color-text-primary)]"
        >
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-[15px] font-light leading-[1.75] text-[var(--color-text-secondary)]">
        {children}
      </div>
    </section>
  );
}

export function LegalParagraph({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[15px] font-light leading-[1.75] text-[var(--color-text-secondary)]", className)}>
      {children}
    </p>
  );
}

export function LegalHighlight({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[rgba(255,90,31,0.18)] bg-[rgba(255,90,31,0.07)] px-5 py-4 text-sm font-light leading-relaxed text-[#9A3412] dark:text-[rgba(253,130,70,0.95)]">
      {children}
    </div>
  );
}

export function LegalList({
  items,
  variant = "dash",
}: {
  items: string[];
  variant?: "dash" | "check" | "cross";
}) {
  const symbol = variant === "check" ? "✓" : variant === "cross" ? "✗" : "—";
  const color =
    variant === "check"
      ? "text-emerald-600"
      : variant === "cross"
        ? "text-red-500"
        : "text-[#FF5A1F]";

  return (
    <ul className="mt-2 flex list-none flex-col gap-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-[15px] font-light leading-relaxed text-[var(--color-text-secondary)]"
        >
          <span className={cn("mt-0.5 shrink-0 font-semibold", color)} aria-hidden="true">
            {symbol}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalDataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: TableRow[];
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-[12px] border border-[var(--color-border)]">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-[var(--color-surface-secondary)]">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.col1}-${row.col2}`} className="border-t border-[var(--color-border)]">
              <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{row.col1}</td>
              <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.col2}</td>
              <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.col3}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalDataTable4({
  headers,
  rows,
}: {
  headers: string[];
  rows: TableRow4[];
}) {
  const visibleHeaders = headers.filter(Boolean);
  return (
    <div className="mt-4 overflow-x-auto rounded-[12px] border border-[var(--color-border)]">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-[var(--color-surface-secondary)]">
          <tr>
            {visibleHeaders.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.col1}-${row.col2}`} className="border-t border-[var(--color-border)]">
              <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{row.col1}</td>
              <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.col2}</td>
              <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.col3}</td>
              {visibleHeaders.length > 3 ? (
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.col4}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TAKEAWAY_ICONS = [UserCheck, Ban, Shield, Scale, CheckCircle2, Info];

export function LegalTakeaways({ items }: { items: string[] }) {
  return (
    <aside
      className="mb-10 rounded-[14px] border border-[rgba(255,90,31,0.18)] bg-[rgba(255,90,31,0.06)] p-5 sm:p-6"
      aria-label="Key takeaways"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FF5A1F] text-sm font-bold text-white">
          i
        </span>
        <p className="text-sm font-bold text-[#111827] dark:text-[var(--color-text-primary)]">
          Key takeaways
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => {
          const Icon = TAKEAWAY_ICONS[index % TAKEAWAY_ICONS.length];
          return (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm font-medium text-[var(--color-text-secondary)]"
            >
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-white text-[#FF5A1F] shadow-sm dark:bg-[var(--color-surface)]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function LegalReviewNotice({ title }: { title: string }) {
  return (
    <div
      className="mb-8 flex items-start gap-3 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
      role="note"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <div>
        <p className="font-bold">Counsel review required</p>
        <p className="mt-1 font-light leading-relaxed">
          {title} consolidates rules already published in Jimvio Terms and related policies. It is
          provided for clarity and is not presented as a separately signed product contract until
          counsel approves a final version.
        </p>
      </div>
    </div>
  );
}

export function LegalRelatedLinks({
  links,
}: {
  links: Array<{ href: string; title: string }>;
}) {
  if (!links.length) return null;
  return (
    <div className="mt-10 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-5">
      <p className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">Related documents</p>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm font-medium text-[#C2410C] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
