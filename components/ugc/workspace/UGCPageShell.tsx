"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function UGCPageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827] sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-[13px] text-[#6B7280]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function UGCPageLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-[16px] bg-[#F3F4F6]" />
      ))}
    </div>
  );
}

export function UGCPageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-6 text-center">
      <p className="text-sm font-semibold text-rose-800">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function UGCPageEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-10 text-center">
      <p className="text-base font-bold text-[#111827]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#6B7280]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function UGCFilterBar({
  search,
  onSearchChange,
  children,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-[#EEF0F2] bg-white p-3 sm:flex-row sm:items-center">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search…"
        className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
      />
      {children}
    </div>
  );
}

export function UGCStatusPill({
  status,
}: {
  status: string;
}) {
  const tone =
    status === "accepted" || status === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "pending" || status === "waitlisted"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "rejected"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
