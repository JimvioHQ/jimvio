/** Count-only Search Console line for run summaries and stored provider checks. */
export function searchConsoleReadSummary(report: {
  status: "read" | "failed";
  rowCount: number;
  pageRows?: { length: number } | null;
  pageRead?: "read" | "failed";
}): string {
  if (report.status !== "read") return "Search Console read was not successful.";
  if (report.pageRead === "read" || report.pageRead === "failed") {
    const pages = report.pageRows?.length ?? 0;
    return `Search Console returned ${report.rowCount} queries and ${pages} pages (${report.pageRead}).`;
  }
  return `Search Console returned ${report.rowCount} queries.`;
}
