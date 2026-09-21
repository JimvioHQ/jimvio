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
 * Layers use opacity (not backdrop-filter) for performance across many cards.
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
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-[18%] -z-20 -translate-x-1/2 rounded-full blur-3xl",
          "opacity-50 transition-opacity duration-500 ease-out group-hover/stack:opacity-85",
          "motion-reduce:transition-none",
          isHero ? "h-[62%] w-[82%]" : "h-[56%] w-[76%]",
        )}
        style={{
          background: `radial-gradient(ellipse at center, color-mix(in srgb, ${accent} 30%, transparent) 0%, transparent 72%)`,
        }}
      />

      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-4 bottom-3 top-7 -z-10 rounded-[28px] sm:inset-x-5 sm:top-8",
          "border border-white/55 bg-white/35 shadow-[0_18px_44px_rgba(17,24,39,0.04)]",
          "origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-1.5 group-hover/stack:-rotate-[6.5deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "-rotate-[5.5deg] -translate-x-1.5",
        )}
      />

      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-3 bottom-2 top-5 -z-10 rounded-[28px] sm:inset-x-3.5 sm:top-5",
          "border border-white/70 bg-white/50 shadow-[0_14px_40px_rgba(17,24,39,0.045)]",
          "origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-1 group-hover/stack:rotate-[4.5deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "rotate-[4deg] translate-x-1.5",
        )}
      />

      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-2 bottom-1 top-3 -z-10 rounded-[28px] sm:inset-x-2.5 sm:top-3.5",
          "border border-white/85 bg-white/70 shadow-[0_10px_32px_rgba(17,24,39,0.045)]",
          "origin-bottom transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-0.5 group-hover/stack:rotate-[1.25deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "rotate-[1.1deg]",
        )}
      />

      <div
        className={cn(
          "jimvio-stack-face relative z-0 h-full overflow-hidden rounded-[26px] sm:rounded-[28px]",
          "border border-[rgba(17,24,39,0.055)] bg-white",
          "shadow-[0_2px_8px_rgba(17,24,39,0.04),0_22px_56px_rgba(17,24,39,0.08)]",
          "transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-[6px] group-hover/stack:shadow-[0_12px_28px_rgba(17,24,39,0.08),0_36px_72px_rgba(17,24,39,0.12)]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const JOURNEY_STACK_CSS = `
.jimvio-action-hub .jimvio-story-stack,
.jimvio-journey-hub .jimvio-story-stack,
.jimvio-how-works .jimvio-story-stack {
  overflow: visible;
}
.jimvio-journey-stack:focus-within .jimvio-stack-face {
  outline: none;
  box-shadow:
    0 0 0 2px #F8FAFC,
    0 0 0 4px color-mix(in srgb, var(--stack-accent) 55%, transparent),
    0 12px 28px rgba(17,24,39,0.08),
    0 36px 72px rgba(17,24,39,0.12);
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-journey-stack .jimvio-stack-layer,
  .jimvio-journey-stack .jimvio-stack-face {
    transition: none !important;
  }
}
`;
