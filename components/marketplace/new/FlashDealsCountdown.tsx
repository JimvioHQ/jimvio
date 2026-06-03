"use client";

import { useEffect, useState } from "react";

function pad(n: number) { return String(n).padStart(2, "0"); }

export function FlashDealsCountdown() {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    function calc() {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 0);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      return { h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 };
    }
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="hidden items-center gap-1.5 text-xs font-semibold text-white sm:flex">
      Time Left:
      {[t.h, t.m, t.s].map((v, i) => (
        <span key={i} className="rounded bg-black/25 px-1.5 py-0.5 tabular-nums">
          {pad(v)}
        </span>
      ))}
    </span>
  );
}