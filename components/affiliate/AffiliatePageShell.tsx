"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AFFILIATE_SHELL, fadeUp } from "./sections/shared";
import { cn } from "@/lib/utils";

export function AffiliatePageShell({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(AFFILIATE_SHELL, "py-6 sm:py-8", className)}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-[#6B7280]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions}
      </motion.div>
      {children}
    </div>
  );
}

export function AffiliateMetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)]",
        accent
          ? "border-[#FFE4D6] bg-[#FFF8F5]"
          : "border-[#E8EAED] bg-white"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-[22px] font-bold tabular-nums tracking-tight",
          accent ? "text-[#FF5A1F]" : "text-[#111827]"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-[#6B7280]">{hint}</p> : null}
    </div>
  );
}

export function AffiliateEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-12 text-center">
      <h3 className="text-[15px] font-bold text-[#111827]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-[#6B7280]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-[10px] bg-[#FF5A1F] px-4 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,90,31,0.28)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
