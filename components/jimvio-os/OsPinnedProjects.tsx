"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Pin, PinOff } from "lucide-react";
import {
  loadPinnedProjects,
  togglePinnedProject,
  type OsPinnedProject,
} from "@/lib/jimvio-os/layout-memory";
import { OsPill, cn } from "./os-ui";

function labelFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return "Home";
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Tiny "pin this page" widget backed by localStorage layout memory.
 * Presentation only — no auth/API calls, purely a UI convenience.
 */
export function OsPinnedProjects({
  className,
  currentLabel,
}: {
  className?: string;
  currentLabel?: string;
}) {
  const pathname = usePathname() ?? "/dashboard";
  const [pins, setPins] = useState<OsPinnedProject[]>([]);

  useEffect(() => {
    setPins(loadPinnedProjects());
  }, [pathname]);

  const isPinned = pins.some((p) => p.href === pathname);

  function handleToggle() {
    const next = togglePinnedProject({
      href: pathname,
      label: currentLabel ?? labelFromPath(pathname),
    });
    setPins(next);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {pins.map((project) => (
        <OsPill key={project.href} href={project.href}>
          {project.label}
        </OsPill>
      ))}
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isPinned}
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
      >
        {isPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
        {isPinned ? "Unpin this page" : "Pin this page"}
      </button>
    </div>
  );
}
