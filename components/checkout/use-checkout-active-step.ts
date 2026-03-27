"use client";

import { useLayoutEffect, useState, useRef } from "react";

/** Scroll-spy: which checkout section is in view (Shipping / Payment / Review). */
export function useCheckoutScrollStep() {
  const shippingRef = useRef<HTMLElement>(null);
  const paymentRef = useRef<HTMLElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  useLayoutEffect(() => {
    const mapped: { el: HTMLElement | null; step: 1 | 2 | 3 }[] = [
      { el: shippingRef.current, step: 1 },
      { el: paymentRef.current, step: 2 },
      { el: reviewRef.current, step: 3 },
    ];
    const nodes = mapped.filter((m) => m.el) as { el: HTMLElement; step: 1 | 2 | 3 }[];
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio > 0.15)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!hit?.target) return;
        const id = hit.target.getAttribute("data-checkout-step");
        if (id === "payment") setActiveStep(2);
        else if (id === "review") setActiveStep(3);
        else setActiveStep(1);
      },
      { root: null, rootMargin: "-10% 0px -45% 0px", threshold: [0, 0.15, 0.35, 0.55] }
    );

    nodes.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return { activeStep, shippingRef, paymentRef, reviewRef };
}
