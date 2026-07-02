"use client";

import { useEffect, useState, useRef } from "react";

type Props = { claimedPct: number };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    function calc() {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 0);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      return {
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      };
    }
    setTimeLeft(calc());
    const t = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(t);
  }, []);

  return timeLeft;
}

// ─── Flip digit ───────────────────────────────────────────────────────────────

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
        width:      34,
        height:     38,
        background: "linear-gradient(180deg, rgba(20,20,20,0.92) 0%, rgba(0,0,0,0.78) 100%)",
        border:     "1px solid rgba(255,255,255,0.18)",
        boxShadow:  "inset 0 1px 0 rgba(255,255,255,0.14), 0 3px 10px rgba(0,0,0,0.45)",
        fontSize:   16,
        fontWeight: 900,
        letterSpacing: "-0.02em",
        transition: flipping ? "none" : undefined,
        transform:  flipping ? "scaleY(0.85)" : "scaleY(1)",
        opacity:    flipping ? 0.6 : 1,
      }}
    >
      {/* Horizontal line — flip card crease */}
      <div
        className="absolute inset-x-0"
        style={{
          top:        "50%",
          height:     1,
          background: "rgba(255,255,255,0.10)",
        }}
      />
      {val}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HeroBannerClient({ claimedPct }: Props) {
  const { h, m, s } = useCountdown();
  const units = [
    { val: pad(h), label: "HRS"  },
    { val: pad(m), label: "MIN"  },
    { val: pad(s), label: "SEC"  },
  ];

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-3"
      style={{
        background:     "rgba(0,0,0,0.58)",
        backdropFilter: "blur(14px)",
        border:         "1px solid rgba(255,255,255,0.16)",
        boxShadow:      "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
        minWidth:       136,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span
          className="size-1.5 animate-pulse rounded-full"
          style={{ background: "var(--color-accent)", boxShadow: "0 0 6px rgba(253,80,0,0.65)" }}
        />
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          Deal ends in
        </span>
      </div>

      {/* Flip-style countdown */}
      <div className="flex items-end gap-1">
        {units.map(({ val, label }, i) => (
          <div key={label} className="flex items-end gap-1">
            {i > 0 && (
              <span
                className="mb-2.5 text-sm font-black leading-none"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                :
              </span>
            )}
            <div className="flex flex-col items-center gap-0.5">
              <Digit val={val} />
              <span
                className="text-[7px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.50)" }}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}