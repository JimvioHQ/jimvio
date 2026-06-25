import { createPdfDocument, type PdfDocumentInstance } from "@/lib/pdf/pdfkit-server";
import {
  PDF_FONT_BOLD,
  PDF_FONT_REGULAR,
  resetPdfCursor,
  sanitizePdfText,
} from "@/lib/pdf/export-fonts";
import type { InvoiceData } from "@/lib/orders/invoice-data";

const MARGIN = 50;
const MUTED = "#6b7280";
const INK = "#111111";
const BRAND = "#fd5000";
const FOOTER_ZONE = 48;

function s(value: string): string {
  return sanitizePdfText(value);
}

function contentBottom(doc: PdfDocumentInstance): number {
  return doc.page.height - doc.page.margins.bottom - FOOTER_ZONE;
}

function drawFooter(doc: PdfDocumentInstance, pageWidth: number, left: number) {
  const footerY = doc.page.height - doc.page.margins.bottom - 28;
  doc.font(PDF_FONT_REGULAR).fontSize(9).fillColor(MUTED);
  doc.text(
    s("Thank you for your purchase on Jimvio. For support, contact us with your order number."),
    left,
    footerY,
    { width: pageWidth, align: "left" },
  );
}

export function buildOrderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createPdfDocument({
      margin: MARGIN,
      size: "A4",
      bufferPages: true,
      autoFirstPage: true,
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const rightX = left + pageWidth;
    const bottom = contentBottom(doc);

    // Brand + header
    doc.font(PDF_FONT_BOLD).fontSize(22).fillColor(BRAND).text("Jimvio");
    doc.moveDown(1.2);

    const headerLeftY = doc.y;
    doc.font(PDF_FONT_BOLD).fontSize(18).fillColor(INK).text("Invoice");
    doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED);
    doc.text(s(`Order #${data.ref}`));
    doc.text(s(`Issued ${data.issuedDate}`));
    if (data.paidDate) doc.text(s(`Paid ${data.paidDate}`));

    doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED);
    doc.text(s(`Payment: ${data.paymentStatus}`), rightX - 180, headerLeftY, {
      width: 180,
      align: "right",
    });
    if (data.paymentProvider) {
      doc.text(s(`Provider: ${data.paymentProvider}`), rightX - 180, headerLeftY + 14, {
        width: 180,
        align: "right",
      });
    }

    doc.y = Math.max(doc.y, headerLeftY + 42);
    doc.moveDown(1.2);

    // Bill to
    doc.font(PDF_FONT_BOLD).fontSize(9).fillColor(MUTED).text("BILL TO");
    doc.moveDown(0.3);
    doc.font(PDF_FONT_BOLD).fontSize(11).fillColor(INK).text(s(data.buyerName));
    if (data.buyerEmail) {
      doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED).text(s(data.buyerEmail));
    }
    if (data.addressLine) {
      doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED).text(s(data.addressLine), {
        width: pageWidth * 0.55,
      });
    }

    doc.moveDown(1.5);

    // Table header
    const colItem = left;
    const colQty = left + pageWidth * 0.52;
    const colUnit = left + pageWidth * 0.64;
    const colTotal = left + pageWidth * 0.78;

    const paintTableHeader = (y: number) => {
      doc.font(PDF_FONT_BOLD).fontSize(8).fillColor(MUTED);
      doc.text("ITEM", colItem, y);
      doc.text("QTY", colQty, y, { width: 40, align: "right" });
      doc.text("UNIT", colUnit, y, { width: 70, align: "right" });
      doc.text("TOTAL", colTotal, y, { width: 80, align: "right" });
      doc
        .moveTo(colItem, y + 14)
        .lineTo(rightX, y + 14)
        .strokeColor(INK)
        .lineWidth(1)
        .stroke();
      return y + 22;
    };

    let rowY = paintTableHeader(doc.y);

    for (const item of data.items) {
      const rowBlockHeight = item.variant ? 34 : 22;
      if (rowY + rowBlockHeight > bottom) {
        doc.addPage({ size: "A4", margin: MARGIN });
        resetPdfCursor(doc);
        rowY = paintTableHeader(doc.page.margins.top);
      }

      doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(INK).text(s(item.name), colItem, rowY, {
        width: pageWidth * 0.48,
      });
      let nextY = doc.y;
      if (item.variant) {
        doc.font(PDF_FONT_REGULAR).fontSize(9).fillColor(MUTED).text(s(item.variant), colItem, nextY, {
          width: pageWidth * 0.48,
        });
        nextY = doc.y;
      }

      doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(INK);
      doc.text(String(item.quantity), colQty, rowY, { width: 40, align: "right" });
      doc.text(s(item.unitPrice), colUnit, rowY, { width: 70, align: "right" });
      doc.text(s(item.totalPrice), colTotal, rowY, { width: 80, align: "right" });

      rowY = Math.max(nextY, rowY + 16) + 8;
      doc
        .moveTo(colItem, rowY - 4)
        .lineTo(rightX, rowY - 4)
        .strokeColor("#ececec")
        .lineWidth(0.5)
        .stroke();
    }

    let totalsY = rowY + 16;
    if (totalsY + data.totals.length * 18 > bottom) {
      doc.addPage({ size: "A4", margin: MARGIN });
      resetPdfCursor(doc);
      totalsY = doc.page.margins.top + 12;
    }

    const totalsX = rightX - 200;
    for (const line of data.totals) {
      if (line.grand) {
        doc
          .moveTo(totalsX, totalsY - 4)
          .lineTo(rightX, totalsY - 4)
          .strokeColor(INK)
          .lineWidth(1)
          .stroke();
        totalsY += 6;
      }

      doc.font(line.grand ? PDF_FONT_BOLD : PDF_FONT_REGULAR).fontSize(line.grand ? 12 : 10);
      doc.fillColor(line.accent ? "#16a34a" : INK);
      doc.text(s(line.label), totalsX, totalsY, { width: 100, align: "left" });
      doc.text(s(line.value), totalsX + 100, totalsY, { width: 100, align: "right" });
      totalsY += line.grand ? 22 : 16;
    }

    const range = doc.bufferedPageRange();
    if (range.count > 0) {
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        drawFooter(doc, pageWidth, left);
      }
      doc.switchToPage(range.start + range.count - 1);
    }
    resetPdfCursor(doc);

    doc.end();
  });
}
