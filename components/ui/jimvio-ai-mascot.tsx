"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-14 w-14",
  sm: "h-20 w-20 sm:h-28 sm:w-28",
  md: "h-32 w-32 md:h-[168px] md:w-[176px]",
  hero: "h-56 w-56 sm:h-64 sm:w-64 md:h-80 md:w-80 lg:h-[480px] lg:w-[480px] xl:h-[540px] xl:w-[540px]",
} as const;

const PARTICLE_SEEDS = [
  { x: "12%", y: "18%", delay: 0, duration: 7 },
  { x: "78%", y: "12%", delay: 1.2, duration: 8.5 },
  { x: "88%", y: "42%", delay: 0.6, duration: 6.5 },
  { x: "6%", y: "52%", delay: 2.1, duration: 9 },
  { x: "62%", y: "8%", delay: 1.8, duration: 7.5 },
  { x: "34%", y: "72%", delay: 0.9, duration: 8 },
  { x: "92%", y: "68%", delay: 2.4, duration: 6.8 },
  { x: "18%", y: "82%", delay: 1.5, duration: 7.2 },
] as const;

type JimvioAIMascotProps = {
  size?: keyof typeof SIZES;
  className?: string;
  showRings?: boolean;
  /** Disable bob animation — for inline header lockups */
  motionless?: boolean;
};

function OrbitRing({
  className,
  ringClassName,
  duration,
  reverse,
  reduced,
}: {
  className: string;
  ringClassName: string;
  duration: number;
  reverse?: boolean;
  reduced: boolean;
}) {
  return (
    <span className={cn("pointer-events-none absolute left-1/2 -translate-x-1/2", className)}>
      <motion.span
        className={cn("block h-full w-full rounded-[100%] border", ringClassName)}
        animate={reduced ? undefined : { rotate: reverse ? -360 : 360 }}
        transition={reduced ? undefined : { duration, repeat: Infinity, ease: "linear" }}
      />
    </span>
  );
}

function FloatingParticles({ reduced }: { reduced: boolean }) {
  if (reduced) return null;

  return (
    <>
      {PARTICLE_SEEDS.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute size-1 rounded-full bg-[var(--color-accent)]/70"
          style={{ left: p.x, top: p.y }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.25, 0.7, 0.25],
            scale: [0.85, 1, 0.85],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </>
  );
}

function SparkleBurst({ reduced }: { reduced: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) return;

    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 2200 + Math.random() * 3800;
      timeout = setTimeout(() => {
        setVisible(true);
        setTimeout(() => {
          setVisible(false);
          schedule();
        }, 700);
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [reduced]);

  if (reduced || !visible) return null;

  const left = 20 + Math.random() * 60;
  const top = 10 + Math.random() * 55;

  return (
    <motion.span
      className="pointer-events-none absolute z-20 text-[var(--color-accent)]"
      style={{ left: `${left}%`, top: `${top}%` }}
      initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.5], rotate: 45 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.09 9.91L24 12L14.09 14.09L12 24L9.91 14.09L0 12L9.91 9.91L12 0Z" />
      </svg>
    </motion.span>
  );
}

function EarGlowPulse({ reduced }: { reduced: boolean }) {
  if (reduced) return null;

  return (
    <>
      <motion.span
        className="pointer-events-none absolute left-[18%] top-[14%] z-[5] h-3 w-3 rounded-full bg-[var(--color-accent)]/60 blur-md"
        animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.span
        className="pointer-events-none absolute right-[18%] top-[14%] z-[5] h-3 w-3 rounded-full bg-[var(--color-accent)]/60 blur-md"
        animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        aria-hidden
      />
    </>
  );
}

function BlinkOverlay({ reduced }: { reduced: boolean }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduced) return;

    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 4000 + Math.random() * 4000;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          schedule();
        }, 120);
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [reduced]);

  if (reduced) return null;

  return (
    <motion.span
      className="pointer-events-none absolute left-[30%] top-[22%] z-20 h-[7%] w-[40%] rounded-full bg-[#ff8c42]/20"
      style={{ transformOrigin: "center center" }}
      animate={{ scaleY: blink ? 0.85 : 0, opacity: blink ? 0.5 : 0 }}
      transition={{ duration: 0.1, ease: "easeInOut" }}
      aria-hidden
    />
  );
}

export function JimvioAIMascot({
  size = "md",
  className,
  showRings = true,
  motionless = false,
}: JimvioAIMascotProps) {
  const prefersReducedMotion = useReducedMotion();
  const reduced = motionless || !!prefersReducedMotion;

  const floatTransition = useMemo(
    () => ({
      y: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
      scale: { duration: 4.2, repeat: Infinity, ease: "easeInOut" as const },
      rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" as const },
    }),
    [],
  );

  return (
    <div
      className={cn(
        "pointer-events-none relative max-w-full select-none",
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {/* Ambient glow pulse — opacity only */}
      {!motionless && (
        <motion.span
          className="pointer-events-none absolute bottom-[8%] left-1/2 z-0 h-[38%] w-[82%] -translate-x-1/2 rounded-[100%] bg-[var(--color-accent)]/28 blur-3xl will-change-[opacity,transform]"
          animate={reduced ? undefined : { opacity: [0.35, 0.55, 0.35], scale: [0.96, 1.04, 0.96] }}
          transition={reduced ? undefined : { duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Soft ambient light drift */}
      {!motionless && !reduced && (
        <motion.span
          className="pointer-events-none absolute left-[20%] top-[30%] z-0 h-[40%] w-[50%] rounded-[100%] bg-[#ff8c42]/16 blur-3xl will-change-[opacity,transform]"
          animate={{ x: [0, 12, -8, 0], y: [0, -10, 6, 0], opacity: [0.2, 0.4, 0.25, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {showRings && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[2%] z-[1] h-[42%]">
          <span className="absolute bottom-0 left-1/2 h-[72%] w-[88%] -translate-x-1/2 rounded-[100%] border border-[var(--color-accent)]/20" />
          <OrbitRing
            className="bottom-[6%] h-[78%] w-[92%]"
            ringClassName="border-dashed border-[var(--color-accent)]/22"
            duration={24}
            reduced={reduced}
          />
          <OrbitRing
            className="bottom-[2%] h-[86%] w-[98%]"
            ringClassName="border-[var(--color-accent)]/14"
            duration={32}
            reverse
            reduced={reduced}
          />
          <OrbitRing
            className="bottom-[10%] h-[64%] w-[76%]"
            ringClassName="border-[#ff8c42]/18"
            duration={18}
            reduced={reduced}
          />
        </div>
      )}

      <FloatingParticles reduced={reduced || motionless} />
      <SparkleBurst reduced={reduced || motionless} />

      <div className="relative z-10 h-full w-full overflow-visible">
        <motion.div
          className="pointer-events-none relative h-full w-full will-change-transform"
          animate={
            reduced
              ? undefined
              : {
                  y: [0, -5, 0],
                  scale: [1, 1.015, 1],
                  rotate: [-0.8, 0.8, -0.8],
                }
          }
          transition={reduced ? undefined : floatTransition}
        >
          <Image
            src="/hero/jimvio-ai-mascot-cutout.png"
            alt=""
            width={540}
            height={540}
            quality={92}
            priority={size === "md" || size === "hero"}
            sizes={
              size === "hero"
                ? "(max-width: 1024px) 280px, 480px"
                : size === "md"
                  ? "(max-width: 768px) 128px, 176px"
                  : "(max-width: 640px) 80px, 112px"
            }
            draggable={false}
            className={cn(
              "pointer-events-none h-full w-full select-none object-contain object-bottom [-webkit-user-drag:none] [transform:translateZ(0)]",
              motionless
                ? "[filter:drop-shadow(0_3px_8px_rgba(253,80,0,0.18))]"
                : "[filter:drop-shadow(0_14px_32px_rgba(253,80,0,0.22))]",
            )}
          />
          <BlinkOverlay reduced={reduced || motionless} />
          <EarGlowPulse reduced={reduced || motionless} />
        </motion.div>
      </div>
    </div>
  );
}
