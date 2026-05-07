import { Eyebrow, SectionHeading } from "@/components/ui";
function CtaBlobBackground() {
    return (
        <svg
            className="pointer-events-none absolute inset-0 w-full h-full"
            viewBox="0 0 680 300"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                {/* Orange blob — top right */}
                <linearGradient id="cta-o1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fd5000" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#ff7a30" stopOpacity="0.04" />
                </linearGradient>

                {/* Orange blob — top left */}
                <linearGradient id="cta-o2" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fd5000" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#fd5000" stopOpacity="0.02" />
                </linearGradient>

                {/* Purple blob — bottom left */}
                <linearGradient id="cta-pu" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7F77DD" stopOpacity="0.11" />
                    <stop offset="100%" stopColor="#534AB7" stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {/* Large orange ellipse — top right */}
            <ellipse
                cx="620" cy="40" rx="180" ry="130"
                fill="url(#cta-o1)"
                transform="rotate(-20 620 40)"
            />

            {/* Purple ellipse — bottom left */}
            <ellipse
                cx="60" cy="260" rx="160" ry="110"
                fill="url(#cta-pu)"
                transform="rotate(15 60 260)"
            />

            {/* Organic blob — top left */}
            <path
                d="M-20,60 C80,10 200,80 160,150 C120,220 -10,190 -20,60Z"
                fill="url(#cta-o2)"
            />

            {/* Soft ellipse — bottom center */}
            <ellipse cx="340" cy="320" rx="240" ry="90" fill="#fd5000" fillOpacity="0.05" />

            {/* Triangle accents — corners */}
            <polygon points="600,0 680,0 680,90" fill="#fd5000" fillOpacity="0.06" />
            <polygon points="640,0 680,0 680,50" fill="#fd5000" fillOpacity="0.08" />
            <polygon points="0,240 0,300 70,300" fill="#534AB7" fillOpacity="0.05" />

            {/* Soft ring strokes */}
            <ellipse
                cx="340" cy="-18" rx="280" ry="100"
                fill="none" stroke="#fd5000" strokeWidth="0.8" strokeOpacity="0.10"
            />
            <ellipse
                cx="340" cy="318" rx="220" ry="80"
                fill="none" stroke="#fd5000" strokeWidth="0.6" strokeOpacity="0.08"
            />

            {/* Fine grid overlay */}
            <path
                d="M0,80 L680,80 M0,160 L680,160 M0,240 L680,240 M80,0 L80,300 M160,0 L160,300 M240,0 L240,300 M320,0 L320,300 M400,0 L400,300 M480,0 L480,300 M560,0 L560,300 M640,0 L640,300"
                stroke="#433360"
                strokeWidth="0.4"
                strokeOpacity="0.045"
                fill="none"
            />

            {/* Decorative arcs */}
            <path
                d="M580,260 Q640,200 680,230"
                fill="none" stroke="#7F77DD" strokeWidth="1.2" strokeOpacity="0.13" strokeLinecap="round"
            />
            <path
                d="M20,40 Q60,10 110,50"
                fill="none" stroke="#fd5000" strokeWidth="1.0" strokeOpacity="0.12" strokeLinecap="round"
            />

            {/* Floating accent circles */}
            <circle cx="80" cy="60" r="4.5" fill="#fd5000" fillOpacity="0.13" />
            <circle cx="580" cy="220" r="6" fill="#fd5000" fillOpacity="0.09" />
            <circle cx="30" cy="200" r="3.5" fill="#534AB7" fillOpacity="0.11" />
            <circle cx="630" cy="140" r="5" fill="#fd5000" fillOpacity="0.10" />
            <circle cx="340" cy="280" r="4" fill="#1D9E75" fillOpacity="0.09" />
            <circle cx="460" cy="18" r="3" fill="#fd5000" fillOpacity="0.16" />

            {/* Diamond accents */}
            <rect x="110" y="80" width="7" height="7" rx="1" fill="#fd5000" fillOpacity="0.13" transform="rotate(45 113 83)" />
            <rect x="520" y="220" width="6" height="6" rx="1" fill="#534AB7" fillOpacity="0.11" transform="rotate(45 523 223)" />
            <rect x="200" y="240" width="5" height="5" rx="1" fill="#fd5000" fillOpacity="0.10" transform="rotate(45 202 242)" />
        </svg>
    );
}

export function CtaSection() {
    return (
        <div className="mx-4 rounnded-xl sm:mx-6 lg:mx-8 mb-24 home-surface p-16 text-center relative overflow-hidden">
            {/* Blob SVG decoration — rendered behind all content */}

            {/* Subtle page-bg tint on top of blobs */}
            <div className="pointer-events-none absolute inset-0 home-page-bg opacity-40" />

            <CtaBlobBackground />
            {/* Content — sits above both decoration layers */}
            <div className="relative z-10">
                <Eyebrow>Start Today</Eyebrow>

                <SectionHeading>
                    Your first payout is
                    <br />
                    closer than you think.
                </SectionHeading>

                <p className="text-sm font-light text-[var(--color-text-secondary)] mb-10">
                    Join 10,000+ creators already building sustainable income on Jimvio.
                </p>

                <button className="btn-premium gradient-brand text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5">
                    Create Your Free Account
                </button>
            </div>
        </div>
    );
}