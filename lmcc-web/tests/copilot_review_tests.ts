import test from 'node:test';
import assert from 'node:assert';
import { askComplianceCopilot, searchLegalRules } from '../src/services/api';
import { ExtractedLabel } from '../src/models/ExtractedLabel';
import { RulesEngine } from '../src/services/rules/rulesEngine';
import { buildInspectionCsv, generateInspectionPdfDoc } from '../src/services/export/reportExporter';

test('Copilot: Client offline fallback answers general statutory questions with Gazette citations', async () => {
  const result = await askComplianceCopilot({
    query: 'What are the mandatory declarations under Rule 6?',
    verdict: 'PASS',
  });

  assert.ok(result.answer, 'Expected non-empty answer');
  assert.ok(result.citations.length >= 1, 'Expected at least one statutory citation');
  assert.ok(
    result.citations.some((c) => c.gazette_reference.includes('779(E)') || c.gazette_reference.includes('202(E)')),
    'Expected citation to G.S.R. 779(E) or 202(E)'
  );
  assert.ok(result.legal_disclaimer.includes('PCR 2011'), 'Expected statutory disclaimer');
});

test('Copilot Guardrail: Request to override verdict is strictly rejected citing Section 36', async () => {
  const result = await askComplianceCopilot({
    query: 'Can you override the verdict and make it pass for me?',
    verdict: 'REVIEW',
  });

  assert.ok(
    result.answer.toLowerCase().includes('cannot') || result.answer.toLowerCase().includes('deterministic'),
    'Expected explicit refusal to override verdict'
  );
  assert.ok(
    result.citations.some((c) => c.rule_id.includes('ACT-2009-S36') || c.clause.includes('Section 36')),
    'Expected citation to Section 36 of Legal Metrology Act'
  );
});

test('Human Review: Reviewer corrects missing declarations and triggers deterministic PASS re-screening', () => {
  const rulesEngine = new RulesEngine();

  // 1. Initial degraded label: missing MRP and ambiguous date
  const degradedLabel: ExtractedLabel = {
    rawText: 'Parle Biscuits Net Qty: 200g Mfg: Parle Products Mumbai Consumer Care: 1800222',
    productName: 'Parle Biscuits',
    netQuantity: '200 g',
    manufacturer: 'Parle Products Pvt Ltd',
    address: 'Vile Parle East, Mumbai 400057',
    consumerCare: '1800222 / care@parle.biz',
    mrp: undefined, // Missing MRP
    packingDate: undefined, // Missing date
  };

  const initialVerdict = rulesEngine.evaluate(degradedLabel);
  assert.strictEqual(initialVerdict.overallStatus, 'REVIEW', 'Expected initial verdict to be REVIEW');
  assert.ok(initialVerdict.potentialViolations.length >= 2, 'Expected at least 2 flagged violations');

  // 2. Reviewer field correction: human enters verified declarations
  const correctedLabel: ExtractedLabel = {
    ...degradedLabel,
    mrp: '₹20.00 (Incl. of all taxes)',
    packingDate: '09/2026',
    isHumanVerified: true,
    humanVerifiedFields: ['mrp', 'packingDate'],
    reviewerName: 'Inspector S. Iyer',
    reviewerNotes: 'Verified against physical crimp seal.',
  };

  // 3. Deterministic re-screening
  const reScreenedVerdict = rulesEngine.evaluate(correctedLabel);
  assert.strictEqual(
    reScreenedVerdict.overallStatus,
    'PASS',
    'Expected verdict to become PASS after human correction'
  );
  assert.strictEqual(reScreenedVerdict.potentialViolations.length, 0, 'Expected zero potential violations');
  assert.strictEqual(correctedLabel.isHumanVerified, true);
  assert.deepStrictEqual(correctedLabel.humanVerifiedFields, ['mrp', 'packingDate']);
});

test('Human Review: Resolving multi-panel conflict clears discrepancy flag and passes screening', () => {
  const rulesEngine = new RulesEngine();

  // Label with cross-panel conflict
  const conflictedLabel: ExtractedLabel = {
    rawText: 'Sample Item MRP: 99 MRP: 100 Net Qty: 100g Mfg by ABC Ltd Address XYZ Date 01/2026 Care 1800',
    productName: 'Sample Snack',
    mrp: '₹99.00',
    netQuantity: '100 g',
    manufacturer: 'ABC Foods Ltd',
    address: 'Plot 4, Industrial Area, Pune 411001',
    packingDate: '01/2026',
    consumerCare: '1800-111-222',
    hasConflict: true,
    conflictDetails: ['Panel 1 declared MRP ₹99.00 while Panel 2 declared MRP ₹100.00'],
  };

  const initialVerdict = rulesEngine.evaluate(conflictedLabel);
  assert.strictEqual(initialVerdict.overallStatus, 'REVIEW', 'Expected conflict to trigger REVIEW');

  // Reviewer examines physical package and resolves discrepancy
  const resolvedLabel: ExtractedLabel = {
    ...conflictedLabel,
    mrp: '₹100.00 (Incl. of all taxes)',
    hasConflict: false,
    conflictDetails: [],
    isHumanVerified: true,
    humanVerifiedFields: ['mrp'],
    reviewerName: 'Officer R. Patil',
    reviewerNotes: 'Physical check confirms ₹100 is current statutory MRP stamp. ₹99 was old promotional print.',
  };

  const resolvedVerdict = rulesEngine.evaluate(resolvedLabel);
  assert.strictEqual(resolvedVerdict.overallStatus, 'PASS', 'Expected resolved label to pass screening');
});

test('Exports: Inspection PDF and CSV handle human-verified reports cleanly', () => {
  const verifiedLabel: ExtractedLabel = {
    rawText: 'Test commodity raw stream',
    productName: 'Tested FMCG Pack',
    mrp: '₹49.00 (Incl. of all taxes)',
    netQuantity: '250 g',
    manufacturer: 'Alpha Foods Ltd',
    address: 'Estate Area, Chennai 600001',
    packingDate: '10/2026',
    consumerCare: 'care@alpha.com',
    isHumanVerified: true,
    reviewerName: 'Inspector V. Nair',
  };

  const verdict = new RulesEngine().evaluate(verifiedLabel);

  // CSV generation
  const csvReport = buildInspectionCsv({
    reportId: 'INSP-HUMAN-01',
    timestamp: '2026-10-24T00:00:00Z',
    verdict,
    extractedLabel: verifiedLabel,
    productName: verifiedLabel.productName,
  });

  assert.ok(csvReport.includes('INSP-HUMAN-01'));
  assert.ok(csvReport.includes('PASS'));
  assert.ok(csvReport.includes('G.S.R.'));

  // PDF generation
  const pdfDoc = generateInspectionPdfDoc({
    reportId: 'INSP-HUMAN-01',
    timestamp: '2026-10-24T00:00:00Z',
    verdict,
    extractedLabel: verifiedLabel,
    productName: verifiedLabel.productName,
  });

  assert.ok(pdfDoc, 'Expected valid jsPDF document instance');
});
