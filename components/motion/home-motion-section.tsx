"use client";

import type { ReactNode } from "react";
import { RevealItem, SectionReveal } from "@/components/motion/section-reveal";

/** Soft once-on-view wrap for homepage sections that are not self-animated. */
export function HomeMotionSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SectionReveal as="div" className={className} threshold={0.1}>
      <RevealItem index={0}>{children}</RevealItem>
    </SectionReveal>
  );
}
