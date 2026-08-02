"use client";

import Link from "next/link";
import { ArrowUpRight, Download, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  WalletButton,
  WalletCard,
  WalletEmptyState,
  WalletErrorState,
  WalletLoading,
  WalletPill,
  WalletSectionHeading,
  statusTone,
  useWalletFetch,
} from "./wallet-ui";

interface InvoiceRecord {
  id: string;
  number?: string;
  periodLabel?: string;
  amount: number;
  currency?: string;
  status: string;
  issuedAt: string;
  downloadUrl?: string | null;
}

interface WalletInvoicesResponse {
  currency?: string;
  invoices?: InvoiceRecord[];
}

async function handleDownload(invoice: InvoiceRecord) {
  const url = invoice.downloadUrl || `/api/wallet/os/export?format=pdf&invoiceId=${invoice.id}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `jimvio-statement-${invoice.number || invoice.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

export function WalletInvoicesClient() {
  const { status, data, error, retry } = useWalletFetch<WalletInvoicesResponse>("/api/wallet/os/invoices");
  const currency = data?.currency || "USD";
  const invoices = data?.invoices ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet OS"
        title="Invoices & statements"
        description="Monthly wallet statements and downloadable receipts for every payout."
        action={
          <Link href="/dashboard/orders">
            <WalletButton variant="outline" size="md">
              Order invoices
              <ArrowUpRight className="h-4 w-4" />
            </WalletButton>
          </Link>
        }
        className="mb-6"
      />

      {status === "loading" && <WalletLoading label="Loading statements…" />}
      {status === "error" && (
        <WalletErrorState message={error || "The invoices endpoint isn't available yet."} onRetry={retry} />
      )}
      {(status === "empty" || (status === "ready" && invoices.length === 0)) && (
        <WalletEmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No statements yet"
          description="Wallet statements are generated monthly once you have activity. Looking for a specific order receipt? Check order invoices."
        />
      )}

      {status === "ready" && invoices.length > 0 && (
        <WalletCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {["Statement", "Issued", "Amount", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9B968D] sm:px-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-black/[0.015]">
                    <td className="px-4 py-3.5 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[0.04] text-[#726D64]">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#121113]">{inv.number || inv.id}</p>
                          {inv.periodLabel && <p className="text-[10.5px] text-[#9B968D]">{inv.periodLabel}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[12.5px] text-[#726D64] sm:px-5">
                      {new Date(inv.issuedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold text-[#121113] sm:px-5">
                      {formatCurrency(inv.amount, inv.currency || currency)}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5">
                      <WalletPill tone={statusTone(inv.status)}>{inv.status}</WalletPill>
                    </td>
                    <td className="px-4 py-3.5 text-right sm:px-5">
                      <WalletButton variant="ghost" size="sm" onClick={() => handleDownload(inv)}>
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </WalletButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WalletCard>
      )}
    </div>
  );
}
