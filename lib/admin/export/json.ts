import type { ExportDocument } from "@/lib/admin/export/types";

export function buildExportJson(doc: ExportDocument): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    title: doc.title,
    subtitle: doc.subtitle ?? null,
    sheets: doc.sheets.map((sheet) => ({
      name: sheet.name,
      columns: sheet.columns,
      rowCount: sheet.rows.length,
      rows: sheet.rows.map((cells) =>
        Object.fromEntries(sheet.columns.map((col, i) => [col, cells[i] ?? ""])),
      ),
    })),
  };
  return JSON.stringify(payload, null, 2);
}
