"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_ROOT_MARGIN = "280px 0px";

/** Lazy-mount sections when they approach the viewport — reduces initial work. */
export function useLazyInView(rootMargin = DEFAULT_ROOT_MARGIN) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return { ref: setRef, visible };
}
