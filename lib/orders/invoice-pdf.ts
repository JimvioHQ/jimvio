import { createPdfDocument } from "@/lib/pdf/pdfkit-server";
import { PDF_FONT_BOLD, PDF_FONT_REGULAR } from "@/lib/pdf/export-fonts";
import type { InvoiceData } from "@/lib/orders/invoice-data";

const MUTED = "#6b7280";
const INK = "#111111";
const BRAND = "#fd5000";

export function buildOrderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createPdfDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rightX = doc.page.margins.left + pageWidth;

    // Brand + header
    doc.font(PDF_FONT_BOLD).fontSize(22).fillColor(BRAND).text("Jimvio");
    doc.moveDown(1.2);

    doc.font(PDF_FONT_BOLD).fontSize(18).fillColor(INK).text("Invoice");
    doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED);
    doc.text(`Order #${data.ref}`);
    doc.text(`Issued ${data.issuedDate}`);
    if (data.paidDate) doc.text(`Paid ${data.paidDate}`);

    const metaY = doc.y - 48;
    doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED);
    doc.text(`Payment: ${data.paymentStatus}`, rightX - 180, metaY, { width: 180, align: "right" });
    if (data.paymentProvider) {
      doc.text(`Provider: ${data.paymentProvider}`, rightX - 180, metaY + 14, {
        width: 180,
        align: "right",
      });
    }

    doc.moveDown(1.5);

    // Bill to
    doc.font(PDF_FONT_BOLD).fontSize(9).fillColor(MUTED).text("BILL TO", { characterSpacing: 0.8 });
    doc.moveDown(0.3);
    doc.font(PDF_FONT_BOLD).fontSize(11).fillColor(INK).text(data.buyerName);
    if (data.buyerEmail) {
      doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED).text(data.buyerEmail);
    }
    if (data.addressLine) {
      doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(MUTED).text(data.addressLine, { width: pageWidth * 0.55 });
    }

    doc.moveDown(1.5);

    // Table header
    const tableTop = doc.y;
    const colItem = doc.page.margins.left;
    const colQty = colItem + pageWidth * 0.52;
    const colUnit = colItem + pageWidth * 0.64;
    const colTotal = colItem + pageWidth * 0.78;

    doc.font(PDF_FONT_BOLD).fontSize(8).fillColor(MUTED);
    doc.text("ITEM", colItem, tableTop);
    doc.text("QTY", colQty, tableTop, { width: 40, align: "right" });
    doc.text("UNIT", colUnit, tableTop, { width: 70, align: "right" });
    doc.text("TOTAL", colTotal, tableTop, { width: 80, align: "right" });

    doc
      .moveTo(colItem, tableTop + 14)
      .lineTo(rightX, tableTop + 14)
      .strokeColor(INK)
      .lineWidth(1)
      .stroke();

    let rowY = tableTop + 22;

    doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(INK);

    for (const item of data.items) {
      if (rowY > doc.page.height - 140) {
        doc.addPage();
        rowY = doc.page.margins.top;
      }

      doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(INK).text(item.name, colItem, rowY, {
        width: pageWidth * 0.48,
      });
      let nextY = doc.y;
      if (item.variant) {
        doc.font(PDF_FONT_REGULAR).fontSize(9).fillColor(MUTED).text(item.variant, colItem, nextY, {
          width: pageWidth * 0.48,
        });
        nextY = doc.y;
      }

      doc.font(PDF_FONT_REGULAR).fontSize(10).fillColor(INK);
      doc.text(String(item.quantity), colQty, rowY, { width: 40, align: "right" });
      doc.text(item.unitPrice, colUnit, rowY, { width: 70, align: "right" });
      doc.text(item.totalPrice, colTotal, rowY, { width: 80, align: "right" });

      rowY = Math.max(nextY, rowY + 16) + 8;
      doc
        .moveTo(colItem, rowY - 4)
        .lineTo(rightX, rowY - 4)
        .strokeColor("#ececec")
        .lineWidth(0.5)
        .stroke();
    }

    doc.moveDown(2);
    let totalsY = Math.max(rowY + 12, doc.y);

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

      doc.font(line.grand ? "Helvetica-Bold" : "Helvetica").fontSize(line.grand ? 12 : 10);
      doc.fillColor(line.accent ? "#16a34a" : INK);
      doc.text(line.label, totalsX, totalsY, { width: 100, align: "left" });
      doc.text(line.value, totalsX + 100, totalsY, { width: 100, align: "right" });
      totalsY += line.grand ? 22 : 16;
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        "Thank you for your purchase on Jimvio. For support, contact us with your order number.",
        doc.page.margins.left,
        doc.page.height - 70,
        { width: pageWidth, align: "left" },
      );

    doc.end();
  });
}
