/** Illustrations for the Trust Checker landing page (pure SVG, one Jimvio orange palette). */

const O = "#FF5A1F";

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-o`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF8A4C" /><stop offset="1" stopColor={O} /></linearGradient>
      <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#FFEDE3" /></linearGradient>
      <filter id={`${id}-s`} x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#E8501A" floodOpacity="0.18" /></filter>
    </defs>
  );
}

function Check({ id, cx, cy }: { id: string; cx: number; cy: number }) {
  return (
    <g filter={`url(#${id}-s)`}>
      <circle cx={cx} cy={cy} r="20" fill="#fff" />
      <circle cx={cx} cy={cy} r="16.5" fill={`url(#${id}-o)`} />
      <path d={`M${cx - 8} ${cy} l5.5 5.5 l11 -12`} fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export function ScamArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <Defs id="sa" />
      <g filter="url(#sa-s)">
        <rect x="10" y="12" width="112" height="86" rx="11" fill="url(#sa-l)" />
        <path d="M10 23 a11 11 0 0 1 11 -11 h90 a11 11 0 0 1 11 11 v8 h-112z" fill="url(#sa-o)" />
        <circle cx="23" cy="22" r="2.6" fill="#fff" /><circle cx="32" cy="22" r="2.6" fill="#fff" /><circle cx="41" cy="22" r="2.6" fill="#fff" />
      </g>
      <path d="M60 46 L82 84 H38 Z" fill="url(#sa-o)" stroke={O} strokeWidth="5" strokeLinejoin="round" />
      <rect x="57.5" y="57" width="5" height="14" rx="2.5" fill="#fff" /><circle cx="60" cy="77" r="3" fill="#fff" />
      <g filter="url(#sa-s)">
        <path d="M114 56 l24 8 v17 c0 15 -10 25 -24 31 c-14 -6 -24 -16 -24 -31 v-17z" fill="url(#sa-o)" />
        <path d="M103 84 l7 7 l14 -15" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function EngagementArt({ className }: { className?: string }) {
  const bars = [[22, 78, 22], [48, 64, 36], [74, 48, 52], [100, 30, 70]];
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <Defs id="ea" />
      <ellipse cx="75" cy="106" rx="62" ry="7" fill="#FFE3D3" />
      <rect x="14" y="98" width="122" height="8" rx="4" fill="#FFD2BC" />
      <g filter="url(#ea-s)">{bars.map(([x, y, h], i) => <rect key={i} x={x} y={y} width="20" height={h} rx="4" fill="url(#ea-o)" />)}</g>
      <path d="M18 72 C 50 66, 82 52, 116 20" fill="none" stroke={O} strokeWidth="7" strokeLinecap="round" />
      <path d="M100 15 L125 10 L120 35 Z" fill={O} />
    </svg>
  );
}

export function ProductArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <Defs id="pa" />
      <g filter="url(#pa-s)">
        <path d="M40 8 h48 l22 22 v76 a6 6 0 0 1 -6 6 h-64 a6 6 0 0 1 -6 -6 v-92 a6 6 0 0 1 6 -6z" fill="url(#pa-l)" />
        <path d="M88 8 v18 a4 4 0 0 0 4 4 h18z" fill="#FFC8AE" />
      </g>
      <rect x="46" y="34" width="34" height="5" rx="2.5" fill={O} /><rect x="46" y="46" width="48" height="5" rx="2.5" fill="#FFB590" />
      <rect x="46" y="58" width="40" height="5" rx="2.5" fill="#FFB590" />
      <rect x="22" y="70" width="46" height="22" rx="5" fill="url(#pa-o)" />
      <text x="45" y="86" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14" fill="#fff">PDF</text>
      <Check id="pa" cx={110} cy={90} />
    </svg>
  );
}

export function MediaArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <Defs id="ma" />
      <g filter="url(#ma-s)">
        <rect x="12" y="14" width="106" height="80" rx="11" fill="#fff" />
        <rect x="18" y="20" width="94" height="68" rx="7" fill="url(#ma-o)" />
      </g>
      <circle cx="88" cy="38" r="8" fill="#fff" />
      <path d="M18 80 L48 48 L70 70 L82 60 L112 84 V88 H18Z" fill="#fff" opacity="0.95" />
      <Check id="ma" cx={116} cy={88} />
    </svg>
  );
}

/** Soft orange ribbons in the hero corners. */
export function HeroWave({ side, className }: { side: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 520 320" className={className} style={side === "right" ? { transform: "scaleX(-1)" } : undefined} aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id={`hw-${side}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FF7A3D" stopOpacity="0.55" /><stop offset="0.55" stopColor="#FFA06E" stopOpacity="0.28" /><stop offset="1" stopColor="#FFD2BC" stopOpacity="0" /></linearGradient>
        <linearGradient id={`hw2-${side}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FFC3A3" stopOpacity="0.5" /><stop offset="1" stopColor="#FFE9DD" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M0 300 C 70 210, 170 120, 330 70 C 400 48, 460 40, 520 38 C 430 56, 330 92, 240 150 C 160 200, 80 260, 0 320 Z" fill={`url(#hw2-${side})`} />
      <path d="M0 250 C 60 170, 150 96, 290 50 C 340 34, 380 26, 420 22 C 330 44, 230 90, 150 150 C 95 190, 45 230, 0 270 Z" fill={`url(#hw-${side})`} />
    </svg>
  );
}
