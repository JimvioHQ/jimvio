import React from "react";

// For empty search results — magnifying glass over a void
export function EmptySearchIllustration() {
    return (
        <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <defs>
                <radialGradient id="search-void" cx="0.5" cy="0.5">
                    <stop offset="0%" stopColor="var(--color-text-muted)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--color-text-muted)" stopOpacity="0" />
                </radialGradient>
            </defs>
            {/* The void being searched */}
            <ellipse cx="120" cy="100" rx="80" ry="40" fill="url(#search-void)" />
            <ellipse cx="120" cy="100" rx="80" ry="40" fill="none" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 4" />

            {/* Tilted magnifying glass */}
            <g transform="translate(120 90) rotate(-18)">
                <circle cx="0" cy="0" r="32" fill="var(--color-bg)" stroke="var(--color-text-secondary)" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="32" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeOpacity="0.3" />
                {/* Highlight on glass */}
                <path d="M -20 -15 A 25 25 0 0 1 -10 -25" fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeOpacity="0.15" strokeLinecap="round" />
                {/* Handle */}
                <line x1="22" y1="22" x2="48" y2="48" stroke="var(--color-text-secondary)" strokeWidth="5" strokeLinecap="round" />
                <line x1="22" y1="22" x2="48" y2="48" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
            </g>

            {/* Tiny scattered dots — things that aren't what you're looking for */}
            <circle cx="40" cy="50" r="2" fill="var(--color-text-muted)" opacity="0.3" />
            <circle cx="200" cy="55" r="1.5" fill="var(--color-text-muted)" opacity="0.3" />
            <circle cx="60" cy="150" r="1.5" fill="var(--color-text-muted)" opacity="0.25" />
            <circle cx="190" cy="145" r="2" fill="var(--color-text-muted)" opacity="0.25" />
        </svg>
    );
}


export function EmptyBoxIllustration() {
    return (
        <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            {/* Floor shadow */}
            <ellipse cx="120" cy="155" rx="60" ry="6" fill="var(--color-text-muted)" opacity="0.15" />

            {/* Box — slightly tilted, opened */}
            <g transform="translate(120 95) rotate(-3)">
                {/* Back flaps (open) */}
                <path d="M -52 -28 L -38 -52 L 38 -52 L 52 -28 Z" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1" />
                {/* Box body */}
                <path d="M -52 -28 L 52 -28 L 48 48 L -48 48 Z" fill="var(--color-bg)" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeOpacity="0.4" />
                {/* Inside — darker */}
                <path d="M -52 -28 L 52 -28 L 48 -20 L -48 -20 Z" fill="var(--color-text-muted)" fillOpacity="0.15" />
                {/* Front flap (open, slightly down) */}
                <path d="M -52 -28 L -42 -8 L 42 -8 L 52 -28 Z" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1" />
                {/* Tape strip */}
                <line x1="-15" y1="-50" x2="-15" y2="-28" stroke="var(--color-accent)" strokeWidth="3" strokeOpacity="0.4" />
            </g>

            {/* Floating question mark above */}
            <text x="120" y="40" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--color-text-muted)" opacity="0.4" fontFamily="ui-sans-serif, system-ui, sans-serif">?</text>
        </svg>
    );
}

export function LostMapIllustration() {
    return (
        <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <defs>
                <linearGradient id="path-fade-default" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="1" />
                    <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d="M 20 140 Q 60 130, 90 110 T 160 90" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" opacity="0.4" />
            <path d="M 160 90 Q 200 80, 230 95 T 290 105" fill="none" stroke="url(#path-fade-default)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="140" r="4" fill="var(--color-text-muted)" opacity="0.5" />
            <circle cx="20" cy="140" r="2" fill="var(--color-surface)" />
            <g transform="translate(160 90) rotate(-12)">
                <ellipse cx="0" cy="14" rx="10" ry="2.5" fill="var(--color-text-muted)" opacity="0.2" />
                <path d="M 0 -22 C -8 -22, -12 -16, -12 -10 C -12 -2, 0 12, 0 12 C 0 12, 12 -2, 12 -10 C 12 -16, 8 -22, 0 -22 Z" fill="var(--color-accent)" />
                <circle cx="0" cy="-11" r="4" fill="var(--color-surface)" />
            </g>
            <text x="270" y="115" fontSize="24" fontWeight="800" fill="var(--color-text-muted)" opacity="0.25" fontFamily="ui-sans-serif, system-ui, sans-serif">?</text>
        </svg>
    );
}

export function ProductsShelfIllustration() {
    return (
        <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <rect x="30" y="70" width="180" height="8" rx="2" fill="var(--color-border)" />
            <rect x="30" y="110" width="180" height="8" rx="2" fill="var(--color-border)" />
            <rect x="48" y="42" width="36" height="28" rx="4" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="4 3" />
            <rect x="102" y="42" width="36" height="28" rx="4" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="4 3" />
            <rect x="156" y="42" width="36" height="28" rx="4" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="120" cy="145" r="18" fill="var(--color-accent)" fillOpacity="0.12" />
            <path d="M120 133v24M108 145h24" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

export function OrdersIllustration() {
    return (
        <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <ellipse cx="120" cy="152" rx="52" ry="5" fill="var(--color-text-muted)" opacity="0.12" />
            <rect x="72" y="38" width="96" height="112" rx="6" fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="1.5" />
            <line x1="88" y1="62" x2="152" y2="62" stroke="var(--color-border)" strokeWidth="1.5" />
            <line x1="88" y1="78" x2="140" y2="78" stroke="var(--color-text-muted)" strokeWidth="1.5" opacity="0.35" />
            <line x1="88" y1="92" x2="148" y2="92" stroke="var(--color-text-muted)" strokeWidth="1.5" opacity="0.35" />
            <line x1="88" y1="106" x2="132" y2="106" stroke="var(--color-text-muted)" strokeWidth="1.5" opacity="0.35" />
            <circle cx="152" cy="128" r="14" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="1.5" strokeOpacity="0.5" />
            <path d="M146 128l4 4 8-8" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
    );
}

export function CampaignsIllustration() {
    return (
        <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <ellipse cx="120" cy="148" rx="48" ry="5" fill="var(--color-text-muted)" opacity="0.12" />
            <path d="M52 118 L52 72 Q52 58 66 58 H138 Q152 58 152 72 V96 L188 108 V84 Q188 70 174 70 H152" fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
            <rect x="52" y="58" width="100" height="60" rx="8" fill="var(--color-surface)" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeOpacity="0.35" />
            <circle cx="78" cy="88" r="10" fill="var(--color-accent)" fillOpacity="0.15" />
            <path d="M74 88h8M78 84v8" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            <path d="M100 82h40M100 94h28" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
    );
}

export function MessagesIllustration() {
    return (
        <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <rect x="58" y="48" width="124" height="84" rx="12" fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth="1.5" />
            <path d="M82 132 L98 118 H170 Q182 118 182 106 V58 Q182 46 170 46 H70 Q58 46 58 58 V106 Q58 118 70 118 H82 Z" fill="var(--color-surface)" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeOpacity="0.3" />
            <circle cx="92" cy="82" r="4" fill="var(--color-text-muted)" opacity="0.35" />
            <circle cx="108" cy="82" r="4" fill="var(--color-text-muted)" opacity="0.35" />
            <circle cx="124" cy="82" r="4" fill="var(--color-text-muted)" opacity="0.35" />
        </svg>
    );
}

export function OfflineIllustration() {
    return (
        <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden>
            <circle cx="120" cy="88" r="44" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
            <path d="M88 108 Q120 72 152 108" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
            <path d="M98 98 Q120 82 142 98" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            <circle cx="120" cy="118" r="3" fill="var(--color-text-muted)" opacity="0.45" />
            <line x1="76" y1="64" x2="164" y2="112" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="164" cy="112" r="3" fill="var(--color-accent)" />
            <text x="120" y="158" textAnchor="middle" fontSize="7" fill="var(--color-text-muted)" opacity="0.5" fontFamily="ui-monospace, monospace">NO_SIGNAL</text>
        </svg>
    );
}