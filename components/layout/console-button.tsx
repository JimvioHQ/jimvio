"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const ConsoleButton = React.forwardRef<
  any,
  {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    className?: string;
    active?: boolean;
    orange?: boolean;
    style?: React.CSSProperties;
    [key: string]: any;
  }
>(({ children, href, onClick, className, active = false, orange = false, style, ...props }, ref) => {
  const cls = cn(
    "relative inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium tracking-tight transition-all duration-150 select-none outline-none",
    "after:absolute after:bottom-1 after:left-0 after:h-0.5 after:bg-[var(--color-accent)] after:transition-all after:duration-[1s] after:ease-out",
    active
      ? ["text-[var(--color-accent)] font-bold"]
      : orange
        ? [
          "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
          "shadow-[0_1px_3px_rgba(200,60,0,0.25),inset_0_0_0_1px_rgba(200,60,0,0.12)]",
          "hover:shadow-[0_2px_6px_rgba(200,60,0,0.35)]",
          "dark:hover:bg-[var(--color-accent-hover)]",
          "dark:shadow-[0_1px_4px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,120,40,0.18)]",
          "dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.50)]",
          "after:w-0",
        ]
        : [
          "text-stone-500 dark:text-stone-400 after:w-0",
          "hover:after:w-full hover:font-bold hover:text-stone-900",
          "dark:hover:text-stone-100",
        ],
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls} style={style} ref={ref} {...props}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>
      {children}
    </button>
  );
});
ConsoleButton.displayName = "ConsoleButton";

export const ConsoleIconBtn = React.forwardRef<
  any,
  {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    badge?: number;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
  }
>(({ children, href, onClick, badge, className, style, ...props }, ref) => {
  const cls = cn(
    "relative flex items-center justify-center h-9 w-9 shrink-0 rounded-xl transition-all duration-150 active:scale-[0.94]",
    "text-stone-500 hover:bg-black/[0.06] hover:text-stone-800",
    "dark:text-stone-400 dark:hover:bg-white/[0.08] dark:hover:text-stone-100",
    className,
  );
  const inner = (
    <>
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-[16px]
         px-1 bg-[var(--color-accent)]
         text-white text-[9px] font-black flex items-center justify-center 
         rounded-full ring-2 ring-white dark:ring-[var(--color-ink)] z-20">
          {badge}
        </span>
      )}
    </>
  );
  if (href)
    return (
      <Link href={href} className={cls} style={style} ref={ref} {...props}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} style={style} ref={ref} {...props}>
      {inner}
    </button>
  );
});
ConsoleIconBtn.displayName = "ConsoleIconBtn";
