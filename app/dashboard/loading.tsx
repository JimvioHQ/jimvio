"use client";

import { useEffect, useState } from "react";

const DOTS = [1, 2, 3];

export default function DashboardLoading() {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % DOTS.length);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-[84px] h-[84px] rounded-[24px] border border-[#fd5000]/[0.07] animate-pulse" />
        <div className="absolute w-[68px] h-[68px] rounded-[18px] border border-[#fd5000]/[0.15] animate-pulse" />
        <div className="relative w-[52px] h-[52px] rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fd5000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-spin"
            style={{ animationDuration: "1s" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5 mb-5">
        <p className="text-[12px] font-semibold text-[var(--color-text-primary)] tracking-[0.25em] uppercase">
          Accessing System
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] tracking-[0.15em] uppercase">
          Syncing secure nodes
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-[5px] items-center">
        {DOTS.map((_, i) => (
          <div
            key={i}
            className="w-[5px] h-[5px] rounded-full bg-[#fd5000] transition-opacity duration-300"
            style={{ opacity: activeDot === i ? 1 : activeDot === (i + 1) % 3 ? 0.4 : 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}