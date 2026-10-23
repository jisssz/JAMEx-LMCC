import test from 'node:test';
import assert from 'node:assert';
import { evaluateImageQualityFromData } from '../src/utils/imageQualityGate';
import { compareOriginalAndEnhancedOcr } from '../src/services/ocr/dualOcrComparator';

test('Image Quality Gate: Clean high-res synthetic frame passes evaluation', () => {
  const width = 800;
  const height = 600;
  const data = new Uint8ClampedArray(width * height * 4);

  // Fill with mid-tone with good contrast variation
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const val = (x % 20 < 10) ? 40 : 200; // Sharp edges / high contrast
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  const result = evaluateImageQualityFromData({ data, width, height } as unknown as ImageData, width, height);
  assert.ok(result.metrics.totalPixels >= 150000, 'Expected sufficient total pixels');
  assert.ok(result.metrics.sharpnessScore > 0, 'Expected non-zero sharpness');
});

test('Image Quality Gate: Severe underexposure generates actionable lighting guidance', () => {
  const width = 400;
  const height = 400;
  const data = new Uint8ClampedArray(width * height * 4);

  // Nearly pitch black
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 5;
    data[i + 1] = 5;
    data[i + 2] = 5;
    data[i + 3] = 255;
  }

  const result = evaluateImageQualityFromData({ data, width, height } as unknown as ImageData, width, height);
  assert.strictEqual(result.isUsable, false, 'Expected pitch black frame to be unusable');
  assert.ok(
    result.actionableGuidance.some((g) => g.toLowerCase().includes('dark') || g.toLowerCase().includes('light')),
    'Expected guidance to mention darkness or lighting'
  );
});

test('Dual OCR: Matches identical extractions without flagging human review', () => {
  const ocrText = `
    Parle-G Glucose Biscuits
    Net Qty: 250 g
    MRP Rs 25.00 (incl. of all taxes)
    Mfg Date: 03/2024
    Packed by: Parle Biscuits Pvt Ltd, Mumbai
    Customer Care: 1800-222-111
  `;

  const comparison = compareOriginalAndEnhancedOcr(ocrText, ocrText);

  assert.strictEqual(comparison.hasDisagreements, false, 'Should not have disagreements for identical text');
  assert.ok(comparison.matchedCount >= 4, 'Expected multiple matched fields');
  assert.strictEqual(comparison.disagreementCount, 0, 'Disagreement count should be 0');
  assert.strictEqual(comparison.confidenceScore, 100, 'Confidence score should be 100');
});

test('Dual OCR: Enhancement recovers missing MRP and preserves provenance', () => {
  // Original has smudged/missing MRP
  const originalText = `
    Parle-G Glucose Biscuits
    Net Qty: 250 g
    Mfg Date: 03/2024
    Packed by: Parle Biscuits Pvt Ltd, Mumbai
  `;

  // Enhanced copy cleanly extracted MRP
  const enhancedText = `
    Parle-G Glucose Biscuits
    Net Qty: 250 g
    MRP Rs 30.00 incl. of all taxes
    Mfg Date: 03/2024
    Packed by: Parle Biscuits Pvt Ltd, Mumbai
  `;

  const comparison = compareOriginalAndEnhancedOcr(originalText, enhancedText);

  assert.strictEqual(comparison.hasDisagreements, false, 'Recovered field should not be flagged as conflict');
  assert.ok(comparison.recoveredCount >= 1, 'Expected at least 1 recovered field');
  
  const mrpComp = comparison.comparisons.find((c) => c.fieldName === 'mrp');
  assert.ok(mrpComp, 'Expected MRP comparison entry');
  assert.strictEqual(mrpComp?.status, 'RECOVERED_BY_ENHANCEMENT');
  assert.ok(mrpComp?.selectedValue.includes('30.00'), 'Selected value should take recovered MRP');
  assert.ok(comparison.unifiedParsed.mrp?.includes('30.00'), 'Unified label should contain recovered MRP');
});

test('Dual OCR: Disagreement on critical statutory field (MRP mismatch) flags Human Review', () => {
  const originalText = `
    Parle-G Glucose Biscuits
    Net Qty: 250 g
    MRP Rs 25.00
    Mfg Date: 03/2024
    Packed by: Parle Biscuits Pvt Ltd
  `;

  const enhancedText = `
    Parle-G Glucose Biscuits
    Net Qty: 250 g
    MRP Rs 35.00
    Mfg Date: 03/2024
    Packed by: Parle Biscuits Pvt Ltd
  `;

  const comparison = compareOriginalAndEnhancedOcr(originalText, enhancedText);

  assert.strictEqual(comparison.hasDisagreements, true, 'MRP mismatch must be flagged as disagreement');
  assert.strictEqual(comparison.disagreementCount, 1, 'Expected 1 disagreement');

  const mrpComp = comparison.comparisons.find((c) => c.fieldName === 'mrp');
  assert.ok(mrpComp, 'Expected MRP comparison entry');
  assert.strictEqual(mrpComp?.status, 'DISAGREEMENT');
  assert.strictEqual(mrpComp?.requiresHumanReview, true, 'MRP disagreement must require human review');
  assert.strictEqual(mrpComp?.selectedValue, '₹25.00', 'Original evidence value must be selected by default');
});
