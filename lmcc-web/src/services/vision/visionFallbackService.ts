import { ExtractedLabel } from '../../models/ExtractedLabel';
import { VisionExtractionResponse } from '../api';
import { parseLabel } from '../parser/fieldParser';

export interface QualityAssessmentSignals {
  ocrQuality: 'GOOD' | 'FAIR' | 'POOR';
  confidence: number;
  extractedLabel?: ExtractedLabel;
  missingMandatoryFields?: string[];
}

/**
 * Evaluates whether an automated scan should prompt for AI Vision Extraction Fallback.
 * Triggered when OCR quality is POOR, confidence is under 65%, or mandatory fields are missing.
 */
export function shouldOfferVisionFallback(signals: QualityAssessmentSignals): {
  recommended: boolean;
  reason?: string;
  targetFields: string[];
} {
  const targetFields: string[] = [];
  const label = signals.extractedLabel;

  if (!label?.mrp) targetFields.push('MRP');
  if (!label?.netQuantity) targetFields.push('Net Quantity');
  if (!label?.manufacturer) targetFields.push('Manufacturer');
  if (!label?.packingDate && !label?.manufactureDate) targetFields.push('Date Declaration');
  if (!label?.consumerCare) targetFields.push('Consumer Care');

  if (signals.ocrQuality === 'POOR') {
    return {
      recommended: true,
      reason: 'Low OCR clarity or high image noise detected on packaging stamp.',
      targetFields,
    };
  }

  if (signals.confidence < 65) {
    return {
      recommended: true,
      reason: `Low OCR recognition confidence (${Math.round(signals.confidence)}%).`,
      targetFields,
    };
  }

  if (targetFields.length >= 2) {
    return {
      recommended: true,
      reason: `${targetFields.length} statutory declarations were not clearly detected by client OCR.`,
      targetFields,
    };
  }

  return { recommended: false, targetFields: [] };
}

/**
 * Merges AI vision extraction result with client-extracted label, preserving field provenance.
 */
export function mergeVisionExtractionWithLabel(
  baseLabel: ExtractedLabel,
  visionResult: VisionExtractionResponse
): ExtractedLabel {
  const lines: string[] = [];

  // Synthesize clean declaration lines from vision results
  if (visionResult?.product_name?.value) {
    lines.push(visionResult.product_name.value);
  } else if (baseLabel.productName) {
    lines.push(baseLabel.productName);
  }

  const mrpVal = visionResult?.mrp?.value || baseLabel.mrp;
  if (mrpVal) {
    lines.push(mrpVal.toLowerCase().includes('mrp') ? mrpVal : `MRP: ${mrpVal}`);
  }

  const netQtyVal = visionResult?.net_quantity?.value || baseLabel.netQuantity;
  if (netQtyVal) {
    lines.push(netQtyVal.toLowerCase().includes('net') ? netQtyVal : `Net Wt.: ${netQtyVal}`);
  }

  const dateVal = visionResult?.date_declaration?.value || baseLabel.packingDate || baseLabel.manufactureDate;
  if (dateVal) {
    lines.push(dateVal.toLowerCase().includes('mfd') || dateVal.toLowerCase().includes('pkd') ? dateVal : `MFD: ${dateVal}`);
  }

  const mfgVal = visionResult?.manufacturer?.value || baseLabel.manufacturer;
  if (mfgVal) {
    lines.push(mfgVal.toLowerCase().includes('mfg') || mfgVal.toLowerCase().includes('manufactured') ? mfgVal : `Mfg by: ${mfgVal}`);
  }

  const careVal = visionResult?.consumer_care?.value || baseLabel.consumerCare;
  if (careVal) {
    lines.push(careVal.toLowerCase().includes('care') || careVal.toLowerCase().includes('customer') ? careVal : `Customer Care: ${careVal}`);
  }

  const synthesizedText = lines.join('\n');
  const enriched = parseLabel(synthesizedText);

  return {
    ...baseLabel,
    ...enriched,
    rawText: [baseLabel.rawText, synthesizedText].filter(Boolean).join('\n---\n'),
  };
}
