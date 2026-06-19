"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-14 w-14",
  sm: "h-20 w-20 sm:h-28 sm:w-28",
  md: "h-32 w-32 md:h-[168px] md:w-[176px]",
} as const;

type JimvioAIMascotProps = {
  size?: keyof typeof SIZES;
  className?: string;
  showRings?: boolean;
};

export function JimvioAIMascot({
  size = "md",
  className,
  showRings = true,
}: JimvioAIMascotProps) {
  return (
    <div
      className={cn(
        "relative max-w-full select-none overflow-hidden",
        SIZES[size],
        className
      )}
      aria-hidden
    >
      {showRings && (
        <>
          <span className="pointer-events-none absolute bottom-0 left-1/2 h-10 w-[72%] -translate-x-1/2 rounded-[100%] bg-[#fd5000]/30 blur-2xl" />
          <span className="pointer-events-none absolute left-1/2 top-[58%] h-[40%] w-[76%] -translate-x-1/2 rounded-[100%] border border-[#fd5000]/18" />
          <span className="pointer-events-none absolute left-1/2 top-[58%] h-[40%] w-[76%] -translate-x-1/2 animate-spin rounded-[100%] border border-dashed border-[#fd5000]/14 [animation-duration:22s]" />
          <span className="pointer-events-none absolute right-[14%] top-[10%] size-1 rounded-full bg-[#fd5000]/80" />
          <span className="pointer-events-none absolute left-[10%] top-[28%] size-1.5 rounded-full bg-[#ff8c42]/70" />
          <span className="pointer-events-none absolute right-[22%] top-[36%] size-1 rounded-full bg-[#fd5000]/55" />
        </>
      )}

      <motion.div
        className="pointer-events-none relative z-10 h-full w-full"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/hero/jimvio-ai-mascot-cutout.png"
          alt=""
          width={352}
          height={352}
          priority={size === "md"}
          draggable={false}
          className="pointer-events-none h-full w-full select-none object-contain object-bottom [filter:drop-shadow(0_12px_28px_rgba(253,80,0,0.32))] [-webkit-user-drag:none]"
        />
      </motion.div>
    </div>
  );
}
