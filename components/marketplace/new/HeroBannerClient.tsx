"use client";

import { useEffect, useState, useRef } from "react";

type Props = { claimedPct: number };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, elapsedPct: 0 });

  useEffect(() => {
    function calc() {
      const now = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      return {
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
        elapsedPct: Math.min(100, Math.round((elapsed / total) * 100)),
      };
    }
    setTimeLeft(calc());
    const t = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(t);
  }, []);

  return timeLeft;
}

function Digit({ val }: { val: string }) {
  const prev = useRef(val);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (prev.current !== val) {
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 300);
      prev.current = val;
      return () => clearTimeout(t);
    }
  }, [val]);

  return (
    <div
      className="relative grid place-items-center rounded-lg tabular-nums text-white"
      style={{
        width: 36,
        height: 42,
        background: "linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.35) 100%)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.30)",
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: "-0.02em",
        transition: flipping ? "none" : undefined,
        transform: flipping ? "scaleY(0.85)" : "scaleY(1)",
        opacity: flipping ? 0.6 : 1,
      }}
    >
      <div
        className="absolute inset-x-0"
        style={{ top: "50%", height: 1, background: "rgba(255,255,255,0.07)" }}
      />
      {val}
    </div>
  );
}

export function HeroBannerClient({ claimedPct }: Props) {
  const { h, m, s, elapsedPct } = useCountdown();
  const units = [
    { val: pad(h), label: "HRS" },
    { val: pad(m), label: "MIN" },
    { val: pad(s), label: "SEC" },
  ];

  return (
    <div
      className="flex flex-col gap-2.5 rounded-2xl p-3"
      style={{
        background: "linear-gradient(135deg, rgba(253,80,0,0.20) 0%, rgba(200,50,0,0.12) 100%)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(253,80,0,0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(253,80,0,0.12)",
        minWidth: 148,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="size-1.5 animate-pulse rounded-full"
            style={{ background: "var(--color-accent)", boxShadow: "0 0 8px rgba(253,80,0,0.75)" }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Deal ends in
          </span>
        </div>
        {claimedPct > 0 && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
            style={{
              background: "rgba(253,80,0,0.30)",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(253,80,0,0.20)",
            }}
          >
            {claimedPct}% claimed
          </span>
        )}
      </div>

      {/* Flip-style countdown */}
      <div className="flex items-end gap-0.5">
        {units.map(({ val, label }, i) => (
          <div key={label} className="flex items-end gap-0.5">
            {i > 0 && (
              <span
                className="mb-2.5 text-sm font-black leading-none"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                :
              </span>
            )}
            <div className="flex flex-col items-center gap-0.5">
              <Digit val={val} />
              <span
                className="text-[7px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-0.5">
        <div
          className="h-0.5 w-full overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${elapsedPct}%`,
              background: "linear-gradient(90deg, rgba(253,80,0,0.60), rgba(253,80,0,0.90))",
              boxShadow: "0 0 6px rgba(253,80,0,0.40)",
            }}
          />
        </div>
        <span
          className="text-[7px] font-semibold uppercase tracking-wider text-right"
          style={{ color: "rgba(255,255,255,0.30)" }}
        >
          {100 - elapsedPct}% remaining
        </span>
      </div>
    </div>
  );
}
