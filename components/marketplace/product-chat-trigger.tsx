"use client";

import React from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OpenProductChatDetail } from "@/components/marketplace/product-chat-widget";

/** Dispatches openProductChat so ProductChatWidget opens. Pass vendor (and optional product) to open chat with that supplier. */
export function ProductChatTrigger({
  children,
  className,
  variant,
  size,
  vendor,
  product,
  currentPath,
}: {
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  /** When provided, opens chat with this supplier (and optional product context). */
  vendor?: OpenProductChatDetail["vendor"];
  product?: OpenProductChatDetail["product"];
  currentPath?: string;
}) {
  const open = () => {
    if (vendor) {
      window.dispatchEvent(
        new CustomEvent("openProductChat", {
          detail: { vendor, product: product ?? null, currentPath } as OpenProductChatDetail,
        })
      );
    } else {
      window.dispatchEvent(new CustomEvent("openProductChat"));
    }
  };

  if (children) {
    return (
      <Button type="button" variant={variant} size={size} onClick={open} className={cn(className)}>
        {children}
      </Button>
    );
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={open} className={cn(className)}>
      <MessageCircle className="mr-2 h-4 w-4" />
      Chat with Supplier
    </Button>
  );
}
