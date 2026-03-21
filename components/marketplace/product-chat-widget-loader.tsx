"use client";

import dynamic from "next/dynamic";

const ProductChatWidget = dynamic(
  () => import("@/components/marketplace/product-chat-widget").then((m) => ({ default: m.ProductChatWidget })),
  { ssr: false }
);

export function ProductChatWidgetLoader() {
  return <ProductChatWidget />;
}
