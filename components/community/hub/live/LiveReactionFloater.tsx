"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveCollabStore } from "@/lib/community/live-collab";

type Floater = { id: string; emoji: string; left: number; delay: number };

export function LiveReactionFloater({ sessionId }: { sessionId: string | null }) {
  const reactions = useLiveCollabStore((s) => s.reactions);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  const recent = useMemo(() => {
    if (!sessionId) return [];
    return reactions.filter((r) => r.sessionId === sessionId).slice(-8);
  }, [reactions, sessionId]);

  useEffect(() => {
    if (!sessionId || recent.length === 0) return;
    const latest = recent[recent.length - 1];
    if (!latest?.emoji) return;
    const id = latest.id;
    setFloaters((prev) => {
      if (prev.some((f) => f.id === id)) return prev;
      const next: Floater = {
        id,
        emoji: latest.emoji ?? "❤️",
        left: 12 + Math.random() * 76,
        delay: Math.random() * 0.2,
      };
      return [...prev.slice(-12), next];
    });
  }, [recent, sessionId]);

  useEffect(() => {
    if (floaters.length === 0) return;
    const timer = window.setTimeout(() => {
      setFloaters((prev) => prev.slice(1));
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [floaters]);

  if (!sessionId || floaters.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      {floaters.map((f) => (
        <span
          key={f.id}
          className="live-reaction-float absolute bottom-16 text-[22px] sm:text-[26px]"
          style={{ left: `${f.left}%`, animationDelay: `${f.delay}s` }}
          aria-hidden
        >
          {f.emoji}
        </span>
      ))}
      <style jsx>{`
        .live-reaction-float {
          animation: liveReactionFloat 2.6s ease-out forwards;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35));
        }
        @keyframes liveReactionFloat {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.85);
          }
          12% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-120px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
