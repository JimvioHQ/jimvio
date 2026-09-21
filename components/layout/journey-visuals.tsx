"use client";

import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Shared Jimvio journey illustration system — soft-lit, matte, brand-coherent SVGs. */

type VisualProps = {
  accent?: string;
  className?: string;
  style?: CSSProperties;
};

const ORANGE = "#FF5A1F";

function SoftFloor({
  cx = 80,
  cy = 118,
  rx = 48,
  ry = 8,
}: {
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(17,24,39,0.07)" />;
}

/** Premium over-ear product — Buy Products */
export function BuyProductsVisual({ accent = ORANGE, className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const shell = `hp-shell-${uid}`;
  const cushion = `hp-cush-${uid}`;
  const band = `hp-band-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={shell} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </linearGradient>
        <linearGradient id={cushion} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7F3" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
        <linearGradient id={band} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D1D5DB" />
        </linearGradient>
      </defs>
      <SoftFloor cy={120} rx={44} ry={7} />
      <g transform="translate(80 68)">
        {/* Headband */}
        <path
          d="M-38 -8 C-38 -48 -20 -58 0 -58 C20 -58 38 -48 38 -8"
          fill="none"
          stroke={`url(#${band})`}
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M-34 -6 C-34 -42 -18 -50 0 -50 C18 -50 34 -42 34 -6"
          fill="none"
          stroke="rgba(17,24,39,0.06)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Left cup */}
        <ellipse cx="-40" cy="10" rx="18" ry="24" fill={`url(#${shell})`} stroke="rgba(17,24,39,0.08)" />
        <ellipse cx="-40" cy="10" rx="11" ry="16" fill={`url(#${cushion})`} opacity="0.9" />
        <ellipse cx="-40" cy="6" rx="6" ry="8" fill="#FFFFFF" opacity="0.35" />
        {/* Right cup */}
        <ellipse cx="40" cy="10" rx="18" ry="24" fill={`url(#${shell})`} stroke="rgba(17,24,39,0.08)" />
        <ellipse cx="40" cy="10" rx="11" ry="16" fill={`url(#${cushion})`} opacity="0.9" />
        <ellipse cx="40" cy="6" rx="6" ry="8" fill="#FFFFFF" opacity="0.35" />
        {/* Accent hinge marks */}
        <rect x="-46" y="-6" width="12" height="6" rx="2" fill={accent} opacity="0.85" />
        <rect x="34" y="-6" width="12" height="6" rx="2" fill={accent} opacity="0.85" />
      </g>
    </svg>
  );
}

/** Premium shopping bag — Buyer journey */
export function BuyerBagVisual({ accent = ORANGE, className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const bag = `buy-bag-${uid}`;
  const handle = `buy-handle-${uid}`;
  const gloss = `buy-gloss-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={bag} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F3F4F6" />
        </linearGradient>
        <linearGradient id={handle} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#E04A12" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <SoftFloor />
      <g transform="translate(80 64)">
        <path
          d="M-36 -6 L-31 44 Q-31 52 -22 52 L22 52 Q31 52 31 44 L36 -6 Z"
          fill={`url(#${bag})`}
          stroke="rgba(17,24,39,0.08)"
          strokeWidth="1"
        />
        <path d="M-30 -2 L-26 40 L-22 40 L-26 -2 Z" fill={`url(#${gloss})`} />
        <path
          d="M-36 -6 L36 -6 L34 -18 Q32 -26 24 -26 L-24 -26 Q-32 -26 -34 -18 Z"
          fill="#FFFFFF"
          stroke="rgba(17,24,39,0.06)"
        />
        <path
          d="M-16 -26 C-16 -44 -4 -52 0 -52 C4 -52 16 -44 16 -26"
          fill="none"
          stroke={`url(#${handle})`}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="0" cy="16" r="11" fill={`${accent}16`} />
        <path d="M-4.5 16h9M0 11.5v9" stroke={accent} strokeWidth="2.25" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function SellProductsVisual({ accent = ORANGE, className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const face = `sell-face-${uid}`;
  const awning = `sell-awning-${uid}`;
  const roof = `sell-roof-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>
        <linearGradient id={awning} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} />
          <stop offset="25%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor={accent} />
          <stop offset="75%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
        <linearGradient id={roof} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2F7" />
        </linearGradient>
      </defs>
      <SoftFloor cy={120} rx={52} />
      <g transform="translate(80 70)">
        <rect x="-44" y="-8" width="88" height="54" rx="7" fill={`url(#${face})`} stroke="rgba(17,24,39,0.08)" />
        <path d="M-50 -22 L0 -40 L50 -22 L44 -8 L-44 -8 Z" fill={`url(#${roof})`} stroke="rgba(17,24,39,0.06)" />
        <rect x="-46" y="-18" width="92" height="13" rx="3.5" fill={`url(#${awning})`} />
        {/* Door */}
        <rect x="-14" y="10" width="28" height="36" rx="4" fill={`${accent}12`} stroke={accent} strokeWidth="1.6" />
        <circle cx="8" cy="28" r="1.8" fill={accent} />
        {/* Windows */}
        <rect x="-34" y="4" width="14" height="14" rx="2.5" fill="#E5E7EB" />
        <rect x="20" y="4" width="14" height="14" rx="2.5" fill="#E5E7EB" />
        <path d="M-34 11h14M-27 4v14M20 11h14M27 4v14" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
        {/* Sign */}
        <rect x="-12" y="-4" width="24" height="8" rx="2" fill="#FFFFFF" stroke="rgba(17,24,39,0.08)" />
        <rect x="-8" y="-1.5" width="16" height="3" rx="1.5" fill={`${accent}40`} />
      </g>
    </svg>
  );
}

export function SellerStoreVisual({ accent = "#2563eb", className, style }: VisualProps) {
  return <SellProductsVisual accent={accent} className={className} style={style} />;
}

export function EarnCommissionsVisual({ accent = "#16a34a", className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const bar = `earn-bar-${uid}`;
  const coin = `earn-coin-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={bar} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F3F4F6" />
        </linearGradient>
        <linearGradient id={coin} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={`${accent}35`} />
        </linearGradient>
      </defs>
      <SoftFloor cy={118} />
      <g transform="translate(72 78)">
        {[
          { x: -34, h: 26 },
          { x: -8, h: 42 },
          { x: 18, h: 56 },
        ].map((item) => (
          <g key={item.x}>
            <rect
              x={item.x}
              y={-item.h}
              width="20"
              height={item.h}
              rx="5"
              fill={`url(#${bar})`}
              stroke="rgba(17,24,39,0.07)"
            />
            <rect x={item.x} y={-item.h} width="20" height="7" rx="3.5" fill={accent} />
          </g>
        ))}
        <path
          d="M-38 -6 L-6 -20 L20 -34 L42 -48"
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
      {/* Floating coin */}
      <g transform="translate(118 42)">
        <ellipse cx="0" cy="4" rx="16" ry="5" fill="rgba(17,24,39,0.08)" />
        <ellipse cx="0" cy="0" rx="16" ry="16" fill={`url(#${coin})`} stroke={accent} strokeWidth="2" />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill={accent}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          $
        </text>
      </g>
    </svg>
  );
}

export function AffiliateCoinsVisual({ accent = "#16a34a", className, style }: VisualProps) {
  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <SoftFloor cy={118} rx={42} />
      <g transform="translate(80 72)">
        {[
          { y: 20, s: 0.92, o: 0.5 },
          { y: 6, s: 1, o: 0.75 },
          { y: -10, s: 1.08, o: 1 },
        ].map((c) => (
          <g key={c.y} transform={`translate(0 ${c.y}) scale(${c.s})`} opacity={c.o}>
            <ellipse cx="0" cy="10" rx="30" ry="9" fill={`${accent}20`} />
            <ellipse cx="0" cy="2" rx="30" ry="10" fill={`${accent}55`} />
            <ellipse cx="0" cy="0" rx="30" ry="13" fill="#FFFFFF" stroke={accent} strokeWidth="2.25" />
            <ellipse cx="0" cy="0" rx="18" ry="7.5" fill={`${accent}14`} />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill={accent}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              $
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function CreateCampaignsVisual({ accent = "#7c3aed", className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const phone = `camp-phone-${uid}`;
  const screen = `camp-screen-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={phone} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2FF" />
        </linearGradient>
        <linearGradient id={screen} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="45%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <SoftFloor cy={120} rx={40} />
      <g transform="translate(80 64) rotate(-10)">
        <rect x="-28" y="-50" width="56" height="94" rx="14" fill={`url(#${phone})`} stroke="rgba(17,24,39,0.1)" />
        <rect x="-22" y="-42" width="44" height="74" rx="7" fill={`url(#${screen})`} />
        {/* Scenic hint */}
        <path d="M-22 8 Q-8 -6 4 2 T22 0 L22 32 L-22 32 Z" fill={`${accent}35`} />
        <circle cx="-8" cy="-18" r="7" fill="#FDE68A" opacity="0.7" />
        <circle cx="0" cy="-4" r="14" fill={`${accent}60`} />
        <path d="M-4 -10 L10 -4 L-4 2 Z" fill="#FFFFFF" />
        <rect x="-7" y="36" width="14" height="3.5" rx="1.75" fill="#D1D5DB" />
      </g>
    </svg>
  );
}

export function JoinCampaignsVisual({ accent = "#2563eb", className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const card = `join-card-${uid}`;
  const back = `join-back-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={card} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EFF6FF" />
        </linearGradient>
        <linearGradient id={back} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>
      <SoftFloor cy={118} />
      <g transform="translate(80 66)">
        <rect
          x="-50"
          y="-30"
          width="76"
          height="54"
          rx="14"
          fill={`url(#${back})`}
          stroke="rgba(17,24,39,0.06)"
          transform="rotate(-10)"
        />
        <rect x="-30" y="-20" width="76" height="54" rx="14" fill={`url(#${card})`} stroke="rgba(17,24,39,0.1)" />
        <circle cx="8" cy="6" r="15" fill={`${accent}16`} />
        <path d="M3 6 L13 6 M8 1 L8 11" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
        <rect x="-14" y="-8" width="30" height="4.5" rx="2.25" fill="#E5E7EB" />
        <rect x="-14" y="24" width="44" height="4.5" rx="2.25" fill="#F3F4F6" />
      </g>
    </svg>
  );
}

export function BrandMegaphoneVisual({ accent = "#4f46e5", className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const cone = `mega-cone-${uid}`;
  const grip = `mega-grip-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={cone} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EEF2FF" />
        </linearGradient>
        <linearGradient id={grip} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <SoftFloor cy={118} />
      <g transform="translate(76 68) rotate(-16)">
        <path d="M-6 -12 L46 -32 L46 32 L-6 12 Z" fill={`url(#${cone})`} stroke="rgba(17,24,39,0.1)" />
        <path d="M-6 -12 L46 -32 L46 -20 L-6 0 Z" fill={`${accent}22`} />
        <rect x="-30" y="-12" width="26" height="24" rx="7" fill={`url(#${grip})`} />
        <rect x="-18" y="10" width="12" height="24" rx="3.5" fill="#EEF2FF" stroke={accent} strokeWidth="1.5" />
        <path d="M52 -12 Q64 0 52 12" fill="none" stroke={accent} strokeWidth="2.25" strokeLinecap="round" opacity="0.55" />
        <path d="M60 -20 Q78 0 60 20" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.28" />
      </g>
    </svg>
  );
}

export function CreatorMediaVisual({ accent = "#7c3aed", className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const frame = `creator-frame-${uid}`;
  const screen = `creator-screen-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={frame} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F5F3FF" />
        </linearGradient>
        <linearGradient id={screen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`${accent}28`} />
          <stop offset="100%" stopColor={`${accent}10`} />
        </linearGradient>
      </defs>
      <SoftFloor cy={118} rx={46} />
      <g transform="translate(80 64)">
        <rect x="-50" y="-34" width="100" height="68" rx="18" fill={`url(#${frame})`} stroke="rgba(17,24,39,0.08)" />
        <rect x="-40" y="-24" width="80" height="48" rx="12" fill={`url(#${screen})`} />
        <circle cx="0" cy="0" r="18" fill={accent} opacity="0.92" />
        <path d="M-5 -10 L12 0 L-5 10 Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export function BuildCommunitiesVisual({ accent = "#d97706", className, style }: VisualProps) {
  const uid = useId().replace(/:/g, "");
  const globe = `comm-globe-${uid}`;

  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <defs>
        <radialGradient id={globe} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </radialGradient>
      </defs>
      <SoftFloor cy={118} rx={44} />
      <g transform="translate(80 62)">
        <circle cx="0" cy="0" r="42" fill={`url(#${globe})`} stroke="rgba(17,24,39,0.08)" />
        <ellipse cx="0" cy="0" rx="18" ry="42" fill="none" stroke="rgba(17,24,39,0.11)" strokeWidth="1.1" />
        <ellipse cx="0" cy="-14" rx="40" ry="13" fill="none" stroke="rgba(17,24,39,0.1)" strokeWidth="1.1" />
        <ellipse cx="0" cy="12" rx="38" ry="12" fill="none" stroke="rgba(17,24,39,0.1)" strokeWidth="1.1" />
        <circle cx="-14" cy="-8" r="3.2" fill={accent} opacity="0.9" />
        <circle cx="12" cy="6" r="2.8" fill={accent} opacity="0.75" />
        <circle cx="20" cy="-18" r="2.2" fill={accent} opacity="0.55" />
        <path d="M-14 -8 L12 6 L20 -18" fill="none" stroke={accent} strokeWidth="1.35" opacity="0.45" />
        {/* Floating person chip */}
        <g transform="translate(26 -28)">
          <circle cx="0" cy="0" r="12" fill="#FFFFFF" stroke="rgba(17,24,39,0.08)" />
          <circle cx="0" cy="-3" r="3.8" fill={`${accent}35`} />
          <path d="M-7 8 Q-7 2 0 2 Q7 2 7 8" fill="none" stroke={`${accent}95`} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

export function CommunityPeopleVisual({ accent = "#d97706", className, style }: VisualProps) {
  return (
    <svg viewBox="0 0 160 130" className={cn("h-full w-full", className)} style={style} aria-hidden>
      <SoftFloor cy={118} rx={48} />
      <g transform="translate(80 74)">
        {[
          { x: -30, scale: 0.88, o: 0.65 },
          { x: 0, scale: 1.08, o: 1 },
          { x: 30, scale: 0.88, o: 0.65 },
        ].map((p) => (
          <g key={p.x} transform={`translate(${p.x} 0) scale(${p.scale})`} opacity={p.o}>
            <ellipse cx="0" cy="22" rx="18" ry="5" fill="rgba(17,24,39,0.06)" />
            <circle cx="0" cy="-18" r="13" fill="#FFFFFF" stroke={accent} strokeWidth="2.1" />
            <circle cx="0" cy="-18" r="5.5" fill={`${accent}28`} />
            <path
              d="M-18 24 Q-18 -2 0 -2 Q18 -2 18 24 Z"
              fill="#FFFFFF"
              stroke={accent}
              strokeWidth="2.1"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
