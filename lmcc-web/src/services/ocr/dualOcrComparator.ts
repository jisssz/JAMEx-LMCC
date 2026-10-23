/**
 * Dual OCR Comparator Service for Evidence-Preserving Packaging Analysis.
 * 
 * Implements Stage 4 & Stage 5:
 * - Runs OCR on both original package photograph and enhanced working copy.
 * - Compares extracted mandatory declarations field-by-field.
 * - Detects matches, enhancements, and disagreements.
 * - Any disagreement on a critical statutory field (MRP, Net Qty, Date) is strictly
 *   flagged for Human Review.
 * - Both raw OCR texts and provenance are preserved.
 */

import { parseLabel } from '../parser/fieldParser';
import { ExtractedLabel } from '../../models/ExtractedLabel';

export type FieldComparisonStatus =
  | 'MATCH' // Both original and enhanced extracted identical value
  | 'RECOVERED_BY_ENHANCEMENT' // Original missed field, enhanced cleanly recovered it
  | 'ORIGINAL_ONLY' // Enhanced missed field, original had it
  | 'DISAGREEMENT' // Both extracted values, but they conflict
  | 'MISSING_IN_BOTH'; // Neither extraction found this field

export interface FieldComparisonResult {
  fieldName: string;
  fieldLabel: string;
  originalValue?: string;
  enhancedValue?: string;
  selectedValue: string;
  status: FieldComparisonStatus;
  requiresHumanReview: boolean;
  notes?: string;
}

export interface DualOcrComparisonSummary {
  originalRawOcr: string;
  enhancedRawOcr: string;
  originalParsed: ExtractedLabel;
  enhancedParsed: ExtractedLabel;
  unifiedParsed: ExtractedLabel;
  comparisons: FieldComparisonResult[];
  hasDisagreements: boolean;
  totalFieldsCompared: number;
  matchedCount: number;
  recoveredCount: number;
  disagreementCount: number;
  confidenceScore: number; // 0 - 100
}

/**
 * Normalizes text string for semantic comparison (case-insensitive, trims punctuation/spaces).
 */
function normalizeForComparison(val?: string): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .replace(/[₹\.,\-\/]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Compares two extracted label sets from original and enhanced image streams.
 */
export function compareOriginalAndEnhancedOcr(
  originalRawOcr: string,
  enhancedRawOcr: string
): DualOcrComparisonSummary {
  const originalParsed = parseLabel(originalRawOcr);
  const enhancedParsed = parseLabel(enhancedRawOcr);

  const fieldsToCheck: { key: keyof ExtractedLabel; label: string; isCritical: boolean }[] = [
    { key: 'mrp', label: 'Maximum Retail Price (MRP)', isCritical: true },
    { key: 'netQuantity', label: 'Net Quantity', isCritical: true },
    { key: 'manufactureDate', label: 'Date of Manufacture', isCritical: true },
    { key: 'packingDate', label: 'Date of Packing', isCritical: true },
    { key: 'manufacturer', label: 'Manufacturer / Packer Name', isCritical: true },
    { key: 'address', label: 'Registered Premises Address', isCritical: false },
    { key: 'consumerCare', label: 'Consumer Helpline / Contact', isCritical: false },
    { key: 'email', label: 'Consumer Email', isCritical: false },
    { key: 'importer', label: 'Importer Identity', isCritical: false },
  ];

  const comparisons: FieldComparisonResult[] = [];
  const unifiedParsed: ExtractedLabel = { ...originalParsed };

  let matchedCount = 0;
  let recoveredCount = 0;
  let disagreementCount = 0;

  for (const f of fieldsToCheck) {
    const origVal = (originalParsed[f.key] as string | undefined)?.trim();
    const enhVal = (enhancedParsed[f.key] as string | undefined)?.trim();

    const origNorm = normalizeForComparison(origVal);
    const enhNorm = normalizeForComparison(enhVal);

    let status: FieldComparisonStatus = 'MISSING_IN_BOTH';
    let selectedValue = '';
    let requiresReview = false;
    let notes: string | undefined;

    if (!origVal && !enhVal) {
      status = 'MISSING_IN_BOTH';
      selectedValue = '';
    } else if (origVal && !enhVal) {
      status = 'ORIGINAL_ONLY';
      selectedValue = origVal;
      (unifiedParsed as any)[f.key] = origVal;
    } else if (!origVal && enhVal) {
      status = 'RECOVERED_BY_ENHANCEMENT';
      selectedValue = enhVal;
      recoveredCount++;
      (unifiedParsed as any)[f.key] = enhVal;
      notes = 'Recovered from enhanced working copy (micro-print clarified)';
    } else if (origNorm === enhNorm) {
      status = 'MATCH';
      selectedValue = origVal || ''; // Both agree
      matchedCount++;
      (unifiedParsed as any)[f.key] = origVal;
    } else {
      // Conflict between original and enhanced OCR!
      status = 'DISAGREEMENT';
      disagreementCount++;
      requiresReview = true;
      // In a disagreement, we prioritize the original evidence by default but flag for mandatory human review
      selectedValue = origVal || enhVal || '';
      notes = `Discrepancy: Original detected '${origVal}', but enhanced working copy read '${enhVal}'. Requires officer transcription.`;
    }

    comparisons.push({
      fieldName: String(f.key),
      fieldLabel: f.label,
      originalValue: origVal,
      enhancedValue: enhVal,
      selectedValue,
      status,
      requiresHumanReview: requiresReview,
      notes,
    });
  }

  const hasDisagreements = disagreementCount > 0;
  const activeFieldsCount = comparisons.filter((c) => c.status !== 'MISSING_IN_BOTH').length;
  const confidenceScore =
    activeFieldsCount > 0
      ? Math.round(((matchedCount + recoveredCount * 0.8) / activeFieldsCount) * 100)
      : 50;

  return {
    originalRawOcr,
    enhancedRawOcr,
    originalParsed,
    enhancedParsed,
    unifiedParsed,
    comparisons,
    hasDisagreements,
    totalFieldsCompared: fieldsToCheck.length,
    matchedCount,
    recoveredCount,
    disagreementCount,
    confidenceScore,
  };
}
