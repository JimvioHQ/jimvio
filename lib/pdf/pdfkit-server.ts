import { createRequire } from "node:module";
import { registerExportPdfFonts } from "@/lib/pdf/export-fonts";

const require = createRequire(import.meta.url);

type PDFDocumentConstructor = typeof import("pdfkit");
export type PdfDocumentInstance = InstanceType<PDFDocumentConstructor>;
type PDFDocumentOptions = ConstructorParameters<PDFDocumentConstructor>[0];

let cachedCtor: PDFDocumentConstructor | null = null;

/** Load pdfkit's CJS build so standard fonts resolve from node_modules (not a bundled __dirname). */
function getPdfDocumentConstructor(): PDFDocumentConstructor {
  if (!cachedCtor) {
    cachedCtor = require("pdfkit") as PDFDocumentConstructor;
  }
  return cachedCtor;
}

export function createPdfDocument(options?: PDFDocumentOptions): PdfDocumentInstance {
  const PDFDocument = getPdfDocumentConstructor();
  const doc = new PDFDocument(options);
  registerExportPdfFonts(doc);
  return doc;
}
