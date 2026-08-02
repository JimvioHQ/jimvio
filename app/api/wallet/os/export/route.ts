import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getWalletOsOverview } from "@/lib/wallet-os/overview";
import { getWalletOsLedger } from "@/lib/wallet-os/ledger";
import { buildWalletStatementPdf } from "@/lib/wallet-os/statement-pdf";
import type { LedgerEntry } from "@/lib/wallet-os/types";

export const dynamic = "force-dynamic";

const CSV_COLUMNS: Array<keyof LedgerEntry> = [
  "createdAt",
  "surface",
  "type",
  "title",
  "direction",
  "amount",
  "currency",
  "status",
  "reference",
];

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return (buf.buffer as ArrayBuffer).slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const format = (req.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();

  try {
    const [overview, ledgerPage] = await Promise.all([
      getWalletOsOverview(user.id),
      getWalletOsLedger(user.id, { limit: 100 }),
    ]);

    if (format === "csv") {
      const header = CSV_COLUMNS.join(",");
      const body = ledgerPage.entries.map((entry) => CSV_COLUMNS.map((c) => csvEscape(entry[c])).join(",")).join("\n");
      const csv = `${header}\n${body}\n`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="jimvio-wallet-statement.csv"',
        },
      });
    }

    if (format === "pdf") {
      const buffer = await buildWalletStatementPdf({
        accountName: user.email ?? user.id,
        overview,
        ledger: ledgerPage.entries,
      });
      return new NextResponse(bufferToArrayBuffer(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="jimvio-wallet-statement.pdf"',
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (err) {
    console.error("GET /api/wallet/os/export failed", err);
    return NextResponse.json({ error: "Failed to export wallet statement" }, { status: 500 });
  }
}
