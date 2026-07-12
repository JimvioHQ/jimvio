"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export function SectionCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[16px] border border-[#EEF0F2] bg-white p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-bold text-[#111827]">{children}</h2>
      {sub ? <p className="mt-0.5 text-[12px] text-[#6B7280]">{sub}</p> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]",
    brand: "bg-[#FFF4EF] text-[#FF5A1F] border-[#FFE4D6]",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function MetricTile({
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
      <p className="mt-1 text-[18px] font-bold tabular-nums text-[#111827]">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-[#6B7280]">{sub}</p> : null}
    </div>
  );
}

export function ChecklistItem({
  label,
  met,
  detail,
}: {
  label: string;
  met: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold",
          met ? "bg-emerald-500 text-white" : "bg-[#E5E7EB] text-[#9CA3AF]",
        )}
        aria-hidden
      >
        {met ? "✓" : ""}
      </span>
      <div className="min-w-0">
        <p className={cn("text-[13px] font-medium", met ? "text-[#111827]" : "text-[#6B7280]")}>
          {label}
        </p>
        {detail ? <p className="text-[11px] text-[#9CA3AF]">{detail}</p> : null}
      </div>
    </div>
  );
}

export function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#EEF0F2] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-[13px] font-semibold text-[#111827]">{q}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <p className="pb-3 text-[13px] leading-relaxed text-[#6B7280]">{a}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#FF7A45] to-[#FF5A1F] transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
