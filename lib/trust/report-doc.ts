/**
 * The downloadable / shareable form of a result page. Built from the same
 * view model the page renders, so the file always matches the screen.
 */
import type { AssessmentSections, Banner, CheckRow, InfoRow, Score, Tile } from "./result-model";

export type ReportDoc = {
  scanId: string;
  category: string;
  item: string;
  checkedAt: string;
  banner: Banner;
  score: { title: string; score: Score } | null;
  sections: { title: string; rows: { label: string; value: string }[] }[];
  limits: string[];
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function rowsFromChecks(rows: CheckRow[]) {
  return rows.map((r) => ({ label: r.title, value: `${r.pill.label}${r.note ? ` — ${r.note}` : ""}` }));
}

export function rowsFromInfo(rows: InfoRow[]) {
  return rows.map((r) => ({ label: r.label, value: [r.pill?.label, r.value].filter(Boolean).join(" · ") || "Not Available" }));
}

export function rowsFromTiles(tiles: Tile[]) {
  // Tiles show compact figures (e.g. "1.83B"); the report keeps the exact count when the tile has one.
  return tiles.map((t) => {
    const exact = /Exact: ([\d,]+)\./.exec(t.hint ?? "")?.[1];
    return { label: t.label, value: t.value == null ? "Not Available" : exact ? `${t.value} (${exact})` : t.value };
  });
}

/** The three summary cards, in the same order as on the page (after the detailed results). */
export function sectionDocs(s: AssessmentSections) {
  return [
    { title: "What We Found", rows: s.found.map((it) => ({ label: it.title, value: `${it.pill ? `[${it.pill.label}] ` : ""}${it.text}` })) },
    { title: "What We Could Not Verify", rows: s.couldNotVerify.map((it) => ({ label: it.title, value: `${it.pill ? `[${it.pill.label}] ` : ""}${it.text}` })) },
    { title: "Recommended Action", rows: s.actions.map((v, i) => ({ label: String(i + 1), value: v })) },
  ];
}

export function reportHtml(doc: ReportDoc): string {
  const color = doc.banner.tone === "good" ? "#1E8E3E" : doc.banner.tone === "warn" ? "#E2561B" : doc.banner.tone === "neutral" ? "#334155" : "#E5352B";
  const sections = doc.sections
    .map(
      (s) =>
        `<h2>${esc(s.title)}</h2><table>${s.rows.map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join("")}</table>`,
    )
    .join("");
  const score = doc.score
    ? `<p class="score"><b>${esc(doc.score.title)}:</b> ${doc.score.score.value == null ? "Not scored" : `${doc.score.score.value}/100`} — ${esc(doc.score.score.badge.label)}. ${esc(doc.score.score.text)}</p><p class="basis">${esc(doc.score.score.basis)}</p>`
    : "";
  const limits = doc.limits.length ? `<h2>What this check can't verify</h2><ul>${doc.limits.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jimvio Trust Checker — ${esc(doc.category)}</title>
<style>body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;max-width:860px;margin:32px auto;padding:0 20px;line-height:1.5}
.brand{color:#FF5A1F;font-weight:800;letter-spacing:.02em}h1{font-size:26px;margin:4px 0 2px}.item{color:#334155;word-break:break-all}
.banner{border:1px solid #e5e7eb;border-left:6px solid ${color};border-radius:12px;padding:14px 18px;margin:18px 0}.banner b{color:${color};font-size:19px}
.score{margin:10px 0 2px}.basis{color:#64748b;font-size:12px;margin:0 0 8px}h2{font-size:17px;margin:26px 0 8px;border-bottom:2px solid #FF5A1F;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;font-weight:600;width:38%;color:#334155}th,td{padding:7px 6px;border-bottom:1px solid #eef0f3;vertical-align:top;word-break:break-word}
ul{font-size:13px;color:#475569}footer{margin-top:30px;font-size:12px;color:#64748b}@media print{body{margin:0}}</style></head>
<body><div class="brand">JIMVIO TRUST CHECKER</div><h1>${esc(doc.category)}</h1><div class="item">${esc(doc.item)}</div>
<div class="banner"><b>${esc(doc.banner.title)}</b> — ${esc(doc.banner.result.label)}<br>${esc(doc.banner.text)}</div>${score}${sections}${limits}
<footer>Checked ${esc(doc.checkedAt)} · Report ${esc(doc.scanId)} · Jimvio reports evidence-based signals, not legal judgments. Values marked “Not Available” could not be verified and were not estimated.</footer></body></html>`;
}

export function shareText(doc: ReportDoc): string {
  const score = doc.score && doc.score.score.value != null ? ` · ${doc.score.title}: ${doc.score.score.value}/100` : "";
  return `Jimvio Trust Checker — ${doc.category}\n${doc.item}\nResult: ${doc.banner.title} (${doc.banner.result.label})${score}`;
}

export function reportFileName(doc: ReportDoc): string {
  const slug = doc.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `jimvio-${slug}-${doc.scanId.slice(0, 8)}.html`;
}
