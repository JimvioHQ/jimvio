"use client";

import { useEffect, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  decimals?: number;
  suffix?: string;
  durationMs?: number;
};

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  durationMs = 700,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = display;
    const delta = value - from;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <span>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
