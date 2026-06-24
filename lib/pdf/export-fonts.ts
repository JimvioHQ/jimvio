import path from "node:path";
import type { PdfDocumentInstance } from "@/lib/pdf/pdfkit-server";

/** Matches site typography (`DM Sans` from `app/layout.tsx`). */
export const PDF_FONT_REGULAR = "DMSans";
export const PDF_FONT_BOLD = "DMSans-Bold";
export const EXCEL_FONT = "DM Sans";

const registeredDocs = new WeakSet<PdfDocumentInstance>();

function fontDir(packageName: string) {
  return path.join(process.cwd(), "node_modules", "@fontsource", packageName, "files");
}

export function registerExportPdfFonts(doc: PdfDocumentInstance) {
  if (registeredDocs.has(doc)) return;

  const dmDir = fontDir("dm-sans");
  doc.registerFont(PDF_FONT_REGULAR, path.join(dmDir, "dm-sans-latin-400-normal.woff2"));
  doc.registerFont(PDF_FONT_BOLD, path.join(dmDir, "dm-sans-latin-700-normal.woff2"));

  registeredDocs.add(doc);
}

/** Reset cursor so pdfkit does not auto-add blank pages after footer passes. */
export function resetPdfCursor(doc: PdfDocumentInstance) {
  doc.x = doc.page.margins.left;
  doc.y = doc.page.margins.top;
}

/** Normalize text for pdfkit + embedded fonts (avoids DataView errors on exotic glyphs). */
export function sanitizePdfText(text: string): string {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/\u2212/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "");
}
