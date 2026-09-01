"use client";

import { Command } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";

/** Mobile FAB — opens the universal command center (desktop uses ⌘K). Hidden on communities hub where header search is available. */
export function CommandCenterFAB() {
  const pathname = usePathname();
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const isOpen = useCommandCenterStore((s) => s.isOpen);

  const onCommunitiesHub = pathname === "/communities" || pathname.startsWith("/communities/");

  if (isOpen || onCommunitiesHub) return null;

  return (
    <button
      type="button"
      onClick={() => openCommandCenter()}
      aria-label="Open command center"
      className="fixed bottom-5 left-5 z-[9998] grid size-14 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-lg transition-[transform,opacity] duration-200 motion-reduce:transition-none hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 md:hidden"
      style={{
        boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
      }}
    >
      <Command className="size-5 text-[var(--color-accent)]" />
    </button>
  );
}
