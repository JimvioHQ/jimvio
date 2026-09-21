import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Continuous Home atmosphere — one canvas behind all sections.
 * Static radial fields only (no continuous animation / no backdrop-filter).
 */
export function HomeCanvasAtmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#F8FAFC]" />
      <div
        className="absolute left-[-8%] top-[-4%] h-[min(520px,55vw)] w-[min(620px,70vw)] rounded-full opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,90,31,0.09) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute left-[22%] top-[36%] h-[min(400px,44vw)] w-[min(500px,55vw)] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,90,31,0.045) 0%, transparent 72%)",
        }}
      />
      <div
        className="absolute bottom-[16%] right-[6%] h-[min(440px,46vw)] w-[min(520px,58vw)] rounded-full opacity-55"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(17,24,39,0.03) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-6%] left-[-4%] h-[min(500px,52vw)] w-[min(580px,64vw)] rounded-full opacity-65"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,90,31,0.06) 0%, transparent 72%)",
        }}
      />
    </div>
  );
}

export function HomeCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "jimvio-home-canvas relative min-h-screen w-full max-w-[100dvw] overflow-x-hidden bg-[#F8FAFC]",
        className,
      )}
    >
      <HomeCanvasAtmosphere />
      <div className="relative z-10">{children}</div>
      <style>{HOME_CANVAS_CSS}</style>
    </div>
  );
}

const HOME_CANVAS_CSS = `
.jimvio-home-canvas > .relative > section,
.jimvio-home-canvas .jimvio-action-hub,
.jimvio-home-canvas .jimvio-journey-hub,
.jimvio-home-canvas .jimvio-how-works,
.jimvio-home-canvas .jimvio-take-everywhere,
.jimvio-home-canvas .jimvio-trusted-strip {
  background-color: transparent !important;
}
.jimvio-home-canvas .jimvio-section-bridge {
  background-image: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255,255,255,0.35) 48%,
    transparent 100%
  );
}
`;
