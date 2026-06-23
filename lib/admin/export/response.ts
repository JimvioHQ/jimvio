import { NextResponse } from "next/server";
import { buildCsv } from "@/lib/admin/export/csv";
import { buildExportJson } from "@/lib/admin/export/json";
import { buildXlsxXml } from "@/lib/admin/export/xlsx";
import { buildAdminExportPdf } from "@/lib/admin/export/table-pdf";
import type { ExportDocument, ExportFormat } from "@/lib/admin/export/types";
import { exportFormatMeta } from "@/lib/admin/export/types";

export async function buildExportResponse(doc: ExportDocument, format: ExportFormat) {
  const meta = exportFormatMeta(format);
  const filename = `${doc.filename}.${meta.ext}`;

  if (format === "csv") {
    return new NextResponse(buildCsv(doc.sheets), {
      headers: {
        "Content-Type": meta.mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format === "json") {
    return new NextResponse(buildExportJson(doc), {
      headers: {
        "Content-Type": meta.mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format === "xlsx") {
    return new NextResponse(buildXlsxXml(doc.sheets), {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${doc.filename}.xls"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const pdf = await buildAdminExportPdf(doc);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": meta.mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
