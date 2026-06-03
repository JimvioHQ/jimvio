"use client";

import { useEffect, useState } from "react";

type Props = { claimedPct: number };

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function CountBox({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center">
            <div
                className="rounded-md px-2.5 py-1.5 text-xl font-black tabular-nums" 
                style={{ background: "var(--color-surface-secondary)", color: "var(--color-text-primary)" }}
            >
                {value}
            </div>
            <div className="mt-1 text-[10px] font-medium tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                {label}
            </div>
        </div>
    );
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
        <div className="flex flex-col items-center gap-3">

            {/* Countdown */}
            <div
                className="rounded-xl p-3"
                style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
            >
                <div
                    className="mb-2 text-center text-xs font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Deal ends in
                </div>
                <div className="flex gap-2">
                    <CountBox value={pad(timeLeft.h)} label="HRS" />
                    <CountBox value={pad(timeLeft.m)} label="MINS" />
                    <CountBox value={pad(timeLeft.s)} label="SECS" />
                </div>
            </div>

            {/* Claimed progress */}
            {claimedPct > 0 && (
                <div
                    className="w-full rounded-xl px-3 py-2.5"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                    <div className="mb-1.5 flex items-center justify-between text-[10px]">
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>Claimed</span>
                        <span className="font-bold" style={{ color: "var(--color-text-primary)" }}>{claimedPct}%</span>
                    </div>
                    <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: "var(--color-surface-secondary)" }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${claimedPct}%`,
                                background: "linear-gradient(90deg, var(--color-accent) 0%, #ff8c00 100%)",
                            }}
                        />
                    </div>
                    {claimedPct >= 80 && (
                        <p
                            className="mt-1.5 text-center text-[10px] font-semibold"
                            style={{ color: "var(--color-accent)" }}
                        >
                            Almost gone — {100 - claimedPct}% left!
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}