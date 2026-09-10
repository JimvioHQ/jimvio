"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { jimvioStagger } from "@/lib/motion/jimvio-motion";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type SectionRevealProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "header" | "footer" | "article";
  threshold?: number;
  rootMargin?: string;
  id?: string;
  style?: CSSProperties;
  "aria-labelledby"?: string;
};

/**
 * CSS-driven once-per-viewport reveal wrapper.
 * Children marked with `jimvio-reveal-item` animate in when the section enters view.
 */
export function SectionReveal({
  children,
  className,
  as = "section",
  threshold = 0.14,
  rootMargin = "0px 0px -6% 0px",
  style,
  ...rest
}: SectionRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag = as;

  useLayoutEffect(() => {
    const section = ref.current;
    if (!section) return;

    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;

    // Mobile: show immediately — opacity-gated reveals feel like scroll lag.
    if (prefersReducedMotion() || isMobile) {
      section.dataset.reveal = "in";
      return;
    }

    section.dataset.reveal = "ready";

    const play = () => {
      section.dataset.reveal = "in";
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        play();
        observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <Tag
      ref={ref as never}
      className={cn("jimvio-reveal", className)}
      data-reveal="idle"
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

type RevealItemProps = {
  children: ReactNode;
  className?: string;
  index?: number;
  as?: ElementType;
  style?: CSSProperties;
} & HTMLAttributes<HTMLElement>;

export function RevealItem({
  children,
  className,
  index = 0,
  as: ItemTag = "div",
  style,
  ...rest
}: RevealItemProps) {
  return (
    <ItemTag
      className={cn("jimvio-reveal-item", className)}
      style={
        {
          ...style,
          ["--reveal-i" as string]: index,
          ["--reveal-stagger" as string]: `${jimvioStagger.default}ms`,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </ItemTag>
  );
}

/** Soft fade-up for a single block (header, strip, etc.) */
export function RevealBlock({
  children,
  className,
  as: ItemTag = "div",
  index = 0,
  style,
  ...rest
}: RevealItemProps) {
  return (
    <ItemTag
      className={cn("jimvio-reveal-item jimvio-reveal-block", className)}
      style={
        {
          ...style,
          ["--reveal-i" as string]: index,
          ["--reveal-stagger" as string]: `${jimvioStagger.tight}ms`,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </ItemTag>
  );
}
