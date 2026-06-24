import ExcelJS from "exceljs";
import type { ExportDocument, ExportSheet } from "@/lib/admin/export/types";
import { EXCEL_FONT } from "@/lib/pdf/export-fonts";

const BRAND = "FFFD5000";
const INK = "FF111827";
const MUTED = "FF6B7280";
const HEADER_BG = "FF1F2937";
const HEADER_TEXT = "FFFFFFFF";
const STRIPE_BG = "FFF9FAFB";
const BORDER = "FFE5E7EB";
const SUCCESS = "FF15803D";
const SUCCESS_BG = "FFDCFCE7";
const DANGER = "FFB91C1C";
const DANGER_BG = "FFFEE2E2";
const WARN = "FFB45309";
const WARN_BG = "FFFEF3C7";
const TITLE_BG = "FFFFF4ED";

function columnWidth(name: string): number {
  const n = name.toLowerCase();
  if (n === "id") return 14;
  if (n.includes("order")) return 16;
  if (n.includes("user") || n.includes("buyer") || n.includes("vendor")) return 18;
  if (n.includes("email")) return 22;
  if (n.includes("amount") || n.includes("revenue") || n.includes("total")) return 16;
  if (n.includes("status") || n.includes("type")) return 12;
  if (n.includes("provider")) return 14;
  if (n.includes("reference") || n.includes("ref")) return 18;
  if (n.includes("created") || n.includes("date")) return 18;
  if (n.includes("description") || n.includes("note")) return 24;
  return 14;
}

function statusColors(value: string): { font: string; fill: string } | null {
  const v = value.toLowerCase();
  if (["completed", "paid", "delivered", "verified", "active", "resolved"].some((s) => v.includes(s))) {
    return { font: SUCCESS, fill: SUCCESS_BG };
  }
  if (["failed", "cancelled", "rejected", "refunded", "suspended"].some((s) => v.includes(s))) {
    return { font: DANGER, fill: DANGER_BG };
  }
  if (["pending", "processing", "open"].some((s) => v.includes(s))) {
    return { font: WARN, fill: WARN_BG };
  }
  return null;
}

function isStatusColumn(name: string) {
  const n = name.toLowerCase();
  return n.includes("status") || n === "payment";
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER } };
  return { top: side, left: side, bottom: side, right: side };
}

function fillSolid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function setMetaRow(
  row: ExcelJS.Row,
  left: { text: string; bold?: boolean; size?: number; color?: string },
  right: { text: string; label?: boolean },
  colSpan: number,
) {
  const leftCell = row.getCell(1);
  leftCell.value = left.text;
  leftCell.font = {
    name: EXCEL_FONT,
    bold: left.bold ?? false,
    size: left.size ?? 10,
    color: { argb: left.color ?? INK },
  };
  leftCell.fill = fillSolid(TITLE_BG);
  leftCell.alignment = { vertical: "middle" };
  if (colSpan > 1) {
    worksheetMerge(row, 1, colSpan);
  }

  if (right.text) {
    const rightCell = row.getCell(colSpan + 1);
    rightCell.value = right.text;
    rightCell.font = {
      name: EXCEL_FONT,
      bold: right.label ?? false,
      size: 9,
      color: { argb: right.label ? MUTED : INK },
    };
    rightCell.fill = fillSolid(TITLE_BG);
    rightCell.alignment = { horizontal: "right", vertical: "middle" };
  }
}

function worksheetMerge(row: ExcelJS.Row, startCol: number, colSpan: number) {
  const sheet = row.worksheet;
  const rowNum = Number(row.number);
  if (colSpan > 1) {
    sheet.mergeCells(rowNum, startCol, rowNum, startCol + colSpan - 1);
  }
}

async function buildWorksheet(
  workbook: ExcelJS.Workbook,
  doc: ExportDocument,
  sheet: ExportSheet,
  options: { includeMeta: boolean; showSheetTitle: boolean },
) {
  const ws = workbook.addWorksheet(sheet.name.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  sheet.columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = columnWidth(col);
  });

  const colCount = Math.max(sheet.columns.length, 1);
  let rowIndex = 1;

  if (options.includeMeta) {
    const generated = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

    const r1 = ws.getRow(rowIndex++);
    setMetaRow(r1, { text: "Jimvio", bold: true, size: 16, color: BRAND }, { text: "GENERATED", label: true }, colCount - 1);
    r1.height = 22;

    const r2 = ws.getRow(rowIndex++);
    setMetaRow(r2, { text: doc.title, bold: true, size: 12 }, { text: generated }, colCount - 1);
    r2.height = 20;

    if (doc.subtitle) {
      const r3 = ws.getRow(rowIndex++);
      setMetaRow(r3, { text: doc.subtitle, size: 10 }, { text: "RECORDS", label: true }, colCount - 1);
      r3.height = 18;

      const r4 = ws.getRow(rowIndex++);
      setMetaRow(r4, { text: sheet.name, size: 9, color: MUTED }, { text: String(sheet.rows.length) }, colCount - 1);
      r4.height = 18;
    } else {
      const r3 = ws.getRow(rowIndex++);
      setMetaRow(
        r3,
        { text: `${sheet.name} · ${sheet.rows.length} records`, bold: true, size: 11 },
        { text: "" },
        colCount - 1,
      );
      r3.height = 20;
    }

    ws.getRow(rowIndex++).height = 6;
  }

  if (options.showSheetTitle) {
    const titleRow = ws.getRow(rowIndex++);
    const cell = titleRow.getCell(1);
    cell.value = `${sheet.name} · ${sheet.rows.length} records`;
    cell.font = { name: EXCEL_FONT, bold: true, size: 11, color: { argb: INK } };
    cell.alignment = { vertical: "middle" };
    if (colCount > 1) ws.mergeCells(rowIndex - 1, 1, rowIndex - 1, colCount);
    titleRow.height = 20;
  }

  const headerRowNum = rowIndex;
  const headerRow = ws.getRow(rowIndex++);
  sheet.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.toUpperCase();
    cell.font = { name: EXCEL_FONT, bold: true, size: 9, color: { argb: HEADER_TEXT } };
    cell.fill = fillSolid(HEADER_BG);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  });
  headerRow.height = 22;

  sheet.rows.forEach((row, rowIdx) => {
    const dataRow = ws.getRow(rowIndex++);
    const stripe = rowIdx % 2 === 1;

    sheet.columns.forEach((col, i) => {
      const raw = (row[i] ?? "").trim() || "—";
      const cell = dataRow.getCell(i + 1);
      cell.value = raw;
      cell.alignment = { vertical: "middle" };

      const status = isStatusColumn(col) ? statusColors(raw) : null;
      if (status) {
        cell.font = { name: EXCEL_FONT, bold: true, size: 9, color: { argb: status.font } };
        cell.fill = fillSolid(status.fill);
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.font = { name: EXCEL_FONT, size: 10, color: { argb: INK } };
        if (stripe) cell.fill = fillSolid(STRIPE_BG);
      }
      cell.border = thinBorder();
    });
    dataRow.height = 18;
  });

  ws.views = [{ state: "frozen", ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` }];
}

/** Real `.xlsx` workbook (OOXML) — opens in Excel without format warnings. */
export async function buildXlsxBuffer(doc: ExportDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Jimvio Admin";
  workbook.created = new Date();

  const multiSheet = doc.sheets.length > 1;
  for (let i = 0; i < doc.sheets.length; i++) {
    await buildWorksheet(workbook, doc, doc.sheets[i], {
      includeMeta: !multiSheet && i === 0,
      showSheetTitle: multiSheet,
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
