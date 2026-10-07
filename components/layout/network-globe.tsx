"use client";

import { cn } from "@/lib/utils";

const ORANGE = "#FF5A1F";

/** Geographic nodes in viewBox 0–200 × 0–200 (stylized globe projection). */
const NODES = [
  { id: "na", x: 48, y: 72 },
  { id: "eu", x: 108, y: 58 },
  { id: "af", x: 112, y: 110 },
  { id: "as", x: 148, y: 78 },
  { id: "sa", x: 68, y: 130 },
  { id: "oc", x: 168, y: 138 },
] as const;

const ARCS: { from: number; to: number; delay: string }[] = [
  { from: 0, to: 1, delay: "0s" },
  { from: 1, to: 2, delay: "1.2s" },
  { from: 2, to: 3, delay: "2.4s" },
  { from: 3, to: 0, delay: "3.6s" },
  { from: 0, to: 4, delay: "0.8s" },
  { from: 4, to: 5, delay: "2s" },
  { from: 5, to: 3, delay: "3.2s" },
];

function arcPath(a: (typeof NODES)[number], b: (typeof NODES)[number]) {
  const mx = (a.x + b.x) / 2;
  const my = Math.min(a.y, b.y) - 28;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

/**
 * Lightweight SVG globe with animated network nodes.
 * Motion is CSS/SMIL driven and disabled via prefers-reduced-motion.
 */
export function NetworkGlobe({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "jimvio-network-globe relative mx-auto aspect-square w-full max-w-[340px] lg:max-w-none",
        className,
      )}
      aria-hidden
    >
      <style>{NETWORK_GLOBE_CSS}</style>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <radialGradient id="ng-sphere" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFF7F3" />
            <stop offset="55%" stopColor="#EEF2F7" />
            <stop offset="100%" stopColor="#D1D5DB" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="78" fill="url(#ng-sphere)" stroke="rgba(17,24,39,0.08)" />
        <ellipse
          cx="100"
          cy="100"
          rx="32"
          ry="78"
          fill="none"
          stroke="rgba(17,24,39,0.08)"
          strokeWidth="1"
        />
        <ellipse
          cx="100"
          cy="78"
          rx="76"
          ry="22"
          fill="none"
          stroke="rgba(17,24,39,0.07)"
          strokeWidth="1"
        />
        <ellipse
          cx="100"
          cy="118"
          rx="72"
          ry="20"
          fill="none"
          stroke="rgba(17,24,39,0.07)"
          strokeWidth="1"
        />

        {ARCS.map((arc, i) => {
          const a = NODES[arc.from];
          const b = NODES[arc.to];
          const d = arcPath(a, b);
          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke={`${ORANGE}35`}
                strokeWidth="1.25"
                strokeDasharray="4 5"
              />
              <circle r="2.8" fill={ORANGE} className="jimvio-net-dot">
                <animateMotion dur="4.8s" begin={arc.delay} repeatCount="indefinite" path={d} />
              </circle>
            </g>
          );
        })}

        {NODES.map((n, i) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r="5"
              fill={`${ORANGE}22`}
              className="jimvio-net-pulse"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
            <circle cx={n.x} cy={n.y} r="2.6" fill={ORANGE} />
          </g>
        ))}
      </svg>
    </div>
  );
}

const NETWORK_GLOBE_CSS = `
@keyframes jimvio-net-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.55); }
}
.jimvio-net-pulse {
  transform-origin: center;
  transform-box: fill-box;
  animation: jimvio-net-pulse 2.8s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-net-pulse { animation: none !important; }
  .jimvio-network-globe .jimvio-net-dot { display: none; }
}
`;
