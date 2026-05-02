"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Syncing secure nodes",
  "Fetching your data",
  "Almost ready",
];

export default function DashboardLoading() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 600);
    return () => clearInterval(id);
  }, []);

  const msgIndex = Math.floor(tick / 3) % MESSAGES.length;
  const dotCount = (tick % 3) + 1;

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[var(--color-bg)] select-none">

      {/* ── Icon ── */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Orbiting ring */}
        <svg
          className="absolute"
          width="88" height="88"
          viewBox="0 0 88 88"
          style={{ animation: "spin 1.4s linear infinite" }}
        >
          <circle cx="44" cy="44" r="38" fill="none" stroke="var(--color-border)" strokeWidth="1" />
          <circle
            cx="44" cy="44" r="38"
            fill="none" stroke="#fd5000" strokeWidth="1.5"
            strokeLinecap="round" strokeDasharray="28 210"
          />
        </svg>

        {/* Second ring, counter-spin */}
        <svg
          className="absolute"
          width="68" height="68"
          viewBox="0 0 68 68"
          style={{ animation: "spin-rev 2.2s linear infinite" }}
        >
          <circle cx="34" cy="34" r="28" fill="none" stroke="var(--color-border)" strokeWidth="0.75" strokeDasharray="4 12" />
        </svg>

        {/* Core icon */}
        <div className="relative z-10 w-[46px] h-[46px] rounded-[13px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#fd5000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: "spin 1s linear infinite" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </div>

      {/* ── Label ── */}
      <p
        className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--color-text-primary)] mb-2"
        style={{ animation: "fade-up 0.4s ease both" }}
      >
        Accessing System
      </p>

      {/* ── Cycling message ── */}
      <div className="h-[18px] flex items-center justify-center overflow-hidden">
        <p
          key={msgIndex}
          className="text-[10px] text-[var(--color-text-muted)] tracking-[0.18em] uppercase"
          style={{ animation: "slide-up 0.35s ease both" }}
        >
          {MESSAGES[msgIndex]}
          <span className="inline-block w-[18px] text-left text-[#fd5000]">
            {".".repeat(dotCount)}
          </span>
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div className="mt-8 w-[120px] h-[2px] rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#fd5000]"
          style={{ animation: "progress 2.4s ease-in-out infinite" }}
        />
      </div>

      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes spin-rev    { to { transform: rotate(-360deg); } }
        @keyframes fade-up     { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes slide-up    { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes progress    {
          0%   { width: 0%;    margin-left: 0%; }
          50%  { width: 60%;   margin-left: 20%; }
          100% { width: 0%;    margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}