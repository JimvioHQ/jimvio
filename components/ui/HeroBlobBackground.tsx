export function HeroBlobBackground() {
    return (
        <svg
            className="pointer-events-none absolute inset-0 w-full h-full"
            viewBox="0 0 680 480"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="blob-o1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fd5000" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#ff7a30" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="blob-o2" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fd5000" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#fd5000" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="blob-pu" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7F77DD" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#534AB7" stopOpacity="0.03" />
                </linearGradient>
                <linearGradient id="blob-tl" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.09" />
                    <stop offset="100%" stopColor="#0F6E56" stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {/* Large orange blob — top right */}
            <ellipse cx="560" cy="60" rx="200" ry="160" fill="url(#blob-o1)" transform="rotate(-18 560 60)" />

            {/* Medium orange blob — upper center */}
            <path
                d="M220,-30 C340,-60 500,20 460,110 C420,200 260,180 200,100 C140,20 100,60 220,-30Z"
                fill="url(#blob-o2)"
            />

            {/* Purple blob — left side */}
            <ellipse cx="80" cy="200" rx="160" ry="120" fill="url(#blob-pu)" transform="rotate(25 80 200)" />

            {/* Teal blob — bottom right */}
            <ellipse cx="580" cy="400" rx="180" ry="130" fill="url(#blob-tl)" transform="rotate(-12 580 400)" />

            {/* Small crisp accent blob — tight top right corner */}
            <ellipse cx="640" cy="30" rx="90" ry="70" fill="#fd5000" fillOpacity="0.08" transform="rotate(-30 640 30)" />

            {/* Soft ring stroke — orange, center top */}
            <ellipse cx="340" cy="-10" rx="260" ry="110" fill="none" stroke="#fd5000" strokeWidth="0.8" strokeOpacity="0.12" />

            {/* Geometric triangle accent — top right */}
            <polygon points="520,0 680,0 680,130" fill="#fd5000" fillOpacity="0.05" />
            <polygon points="560,0 680,0 680,80" fill="#fd5000" fillOpacity="0.07" />

            {/* Fine grid overlay */}
            <path
                d="M0,80 L680,80 M0,160 L680,160 M0,240 L680,240 M0,320 L680,320 M0,400 L680,400 M80,0 L80,480 M160,0 L160,480 M240,0 L240,480 M320,0 L320,480 M400,0 L400,480 M480,0 L480,480 M560,0 L560,480 M640,0 L640,480"
                stroke="#433360"
                strokeWidth="0.4"
                strokeOpacity="0.04"
                fill="none"
            />

            {/* Decorative arcs — lower left */}
            <path d="M-40,360 Q80,280 180,380" fill="none" stroke="#7F77DD" strokeWidth="1.2" strokeOpacity="0.14" strokeLinecap="round" />
            <path d="M-40,400 Q100,300 220,420" fill="none" stroke="#7F77DD" strokeWidth="0.7" strokeOpacity="0.09" strokeLinecap="round" />

            {/* Floating accent circles */}
            <circle cx="130" cy="50" r="5" fill="#fd5000" fillOpacity="0.12" />
            <circle cx="490" cy="310" r="7" fill="#fd5000" fillOpacity="0.09" />
            <circle cx="60" cy="390" r="4" fill="#534AB7" fillOpacity="0.10" />
            <circle cx="610" cy="180" r="6" fill="#fd5000" fillOpacity="0.11" />
            <circle cx="270" cy="430" r="5" fill="#1D9E75" fillOpacity="0.09" />
            <circle cx="400" cy="20" r="3.5" fill="#fd5000" fillOpacity="0.15" />

            {/* Diamond accents */}
            <rect x="155" y="130" width="8" height="8" rx="1" fill="#fd5000" fillOpacity="0.12" transform="rotate(45 159 134)" />
            <rect x="500" y="390" width="6" height="6" rx="1" fill="#534AB7" fillOpacity="0.12" transform="rotate(45 503 393)" />
        </svg>
    );
}