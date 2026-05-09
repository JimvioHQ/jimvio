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