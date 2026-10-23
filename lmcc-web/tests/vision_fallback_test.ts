import test from 'node:test';
import assert from 'node:assert';
import {
  shouldOfferVisionFallback,
  mergeVisionExtractionWithLabel,
} from '../src/services/vision/visionFallbackService';
import { ExtractedLabel } from '../src/models/ExtractedLabel';
import { defaultRulesEngine } from '../src/services/rules/rulesEngine';

test('Vision Fallback Trigger: identifies POOR OCR quality and missing fields', () => {
  // Scenario 1: POOR quality
  const poorQualitySignal = shouldOfferVisionFallback({
    ocrQuality: 'POOR',
    confidence: 45,
    extractedLabel: { mrp: 'Rs 50' },
  });
  assert.strictEqual(poorQualitySignal.recommended, true);
  assert.ok(poorQualitySignal.reason?.includes('Low OCR clarity'));

  // Scenario 2: Low confidence (<65%)
  const lowConfidenceSignal = shouldOfferVisionFallback({
    ocrQuality: 'FAIR',
    confidence: 60,
    extractedLabel: { mrp: 'Rs 50' },
  });
  assert.strictEqual(lowConfidenceSignal.recommended, true);

  // Scenario 3: Multiple missing statutory fields
  const missingFieldsSignal = shouldOfferVisionFallback({
    ocrQuality: 'FAIR',
    confidence: 78,
    extractedLabel: { mrp: 'Rs 50' }, // missing Net Qty, Mfg, Dates, Care
  });
  assert.strictEqual(missingFieldsSignal.recommended, true);
  assert.ok(missingFieldsSignal.targetFields.length >= 2);

  // Scenario 4: Clean, high-quality complete scan -> NO fallback needed
  const cleanSignal = shouldOfferVisionFallback({
    ocrQuality: 'GOOD',
    confidence: 94,
    extractedLabel: {
      mrp: '₹99.00 (Incl. of all taxes)',
      netQuantity: { value: 200, unit: 'g' },
      manufacturer: 'Britannia Industries Ltd',
      dateOfManufacture: '08/2026',
      consumerCare: { contact: '1800-425-4449' },
    },
  });
  assert.strictEqual(cleanSignal.recommended, false);
});

test('Vision Fallback Merge: safely enriches missing declarations without overriding high-confidence facts', () => {
  const baseLabel: ExtractedLabel = {
    productName: 'Parle-G Gold',
    mrp: '₹20.00 (Incl. of all taxes)',
    // Missing manufacturer and consumer care
  };

  const visionMockResponse = {
    product_name: { value: 'Parle-G Gold', confidence: 0.95, status: 'detected' as const },
    mrp: { value: '₹20.00 (Incl. of all taxes)', confidence: 0.98, status: 'detected' as const },
    net_quantity: { value: '150 g', confidence: 0.92, status: 'detected' as const },
    manufacturer: { value: 'Parle Products Pvt Ltd, Vile Parle, Mumbai 400057', confidence: 0.94, status: 'detected' as const },
    date_declaration: { value: '09/2026', confidence: 0.91, status: 'detected' as const },
    consumer_care: { value: '1800-222-211 / cs@parle.biz', confidence: 0.93, status: 'detected' as const },
    provider_used: 'mock',
    is_ai_fallback: true,
    provenance: 'AI Vision-Assisted Fallback',
    disclaimer: 'Advisory only.',
  };

  const merged = mergeVisionExtractionWithLabel(baseLabel, visionMockResponse);

  assert.ok(merged.mrp?.includes('20.00'), 'MRP must be populated');
  assert.ok(merged.netQuantity?.includes('150'), 'Net quantity must be populated');
  assert.ok(merged.manufacturer?.includes('Parle'), 'Manufacturer must be populated');
  assert.ok(merged.packingDate?.includes('09/2026') || merged.manufactureDate?.includes('09/2026'), 'Date must be populated');
  assert.ok(merged.consumerCare?.includes('1800') || merged.email?.includes('parle.biz'), 'Consumer care must be populated');

  // Verify that deterministic rules engine produces compliant PASS on the reviewed declarations
  const verdict = defaultRulesEngine.evaluate(merged);
  assert.strictEqual(verdict.overallStatus, 'PASS', 'Merged declarations must be deterministically evaluated by RulesEngine');
});
