import { jsPDF } from 'jspdf';
import { ExtractedLabel } from '../../models/ExtractedLabel';
import { Verdict } from '../../models/Verdict';

export interface InspectionExportData {
  reportId: string;
  timestamp: string;
  verdict: Verdict | { overallStatus: 'PASS' | 'REVIEW'; summary?: string; details?: any[] };
  extractedLabel: ExtractedLabel | Record<string, any>;
  productName?: string;
  userRemarks?: string;
  isDemonstrationData?: boolean;
}

/**
 * Sanitizes CSV cell values to prevent CSV / Spreadsheet Formula Injection (OWASP mitigation).
 * If a cell value begins with '=', '+', '-', '@', '\t', or '\r', a leading single quote is prepended.
 */
export function sanitizeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (!str.trim()) return '""';

  // Mitigate Excel/Spreadsheet formula injection
  // Check both raw string and whitespace-trimmed string
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  const trimmed = str.trimStart();
  const startsWithTrigger = formulaTriggers.some((trigger) => str.startsWith(trigger) || trimmed.startsWith(trigger));

  if (startsWithTrigger) {
    str = `'${str.trim()}`;
  } else {
    str = str.trim();
  }

  // Escape existing double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Builds a RFC-4180 compliant CSV string for an individual inspection report.
 */
export function buildInspectionCsv(data: InspectionExportData): string {
  const lines: string[] = [];

  lines.push([sanitizeCsvCell('LEGAL METROLOGY COMPLIANCE SCREENING REPORT (LMPC 2011 RULE 6)')].join(','));
  lines.push([sanitizeCsvCell('Report ID'), sanitizeCsvCell(data.reportId)].join(','));
  lines.push([sanitizeCsvCell('Timestamp'), sanitizeCsvCell(data.timestamp)].join(','));
  lines.push([sanitizeCsvCell('Product / SKU'), sanitizeCsvCell(data.productName || 'Unspecified Commodity')].join(','));
  lines.push([sanitizeCsvCell('Overall Verdict'), sanitizeCsvCell(data.verdict.overallStatus)].join(','));
  lines.push([sanitizeCsvCell('Data Mode'), sanitizeCsvCell(data.isDemonstrationData ? 'Demonstration Dataset' : 'Live Verified Inspection')].join(','));
  if (data.userRemarks) {
    lines.push([sanitizeCsvCell('User Notes'), sanitizeCsvCell(data.userRemarks)].join(','));
  }
  lines.push('');

  // Extracted Declarations
  lines.push([sanitizeCsvCell('MANDATORY STATUTORY DECLARATIONS')].join(','));
  lines.push([
    sanitizeCsvCell('Field'),
    sanitizeCsvCell('Extracted Declaration Value'),
    sanitizeCsvCell('Statutory Status'),
    sanitizeCsvCell('Legal Provision'),
  ].join(','));

  const l = data.extractedLabel as any;
  lines.push([
    sanitizeCsvCell('Maximum Retail Price (MRP)'),
    sanitizeCsvCell(l.mrp || 'NOT DETECTED'),
    sanitizeCsvCell(l.mrp ? 'DECLARED' : 'MISSING / UNCLEAR'),
    sanitizeCsvCell('Rule 6(1)(e) - G.S.R. 202(E)'),
  ].join(','));

  lines.push([
    sanitizeCsvCell('Net Quantity'),
    sanitizeCsvCell(l.netQuantity ? `${l.netQuantity.value ?? ''} ${l.netQuantity.unit ?? ''}`.trim() : (l.netQuantityRaw || 'NOT DETECTED')),
    sanitizeCsvCell(l.netQuantity ? 'DECLARED' : 'MISSING / UNCLEAR'),
    sanitizeCsvCell('Rule 6(1)(c) & Rule 7 (Standard Units)'),
  ].join(','));

  lines.push([
    sanitizeCsvCell('Manufacturer / Packer'),
    sanitizeCsvCell(l.manufacturer || 'NOT DETECTED'),
    sanitizeCsvCell(l.manufacturer ? 'DECLARED' : 'MISSING / UNCLEAR'),
    sanitizeCsvCell('Rule 6(1)(a) & 6(1)(b)'),
  ].join(','));

  lines.push([
    sanitizeCsvCell('Manufacturing / Packing Date'),
    sanitizeCsvCell(l.dateOfManufacture || l.dateOfPacking || l.datesRaw || 'NOT DETECTED'),
    sanitizeCsvCell(l.dateOfManufacture || l.dateOfPacking ? 'DECLARED' : 'MISSING / UNCLEAR'),
    sanitizeCsvCell('Rule 6(1)(d) - G.S.R. 359(E)'),
  ].join(','));

  lines.push([
    sanitizeCsvCell('Consumer Care Helpline'),
    sanitizeCsvCell(l.consumerCare?.contact || l.consumerCareRaw || 'NOT DETECTED'),
    sanitizeCsvCell(l.consumerCare ? 'DECLARED' : 'MISSING / UNCLEAR'),
    sanitizeCsvCell('Rule 6(1)(g) - Name, Address, Tel, Email'),
  ].join(','));

  lines.push('');

  // Compliance Findings
  const issues = (data.verdict as any).details || (data.verdict as any).issues || [];
  lines.push([sanitizeCsvCell('STATUTORY FINDINGS & GAZETTE CITATIONS')].join(','));
  lines.push([
    sanitizeCsvCell('Rule ID'),
    sanitizeCsvCell('Statutory Field'),
    sanitizeCsvCell('Issue Severity'),
    sanitizeCsvCell('Finding Explanation'),
    sanitizeCsvCell('Gazette Citation'),
    sanitizeCsvCell('Recommended Correction'),
  ].join(','));

  if (issues.length === 0) {
    lines.push([
      sanitizeCsvCell('RULE-6-OK'),
      sanitizeCsvCell('All Declarations'),
      sanitizeCsvCell('PASS'),
      sanitizeCsvCell('All mandatory Rule 6 declarations detected with standard statutory phrasing.'),
      sanitizeCsvCell('Legal Metrology (Packaged Commodities) Rules, 2011'),
      sanitizeCsvCell('Compliant. No corrective action required.'),
    ].join(','));
  } else {
    for (const issue of issues) {
      lines.push([
        sanitizeCsvCell(issue.ruleId || 'RULE-6'),
        sanitizeCsvCell(issue.field || issue.title || 'Declaration'),
        sanitizeCsvCell(issue.severity || 'REVIEW'),
        sanitizeCsvCell(issue.explanation || issue.description || ''),
        sanitizeCsvCell(issue.gazetteReference || issue.source || 'LMPC 2011'),
        sanitizeCsvCell(issue.recommendation || 'Print declaration prominently on Principal Display Panel.'),
      ].join(','));
    }
  }

  lines.push('');
  lines.push([
    sanitizeCsvCell('DISCLAIMER'),
    sanitizeCsvCell(
      'This report reflects automated optical screening under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. Results are evidence-based advisory indicators for internal quality assurance and do not constitute an official judicial compliance verdict.'
    ),
  ].join(','));

  return lines.join('\r\n');
}

/**
 * Triggers browser download of the inspection report as a sanitized CSV file.
 */
export function exportInspectionReportCsv(data: InspectionExportData, filename?: string): void {
  const csvContent = buildInspectionCsv(data);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `LMCC_Inspection_${data.reportId.slice(0, 8)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a clean, multi-page PDF document representing the official inspection report.
 */
export function generateInspectionPdfDoc(data: InspectionExportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('LEGAL METROLOGY COMPLIANCE SCREENING REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Rule 6 • Legal Metrology (Packaged Commodities) Rules, 2011 • Department of Consumer Affairs', margin, 18);
  doc.text(`Report ID: ${data.reportId}  |  Generated: ${new Date(data.timestamp).toLocaleString()}`, margin, 23);

  y = 36;

  // Verdict Banner
  const isPass = data.verdict.overallStatus === 'PASS';
  doc.setFillColor(isPass ? 240 : 254, isPass ? 253 : 242, isPass ? 244 : 242);
  doc.setDrawColor(isPass ? 34 : 239, isPass ? 197 : 68, isPass ? 94 : 68);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(isPass ? 22 : 185, isPass ? 101 : 28, isPass ? 52 : 28);
  doc.text(`VERDICT: ${data.verdict.overallStatus} — ${isPass ? 'COMPLIANT WITH RULE 6' : 'ADVISORY REVIEW REQUIRED'}`, margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    isPass
      ? 'All mandatory statutory declarations detected with standard legal wording.'
      : 'One or more mandatory declarations are missing, fragmented, or ambiguous. Human verification recommended.',
    margin + 5,
    y + 14
  );

  y += 24;

  // Commodity Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. COMMODITY & PACKAGING IDENTIFIERS', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Product Name / SKU: ${data.productName || 'Unspecified Package'}`, margin + 2, y);
  y += 4.5;
  if (data.userRemarks) {
    doc.text(`User Inspection Notes: ${data.userRemarks}`, margin + 2, y);
    y += 4.5;
  }
  doc.text(`Data Source: ${data.isDemonstrationData ? 'Demonstration Reference Dataset' : 'Verified Optical Scan'}`, margin + 2, y);
  y += 8;

  // Mandatory Declarations Summary Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. MANDATORY STATUTORY DECLARATIONS (RULE 6)', margin, y);
  y += 6;

  const l = data.extractedLabel as any;
  const declarations = [
    { field: 'MRP (Incl. of all taxes)', val: l.mrp || 'NOT DETECTED', rule: 'Rule 6(1)(e)' },
    {
      field: 'Net Quantity (Standard Unit)',
      val: l.netQuantity ? `${l.netQuantity.value ?? ''} ${l.netQuantity.unit ?? ''}`.trim() : (l.netQuantityRaw || 'NOT DETECTED'),
      rule: 'Rule 6(1)(c) & R-7',
    },
    { field: 'Manufacturer / Packer', val: l.manufacturer || 'NOT DETECTED', rule: 'Rule 6(1)(a)-(b)' },
    { field: 'Mfg / Packing Date', val: l.dateOfManufacture || l.dateOfPacking || l.datesRaw || 'NOT DETECTED', rule: 'Rule 6(1)(d)' },
    { field: 'Consumer Care Helpline', val: l.consumerCare?.contact || l.consumerCareRaw || 'NOT DETECTED', rule: 'Rule 6(1)(g)' },
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Statutory Declaration', margin + 3, y + 4.2);
  doc.text('Extracted Label Value', margin + 60, y + 4.2);
  doc.text('Legal Provision', margin + 140, y + 4.2);
  y += 6;

  doc.setFont('helvetica', 'normal');
  for (const d of declarations) {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);
    doc.setTextColor(30, 41, 59);
    doc.text(d.field, margin + 3, y + 4.2);
    const isMissing = d.val === 'NOT DETECTED';
    doc.setTextColor(isMissing ? 220 : 30, isMissing ? 38 : 41, isMissing ? 38 : 59);
    doc.text(doc.splitTextToSize(d.val, 75)[0] || 'NOT DETECTED', margin + 60, y + 4.2);
    doc.setTextColor(100, 116, 139);
    doc.text(d.rule, margin + 140, y + 4.2);
    y += 6;
  }

  y += 8;

  // Findings & Legal Gazette Citations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. STATUTORY FINDINGS & GAZETTE CITATIONS', margin, y);
  y += 6;

  const issues = (data.verdict as any).details || (data.verdict as any).issues || [];

  if (issues.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text('Zero statutory non-compliances detected. Packaging label satisfies Rule 6 declarations.', margin + 4, y + 7);
    y += 18;
  } else {
    for (const issue of issues) {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(margin, y, contentWidth, 16, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(153, 27, 27);
      doc.text(`[${issue.severity || 'REVIEW'}] ${issue.field || issue.title || 'Declaration Issue'}`, margin + 3, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const explanationLines = doc.splitTextToSize(issue.explanation || issue.description || '', contentWidth - 8);
      doc.text(explanationLines[0] || '', margin + 3, y + 9.5);

      doc.setTextColor(148, 163, 184);
      doc.text(`Gazette Citation: ${issue.gazetteReference || issue.source || 'LMPC 2011 Rule 6'}`, margin + 3, y + 13.5);

      y += 19;
    }
  }

  // Legal Disclaimer Footer
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, margin + contentWidth, footerY - 2);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  const disclaimer =
    'Advisory Screening Notice: This report was generated via automated optical screening under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. Results indicate regulatory compliance risks and do not replace formal inspections under the Legal Metrology Act, 2009.';
  doc.text(doc.splitTextToSize(disclaimer, contentWidth), margin, footerY + 2);

  return doc;
}

/**
 * Triggers browser download of the inspection report as a vector PDF document.
 */
export function exportInspectionReportPdf(data: InspectionExportData, filename?: string): void {
  const doc = generateInspectionPdfDoc(data);
  doc.save(filename || `LMCC_Inspection_${data.reportId.slice(0, 8)}.pdf`);
}
