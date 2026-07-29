"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, FileText, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";
import Link from "next/link";

type ReportType = "campaigns" | "creators" | "financial";
type ExportFormat = "csv" | "xlsx" | "pdf";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CampaignReportsPage() {
  const [type, setType] = useState<ReportType>("campaigns");
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => {
    if (type === "campaigns") return "Campaign Reports";
    if (type === "creators") return "Creator Reports";
    return "Financial Reports";
  }, [type]);

  const exportReport = useCallback(
    async (format: ExportFormat) => {
      setBusy(true);
      try {
        const res = await fetch(
          `/api/ugc/brand/reports/export?type=${encodeURIComponent(type)}&format=${encodeURIComponent(format)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Export failed");
        }
        const blob = await res.blob();
        const safeType = type === "financial" ? "financial" : type;
        const filename =
          format === "csv"
            ? `ugc_${safeType}_report.csv`
            : format === "xlsx"
              ? `ugc_${safeType}_report.xlsx`
              : `ugc_${safeType}_report.pdf`;
        downloadBlob(blob, filename);
        toast.success(`Exported ${title} (${format.toUpperCase()})`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Export failed");
      } finally {
        setBusy(false);
      }
    },
    [type, title],
  );

  return (
    <UGCPageShell
      title="Export Reports"
      subtitle="Download campaign, creator, and financial reports (PDF, CSV, Excel)."
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/ugc/campaign-center">Back to Campaign Center</Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">Report Type</p>
              <h2 className="mt-1 text-[18px] font-bold text-[#111827]">{title}</h2>
              <p className="mt-1 text-[13px] text-[#6B7280]">Choose an export format and download.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setType("campaigns")}
                className={
                  type === "campaigns"
                    ? "rounded-full bg-[#FF5A1F] px-4 py-2 text-[12px] font-bold text-white"
                    : "rounded-full bg-[#F3F4F6] px-4 py-2 text-[12px] font-bold text-[#374151]"
                }
              >
                <FileText className="mr-2 inline h-4 w-4" />
                Campaigns
              </button>
              <button
                type="button"
                onClick={() => setType("creators")}
                className={
                  type === "creators"
                    ? "rounded-full bg-[#FF5A1F] px-4 py-2 text-[12px] font-bold text-white"
                    : "rounded-full bg-[#F3F4F6] px-4 py-2 text-[12px] font-bold text-[#374151]"
                }
              >
                <Users className="mr-2 inline h-4 w-4" />
                Creators
              </button>
              <button
                type="button"
                onClick={() => setType("financial")}
                className={
                  type === "financial"
                    ? "rounded-full bg-[#FF5A1F] px-4 py-2 text-[12px] font-bold text-white"
                    : "rounded-full bg-[#F3F4F6] px-4 py-2 text-[12px] font-bold text-[#374151]"
                }
              >
                <Wallet className="mr-2 inline h-4 w-4" />
                Financial
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">Export Formats</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
                disabled={busy}
                onClick={() => void exportReport("csv")}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                className="rounded-xl"
                variant="outline"
                disabled={busy}
                onClick={() => void exportReport("xlsx")}
              >
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                className="rounded-xl"
                variant="outline"
                disabled={busy}
                onClick={() => void exportReport("pdf")}
              >
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[13px] text-[#6B7280]">
            Exports are generated from your owned campaigns and payout ledger.
          </p>
        </SectionCard>
      </div>
    </UGCPageShell>
  );
}

