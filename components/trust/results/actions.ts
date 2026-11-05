"use client";

import { reportFileName, reportHtml, shareText, type ReportDoc } from "@/lib/trust/report-doc";

/** Share and Download Report for a result page. */
export function useReportActions(doc: ReportDoc) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/trust-checker?scan=${encodeURIComponent(doc.scanId)}` : "";
  return {
    onShare: async (): Promise<string | null> => {
      const text = shareText(doc);
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `Jimvio Trust Checker — ${doc.category}`, text, url: link });
          return null;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return null;
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${link}`);
        return "Copied";
      } catch {
        return "Couldn't copy";
      }
    },
    onDownload: () => {
      const blob = new Blob([reportHtml(doc)], { type: "text/html;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = reportFileName(doc);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    },
  };
}
