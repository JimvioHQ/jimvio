"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SESSION_KEY = "jimvio_marketplace_personalized_expanded";

function readSessionExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSessionExpanded(value: boolean) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(value));
  } catch {
    // sessionStorage unavailable
  }
}

type PersonalizedForYouGateProps = {
  sectionCount: number;
  loading?: boolean;
  children: () => React.ReactNode;
};

export function PersonalizedForYouGate({
  sectionCount,
  loading = false,
  children,
}: PersonalizedForYouGateProps) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setExpanded(readSessionExpanded());
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      writeSessionExpanded(next);
      return next;
    });
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    },
    [toggle],
  );

  const isExpanded = hydrated && expanded;
  const subtitle = loading
    ? "Preparing your picks…"
    : isExpanded
      ? "Tap to hide your recommendations"
      : `${sectionCount} curated ${sectionCount === 1 ? "section" : "sections"} ready for you`;

  return (
    <div className="flex flex-col gap-3 lg:gap-4" aria-label="Personalized marketplace recommendations">
      <button
        type="button"
        onClick={toggle}
        onKeyDown={onKeyDown}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={cn(
          "group flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 sm:px-4 sm:py-3",
          "transition-[border-color,box-shadow,transform] duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
          "active:scale-[0.995]",
          isExpanded
            ? "border-[color-mix(in_srgb,var(--color-accent)_28%,var(--color-border))] shadow-[var(--shadow-sm),0_0_0_1px_color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
            : "border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-border))] hover:shadow-[var(--shadow-sm)]",
        )}
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 7%, var(--color-surface)), var(--color-surface))",
        }}
      >
        <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-sm sm:size-9"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 20%, transparent), color-mix(in srgb, var(--color-accent) 6%, transparent))",
            }}
            aria-hidden
          >
            ⭐
          </span>
          <span className="min-w-0 text-left">
            <span className="block truncate text-[13px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-sm">
              Personalized For You
            </span>
            <span className="block truncate text-[11px] text-[var(--color-text-muted)] sm:text-xs">
              {subtitle}
            </span>
          </span>
        </span>

        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition-[transform,background-color,color] duration-200",
            "group-hover:text-[var(--color-text-secondary)]",
            isExpanded && "rotate-180 text-[var(--color-accent)]",
          )}
          aria-hidden
        >
          <ChevronDown className="size-4" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={panelId}
            key="personalized-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 lg:gap-5">{children()}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
