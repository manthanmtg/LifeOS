import "server-only";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExpenseSpaceReport } from "./report";

const MARGIN = 14;

function section(doc: jsPDF, title: string, y: number) {
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text(title, MARGIN, y);
  return y + 6;
}

function breakdownTable(
  doc: jsPDF,
  title: string,
  rows: Array<{ name: string; formattedAmount: string; count: number }>,
  startY: number,
) {
  section(doc, title, startY);
  autoTable(doc, {
    startY: startY + 4,
    head: [["Name", "Transactions", "Amount"]],
    body: rows.map((row) => [row.name, String(row.count), row.formattedAmount]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [39, 39, 42] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 10;
}

export function renderExpenseSpaceReportPdf(report: ExpenseSpaceReport): Uint8Array {
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: false });
  doc.setFillColor(39, 39, 42);
  doc.rect(0, 0, 210, 8, "F");
  doc.setFontSize(20);
  doc.setTextColor(24, 24, 27);
  doc.text(report.spaceName, MARGIN, 22);
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91);
  doc.text(`Expense Space report · ${report.generatedAt.toISOString().slice(0, 10)}`, MARGIN, 29);
  doc.text(`Total ${report.ledger[0]?.formattedAmount.replace(/[\d,.-]/g, "").trim() ?? report.currency}${report.metrics.total.toLocaleString("en-IN")}`, MARGIN, 36);
  const ledgerY = section(doc, "Expense ledger", 46);
  autoTable(doc, {
    startY: ledgerY,
    head: [["Date", "Description", "Paid to", "Category", "Subcategory", "Payment", "Amount"]],
    body: report.ledger.length
      ? report.ledger.map((row) => [row.date, row.description, row.paidTo, row.category, row.subcategory, row.paymentMethod, row.formattedAmount])
      : [["", "No expenses recorded in this space.", "", "", "", "", ""]],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: [39, 39, 42] },
    columnStyles: { 6: { halign: "right" } },
    margin: { left: MARGIN, right: MARGIN },
  });
  doc.addPage();
  let y = 20;
  y = breakdownTable(doc, "Category breakdown", report.categoryBreakdown, y) + 12;
  y = breakdownTable(doc, "Subcategory breakdown", report.subcategoryBreakdown, y) + 12;
  if (y > 245) {
    doc.addPage();
    y = 20;
  }
  y = breakdownTable(doc, "Top payees", report.payeeBreakdown.slice(0, 10), y) + 12;
  y = breakdownTable(doc, "Payment methods", report.paymentMethodBreakdown, y) + 12;
  breakdownTable(doc, "Monthly spend", report.monthlyBreakdown, y);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`Generated ${report.generatedAt.toISOString().slice(0, 10)} · Page ${page} of ${pages}`, MARGIN, 290);
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
