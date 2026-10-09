"use client";

import { useEffect, useRef, useState } from "react";

/** Lower visual start for a one-shot count-up. Same digit width for large values. */
function countUpStart(target: number): number {
  if (!Number.isFinite(target) || target <= 20) return target;
  const start = Math.round(target * 0.9);
  return start >= target ? target - 1 : start;
}

export function useAnimatedNumber(target: number, animate: boolean) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const countedTarget = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    if (!animate || reduceMotion) {
      countedTarget.current = target;
      if (displayRef.current !== target) {
        frame = requestAnimationFrame(() => {
          displayRef.current = target;
          setDisplay(target);
        });
        rafRef.current = frame;
      }
      return () => {
        cancelAnimationFrame(frame);
        rafRef.current = null;
      };
    }

    const start =
      countedTarget.current === null ? countUpStart(target) : displayRef.current;
    const diff = target - start;
    if (diff === 0) {
      countedTarget.current = target;
      return;
    }

    const duration = 800;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = progress === 1 ? target : Math.round(start + diff * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        rafRef.current = frame;
      } else {
        countedTarget.current = target;
        rafRef.current = null;
      }
    };

    frame = requestAnimationFrame(tick);
    rafRef.current = frame;

    return () => {
      cancelAnimationFrame(frame);
      rafRef.current = null;
    };
  }, [target, animate]);

  return display;
}

export function CountUpNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const display = useAnimatedNumber(value, value > 0);

  return (
    <span className={className ? `tabular-nums ${className}` : "tabular-nums"}>
      {format(display)}
    </span>
  );
}
