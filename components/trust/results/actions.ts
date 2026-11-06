"use client";

import { useEffect, useState } from "react";
import { reportFileName, reportHtml, shareText, type ReportDoc } from "@/lib/trust/report-doc";

/** The share link already in the address bar, when this page was itself opened from a share link. */
function currentShareLink(scanId: string): string | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const token = q.get("share");
  return token && q.get("scan") === scanId ? `${window.location.origin}/trust-checker?scan=${encodeURIComponent(scanId)}&share=${encodeURIComponent(token)}` : null;
}

async function requestShareLink(scanId: string): Promise<string | null> {
  try {
    const r = await fetch(`/api/trust-checker/scan/${encodeURIComponent(scanId)}/share`, { method: "POST", cache: "no-store" });
    const p = (await r.json().catch(() => ({}))) as { path?: string };
    return r.ok && p.path ? `${window.location.origin}${p.path}` : null;
  } catch {
    return null;
  }
}

/**
 * Share and Download Report for a result page.
 *
 * The result itself stays private: Share uses an expiring link signed by the
 * server for this scan only, never the private `?scan=` address (which only the
 * owner can open). The link is prepared in advance so the browser's share sheet
 * still opens directly from the click.
 */
export function useReportActions(doc: ReportDoc) {
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const existing = currentShareLink(doc.scanId);
    if (existing) {
      setLink(existing);
      return;
    }
    setLink(null);
    void requestShareLink(doc.scanId).then((l) => {
      if (live) setLink(l);
    });
    return () => {
      live = false;
    };
  }, [doc.scanId]);

  return {
    onShare: async (): Promise<string | null> => {
      const url = link ?? currentShareLink(doc.scanId) ?? (await requestShareLink(doc.scanId));
      if (!url) return "Couldn't share";
      if (url !== link) setLink(url);
      const text = shareText(doc);
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `Jimvio Trust Checker — ${doc.category}`, text, url });
          return null;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return null;
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        return "Link copied";
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
