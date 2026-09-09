"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";

type UseInViewOnceOptions = {
  /** IntersectionObserver threshold (0–1) */
  threshold?: number;
  /** rootMargin string, e.g. "0px 0px -8% 0px" */
  rootMargin?: string;
  /** When true, skip observation and report visible immediately */
  disabled?: boolean;
};

/**
 * Fires once when the element enters the viewport.
 * Respects prefers-reduced-motion by returning `true` immediately.
 */
export function useInViewOnce<T extends Element = HTMLElement>(
  options: UseInViewOnceOptions = {},
): [RefObject<T | null>, boolean] {
  const {
    threshold = 0.14,
    rootMargin = "0px 0px -6% 0px",
    disabled = false,
  } = options;

  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (disabled || reduced) {
      setInView(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled, reduced, rootMargin, threshold]);

  return [ref, inView];
}
