import { formatExportValue, type CropExportReport } from "./export-data";

function pdfText(value: string) {
  const normalized = value
    .replace(/[₹]/g, "INR ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(normalized))
    throw new Error(
      "This PDF format cannot render some characters in these records. Download as Excel or HTML to preserve the text.",
    );
  return normalized;
}

export async function renderCropExportPdf(report: CropExportReport) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  doc.setFontSize(16);
  doc.text(pdfText(`${report.cropName} crop history`), 12, 14);
  doc.setFontSize(8);
  doc.text(
    pdfText(`Generated ${report.generatedAt} - ${report.timeZone}`),
    12,
    20,
  );
  autoTable(doc, {
    startY: 25,
    head: [["Group", "Metric", "Unit", ...report.periods.map(pdfText)]],
    body: report.rows.map((row) => [
      pdfText(row.group),
      pdfText(row.label),
      pdfText(row.unit),
      ...row.values.map((value) =>
        pdfText(formatExportValue(value, row.format)),
      ),
    ]),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.7, overflow: "linebreak" },
    headStyles: { fillColor: [39, 39, 42] },
    showHead: "everyPage",
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: [0, 1, 2],
    margin: { left: 12, right: 12, top: 25, bottom: 15 },
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    doc.text(`Page ${page} of ${pages}`, 12, 202);
  }
  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}
