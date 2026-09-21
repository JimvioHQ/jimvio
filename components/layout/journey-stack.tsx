import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type JourneyStackProps = {
  accent: string;
  children: ReactNode;
  className?: string;
  density?: "hero" | "compact";
  style?: CSSProperties;
};

/**
 * Art-directed translucent layer stack used by Home journey cards.
 * Back layers fan behind a smaller face so the stack reads as a physical object.
 */
export function JourneyStack({
  accent,
  children,
  className,
  density = "hero",
  style,
}: JourneyStackProps) {
  const isHero = density === "hero";

  return (
    <div
      className={cn(
        "jimvio-journey-stack group/stack relative isolate h-full",
        isHero ? "px-2.5 pb-1.5 pt-4 sm:px-3.5 sm:pt-5" : "px-2 pb-1 pt-3.5 sm:px-3 sm:pt-4",
        className,
      )}
      style={
        {
          ["--stack-accent" as string]: accent,
          ...style,
        } as CSSProperties
      }
    >
      {/* Soft accent glow */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-[18%] -z-20 -translate-x-1/2 rounded-full blur-3xl",
          "opacity-55 transition-opacity duration-500 ease-out group-hover/stack:opacity-95",
          "motion-reduce:transition-none",
          isHero ? "h-[62%] w-[82%]" : "h-[56%] w-[76%]",
        )}
        style={{
          background: `radial-gradient(ellipse at center, color-mix(in srgb, ${accent} 34%, transparent) 0%, transparent 72%)`,
        }}
      />

      {/* Far back layer */}
      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-4 bottom-3 top-7 -z-10 rounded-[28px] sm:inset-x-5 sm:top-8",
          "border border-white/50 bg-white/30 shadow-[0_18px_44px_rgba(17,24,39,0.045)]",
          "backdrop-blur-[6px]",
          "origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-1.5 group-hover/stack:-rotate-[7deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "-rotate-[6deg] -translate-x-1.5",
        )}
      />

      {/* Mid layer */}
      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-3 bottom-2 top-4.5 -z-10 rounded-[28px] sm:inset-x-3.5 sm:top-5",
          "border border-white/70 bg-white/45 shadow-[0_14px_40px_rgba(17,24,39,0.05)]",
          "backdrop-blur-[8px]",
          "origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-1 group-hover/stack:rotate-[5deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "rotate-[4.5deg] translate-x-1.5",
        )}
      />

      {/* Near back layer — subtle peek */}
      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-2 bottom-1 top-3 -z-10 rounded-[28px] sm:inset-x-2.5 sm:top-3.5",
          "border border-white/80 bg-white/60 shadow-[0_10px_32px_rgba(17,24,39,0.05)]",
          "backdrop-blur-[10px]",
          "origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-0.5 group-hover/stack:rotate-[1.5deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "rotate-[1.25deg]",
        )}
      />

      {/* Front surface */}
      <div
        className={cn(
          "jimvio-stack-face relative z-0 h-full overflow-hidden rounded-[26px] sm:rounded-[28px]",
          "border border-[rgba(17,24,39,0.055)] bg-white/95",
          "shadow-[0_2px_8px_rgba(17,24,39,0.04),0_22px_56px_rgba(17,24,39,0.085)]",
          "transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-2 group-hover/stack:shadow-[0_12px_28px_rgba(17,24,39,0.08),0_36px_72px_rgba(17,24,39,0.13)]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const JOURNEY_STACK_CSS = `
.jimvio-action-hub .grid,
.jimvio-journey-hub .grid {
  overflow: visible;
}
.jimvio-journey-stack:focus-within .jimvio-stack-face {
  outline: none;
  box-shadow:
    0 0 0 2px #F8FAFC,
    0 0 0 4px color-mix(in srgb, var(--stack-accent) 55%, transparent),
    0 12px 28px rgba(17,24,39,0.08),
    0 36px 72px rgba(17,24,39,0.13);
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-journey-stack .jimvio-stack-layer,
  .jimvio-journey-stack .jimvio-stack-face {
    transition: none !important;
  }
}
`;
