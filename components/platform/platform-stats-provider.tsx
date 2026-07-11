"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Package, Store, Users, type LucideIcon } from "lucide-react";
import {
  PLATFORM_STAT_KEYS,
  PLATFORM_STAT_META,
  PLATFORM_STATS,
  formatPlatformStat,
  getPlatformStatDisplay,
  getPlatformStatsLaunchSnapshot,
  type PlatformStatKey,
  type PlatformStatsSnapshot,
} from "@/lib/platform-stats";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

const PHRASE_EASE = [0.22, 1, 0.36, 1] as const;

const STAT_ICONS: Record<PlatformStatKey, LucideIcon> = {
  countries: Globe,
  users: Users,
  businesses: Store,
  products: Package,
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

type PlatformStatsContextValue = {
  stats: PlatformStatsSnapshot;
};

const PlatformStatsContext = createContext<PlatformStatsContextValue | null>(
  null,
);

export function PlatformStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<PlatformStatsSnapshot>(() => ({
    ...PLATFORM_STATS,
  }));

  useEffect(() => {
    let userTimeout: ReturnType<typeof setTimeout>;
    let businessTimeout: ReturnType<typeof setTimeout>;
    let productTimeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const scheduleUsers = () => {
      userTimeout = setTimeout(() => {
        if (cancelled) return;
        setStats((current) => ({
          ...current,
          users: current.users + randomInt(1, 3),
        }));
        scheduleUsers();
      }, randomBetween(30_000, 90_000));
    };

    const scheduleBusinesses = () => {
      businessTimeout = setTimeout(() => {
        if (cancelled) return;
        setStats((current) => ({
          ...current,
          businesses: current.businesses + 1,
        }));
        scheduleBusinesses();
      }, randomBetween(180_000, 300_000));
    };

    const scheduleProducts = () => {
      productTimeout = setTimeout(() => {
        if (cancelled) return;
        setStats((current) => ({
          ...current,
          products: current.products + randomInt(1, 5),
        }));
        scheduleProducts();
      }, randomBetween(120_000, 240_000));
    };

    scheduleUsers();
    scheduleBusinesses();
    scheduleProducts();

    return () => {
      cancelled = true;
      clearTimeout(userTimeout);
      clearTimeout(businessTimeout);
      clearTimeout(productTimeout);
    };
  }, []);

  const value = useMemo(() => ({ stats }), [stats]);

  return (
    <PlatformStatsContext.Provider value={value}>
      {children}
    </PlatformStatsContext.Provider>
  );
}

export function usePlatformStats() {
  const context = useContext(PlatformStatsContext);
  if (!context) {
    return { stats: getPlatformStatsLaunchSnapshot() };
  }
  return context;
}


function useAnimatedNumber(target: number, animate: boolean) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const start = displayRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const duration = randomBetween(500, 1000);
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + diff * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, animate]);

  return display;
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

const LONGEST_STAT_KEY = PLATFORM_STAT_KEYS.reduce((longest, key) =>
  getPlatformStatDisplay(key, PLATFORM_STATS[key]).length >=
  getPlatformStatDisplay(longest, PLATFORM_STATS[longest]).length
    ? key
    : longest,
);

export function PlatformStatsRotatingBadge({
  className,
  showLiveDot = true,
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
  const Icon = STAT_ICONS[currentKey];
  const longestDisplay = getPlatformStatDisplay(
    LONGEST_STAT_KEY,
    stats[LONGEST_STAT_KEY],
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.25)]",
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
          <span className="size-3.5 shrink-0" />
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
              <Icon className="size-3.5 shrink-0 text-[#FF5A1F]" strokeWidth={2.2} />
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
