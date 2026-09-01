"use client";

import { createElement } from "react";
import Link from "next/link";
import {
  OWNER_NAV_ITEMS,
  type OwnerConsoleSectionId,
} from "@/lib/community/owner-console";
import { ownerSectionIcon } from "./owner-icons";

/**
 * Reusable section shell for Owner Console pages.
 * Feature UIs plug into children; empty state stays calm and premium.
 */
export function OwnerSectionShell({
  sectionId,
  children,
  actions,
}: {
  sectionId: OwnerConsoleSectionId;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const item = OWNER_NAV_ITEMS[sectionId];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A1F]">
            {createElement(ownerSectionIcon(sectionId), {
              className: "h-3.5 w-3.5",
              "aria-hidden": true,
            })}
            {item.label}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#111827]">
            {item.label}
          </h1>
          <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[#6B7280]">
            {item.description}.
          </p>
        </div>
        {actions}
      </header>

      {children ?? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[15px] font-semibold text-[#111827]">
            {item.label} is ready
          </p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[#6B7280]">
            Management tools for this area plug into the Owner Console without
            leaving your workspace.
          </p>
          <Link
            href="/owner/communities"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-[#FF5A1F] px-4 text-[13px] font-semibold text-white transition hover:bg-[#F04E14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50"
          >
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
