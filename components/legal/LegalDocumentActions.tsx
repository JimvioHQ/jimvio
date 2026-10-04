"use client";

import { useState } from "react";
import { Check, Link2, Printer, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  className?: string;
  compact?: boolean;
};

export function LegalDocumentActions({ title, className, compact }: Props) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function shareDocument() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: `${title} · Jimvio`, url });
        setStatus("Shared successfully.");
        return;
      }
      await copyLink();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Unable to share. Try copying the link instead.");
    }
  }

  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setStatus("Link copied to clipboard.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus("Could not copy the link. Please copy it from the address bar.");
    }
  }

  function printDocument() {
    window.print();
    setStatus("Use your browser print dialog to save as PDF.");
  }

  const btnClass = cn(
    "inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[#111827] transition-colors",
    "hover:border-[rgba(255,90,31,0.35)] hover:bg-[rgba(255,90,31,0.04)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2",
    "dark:bg-[var(--color-surface)] dark:text-[var(--color-text-primary)]",
    compact && "w-full",
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn("flex flex-wrap gap-2", compact && "flex-col")}>
        <button type="button" onClick={printDocument} className={btnClass}>
          <Printer className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
          Print / PDF
        </button>
        <button type="button" onClick={shareDocument} className={btnClass}>
          <Share2 className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
          Share
        </button>
        <button type="button" onClick={copyLink} className={btnClass} aria-label="Copy document link">
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Link2 className="h-4 w-4 text-[#FF5A1F]" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {status && !status.includes("successfully") && status.includes("Unable") ? (
        <p className="text-xs text-red-600" role="alert">
          {status}
        </p>
      ) : null}
    </div>
  );
}
