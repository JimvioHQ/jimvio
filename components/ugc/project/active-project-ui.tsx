"use client";

import { cn } from "@/lib/utils";

export function ProjectCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("rounded-[16px] border border-[#EEF0F2] bg-white p-4 sm:p-5", className)}
    >
      {children}
    </section>
  );
}

export function ProjectSectionTitle({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-bold text-[#111827]">{children}</h2>
      {sub ? <p className="mt-0.5 text-[12px] text-[#6B7280]">{sub}</p> : null}
    </div>
  );
}

export function ProjectMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#EEF0F2] bg-[#FAFAFA] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-[17px] font-bold tabular-nums text-[#111827]">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-[#6B7280]">{sub}</p> : null}
    </div>
  );
}

export function ProjectProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#FF7A45] to-[var(--color-accent)] transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
