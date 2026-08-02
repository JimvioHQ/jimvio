import { createPdfDocument, type PdfDocumentInstance } from "@/lib/pdf/pdfkit-server";
import { PDF_FONT_BOLD, PDF_FONT_REGULAR, resetPdfCursor, sanitizePdfText } from "@/lib/pdf/export-fonts";
import type { LedgerEntry, WalletOsOverview } from "@/lib/wallet-os/types";

const MARGIN = 50;
const BRAND = "#FF5A1F";
const INK = "#111111";
const MUTED = "#6b7280";
const FOOTER_ZONE = 48;

function s(value: string): string {
  return sanitizePdfText(value);
}

function fmt(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

function contentBottom(doc: PdfDocumentInstance): number {
  return doc.page.height - doc.page.margins.bottom - FOOTER_ZONE;
}

export interface WalletStatementInput {
  accountName: string;
  overview: WalletOsOverview;
  ledger: LedgerEntry[];
  generatedAt?: Date;
}

/** Builds a branded Jimvio Wallet OS statement PDF (balances + recent ledger). */
export function buildWalletStatementPdf(input: WalletStatementInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createPdfDocument({ margin: MARGIN, size: "A4", bufferPages: true, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const rightX = left + pageWidth;
    const bottom = contentBottom(doc);
    const { overview } = input;

    doc.font(PDF_FONT_BOLD).fontSize(22).fillColor(BRAND).text("Jimvio Wallet");
    doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED).text(s("Wallet OS Statement"));
    doc.moveDown(0.6);

    const generatedAt = input.generatedAt ?? new Date();
    doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED);
    doc.text(s(`Account: ${input.accountName}`));
    doc.text(s(`Generated: ${generatedAt.toLocaleString()}`));
    doc.moveDown(1);

    doc.font(PDF_FONT_BOLD).fontSize(13).fillColor(INK).text("Balance Summary");
    doc.moveDown(0.4);

    const balanceRows: Array<[string, string]> = [
      ["Available balance", fmt(overview.available, overview.currency)],
      ["Pending balance", fmt(overview.pending, overview.currency)],
      ["Locked balance", fmt(overview.locked, overview.currency)],
      ["Escrow balance", fmt(overview.escrow, overview.currency)],
      ["Rewards balance", fmt(overview.rewards, overview.currency)],
      ["Total earned", fmt(overview.totalEarned, overview.currency)],
      ["Total paid out", fmt(overview.totalPaid, overview.currency)],
    ];

    const colValue = left + pageWidth * 0.6;
    let y = doc.y;
    for (const [label, value] of balanceRows) {
      doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED).text(s(label), left, y, { width: pageWidth * 0.55 });
      doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(INK).text(s(value), colValue, y, { width: pageWidth * 0.4, align: "right" });
      y += 18;
    }
    doc.y = y;
    doc.moveDown(1);

    doc.font(PDF_FONT_BOLD).fontSize(13).fillColor(INK).text("Recent Activity");
    doc.moveDown(0.4);

    const colDate = left;
    const colDesc = left + pageWidth * 0.22;
    const colSurface = left + pageWidth * 0.62;
    const colAmount = left + pageWidth * 0.8;

    const paintHeader = (headerY: number) => {
      doc.font(PDF_FONT_BOLD).fontSize(8).fillColor(MUTED);
      doc.text("DATE", colDate, headerY, { width: 90 });
      doc.text("DESCRIPTION", colDesc, headerY, { width: pageWidth * 0.38 });
      doc.text("MODULE", colSurface, headerY, { width: pageWidth * 0.16 });
      doc.text("AMOUNT", colAmount, headerY, { width: pageWidth * 0.2, align: "right" });
      doc.moveTo(colDate, headerY + 14).lineTo(rightX, headerY + 14).strokeColor(INK).lineWidth(1).stroke();
      return headerY + 20;
    };

    let rowY = paintHeader(doc.y);

    for (const entry of input.ledger) {
      if (rowY + 16 > bottom) {
        doc.addPage({ size: "A4", margin: MARGIN });
        resetPdfCursor(doc);
        rowY = paintHeader(doc.page.margins.top);
      }

      const dateLabel = new Date(entry.createdAt).toLocaleDateString();
      const amountLabel = `${entry.direction === "debit" ? "-" : "+"}${entry.amount.toFixed(2)} ${entry.currency}`;

      doc.font(PDF_FONT_REGULAR).fontSize(9).fillColor(MUTED).text(s(dateLabel), colDate, rowY, { width: 90 });
      doc.font(PDF_FONT_REGULAR).fontSize(9).fillColor(INK).text(s(entry.title), colDesc, rowY, { width: pageWidth * 0.38 });
      doc.font(PDF_FONT_REGULAR).fontSize(9).fillColor(MUTED).text(s(entry.surface), colSurface, rowY, { width: pageWidth * 0.16 });
      doc
        .font(PDF_FONT_BOLD)
        .fontSize(9)
        .fillColor(entry.direction === "debit" ? "#dc2626" : "#16a34a")
        .text(s(amountLabel), colAmount, rowY, { width: pageWidth * 0.2, align: "right" });

      rowY += 16;
    }

    const range = doc.bufferedPageRange();
    if (range.count > 0) {
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const footerY = doc.page.height - doc.page.margins.bottom - 28;
        doc
          .font(PDF_FONT_REGULAR)
          .fontSize(8)
          .fillColor(MUTED)
          .text(s("Jimvio Wallet OS — statement generated for informational purposes only."), left, footerY, {
            width: pageWidth,
          });
      }
      doc.switchToPage(range.start + range.count - 1);
    }
    resetPdfCursor(doc);

    doc.end();
  });
}
