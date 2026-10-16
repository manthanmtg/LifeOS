import ExcelJS from "exceljs";
import type { CropExportReport } from "./export-data";

export async function renderCropExportXlsx(report: CropExportReport) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Crop History", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 5 }],
  });
  sheet.mergeCells(1, 1, 1, Math.max(4, report.periods.length + 3));
  sheet.getCell("A1").value = `${report.cropName} crop history`;
  sheet.getCell("A1").font = { bold: true, size: 16 };
  sheet.getCell("A2").value =
    `Generated ${report.generatedAt} (${report.timeZone})`;
  sheet.getCell("A3").value =
    `${report.periods.length} periods · ${report.areaCount} areas`;
  sheet.addRow([]);
  const header = sheet.addRow(["Group", "Metric", "Unit", ...report.periods]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF27272A" },
  };
  for (const row of report.rows) {
    const added = sheet.addRow([row.group, row.label, row.unit, ...row.values]);
    for (let index = 0; index < row.values.length; index += 1) {
      const cell = added.getCell(index + 4);
      if (typeof row.values[index] === "number")
        cell.numFmt =
          row.format === "currency"
            ? '"INR "#,##0'
            : row.format === "percentage"
              ? '0.#"%"'
              : "#,##0.#";
    }
    if (row.section === "total" || row.section === "calculated")
      added.font = { bold: true };
  }
  sheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 22 : index === 1 ? 28 : index === 2 ? 18 : 20;
    column.alignment = { vertical: "top", wrapText: true };
  });
  const bytes = await workbook.xlsx.writeBuffer();
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
