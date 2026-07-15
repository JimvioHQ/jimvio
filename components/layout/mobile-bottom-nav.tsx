"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_BOTTOM_NAV_ITEMS } from "@/lib/navigation/primary-nav";
import { isActive } from "./navbar-helpers";

interface MobileBottomNavProps {
  hidden: boolean;
  onMenuOpen: () => void;
}

export function MobileBottomNav({ hidden, onMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname();
  const mobileBottomLinks = MOBILE_BOTTOM_NAV_ITEMS;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-[100] pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
      <motion.nav
        initial={{ y: 80 }}
        animate={{ y: hidden ? 80 : 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="pointer-events-auto relative grid h-[60px] grid-cols-5 items-stretch border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-md dark:bg-[var(--color-bg-darker)]/95"
      >
        {mobileBottomLinks.map((link) => {
          const active = isActive(pathname, link.href);
          const ariaLabel = "ariaLabel" in link ? (link as any).ariaLabel : link.label;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={ariaLabel}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-0.5 transition-colors duration-200",
                active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
              )}
            >
              <div className="relative flex h-6 items-center justify-center">
                <link.icon
                  className={cn("h-5 w-5 shrink-0 transition-transform duration-300", active && "scale-105")}
                  strokeWidth={active ? 2.5 : 2}
                />
                {active && (
                  <motion.div layoutId="mobile-glow" className="absolute inset-0 rounded-full bg-[var(--color-accent)]/20 blur-xl" />
                )}
              </div>
              <span
                className={cn(
                  "max-w-full truncate text-[9px] font-semibold leading-none tracking-tight whitespace-nowrap",
                  active ? "text-[var(--color-accent)] opacity-100" : "opacity-70",
                )}
              >
                {link.label}
              </span>
              {active && (
                <motion.div layoutId="mobile-pill-active" className="absolute top-0 h-[2px] w-7 rounded-b-full bg-[var(--color-accent)]" />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Open menu"
          className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-0.5 text-[var(--color-text-muted)] transition-colors duration-200"
        >
          <Menu className="h-5 w-5 shrink-0 stroke-[2px]" />
          <span className="text-[9px] font-semibold leading-none tracking-tight whitespace-nowrap opacity-70">
            Menu
          </span>
        </button>
      </motion.nav>
    </div>
  );
}
