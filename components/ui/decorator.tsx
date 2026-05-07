"use client";

/**
 * decorators.tsx — Jimvio shared SVG decorator components
 *
 * All decorative SVG primitives live here so every section stays
 * visually consistent without repeating markup.
 *
 * DESIGN RULES applied uniformly:
 *  • accent color  → var(--color-accent)   / prop `color` defaults to "#fd5000"
 *  • opacity       → every decorator is transparent by default; caller controls prominence
 *  • positioning   → all decorators are position:absolute + pointerEvents:none
 *  • aria          → aria-hidden="true" on every decorator
 *
 * COMPONENT INDEX
 * ─────────────────────────────────────────────────────
 *  GridPattern        — full-section dot-grid background texture
 *  CornerBlob         — concentric arc rings at a corner  (replaces CardCornerBlob)
 *  EdgeGlow           — radial gradient glow behind a corner
 *  RingDecor          — centered concentric ellipse rings
 *  CrosshairDot       — single crosshair target icon
 *  ConnectorArrow     — arrow chip between adjacent cards
 *  SectionDividerLine — thin decorative line with a center dot
 *  Eyebrow            — [— LABEL —] section subtitle with flanking lines
 *  StarIcon           — 5-point star  (used in badges / ratings)
 *  FlameIcon          — flame  (used in "Hot" badges)
 *  ArrowSVG           — right-pointing →  (CTA buttons)
 *  CheckSVG           — circle checkmark  (feature bullets)
 *  PackageSVG         — box outline  (product image placeholder)
 *  DollarCircle       — $ icon  (commission badges)
 *  ExternalLinkSVG    — ↗  (affiliate "Get link" CTA)
 *  StoreSVG           — storefront  (vendor CTA button)
 *  AwardSVG           — ribbon award  (vendor banner badge)
 * ─────────────────────────────────────────────────────
 */

import React from "react";

/* ─── shared defaults ─────────────────────────────── */
const ACCENT = "#fd5000";
const NONE = "none";
const PTR = "none" as const;
const ABS: React.CSSProperties = { position: "absolute", pointerEvents: PTR };

/* ═══════════════════════════════════════════════════════
   BACKGROUND TEXTURES
═══════════════════════════════════════════════════════ */

/**
 * GridPattern
 * Full-bleed section background grid (replaces all inline grid patterns).
 *
 * @param id      — unique <pattern> id; must be unique per page render
 * @param color   — stroke color; defaults to accent orange
 * @param opacity — overall transparency; 0.02–0.04 recommended
 * @param size    — grid cell size in px
 */
export function GridPattern({
  id = "grid",
  color = ACCENT,
  opacity = 0.03,
  size = 40,
}: {
  id?: string;
  color?: string;
  opacity?: number;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      style={{ ...ABS, inset: 0, width: "100%", height: "100%", opacity }}
    >
      <defs>
        <pattern
          id={id}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill={NONE}
            stroke={color}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   CORNER DECORATORS
═══════════════════════════════════════════════════════ */

type Corner = "top-right" | "top-left" | "bottom-right" | "bottom-left";

const CORNER_TRANSFORMS: Record<Corner, string> = {
  "top-right": "none",
  "top-left": "scaleX(-1)",
  "bottom-right": "scaleY(-1)",
  "bottom-left": "scale(-1)",
};

const CORNER_POS: Record<Corner, React.CSSProperties> = {
  "top-right": { top: 0, right: 0 },
  "top-left": { top: 0, left: 0 },
  "bottom-right": { bottom: 0, right: 0 },
  "bottom-left": { bottom: 0, left: 0 },
};

/**
 * CornerBlob  (was CardCornerBlob)
 * Concentric quarter-circle arcs anchored to a card corner.
 * Used on: every card, every stat box, every sidebar panel.
 *
 * @param color       — arc stroke color
 * @param size        — overall svg size in px
 * @param opacity     — 0.04–0.12 for subtle decoration
 * @param rings       — number of concentric arcs (default 3)
 * @param position    — which corner to anchor to
 * @param strokeWidth — arc stroke width
 */
export function CornerBlob({
  color = ACCENT,
  size = 200,
  opacity = 0.08,
  rings = 3,
  position = "top-right",
  strokeWidth = 1.5,
}: {
  color?: string;
  size?: number;
  opacity?: number;
  rings?: number;
  position?: Corner;
  strokeWidth?: number;
}) {
  const minR = size * 0.25;
  const maxR = size * 0.65;
  const radii = Array.from({ length: rings }, (_, i) =>
    rings === 1 ? maxR : minR + ((maxR - minR) / (rings - 1)) * i
  );

  return (
    <svg
      aria-hidden="true"
      style={{
        ...ABS,
        width: size,
        height: size,
        opacity,
        transform: CORNER_TRANSFORMS[position],
        ...CORNER_POS[position],
      }}
      viewBox={`0 0 ${size} ${size}`}
      fill={NONE}
    >
      {radii.map((r, i) => (
        <circle
          key={i}
          cx={size}
          cy={0}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      ))}
    </svg>
  );
}

/**
 * EdgeGlow
 * Radial blob glow — softer than CornerBlob, used as a background warmth.
 * Typically placed at bottom-left or top-right of a section.
 *
 * @param position  — which corner
 * @param color     — fill color
 * @param size      — diameter
 * @param opacity   — 0.03–0.06 recommended
 * @param offset    — how far outside the container to push the center (negative = inset)
 */
export function EdgeGlow({
  position = "bottom-left",
  color = ACCENT,
  size = 280,
  opacity = 0.05,
  offset = -80,
}: {
  position?: Corner;
  color?: string;
  size?: number;
  opacity?: number;
  offset?: number;
}) {
  const pos: React.CSSProperties =
    position === "bottom-left"
      ? { bottom: offset, left: offset }
      : position === "bottom-right"
      ? { bottom: offset, right: offset }
      : position === "top-left"
      ? { top: offset, left: offset }
      : { top: offset, right: offset };

  return (
    <svg
      aria-hidden="true"
      style={{ ...ABS, ...pos, opacity }}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   CENTER / FLOATING DECORATORS
═══════════════════════════════════════════════════════ */

/**
 * RingDecor
 * Concentric ellipse rings, centered horizontally — used at the top
 * of sections as a header "halo" and in the body as a background motif.
 *
 * @param top      — top offset from section top
 * @param opacity
 * @param rings    — number of rings
 * @param color
 * @param rx       — semi-major axis of outermost ring
 * @param ry       — semi-minor axis of outermost ring
 */
export function RingDecor({
  top = -60,
  opacity = 0.06,
  rings = 2,
  color = ACCENT,
  rx = 240,
  ry = 80,
}: {
  top?: number;
  opacity?: number;
  rings?: number;
  color?: string;
  rx?: number;
  ry?: number;
}) {
  const w = rx * 2 + 20;
  const h = ry * 2 + 20;

  return (
    <svg
      aria-hidden="true"
      style={{
        ...ABS,
        top,
        left: "50%",
        transform: "translateX(-50%)",
        opacity,
      }}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
    >
      {Array.from({ length: rings }, (_, i) => {
        const scale = 1 - i * 0.25;
        return (
          <ellipse
            key={i}
            cx={w / 2}
            cy={h / 2}
            rx={rx * scale}
            ry={ry * scale}
            stroke={color}
            strokeWidth={i === 0 ? 1.5 : 1}
            fill={NONE}
          />
        );
      })}
    </svg>
  );
}

/**
 * CrosshairDot
 * Small crosshair target — used as a subtle corner accent inside cards.
 *
 * @param top / right  — position offset
 * @param size         — overall diameter
 * @param opacity
 * @param color
 */
export function CrosshairDot({
  top = 16,
  right = 16,
  size = 20,
  opacity = 0.12,
  color = ACCENT,
}: {
  top?: number;
  right?: number;
  size?: number;
  opacity?: number;
  color?: string;
}) {
  const c = size / 2;
  const r = c - 2;

  return (
    <svg
      aria-hidden="true"
      style={{ ...ABS, top, right, opacity }}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill={NONE}
    >
      <circle cx={c} cy={c} r={r} stroke={color} strokeWidth="1.5" />
      <line x1={c} y1="1" x2={c} y2={size - 1} stroke={color} strokeWidth="1.5" />
      <line x1="1" y1={c} x2={size - 1} y2={c} stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT CONNECTOR
═══════════════════════════════════════════════════════ */

/**
 * ConnectorArrow
 * The small circular arrow chip that sits between adjacent "How it works" cards.
 * Absolutely positioned to the right edge of its parent card.
 */
export function ConnectorArrow() {
  return (
    <svg
      aria-hidden="true"
      style={{
        ...ABS,
        top: "50%",
        right: -18,
        transform: "translateY(-50%)",
        zIndex: 20,
      }}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill={NONE}
    >
      <circle
        cx="10"
        cy="10"
        r="9"
        fill="var(--color-bg)"
        stroke="var(--color-border)"
        strokeWidth="1"
      />
      <path
        d="M7 10H13M10 7L13 10L10 13"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION TYPOGRAPHY HELPERS
═══════════════════════════════════════════════════════ */

/**
 * SectionDividerLine
 * [— LABEL —] eyebrow row used above every section heading.
 * Replaces all the inline LineSVG + text patterns with a single component.
 *
 * @param label   — the eyebrow text
 * @param color   — line + text color
 * @param lineW   — length of each flanking line segment
 */
export function Eyebrow({
  label,
  color = ACCENT,
  lineW = 20,
}: {
  label: string;
  color?: string;
  lineW?: number;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <LineSVG width={lineW} color={color} />
      <p
        style={{
          color,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          margin: 0,
        }}
      >
        {label}
      </p>
      <LineSVG width={lineW} color={color} />
    </div>
  );
}

/**
 * LineSVG  (internal helper — exported for edge cases that need just the line)
 */
export function LineSVG({
  width = 20,
  color = ACCENT,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={width}
      height="2"
      viewBox={`0 0 ${width} 2`}
    >
      <line
        x1="0"
        y1="1"
        x2={width}
        y2="1"
        stroke={color}
        strokeWidth="2.5"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   INLINE ICON SVGs  (used inside buttons / badges / lists)
═══════════════════════════════════════════════════════ */

/** 5-point star — ratings, "Featured" badge */
export function StarIcon({
  size = 14,
  color = ACCENT,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/** Flame — "Hot" badge */
export function FlameIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C12 2 9 7 9 10.5C9 12.4 10.1 14 12 14C13.9 14 15 12.4 15 10.5C15 10.5 17 12 17 15C17 18.3 14.8 21 12 21C9.2 21 7 18.3 7 15C7 10 12 2 12 2Z" />
      <path
        d="M12 14C10.1 14 9 12.4 9 10.5C9 10.5 10 13 12 13C14 13 15 10.5 15 10.5C15 12.4 13.9 14 12 14Z"
        fill="rgba(255,255,255,0.4)"
      />
    </svg>
  );
}

/** Right arrow → — CTA buttons */
export function ArrowSVG({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill={NONE}
    >
      <path
        d="M2 7H12M8 3L12 7L8 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * CheckSVG — feature bullet checkmark inside a tinted circle
 * Used in CorePillars feature lists and FinalCTA trust items.
 */
export function CheckSVG({
  color = ACCENT,
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill={NONE}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="7"
        cy="7"
        r="6.5"
        stroke={color}
        strokeWidth="1"
        fill="rgba(253,80,0,0.06)"
      />
      <polyline
        points="4,7 6,9 10,5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ShieldCheckSVG — "Secure & private" trust item
 */
export function ShieldCheckSVG({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill={NONE}
      style={{ flexShrink: 0 }}
    >
      <path
        d="M7 1.5L2 3.5V7C2 9.8 4.2 12.2 7 13C9.8 12.2 12 9.8 12 7V3.5L7 1.5Z"
        stroke={ACCENT}
        strokeWidth="1"
        fill="rgba(253,80,0,0.06)"
      />
      <polyline
        points="4.5,7 6.5,9 9.5,5"
        stroke={ACCENT}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * GlobeSVG — "Works globally" trust item
 */
export function GlobeSVG({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill={NONE}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke={ACCENT}
        strokeWidth="1"
        fill="rgba(253,80,0,0.06)"
      />
      <path
        d="M7 1.5C7 1.5 5 4 5 7C5 10 7 12.5 7 12.5M7 1.5C7 1.5 9 4 9 7C9 10 7 12.5 7 12.5M1.5 7H12.5"
        stroke={ACCENT}
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * PackageSVG — empty product image placeholder
 */
export function PackageSVG({ size = 40 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill={NONE}
    >
      <rect
        x="4"
        y="12"
        width="32"
        height="24"
        rx="3"
        stroke="rgba(253,80,0,0.3)"
        strokeWidth="1.5"
        fill="rgba(253,80,0,0.06)"
      />
      <path d="M4 18H36" stroke="rgba(253,80,0,0.2)" strokeWidth="1" />
      <path
        d="M14 12V6C14 5.4 14.4 5 15 5H25C25.6 5 26 5.4 26 6V12"
        stroke="rgba(253,80,0,0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 22H24"
        stroke="rgba(253,80,0,0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * DollarCircle — commission badge icon
 */
export function DollarCircle({ size = 10 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill={NONE}
    >
      <path
        d="M5 1V9M3 3.5C3 2.7 3.9 2 5 2S7 2.7 7 3.5 6.1 5 5 5 3 5.7 3 6.5 3.9 8 5 8s2-.7 2-1.5"
        stroke="#fff"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * ExternalLinkSVG — affiliate "Get link" ↗
 */
export function ExternalLinkSVG({ size = 13 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 13 13"
      fill={NONE}
    >
      <path
        d="M5 2H2C1.4 2 1 2.4 1 3V11C1 11.6 1.4 12 2 12H10C10.6 12 11 11.6 11 11V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 1H12M12 1V5M12 1L6 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * StoreSVG — vendor CTA button icon
 */
export function StoreSVG({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={NONE}
    >
      <path
        d="M2 6.5L3.5 2H12.5L14 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 6.5H14.5V14H1.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6 14V10H10V14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * AwardSVG — ribbon award icon for VendorBanner
 */
export function AwardSVG({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={NONE}
    >
      <circle cx="10" cy="8" r="5.5" stroke={ACCENT} strokeWidth="1.5" />
      <path
        d="M6.5 12.5L5 18L10 15.5L15 18L13.5 12.5"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * NumberBadge
 * Tiny filled circle with a number — used as rank/step indicators on icons.
 *
 * @param n       — number to display
 * @param size    — badge diameter
 * @param bg      — fill color
 * @param position — where to anchor the badge relative to its parent icon
 */
export function NumberBadge({
  n,
  size = 16,
  bg = ACCENT,
  position = "top-left",
}: {
  n: number;
  size?: number;
  bg?: string;
  position?: "top-left" | "top-right";
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    background: bg,
    color: "#fff",
    fontSize: size * 0.55,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    top: -size * 0.375,
    ...(position === "top-left"
      ? { left: -size * 0.375 }
      : { right: -size * 0.375 }),
  };

  return <div style={style}>{n}</div>;
}

/**
 * IconWrapper
 * Consistent icon container used throughout all sections.
 * Renders the dashed hover-ring automatically via CSS group selector.
 *
 * @param icon     — Lucide (or any) React component
 * @param color    — icon + border tint color
 * @param bg       — fill tint
 * @param size     — box side length (px)
 * @param rounded  — border-radius token  "xl" | "2xl"
 * @param badge    — optional number badge (step number, rank)
 * @param badgePos — badge corner position
 */
export function IconWrapper({
  icon: Icon,
  color = ACCENT,
  bg = "rgba(253,80,0,0.08)",
  size = 48,
  rounded = "xl",
  badge,
  badgePos = "top-left",
}: {
  /**
   * Accepts any Lucide icon or any component that takes at least
   * { className?: string; style?: React.CSSProperties }.
   * Using `React.ComponentType<React.SVGProps<SVGSVGElement>>` matches
   * the actual Lucide icon signature without needing lucide-react imported here.
   */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: string;
  bg?: string;
  size?: number;
  rounded?: "xl" | "2xl";
  badge?: number;
  badgePos?: "top-left" | "top-right";
}) {
  const radii = { xl: 12, "2xl": 16 };
  const iconSize = size * 0.42;

  return (
    <div
      className="group-icon-wrapper"
      style={{
        width: size,
        height: size,
        borderRadius: radii[rounded],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        border: `1px solid ${color}30`,
        color,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* dashed hover ring */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -4,
          opacity: 0,
          transition: "opacity 300ms",
          pointerEvents: "none",
        }}
        className="group-hover:opacity-100"
        width={size + 8}
        height={size + 8}
        viewBox={`0 0 ${size + 8} ${size + 8}`}
      >
        <rect
          x="1"
          y="1"
          width={size + 6}
          height={size + 6}
          rx={radii[rounded] + 4}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="6 4"
          fill={NONE}
        />
      </svg>

      {badge !== undefined && (
        <NumberBadge n={badge} position={badgePos} />
      )}

      {/* width/height via SVGProps — no `style` overload conflict */}
      <Icon
        className="shrink-0"
        width={iconSize}
        height={iconSize}
      />
    </div>
  );
}