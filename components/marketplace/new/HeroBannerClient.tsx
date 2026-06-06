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
      className="relative grid place-items-center rounded-md tabular-nums text-white"
      style={{
        width:      32,
        height:     36,
        background: "rgba(0,0,0,0.45)",
        border:     "1px solid rgba(255,255,255,0.08)",
        fontSize:   15,
        fontWeight: 900,
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
          background: "rgba(255,255,255,0.06)",
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
        background:    "rgba(0,0,0,0.38)",
        backdropFilter: "blur(12px)",
        border:        "1px solid rgba(255,255,255,0.10)",
        minWidth:      130,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span
          className="size-1.5 animate-pulse rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.55)" }}
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
                className="mb-2.5 text-xs font-black leading-none"
                style={{ color: "rgba(255,255,255,0.30)" }}
              >
                :
              </span>
            )}
            <div className="flex flex-col items-center gap-0.5">
              <Digit val={val} />
              <span
                className="text-[7px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Claimed bar */}
      {claimedPct > 0 && (
        <div className="flex flex-col gap-1">
          {/* Label row */}
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>
              Claimed
            </span>
            <span
              className="text-[8px] font-black"
              style={{
                color: claimedPct >= 80
                  ? "var(--color-accent)"
                  : "rgba(255,255,255,0.65)",
              }}
            >
              {claimedPct}%
            </span>
          </div>

          {/* Bar */}
          <div
            className="h-1 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width:      `${claimedPct}%`,
                background: claimedPct >= 80
                  ? "linear-gradient(90deg, var(--color-accent) 0%, #ff3a00 100%)"
                  : "linear-gradient(90deg, var(--color-accent) 0%, #ff8c00 100%)",
                transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
                boxShadow:  claimedPct >= 80
                  ? "0 0 8px rgba(253,80,0,0.6)"
                  : "none",
              }}
            />
          </div>

          {claimedPct >= 80 && (
            <p
              className="text-[8px] font-black uppercase tracking-wide"
              style={{ color: "var(--color-accent)" }}
            >
              🔥 Only {100 - claimedPct}% left!
            </p>
          )}
        </div>
      )}
    </div>
  );
}