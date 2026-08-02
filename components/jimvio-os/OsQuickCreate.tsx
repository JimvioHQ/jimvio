"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { OS_QUICK_CREATE_ITEMS } from "@/lib/jimvio-os";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { OsIcon } from "./OsIcon";

/** Global Quick Create menu — open state lives in the shared store so OsTopbar and the FAB stay in sync. */
export function OsQuickCreate() {
  const isOsOpen = useJimvioOsStore((s) => s.isOpen);
  const open = useJimvioOsStore((s) => s.quickCreateOpen);
  const toggleOpen = useJimvioOsStore((s) => s.toggleQuickCreate);
  const closeOpen = useJimvioOsStore((s) => s.closeQuickCreate);
  const openAssistant = useAIStore((s) => s.openAssistant);

  if (isOsOpen) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[9996] bg-black/20 backdrop-blur-[1px]"
          aria-hidden
          onClick={closeOpen}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[9997] flex flex-col items-end gap-2">
        {open && (
          <div
            role="menu"
            aria-label="Quick create"
            className="mb-1 w-[min(100vw-3rem,280px)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl"
            style={{ animation: "jimvio-os-enter 220ms ease-out" }}
          >
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Quick Create
            </p>
            <ul className="max-h-[min(60vh,400px)] space-y-0.5 overflow-y-auto">
              {OS_QUICK_CREATE_ITEMS.map((item) => (
                <li key={item.id} role="none">
                  {item.actionId === "open-ai" ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        openAssistant();
                        closeOpen();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-[transform,background-color] hover:scale-[1.01] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                      style={{ willChange: "transform" }}
                    >
                      <span className="grid size-9 place-items-center rounded-lg" style={{ background: `${item.accent}18`, color: item.accent }}>
                        <OsIcon name={item.icon} className="size-4" />
                      </span>
                      <span>
                        <span className="block text-[12px] font-bold">{item.label}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{item.description}</span>
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={item.href ?? "#"}
                      role="menuitem"
                      onClick={closeOpen}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-[transform,background-color] hover:scale-[1.01] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                      style={{ willChange: "transform" }}
                    >
                      <span className="grid size-9 place-items-center rounded-lg" style={{ background: `${item.accent}18`, color: item.accent }}>
                        <OsIcon name={item.icon} className="size-4" />
                      </span>
                      <span>
                        <span className="block text-[12px] font-bold text-[var(--color-text-primary)]">{item.label}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{item.description}</span>
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          aria-label={open ? "Close quick create" : "Quick create"}
          aria-expanded={open}
          onClick={toggleOpen}
          className="grid size-14 place-items-center rounded-full bg-[var(--color-accent)] text-white shadow-lg transition-[transform,opacity] duration-300 hover:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
          style={{ boxShadow: "0 12px 40px rgba(253,80,0,0.35)", willChange: "transform" }}
        >
          {open ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>
    </>
  );
}
