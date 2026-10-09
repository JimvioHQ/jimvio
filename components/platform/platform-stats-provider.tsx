"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getDemoPlatformStats } from "@/lib/demo-platform-stats";
import {
  PLATFORM_STAT_KEYS,
  PLATFORM_STAT_META,
  formatPlatformStat,
  getPlatformStatDisplay,
  type PlatformStatKey,
  type PlatformStatsSnapshot,
} from "@/lib/platform-stats";
import { useAnimatedNumber } from "@/components/platform/count-up-number";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

const PHRASE_EASE = [0.22, 1, 0.36, 1] as const;

type PlatformStatsContextValue = {
  stats: PlatformStatsSnapshot;
};

const PlatformStatsContext = createContext<PlatformStatsContextValue | null>(
  null,
);

export function PlatformStatsProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ stats: getDemoPlatformStats() }), []);

  return (
    <PlatformStatsContext.Provider value={value}>
      {children}
    </PlatformStatsContext.Provider>
  );
}

export function usePlatformStats() {
  const context = useContext(PlatformStatsContext);
  if (!context) {
    return { stats: getDemoPlatformStats() };
  }
  return context;
}


export function AnimatedPlatformStatValue({
  statKey,
  className,
}: {
  statKey: PlatformStatKey;
  className?: string;
}) {
  const { stats } = usePlatformStats();
  const reduced = usePrefersReducedMotion();
  const value = stats[statKey];
  const animate = statKey !== "countries" && !reduced;
  const display = useAnimatedNumber(value, animate);

  return (
    <span className={cn("tabular-nums", className)}>
      {formatPlatformStat(statKey, display)}
    </span>
  );
}

export function PlatformStatLine({
  statKey,
  className,
  valueClassName,
  labelClassName,
  showEmoji = false,
}: {
  statKey: PlatformStatKey;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  showEmoji?: boolean;
}) {
  const meta = PLATFORM_STAT_META[statKey];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {showEmoji ? <span aria-hidden>{meta.emoji}</span> : null}
      <AnimatedPlatformStatValue statKey={statKey} className={valueClassName} />
      <span className={labelClassName}>{meta.label}</span>
    </span>
  );
}

function longestStatKey(stats: PlatformStatsSnapshot): PlatformStatKey {
  return PLATFORM_STAT_KEYS.reduce((longest, key) =>
    getPlatformStatDisplay(key, stats[key]).length >=
    getPlatformStatDisplay(longest, stats[longest]).length
      ? key
      : longest,
  );
}

export function PlatformStatsRotatingBadge({
  className,
  showLiveDot = false,
  intervalMs = 2800,
}: {
  className?: string;
  showLiveDot?: boolean;
  intervalMs?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const { stats } = usePlatformStats();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % PLATFORM_STAT_KEYS.length),
      intervalMs,
    );
    return () => clearInterval(timer);
  }, [intervalMs]);

  const currentKey = PLATFORM_STAT_KEYS[index];
  const longestKey = longestStatKey(stats);
  const longestDisplay = getPlatformStatDisplay(longestKey, stats[longestKey]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {showLiveDot ? (
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
      ) : null}

      <span className="relative inline-flex min-h-[18px] items-center overflow-hidden sm:min-h-[20px]">
        <span
          aria-hidden
          className="invisible inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-[12px]"
        >
          <span className="font-semibold">{longestDisplay}</span>
        </span>

        <span className="absolute inset-0 flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={currentKey}
              initial={reduced ? { opacity: 0 } : { y: 8, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -8, opacity: 0 }}
              transition={{ duration: 0.38, ease: PHRASE_EASE }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-[12px]"
            >
              <PlatformStatLine
                statKey={currentKey}
                valueClassName="font-semibold text-[var(--color-text-primary)]"
                labelClassName="font-medium text-[var(--color-text-muted)]"
              />
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
}

export function PlatformStatsGrid({
  className,
  itemClassName,
  valueClassName,
  labelClassName,
}: {
  className?: string;
  itemClassName?: string;
  valueClassName?: string;
  labelClassName?: string;
}) {
  return (
    <div className={className}>
      {PLATFORM_STAT_KEYS.map((key) => (
        <div key={key} className={itemClassName}>
          <div className={valueClassName}>
            <AnimatedPlatformStatValue statKey={key} />
          </div>
          <div className={labelClassName}>{PLATFORM_STAT_META[key].label}</div>
        </div>
      ))}
    </div>
  );
}
