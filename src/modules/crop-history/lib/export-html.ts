import { formatExportValue, type CropExportReport } from "./export-data";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderCropExportHtml(report: CropExportReport) {
  const heading = ["Group", "Metric", "Unit", ...report.periods]
    .map((value) => `<th scope="col">${escapeHtml(value)}</th>`)
    .join("");
  const rows = report.rows
    .map(
      (row) =>
        `<tr class="section-${row.section}"><th scope="row">${escapeHtml(row.group)}</th><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.unit)}</td>${row.values.map((value) => `<td>${escapeHtml(formatExportValue(value, row.format))}</td>`).join("")}</tr>`,
    )
    .join("");
  const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(report.cropName)} crop history</title><style>:root{color-scheme:light;--ink:#18181b;--muted:#52525b;--line:#d4d4d8;--accent:#166534}*{box-sizing:border-box}body{margin:0;padding:32px;background:#fafafa;color:var(--ink);font:14px system-ui,sans-serif}.report{max-width:1400px;margin:auto;background:white;padding:32px;border:1px solid var(--line);border-radius:16px}h1{margin:0;color:var(--accent)}p{color:var(--muted)}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;min-width:max-content}th,td{border:1px solid var(--line);padding:9px;text-align:left;vertical-align:top;white-space:pre-wrap}thead th{background:#f4f4f5}.section-total th,.section-total td{font-weight:700;background:#f4f4f5}.section-calculated th,.section-calculated td{background:#f0fdf4}.section-notes td{min-width:180px}@page{size:A4 landscape;margin:12mm}@media print{body{padding:0;background:white}.report{border:0;padding:0}.table-wrap{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><main class="report"><h1>${escapeHtml(report.cropName)} crop history</h1><p>Generated ${escapeHtml(report.generatedAt)} · ${escapeHtml(report.timeZone)} · ${report.periods.length} period${report.periods.length === 1 ? "" : "s"} · ${report.areaCount} area${report.areaCount === 1 ? "" : "s"}</p><div class="table-wrap"><table><caption>Crop history report</caption><thead><tr>${heading}</tr></thead><tbody>${rows}</tbody></table></div></main></body></html>`;
  return new Blob([document], { type: "text/html;charset=utf-8" });
}
