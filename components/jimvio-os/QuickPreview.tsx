"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn, OS_ACCENT } from "./os-ui";

const HOVER_DELAY_MS = 280;

type QuickPreviewProps = {
  title: string;
  subtitle?: string;
  meta?: string[];
  href: string;
  accent?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Floating hover/focus preview panel. Wraps any trigger (card, link, button) and
 * shows a small summary + "Open" CTA after a short hover delay. Presentation only.
 */
export function QuickPreview({
  title,
  subtitle,
  meta = [],
  href,
  accent = OS_ACCENT,
  children,
  className,
}: QuickPreviewProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  function clearPendingOpen() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function handleMouseEnter() {
    clearPendingOpen();
    if (reducedMotion) {
      setOpen(true);
      return;
    }
    timeoutRef.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  }

  function handleMouseLeave() {
    clearPendingOpen();
    setOpen(false);
  }

  function handleFocus() {
    clearPendingOpen();
    setOpen(true);
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }

  useEffect(() => clearPendingOpen, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {open && (
        <div className="absolute left-1/2 top-full z-30 hidden w-64 -translate-x-1/2 pt-2 sm:block">
          <div
            role="tooltip"
            className={cn(
              "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-[0_16px_48px_rgba(16,24,40,0.16)] backdrop-blur-md",
              !reducedMotion && "duration-150 animate-in fade-in zoom-in-95",
            )}
          >
            <p className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)]">{title}</p>
            {subtitle && (
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-muted)]">{subtitle}</p>
            )}
            {meta.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meta.map((item) => (
                  <span
                    key={item}
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
            <Link
              href={href}
              className="mt-3 inline-flex items-center gap-1 rounded text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ color: accent }}
            >
              Open
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
