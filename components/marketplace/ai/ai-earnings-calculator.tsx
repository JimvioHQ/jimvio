"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

export function AiEarningsCalculator() {
  const [clicks, setClicks] = useState(5000);
  const [views, setViews] = useState(50000);
  const [commission, setCommission] = useState(15);

  const { low, high } = useMemo(() => {
    const base = (clicks * 0.05 + views / 1000 * 8) * (commission / 10);
    return { low: Math.max(50, Math.round(base * 0.6)), high: Math.max(250, Math.round(base * 2.5)) };
  }, [clicks, views, commission]);

  const sliders = [
    { label: "Monthly Clicks", val: clicks, set: setClicks, min: 100, max: 50000, step: 100 },
    { label: "Monthly Views", val: views, set: setViews, min: 1000, max: 500000, step: 1000 },
    { label: "Commission Rate", val: commission, set: setCommission, min: 5, max: 30, step: 1, suffix: "%" },
  ] as const;

  return (
    <div className="rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-4">
      <h4 className="text-[14px] font-bold text-[var(--color-text-primary)]">Earnings Calculator</h4>
      <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
        Estimate affiliate + UGC potential on Jimvio.
      </p>

      <div className="mt-4 space-y-4">
        {sliders.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex justify-between text-[12px] font-medium text-[var(--color-text-secondary)]">
              <span>{s.label}</span>
              <span className="text-[var(--color-text-primary)]">
                {fmtCount(s.val)}
                {"suffix" in s ? s.suffix : ""}
              </span>
            </div>
            <Slider
              min={s.min}
              max={s.max}
              step={s.step}
              value={[s.val]}
              onValueChange={(v) => s.set(v[0] ?? s.min)}
              className="py-1 [--color-accent:#FF5A1F]"
            />
          </div>
        ))}
      </div>

      <div
        className="mt-4 rounded-xl p-4 text-center text-white"
        style={{ background: `linear-gradient(135deg, ${JIMVIO_ORANGE}, #ff7a45)` }}
      >
        <div className="text-[11px] font-semibold opacity-90">Potential Earnings</div>
        <div className="mt-1 text-[24px] font-black leading-none sm:text-[28px]">
          ${low.toLocaleString()} – ${high.toLocaleString()}+
        </div>
        <Link
          href="/ugc"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold"
          style={{ color: JIMVIO_ORANGE }}
        >
          Start Earning <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
