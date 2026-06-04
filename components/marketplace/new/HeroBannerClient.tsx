"use client";

import { useEffect, useState } from "react";

type Props = { claimedPct: number };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function HeroBannerClient({ claimedPct }: Props) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    function calc() {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 0);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      return { h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 };
    }
    setTimeLeft(calc());
    const t = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
    >
      {/* Label */}
      <div className="mb-1.5 text-center text-[10px] font-medium text-white/60">
        Deal ends in
      </div>

      {/* Countdown boxes */}
      <div className="flex items-center gap-1.5">
        {[
          { val: pad(timeLeft.h), label: "HRS"  },
          { val: pad(timeLeft.m), label: "MINS" },
          { val: pad(timeLeft.s), label: "SECS" },
        ].map(({ val, label }, i) => (
          <div key={label} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-sm font-bold text-white/40">:</span>}
            <div className="text-center">
              <div
                className="rounded px-1.5 py-0.5 text-sm font-black tabular-nums text-white"
                style={{ background: "rgba(0,0,0,0.35)", minWidth: 28 }}
              >
                {val}
              </div>
              <div className="mt-0.5 text-[8px] font-medium tracking-wide text-white/50">
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Claimed bar */}
      {claimedPct > 0 && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[9px] text-white/50">
            <span>Claimed</span>
            <span className="font-bold text-white/80">{claimedPct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width:      `${claimedPct}%`,
                background: "linear-gradient(90deg, var(--color-accent) 0%, #ff8c00 100%)",
              }}
            />
          </div>
          {claimedPct >= 80 && (
            <p className="mt-1 text-center text-[9px] font-semibold" style={{ color: "var(--color-accent)" }}>
              Only {100 - claimedPct}% left!
            </p>
          )}
        </div>
      )}
    </div>
  );
}