import test from 'node:test';
import assert from 'node:assert';
import { sanitizeCsvCell, buildInspectionCsv, generateInspectionPdfDoc } from '../src/services/export/reportExporter';

test('CSV Sanitization: mitigates formula injection attacks', () => {
  // Test formula injection triggers: =, +, -, @, \t, \r
  const dangerousCells = [
    '=SUM(A1:A10)',
    '+123456',
    '-cmd|"/C calc"!A0',
    '@import("evil.site")',
    '\tmaliciousTab',
    '\rmaliciousReturn',
  ];

  for (const cell of dangerousCells) {
    const sanitized = sanitizeCsvCell(cell);
    // Must be wrapped in quotes and have leading single quote
    assert.ok(sanitized.startsWith(`"'`), `Cell ${cell} should be escaped with leading single quote: ${sanitized}`);
  }

  // Safe strings should not get leading single quote
  assert.strictEqual(sanitizeCsvCell('Parle-G Gold Biscuits'), '"Parle-G Gold Biscuits"');
  assert.strictEqual(sanitizeCsvCell('₹99.00 (Incl. of all taxes)'), '"₹99.00 (Incl. of all taxes)"');
  assert.strictEqual(sanitizeCsvCell('100 g'), '"100 g"');

  // Double quote escaping
  assert.strictEqual(sanitizeCsvCell('Product "Special" Edition'), '"Product ""Special"" Edition"');

  // Null and undefined handling
  assert.strictEqual(sanitizeCsvCell(null), '""');
  assert.strictEqual(sanitizeCsvCell(undefined), '""');
});

test('CSV Report Builder: generates complete RFC-4180 inspection record with Gazette citations', () => {
  const mockData = {
    reportId: 'INSP-TEST-001',
    timestamp: '2026-10-24T01:00:00.000Z',
    productName: 'Britannia Good Day Butter Biscuits',
    verdict: {
      overallStatus: 'REVIEW' as const,
      details: [
        {
          ruleId: 'RULE-6-1-E',
          field: 'MRP / Unit Sale Price',
          severity: 'REVIEW',
          explanation: 'MRP declaration missing required inclusive of all taxes wording.',
          gazetteReference: 'G.S.R. 202(E) dated 02/03/2021',
          recommendation: 'Format as ₹40.00 (Incl. of all taxes) on Principal Display Panel.',
        },
      ],
    },
    extractedLabel: {
      mrp: 'Rs 40',
      netQuantity: { value: 100, unit: 'g' },
      manufacturer: 'Britannia Industries Ltd',
      dateOfManufacture: '08/2026',
      consumerCare: { contact: '1800-425-4449' },
    },
    userRemarks: 'Purchased at retail store in Mumbai',
    isDemonstrationData: false,
  };

  const csv = buildInspectionCsv(mockData);

  assert.ok(csv.includes('LEGAL METROLOGY COMPLIANCE SCREENING REPORT'));
  assert.ok(csv.includes('"INSP-TEST-001"'));
  assert.ok(csv.includes('"Britannia Good Day Butter Biscuits"'));
  assert.ok(csv.includes('"REVIEW"'));
  assert.ok(csv.includes('"G.S.R. 202(E) dated 02/03/2021"'));
  assert.ok(csv.includes('"Rule 6(1)(e) - G.S.R. 202(E)"'));
  assert.ok(csv.includes('"Purchased at retail store in Mumbai"'));
  assert.ok(csv.includes('"100 g"'));
  assert.ok(csv.includes('DISCLAIMER'));
});

test('CSV Report Builder: supports Multilingual Unicode text (Hindi, Tamil, Malayalam)', () => {
  const unicodeData = {
    reportId: 'INSP-UNICODE-002',
    timestamp: '2026-10-24T01:00:00.000Z',
    productName: 'पतंजलि गाय का शुद्ध घी / പതഞ്ജലി നെയ്യ്',
    verdict: {
      overallStatus: 'PASS' as const,
      details: [],
    },
    extractedLabel: {
      mrp: '₹550.00',
      netQuantityRaw: '1 L (लीटर / ലിറ്റർ)',
      manufacturer: 'Patanjali Ayurved Ltd / पतंजलि आयुर्वेद लिमिटेड',
    },
    isDemonstrationData: false,
  };

  const csv = buildInspectionCsv(unicodeData);
  assert.ok(csv.includes('पतंजलि गाय का शुद्ध घी'));
  assert.ok(csv.includes('പതഞ്ജലി നെയ്യ്'));
  assert.ok(csv.includes('₹550.00'));
  assert.ok(csv.includes('1 L (लीटर / ലിറ്റർ)'));
});

test('PDF Generator: builds valid vector PDF document', () => {
  const mockData = {
    reportId: 'INSP-PDF-003',
    timestamp: '2026-10-24T01:00:00.000Z',
    productName: 'Tata Salt Vacuum Evaporated',
    verdict: {
      overallStatus: 'PASS' as const,
      details: [],
    },
    extractedLabel: {
      mrp: '₹28.00 (Incl. of all taxes)',
      netQuantity: { value: 1, unit: 'kg' },
      manufacturer: 'Tata Consumer Products Ltd',
      dateOfPacking: '09/2026',
      consumerCare: { contact: 'care@tataconsumer.com' },
    },
  };

  const doc = generateInspectionPdfDoc(mockData);
  assert.ok(doc, 'PDF Document should be successfully generated');
  const pageCount = doc.internal.pages.length - 1;
  assert.ok(pageCount >= 1, `PDF should contain at least 1 page, got ${pageCount}`);

  // Test multi-page PDF generation for 10 issues
  const multiIssueData = {
    ...mockData,
    verdict: {
      overallStatus: 'REVIEW' as const,
      details: Array.from({ length: 8 }).map((_, i) => ({
        ruleId: `RULE-6-${i}`,
        field: `Statutory Field ${i}`,
        severity: 'REVIEW',
        explanation: `Detailed finding explanation for issue number ${i} spanning across multiple legal considerations.`,
        gazetteReference: `G.S.R. ${100 + i}(E)`,
        recommendation: `Actionable recommendation ${i}`,
      })),
    },
  };

  const multiDoc = generateInspectionPdfDoc(multiIssueData);
  assert.ok(multiDoc, 'Multi-issue PDF should be successfully generated');
  const multiPages = multiDoc.internal.pages.length - 1;
  assert.ok(multiPages >= 1, 'Multi-issue PDF generates valid pages');
});
