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
 * Soft layered card shell — two translucent back layers (no backdrop-filter).
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
        isHero ? "px-2 pb-1 pt-3 sm:px-2.5 sm:pt-3.5" : "px-1.5 pb-1 pt-2.5 sm:px-2 sm:pt-3",
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
          "pointer-events-none absolute left-1/2 top-[20%] -z-20 -translate-x-1/2 rounded-full blur-3xl",
          "opacity-45 transition-opacity duration-400 ease-out group-hover/stack:opacity-75",
          "motion-reduce:transition-none",
          isHero ? "h-[55%] w-[76%]" : "h-[50%] w-[70%]",
        )}
        style={{
          background: `radial-gradient(ellipse at center, color-mix(in srgb, ${accent} 26%, transparent) 0%, transparent 72%)`,
        }}
      />

      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-3 bottom-2 top-5 -z-10 rounded-[22px] sm:inset-x-3.5 sm:top-5",
          "border border-white/60 bg-white/40 shadow-[0_12px_32px_rgba(17,24,39,0.035)]",
          "origin-bottom transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-0.5 group-hover/stack:-rotate-[4deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "-rotate-[4.5deg] -translate-x-1",
        )}
      />

      <span
        aria-hidden
        className={cn(
          "jimvio-stack-layer pointer-events-none absolute inset-x-2 bottom-1.5 top-3.5 -z-10 rounded-[22px] sm:inset-x-2.5 sm:top-4",
          "border border-white/80 bg-white/65 shadow-[0_10px_28px_rgba(17,24,39,0.04)]",
          "origin-bottom transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-px group-hover/stack:rotate-[2.75deg]",
          "motion-reduce:transition-none motion-reduce:group-hover/stack:translate-y-0 motion-reduce:group-hover/stack:rotate-0",
          "rotate-[3deg] translate-x-1",
        )}
      />

      <div
        className={cn(
          "jimvio-stack-face relative z-0 h-full overflow-hidden rounded-[22px] sm:rounded-[24px]",
          "border border-[rgba(17,24,39,0.05)] bg-white",
          "shadow-[0_2px_6px_rgba(17,24,39,0.035),0_16px_40px_rgba(17,24,39,0.07)]",
          "transition-[transform,box-shadow,border-color] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/stack:-translate-y-1 group-hover/stack:shadow-[0_8px_20px_rgba(17,24,39,0.06),0_22px_44px_rgba(17,24,39,0.09)]",
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
    0 0 0 4px color-mix(in srgb, var(--stack-accent) 50%, transparent),
    0 10px 24px rgba(17,24,39,0.07),
    0 28px 56px rgba(17,24,39,0.1);
}
@media (prefers-reduced-motion: reduce) {
  .jimvio-journey-stack .jimvio-stack-layer,
  .jimvio-journey-stack .jimvio-stack-face {
    transition: none !important;
  }
}
`;
