"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shares the current page (native share sheet, or copies the link). */
export function ShareLinkButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled the share sheet */
    }
  }
  return (
    <Button type="button" variant="outline" onClick={() => void share()} className={className}>
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
