export type ExportFormat = "csv" | "json" | "pdf" | "xlsx";

export type ExportResource =
  | "orders"
  | "products"
  | "vendors"
  | "payments"
  | "users"
  | "disputes"
  | "messages"
  | "reports";

export type ExportSheet = {
  name: string;
  columns: string[];
  rows: string[][];
};

export type ExportDocument = {
  title: string;
  subtitle?: string;
  filename: string;
  sheets: ExportSheet[];
};

export const EXPORT_FORMATS: Array<{
  id: ExportFormat;
  label: string;
  description: string;
  ext: string;
  mime: string;
}> = [
  {
    id: "csv",
    label: "CSV",
    description: "Spreadsheet-friendly text",
    ext: "csv",
    mime: "text/csv;charset=utf-8",
  },
  {
    id: "xlsx",
    label: "Excel",
    description: "Styled workbook · DM Sans",
    ext: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Branded printable report",
    ext: "pdf",
    mime: "application/pdf",
  },
  {
    id: "json",
    label: "JSON",
    description: "Structured data for tools",
    ext: "json",
    mime: "application/json;charset=utf-8",
  },
];

export function exportFormatMeta(format: ExportFormat) {
  return EXPORT_FORMATS.find((f) => f.id === format) ?? EXPORT_FORMATS[0];
}
