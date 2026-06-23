import PDFDocument from "pdfkit";
import type { ExportDocument, ExportSheet } from "@/lib/admin/export/types";

const MUTED = "#6b7280";
const INK = "#111111";
const BRAND = "#fd5000";
const BORDER = "#e5e7eb";

function drawSheet(
  doc: InstanceType<typeof PDFDocument>,
  sheet: ExportSheet,
  pageWidth: number,
  left: number,
) {
  const colCount = Math.max(sheet.columns.length, 1);
  const colWidth = pageWidth / colCount;

  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(sheet.name);
  doc.moveDown(0.4);

  const headerY = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
  sheet.columns.forEach((col, i) => {
    doc.text(col, left + i * colWidth, headerY, { width: colWidth - 6, lineBreak: false });
  });

  doc
    .moveTo(left, headerY + 14)
    .lineTo(left + pageWidth, headerY + 14)
    .strokeColor(BORDER)
    .lineWidth(0.75)
    .stroke();

  let rowY = headerY + 20;
  doc.font("Helvetica").fontSize(9).fillColor(INK);

  for (const row of sheet.rows) {
    if (rowY > doc.page.height - 72) {
      doc.addPage();
      rowY = doc.page.margins.top;
    }

    let maxCellHeight = 14;
    const cellHeights = sheet.columns.map((_, i) => {
      const text = row[i] ?? "";
      const h = doc.heightOfString(text, { width: colWidth - 6 });
      maxCellHeight = Math.max(maxCellHeight, h);
      return text;
    });

    cellHeights.forEach((text, i) => {
      doc.text(text, left + i * colWidth, rowY, { width: colWidth - 6 });
    });

    rowY += maxCellHeight + 6;
  }

  doc.moveDown(1);
}

export function buildAdminExportPdf(docData: ExportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 44, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    doc.font("Helvetica-Bold").fontSize(20).fillColor(BRAND).text("Jimvio");
    doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text(docData.title, { continued: false });
    if (docData.subtitle) {
      doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(docData.subtitle);
    }
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(`Exported ${new Date().toLocaleString()}`);
    doc.moveDown(0.8);

    doc
      .moveTo(left, doc.y)
      .lineTo(right, doc.y)
      .strokeColor(BRAND)
      .lineWidth(2)
      .stroke();
    doc.moveDown(0.8);

    for (const sheet of docData.sheets) {
      if (doc.y > doc.page.height - 100) doc.addPage();
      drawSheet(doc, sheet, pageWidth, left);
    }

    const footerY = doc.page.height - 36;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED);
    doc.text("Jimvio Admin · Confidential", left, footerY, { width: pageWidth, align: "center" });

    doc.end();
  });
}
