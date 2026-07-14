import { createPdfDocument, type PdfDocumentInstance } from "@/lib/pdf/pdfkit-server";
import { PDF_FONT_BOLD, PDF_FONT_REGULAR, resetPdfCursor } from "@/lib/pdf/export-fonts";
import type { ExportDocument, ExportSheet } from "@/lib/admin/export/types";

const MUTED = "#6b7280";
const INK = "#111827";
const BRAND = "var(--color-accent)";
const BRAND_LIGHT = "#fff4ed";
const BORDER = "#e5e7eb";
const HEADER_BG = "#1f2937";
const HEADER_TEXT = "#f9fafb";
const STRIPE_BG = "#f9fafb";
const SUCCESS = "#15803d";
const SUCCESS_BG = "#dcfce7";
const DANGER = "#b91c1c";
const DANGER_BG = "#fee2e2";
const WARN = "#b45309";
const WARN_BG = "#fef3c7";

const MARGIN = 40;
const CELL_PAD_X = 5;
const HEADER_H = 21;
const ROW_H = 19;
const BODY_FONT = 7;
const HEADER_FONT = 6;
const FOOTER_ZONE = 28;

type ColLayout = { name: string; width: number; align: "left" | "right" | "center" };

function columnWeight(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("order")) return 1.05;
  if (n.includes("user") || n.includes("buyer")) return 1.15;
  if (n.includes("vendor") || n.includes("name")) return 1;
  if (n.includes("email")) return 1.2;
  if (n.includes("amount") || n.includes("total") || n.includes("revenue")) return 1.05;
  if (n.includes("provider") && !n.includes("ref")) return 0.75;
  if (n.includes("type")) return 0.72;
  if (n.includes("status")) return 0.72;
  if (n.includes("reference") || n.includes("ref")) return 0.95;
  if (n.includes("created") || n.includes("date")) return 0.95;
  return 0.85;
}

function columnAlign(name: string): ColLayout["align"] {
  const n = name.toLowerCase();
  if (n.includes("amount") || n.includes("total") || n.includes("revenue")) return "right";
  if (n.includes("status") || n.includes("type")) return "center";
  return "left";
}

function buildColumnLayout(columns: string[], tableWidth: number): ColLayout[] {
  const weights = columns.map(columnWeight);
  const total = weights.reduce((s, w) => s + w, 0);
  return columns.map((name, i) => ({
    name,
    width: (weights[i] / total) * tableWidth,
    align: columnAlign(name),
  }));
}

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPdfCell(column: string, value: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  const n = column.toLowerCase();

  if (n.includes("type")) return humanize(raw);
  if (n.includes("provider") && !n.includes("ref")) return humanize(raw);
  if (n.includes("reference") || n.includes("ref")) {
    if (raw.length > 12) return `${raw.slice(0, 10)}..`;
    return raw;
  }
  if (n.includes("user") || n.includes("buyer")) {
    if (raw.length > 18) return `${raw.slice(0, 16)}..`;
    return raw;
  }
  if (n.includes("created") || n.includes("date")) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return raw;
}

function statusStyle(value: string): { text: string; bg: string } | null {
  const v = value.toLowerCase();
  if (["completed", "paid", "delivered", "verified", "active", "resolved"].some((s) => v.includes(s))) {
    return { text: SUCCESS, bg: SUCCESS_BG };
  }
  if (["failed", "cancelled", "rejected", "refunded", "suspended"].some((s) => v.includes(s))) {
    return { text: DANGER, bg: DANGER_BG };
  }
  if (["pending", "processing", "open"].some((s) => v.includes(s))) {
    return { text: WARN, bg: WARN_BG };
  }
  return null;
}

function isStatusColumn(name: string) {
  const n = name.toLowerCase();
  return n.includes("status");
}

function contentBottom(doc: PdfDocumentInstance) {
  return doc.page.height - doc.page.margins.bottom - FOOTER_ZONE;
}

function drawPageFooter(
  doc: PdfDocumentInstance,
  pageWidth: number,
  left: number,
  pageNum: number,
  totalPages: number,
) {
  const footerY = doc.page.height - doc.page.margins.bottom - 10;
  doc.save();
  doc
    .moveTo(left, footerY - 6)
    .lineTo(left + pageWidth, footerY - 6)
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .stroke();
  doc.font(PDF_FONT_REGULAR).fontSize(6.5).fillColor(MUTED);
  doc.text("Jimvio Admin  ·  Confidential", left, footerY, { lineBreak: false });
  doc.font(PDF_FONT_REGULAR).fontSize(6.5).fillColor(MUTED);
  doc.text(`Page ${pageNum} of ${totalPages}`, left + pageWidth - 72, footerY, {
    width: 72,
    align: "right",
    lineBreak: false,
  });
  doc.restore();
  resetPdfCursor(doc);
}

function drawReportHeader(
  doc: PdfDocumentInstance,
  docData: ExportDocument,
  pageWidth: number,
  left: number,
  totalRows: number,
): number {
  const top = doc.page.margins.top;
  const headerH = 54;

  doc.save();
  doc.roundedRect(left, top, pageWidth, headerH, 5).fill(BRAND_LIGHT);
  doc.rect(left, top, 3, headerH).fill(BRAND);
  doc.restore();

  const metaLeft = left + pageWidth * 0.62;
  const metaW = pageWidth * 0.38;

  doc.font(PDF_FONT_BOLD).fontSize(15).fillColor(BRAND).text("Jimvio", left + 12, top + 10, { lineBreak: false });
  doc.font(PDF_FONT_BOLD).fontSize(10.5).fillColor(INK).text(docData.title, left + 12, top + 28, { lineBreak: false });

  let my = top + 10;
  doc.font(PDF_FONT_BOLD).fontSize(6).fillColor(MUTED).text("GENERATED", metaLeft, my, { width: metaW, align: "right", lineBreak: false });
  my += 9;
  doc.font(PDF_FONT_REGULAR).fontSize(7.5).fillColor(INK).text(
    new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    metaLeft,
    my,
    { width: metaW, align: "right", lineBreak: false },
  );
  if (docData.subtitle) {
    my += 11;
    doc.font(PDF_FONT_BOLD).fontSize(6).fillColor(MUTED).text("PERIOD", metaLeft, my, { width: metaW, align: "right", lineBreak: false });
    my += 9;
    doc.font(PDF_FONT_REGULAR).fontSize(7.5).fillColor(INK).text(docData.subtitle, metaLeft, my, { width: metaW, align: "right", lineBreak: false });
  }
  my += 11;
  doc.font(PDF_FONT_BOLD).fontSize(6).fillColor(MUTED).text("RECORDS", metaLeft, my, { width: metaW, align: "right", lineBreak: false });
  my += 9;
  doc.font(PDF_FONT_REGULAR).fontSize(7.5).fillColor(INK).text(String(totalRows), metaLeft, my, { width: metaW, align: "right", lineBreak: false });

  return top + headerH + 12;
}

function drawContinuationBanner(doc: PdfDocumentInstance, title: string, left: number, y: number, pageWidth: number) {
  doc.save();
  doc.rect(left, y, pageWidth, 16).fill(BRAND_LIGHT);
  doc.restore();
  doc.font(PDF_FONT_BOLD).fontSize(7.5).fillColor(BRAND).text(`${title} — continued`, left + 8, y + 4, { lineBreak: false });
  return y + 22;
}

function drawTableHeaderRow(doc: PdfDocumentInstance, layout: ColLayout[], left: number, y: number) {
  const tableW = layout.reduce((s, c) => s + c.width, 0);

  doc.save();
  doc.rect(left, y, tableW, HEADER_H).fill(HEADER_BG);
  doc.restore();

  let x = left;
  doc.font(PDF_FONT_BOLD).fontSize(HEADER_FONT).fillColor(HEADER_TEXT);
  for (const col of layout) {
    doc.text(col.name.toUpperCase(), x + CELL_PAD_X, y + 6.5, {
      width: col.width - CELL_PAD_X * 2,
      align: col.align,
      lineBreak: false,
    });
    x += col.width;
  }

  doc.rect(left, y, tableW, HEADER_H).strokeColor("#374151").lineWidth(0.5).stroke();
  return y + HEADER_H;
}

function drawStatusPill(
  doc: PdfDocumentInstance,
  text: string,
  x: number,
  y: number,
  width: number,
  style: { text: string; bg: string },
) {
  const label = humanize(text);
  const pillW = Math.min(width - 6, Math.max(38, label.length * 3.8));
  const pillX = x + (width - pillW) / 2;
  const pillY = y + 3.5;
  doc.save();
  doc.roundedRect(pillX, pillY, pillW, 11, 2).fill(style.bg);
  doc.font(PDF_FONT_BOLD).fontSize(6).fillColor(style.text);
  doc.text(label, pillX, pillY + 2, { width: pillW, align: "center", lineBreak: false });
  doc.restore();
}

function drawTableRow(
  doc: PdfDocumentInstance,
  layout: ColLayout[],
  row: string[],
  left: number,
  y: number,
  stripe: boolean,
) {
  const tableW = layout.reduce((s, c) => s + c.width, 0);

  if (stripe) {
    doc.save();
    doc.rect(left, y, tableW, ROW_H).fill(STRIPE_BG);
    doc.restore();
  }

  let x = left;
  for (let i = 0; i < layout.length; i++) {
    const col = layout[i];
    const raw = formatPdfCell(col.name, row[i] ?? "");
    const status = isStatusColumn(col.name) ? statusStyle(raw) : null;

    if (status) {
      drawStatusPill(doc, raw, x, y, col.width, status);
    } else {
      const bold = col.name.toLowerCase().includes("order");
      doc.font(bold ? PDF_FONT_BOLD : PDF_FONT_REGULAR).fontSize(BODY_FONT).fillColor(INK);
      doc.text(raw, x + CELL_PAD_X, y + 5.5, {
        width: col.width - CELL_PAD_X * 2,
        align: col.align,
        lineBreak: false,
      });
    }
    x += col.width;
  }

  doc.rect(left, y, tableW, ROW_H).strokeColor(BORDER).lineWidth(0.3).stroke();
}

function drawSheet(
  doc: PdfDocumentInstance,
  sheet: ExportSheet,
  docTitle: string,
  pageWidth: number,
  left: number,
  startY: number,
  onNewPage: () => number,
): number {
  let y = startY;
  const layout = buildColumnLayout(sheet.columns, pageWidth);
  const bottom = contentBottom(doc);

  const paintHeader = () => {
    y = drawTableHeaderRow(doc, layout, left, y);
  };

  paintHeader();

  for (let index = 0; index < sheet.rows.length; index++) {
    if (y + ROW_H > bottom) {
      y = onNewPage();
      y = drawContinuationBanner(doc, docTitle, left, y, pageWidth);
      paintHeader();
    }
    drawTableRow(doc, layout, sheet.rows[index], left, y, index % 2 === 1);
    y += ROW_H;
  }

  resetPdfCursor(doc);
  return y + 8;
}

function applyFooters(doc: PdfDocumentInstance, pageWidth: number, left: number) {
  const range = doc.bufferedPageRange();
  const total = range.count;

  if (total > 0) {
    for (let i = 0; i < total; i++) {
      doc.switchToPage(range.start + i);
      drawPageFooter(doc, pageWidth, left, i + 1, total);
    }
    doc.switchToPage(range.start + total - 1);
  }
  resetPdfCursor(doc);
}

export function buildAdminExportPdf(docData: ExportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createPdfDocument({
      margin: MARGIN,
      size: "A4",
      layout: "landscape",
      bufferPages: true,
      autoFirstPage: true,
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const totalRows = docData.sheets.reduce((sum, s) => sum + s.rows.length, 0);

    const onNewPage = () => {
      doc.addPage({ size: "A4", layout: "landscape", margin: MARGIN });
      resetPdfCursor(doc);
      return doc.page.margins.top;
    };

    let y = drawReportHeader(doc, docData, pageWidth, left, totalRows);
    resetPdfCursor(doc);

    for (const sheet of docData.sheets) {
      y = drawSheet(doc, sheet, docData.title, pageWidth, left, y, onNewPage);
    }

    applyFooters(doc, pageWidth, left);
    doc.end();
  });
}
