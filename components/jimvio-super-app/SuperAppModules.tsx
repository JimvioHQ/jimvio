"use client";

import Link from "next/link";
import { SUPER_APP_MODULES } from "@/lib/jimvio-super-app";
import { useAIStore } from "@/lib/store/use-ai-store";
import { SuperAppIcon } from "./SuperAppIcon";

export function SuperAppModules() {
  const openAssistant = useAIStore((s) => s.openAssistant);

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
      role="navigation"
      aria-label="Jimvio Super App modules"
    >
      {SUPER_APP_MODULES.map((mod) => {
        const inner = (
          <>
            <span
              className="mb-2 grid size-10 place-items-center rounded-xl"
              style={{ background: `${mod.accent}18`, color: mod.accent }}
            >
              <SuperAppIcon name={mod.icon} className="size-5" />
            </span>
            <span className="block text-[12px] font-bold text-[var(--color-text-primary)]">{mod.label}</span>
            <span className="mt-0.5 block text-[10px] text-[var(--color-text-muted)]">{mod.description}</span>
            <span className="mt-2 text-[9px] font-medium text-[var(--color-text-muted)]">
              Connected · {mod.connectedTo.slice(0, 2).join(", ")}
            </span>
          </>
        );

        if (mod.href === "#open-ai") {
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => openAssistant()}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              style={{ willChange: "transform", minHeight: 120 }}
            >
              {inner}
            </button>
          );
        }

        return (
          <Link
            key={mod.id}
            href={mod.href}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
            style={{ willChange: "transform", minHeight: 120 }}
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
