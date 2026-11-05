/** Illustrations for the Trust Checker landing page (pure SVG, no images to load). */

export function Laurel({ flip = false, className }: { flip?: boolean; className?: string }) {
  const leaves = [
    [30, 74, -50], [24, 62, -35], [21, 49, -18], [22, 36, -2], [27, 24, 14], [35, 14, 30],
  ];
  return (
    <svg viewBox="0 0 60 90" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      <defs>
        <linearGradient id="laurel-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F7B23B" /><stop offset="1" stopColor="#E27B15" /></linearGradient>
      </defs>
      <path d="M40 86 C 22 72, 16 46, 34 10" fill="none" stroke="url(#laurel-g)" strokeWidth="3" strokeLinecap="round" />
      {leaves.map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="3.8" ry="9" transform={`rotate(${r} ${x} ${y})`} fill="url(#laurel-g)" />
          <ellipse cx={x + 13} cy={y + 2} rx="3.4" ry="8" transform={`rotate(${r + 55} ${x + 12} ${y + 2})`} fill="url(#laurel-g)" opacity="0.92" />
        </g>
      ))}
    </svg>
  );
}

export function ScamArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="sa-bar" x1="0" x2="1"><stop offset="0" stopColor="#FF7A2F" /><stop offset="1" stopColor="#FF5A1F" /></linearGradient>
        <linearGradient id="sa-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFC24A" /><stop offset="1" stopColor="#F58A0B" /></linearGradient>
        <filter id="sa-s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#E8501A" floodOpacity="0.18" /></filter>
      </defs>
      <g filter="url(#sa-s)">
        <rect x="10" y="12" width="112" height="84" rx="10" fill="#fff" />
        <path d="M10 22 a10 10 0 0 1 10 -10 h92 a10 10 0 0 1 10 10 v8 h-112z" fill="url(#sa-bar)" />
        <circle cx="22" cy="21" r="2.6" fill="#fff" /><circle cx="31" cy="21" r="2.6" fill="#fff" /><circle cx="40" cy="21" r="2.6" fill="#fff" />
        <rect x="20" y="38" width="92" height="48" rx="6" fill="#F3F4F6" />
      </g>
      <path d="M57 46 L78 82 H36 Z" fill="#EF2B2B" stroke="#EF2B2B" strokeWidth="5" strokeLinejoin="round" />
      <rect x="54.5" y="56" width="5" height="14" rx="2.5" fill="#fff" /><circle cx="57" cy="75" r="3" fill="#fff" />
      <g filter="url(#sa-s)">
        <path d="M112 52 l26 9 v18 c0 16 -11 27 -26 33 c-15 -6 -26 -17 -26 -33 v-18z" fill="url(#sa-sh)" />
        <path d="M100 81 l8 8 l15 -16" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function EngagementArt({ className }: { className?: string }) {
  const bars = [[22, 74, 26], [48, 60, 40], [74, 44, 56], [100, 26, 74]];
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="ea-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8B3DF0" /><stop offset="1" stopColor="#C49BFF" /></linearGradient>
        <linearGradient id="ea-a" x1="0" x2="1"><stop offset="0" stopColor="#B989FF" /><stop offset="1" stopColor="#7C2BEA" /></linearGradient>
      </defs>
      <ellipse cx="75" cy="106" rx="62" ry="7" fill="#E7DBFF" />
      <rect x="14" y="98" width="122" height="8" rx="4" fill="#DCCBFF" />
      {bars.map(([x, y, h], i) => <rect key={i} x={x} y={y} width="20" height={h} rx="4" fill="url(#ea-b)" />)}
      <path d="M18 70 C 50 64, 82 50, 116 18" fill="none" stroke="url(#ea-a)" strokeWidth="7" strokeLinecap="round" />
      <path d="M100 14 L124 10 L119 34 Z" fill="#7C2BEA" />
    </svg>
  );
}

export function ProductArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="pa-d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F3F8FF" /><stop offset="1" stopColor="#CFE0FB" /></linearGradient>
        <linearGradient id="pa-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3D8BFF" /><stop offset="1" stopColor="#1E5FE0" /></linearGradient>
        <filter id="pa-s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1E5FE0" floodOpacity="0.18" /></filter>
      </defs>
      <g filter="url(#pa-s)">
        <path d="M40 8 h48 l22 22 v76 a6 6 0 0 1 -6 6 h-64 a6 6 0 0 1 -6 -6 v-92 a6 6 0 0 1 6 -6z" fill="url(#pa-d)" />
        <path d="M88 8 v18 a4 4 0 0 0 4 4 h18z" fill="#A9C6F5" />
      </g>
      <rect x="46" y="34" width="34" height="5" rx="2.5" fill="#3D7BE8" /><rect x="46" y="46" width="48" height="5" rx="2.5" fill="#8CB2EE" />
      <rect x="46" y="58" width="40" height="5" rx="2.5" fill="#8CB2EE" />
      <rect x="22" y="70" width="46" height="22" rx="5" fill="#1E6BF0" />
      <text x="45" y="86" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="14" fill="#fff">PDF</text>
      <g filter="url(#pa-s)">
        <circle cx="110" cy="88" r="21" fill="#fff" /><circle cx="110" cy="88" r="17" fill="url(#pa-c)" />
        <path d="M101 88 l6 6 l12 -13" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function MediaArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="ma-i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5BE07B" /><stop offset="1" stopColor="#1FB54C" /></linearGradient>
        <linearGradient id="ma-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34D35E" /><stop offset="1" stopColor="#139A3D" /></linearGradient>
        <filter id="ma-s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#139A3D" floodOpacity="0.2" /></filter>
      </defs>
      <g filter="url(#ma-s)">
        <rect x="12" y="14" width="104" height="80" rx="10" fill="#fff" />
        <rect x="18" y="20" width="92" height="68" rx="6" fill="url(#ma-i)" />
      </g>
      <circle cx="86" cy="38" r="8" fill="#fff" />
      <path d="M18 80 L48 48 L70 70 L82 60 L110 84 V88 H18Z" fill="#fff" opacity="0.95" />
      <g filter="url(#ma-s)">
        <path d="M118 56 l24 8 v17 c0 15 -10 25 -24 31 c-14 -6 -24 -16 -24 -31 v-17z" fill="#fff" />
        <path d="M118 61 l19 6 v14 c0 12 -8 20 -19 25 c-11 -5 -19 -13 -19 -25 v-14z" fill="url(#ma-sh)" />
        <path d="M109 84 l7 7 l12 -14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
