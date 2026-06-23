function escapeCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildCsv(sheets: { name: string; columns: string[]; rows: string[][] }[]): string {
  const parts: string[] = [];

  for (const sheet of sheets) {
    if (sheets.length > 1) {
      parts.push(escapeCell(sheet.name).replace(/^"|"$/g, ""));
      parts.push("");
    }
    parts.push(sheet.columns.map(escapeCell).join(","));
    for (const row of sheet.rows) {
      parts.push(row.map((c) => escapeCell(c ?? "")).join(","));
    }
    if (sheets.length > 1) parts.push("");
  }

  return `\uFEFF${parts.join("\n")}`;
}
