"use client";

import { cn } from "@/lib/utils";

export function DsTable({
  columns,
  children,
  className,
}: {
  columns: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]", className)}>
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-[var(--color-surface-secondary)]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">{children}</tbody>
      </table>
    </div>
  );
}

export function DsTableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]/50", className)}>{children}</tr>;
}

export function DsTableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-[var(--color-text-primary)]", className)}>{children}</td>;
}
