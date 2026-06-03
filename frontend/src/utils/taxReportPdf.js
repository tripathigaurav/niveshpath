import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatINR } from './formatters'

export function downloadTaxReportPdf(report, fyLabel) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(`Tax Summary — FY ${fyLabel}`, 14, 16)
  doc.setFontSize(9)
  doc.text(report.disclaimer, 14, 24, { maxWidth: 180 })

  const body = report.rows.map((r) => [
    r.saleDate,
    r.symbol,
    String(r.qty),
    formatINR(r.proceeds),
    formatINR(r.costBasis),
    formatINR(r.gain),
    r.taxType,
    formatINR(r.taxDue),
  ])

  autoTable(doc, {
    startY: 32,
    head: [['Date', 'Symbol', 'Qty', 'Proceeds', 'Cost', 'Gain', 'Type', 'Tax']],
    body,
    styles: { fontSize: 8 },
  })

  const finalY = doc.lastAutoTable?.finalY ?? 40
  doc.text(`STCG total: ${formatINR(report.summary.totalStcg)}`, 14, finalY + 8)
  doc.text(`LTCG total: ${formatINR(report.summary.totalLtcg)}`, 14, finalY + 14)
  doc.text(`Estimated tax: ${formatINR(report.summary.estimatedTax)}`, 14, finalY + 20)
  doc.save(`tax-report-fy-${fyLabel}.pdf`)
}
