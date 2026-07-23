"use client";

import { createElement } from "react";
import Link from "next/link";
import {
  OWNER_NAV_ITEMS,
  type OwnerConsoleSectionId,
} from "@/lib/community/owner-console";
import { ownerSectionIcon } from "./owner-icons";

/**
 * Reusable section shell for Owner Console pages (Phase A.1).
 * Feature UIs plug into children in later phases.
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            {createElement(ownerSectionIcon(sectionId), {
              className: "h-3.5 w-3.5",
              "aria-hidden": true,
            })}
            {item.label}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {item.label}
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-[var(--color-text-muted)]">
            {item.description}
            {!children
              ? ". This is a foundation shell — management UI arrives in subsequent Owner Console phases."
              : "."}
          </p>
        </div>
        {actions}
      </header>

      {children ?? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {item.label} framework ready
          </p>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-[var(--color-text-muted)]">
            Plug feature modules into this shell. Reuses Community Workspace,
            Creator OS, Commerce, Live, and the shared permission engine.
          </p>
          <Link
            href="/community-owner"
            className="mt-4 inline-flex text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
