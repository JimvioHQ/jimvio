import type { ExportSheet } from "@/lib/admin/export/types";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal SpreadsheetML workbook — opens in Excel without extra dependencies. */
export function buildXlsxXml(sheets: ExportSheet[]): string {
  const worksheetXml = sheets
    .map((sheet) => {
      const safeName = xmlEscape(sheet.name.slice(0, 31));
      const headerRow = sheet.columns
        .map((col) => `<Cell><Data ss:Type="String">${xmlEscape(col)}</Data></Cell>`)
        .join("");
      const dataRows = sheet.rows
        .map((row) => {
          const cells = sheet.columns
            .map((_, i) => {
              const raw = row[i] ?? "";
              const isNumber = raw !== "" && !Number.isNaN(Number(raw)) && /^-?\d+(\.\d+)?$/.test(raw);
              const type = isNumber ? "Number" : "String";
              return `<Cell><Data ss:Type="${type}">${xmlEscape(raw)}</Data></Cell>`;
            })
            .join("");
          return `<Row>${cells}</Row>`;
        })
        .join("");

      return `
<Worksheet ss:Name="${safeName}">
  <Table>
    <Row>${headerRow}</Row>
    ${dataRows}
  </Table>
</Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${worksheetXml}
</Workbook>`;
}
