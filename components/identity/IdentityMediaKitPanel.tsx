"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { IdentityButton, IdentityCard, IdentitySectionHeading } from "@/components/identity/identity-ui";

const INCLUDES = [
  "Headline, bio and creator level badges",
  "Trust, AI and reputation scores + response time",
  "Social reach across every connected platform",
  "Cross-surface earnings summary (UGC, affiliate, marketplace)",
  "Portfolio highlights",
  "Verified testimonials and reviews",
  "Contact & profile link",
];

export function IdentityMediaKitPanel({ username, displayName }: { username: string; displayName: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/identity/media-kit?username=${encodeURIComponent(username)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to generate media kit");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jimvio-media-kit-${username}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate media kit");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5">
      <IdentityCard className="relative overflow-hidden p-6">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.14),transparent_70%)]" />
        <IdentitySectionHeading
          eyebrow="Shareable"
          title="Media kit"
          description={`A branded, one-page PDF summary of ${displayName}'s Jimvio profile — ready to send to brands and partners.`}
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <IdentityButton onClick={handleDownload} loading={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </IdentityButton>
          {error && <p className="text-[12px] text-[#C23A2F]">{error}</p>}
        </div>
      </IdentityCard>

      <IdentityCard className="p-5">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">
          <FileText className="h-3.5 w-3.5" /> What&apos;s included
        </p>
        <ul className="space-y-2">
          {INCLUDES.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#3E3A34]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1C8A44]" />
              {item}
            </li>
          ))}
        </ul>
      </IdentityCard>
    </div>
  );
}
