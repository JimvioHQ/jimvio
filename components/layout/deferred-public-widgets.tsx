"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ProductChatWidgetLoader = dynamic(
  () =>
    import("@/components/marketplace/product-chat-widget-loader").then((m) => ({
      default: m.ProductChatWidgetLoader,
    })),
  { ssr: false },
);

export function DeferredPublicWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 1500);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) return null;

  return (
    <>
      <ProductChatWidgetLoader />
    </>
  );
}
