// components/layout/scroll-progress.tsx
"use client";

import { useEffect, useRef } from "react";

export function ScrollProgress() {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onScroll = () => {
            const el = barRef.current;
            if (!el) return;
            const total =
                document.documentElement.scrollHeight - window.innerHeight;
            el.style.transform = `scaleX(${total > 0 ? window.scrollY / total : 0})`;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div
            ref={barRef}
            aria-hidden="true"
            style={{
                position: "fixed",
                top: "var(--navbar-height)",
                left: 0,
                right: 0,
                height: "2px",
                background: "var(--color-primary, hsl(220 90% 55%))",
                transformOrigin: "left",
                transform: "scaleX(0)",
                zIndex: 999,
                transition: "transform 80ms linear",
                pointerEvents: "none",
            }}
        />
    );
}