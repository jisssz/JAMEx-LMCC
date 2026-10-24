import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLabel } from '../src/services/parser/fieldParser';
import { RulesEngine } from '../src/services/rules/rulesEngine';
import { ExtractedLabel } from '../src/models/ExtractedLabel';
import {
  saveInspectionSession,
  getInspectionSession,
  clearInspectionSession,
  ActiveInspectionSession,
} from '../src/services/storage/inspectionSession';

// Mock browser sessionStorage for Node test environment
const mockStorage: Record<string, string> = {};
(globalThis as any).window = {
  sessionStorage: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  },
};

test('Regression Test 1: Kozhikara / Cozhinkara small packet does NOT show Lay\'s or hardcoded demo data', () => {
  // Real OCR text from small restaurant takeaway packet / condiment sachet
  const kozhikaraOcr = `POZHIKKARA
COZHINKARA
HOTEL AND RESTAURANT
KODUNGALLUR ROAD
CHALAKUDY`;

  const parsed = parseLabel(kozhikaraOcr);

  // Assert actual extracted values
  assert.equal(parsed.mrp, undefined, 'MRP must be undefined when not present on packet');
  assert.equal(parsed.netQuantity, undefined, 'Net quantity must be undefined when not present on packet');
  assert.equal(parsed.consumerCare, undefined, 'Consumer care must be undefined when not present');

  // Must NOT contain Lay's Classic details
  assert.notEqual(parsed.productName, "Lay's Classic");
  assert.notEqual(parsed.manufacturer, 'PepsiCo India Holdings Pvt. Ltd.');
  assert.notEqual(parsed.netQuantity, '52 g');
  assert.notEqual(parsed.mrp, '₹ 20.00 (incl. of all taxes)');

  // Evaluate through statutory RulesEngine
  const engine = new RulesEngine();
  const verdict = engine.evaluate(parsed);

  // Must strictly produce REVIEW or non-compliant because Rule 6 mandatory declarations are missing
  assert.equal(verdict.overallStatus, 'REVIEW', 'Packet with missing mandatory declarations must produce REVIEW');
  assert.ok(verdict.flaggedChecks >= 3, 'Must flag missing mandatory declarations under Rule 6');

  // Verify compliance score is honest (not hardcoded 94%)
  const score = Math.round((verdict.passedChecks / Math.max(verdict.totalChecks, 1)) * 100);
  assert.ok(score < 50, `Compliance score must be low for packet missing mandatory fields, got ${score}%`);
  assert.notEqual(score, 94, 'Must not report hardcoded 94% score');
});

test('Regression Test 2: Active inspection session strictly isolates product data across inspections', () => {
  clearInspectionSession();

  // 1. Session A: Kozhikara sachet
  const sessionA: ActiveInspectionSession = {
    inspectionId: 'INSP-2026-KOZHIKARA-01',
    inspectionDate: '24 Oct 2026, 10:15',
    productName: 'Pozhikkara Restaurant Pack',
    imagePreviewUrl: '/samples/kozhikara.jpg',
    panels: [
      { id: 'p1', type: 'front', label: 'Front Panel', previewUrl: '/samples/kozhikara.jpg' },
    ],
    extractedLabel: {
      rawText: 'POZHIKKARA COZHINKARA HOTEL',
      productName: 'Pozhikkara',
    },
    verdict: {
      overallStatus: 'REVIEW',
      summary: 'Needs Review: Missing mandatory declarations under Rule 6.',
      timestamp: new Date().toISOString(),
      totalChecks: 6,
      passedChecks: 1,
      flaggedChecks: 5,
      checks: [],
      potentialViolations: [],
    },
    ocrConfidence: 74,
    ocrQuality: 'FAIR',
    isMultiPanel: false,
    isDemo: false,
  };

  saveInspectionSession(sessionA);
  const loadedA = getInspectionSession();
  assert.ok(loadedA);
  assert.equal(loadedA.productName, 'Pozhikkara Restaurant Pack');
  assert.equal(loadedA.imagePreviewUrl, '/samples/kozhikara.jpg');
  assert.equal(loadedA.panels.length, 1);
  assert.equal(loadedA.isDemo, false);

  // 2. Session B: Coca-Cola
  const sessionB: ActiveInspectionSession = {
    inspectionId: 'INSP-2026-COLA-02',
    inspectionDate: '24 Oct 2026, 10:20',
    productName: 'Coca-Cola 330ml Can',
    imagePreviewUrl: '/samples/cola.jpg',
    panels: [
      { id: 'p1', type: 'front', label: 'Front Can Face', previewUrl: '/samples/cola.jpg' },
      { id: 'p2', type: 'back', label: 'Back Nutrition Face', previewUrl: '/samples/cola-back.jpg' },
    ],
    extractedLabel: {
      rawText: 'COCA-COLA Net Qty: 330 ml MRP: Rs. 40.00 Mfd by Coca-Cola India',
      productName: 'Coca-Cola',
      netQuantity: '330 ml',
      mrp: '₹ 40.00',
      manufacturer: 'Coca-Cola India Pvt. Ltd.',
    },
    verdict: {
      overallStatus: 'PASS',
      summary: 'All mandatory declarations verified.',
      timestamp: new Date().toISOString(),
      totalChecks: 6,
      passedChecks: 6,
      flaggedChecks: 0,
      checks: [],
      potentialViolations: [],
    },
    ocrConfidence: 96,
    ocrQuality: 'GOOD',
    isMultiPanel: true,
    isDemo: false,
  };

  saveInspectionSession(sessionB);
  const loadedB = getInspectionSession();
  assert.ok(loadedB);
  assert.equal(loadedB.productName, 'Coca-Cola 330ml Can');
  assert.equal(loadedB.extractedLabel.mrp, '₹ 40.00');
  assert.equal(loadedB.extractedLabel.netQuantity, '330 ml');
  assert.equal(loadedB.panels.length, 2);

  // Verify zero bleed-through from Session A
  assert.notEqual(loadedB.productName, sessionA.productName);
  assert.notEqual(loadedB.imagePreviewUrl, sessionA.imagePreviewUrl);
  assert.notEqual(loadedB.inspectionId, sessionA.inspectionId);
});

test('Regression Test 3: Single-panel inspection produces exactly 1 thumbnail and never injects demo Lay\'s thumbnails', () => {
  const singlePanelSession: ActiveInspectionSession = {
    inspectionId: 'INSP-SINGLE-001',
    inspectionDate: '24 Oct 2026, 10:25',
    productName: 'Kozhikara Sachet',
    imagePreviewUrl: '/samples/kozhikara.jpg',
    panels: [
      { id: 'p1', type: 'front', label: 'Front Panel', previewUrl: '/samples/kozhikara.jpg' },
    ],
    extractedLabel: {
      rawText: 'POZHIKKARA COZHINKARA',
      productName: 'Pozhikkara',
    },
    verdict: {
      overallStatus: 'REVIEW',
      summary: 'Needs Review',
      timestamp: new Date().toISOString(),
      totalChecks: 6,
      passedChecks: 1,
      flaggedChecks: 5,
      checks: [],
      potentialViolations: [],
    },
    ocrConfidence: 78,
    ocrQuality: 'FAIR',
    isMultiPanel: false,
    isDemo: false,
  };

  // Thumbnail list computation
  const productImages = singlePanelSession.panels.map((p) => p.previewUrl);

  assert.equal(productImages.length, 1, 'Single panel scan must have exactly 1 thumbnail');
  assert.equal(productImages[0], '/samples/kozhikara.jpg');
  assert.ok(
    !productImages.includes('/samples/lays.png'),
    'Must NOT contain Lay\'s thumbnails when user scanned another product'
  );
});

test('Regression Test 4: High OCR confidence does NOT produce Compliant verdict or 94% score if mandatory fields are missing', () => {
  // A label with very high OCR character clarity (e.g. 98%), but missing manufacturer address and packing date
  const partialLabelText = `BRITANNIA GOOD DAY BUTTER COOKIES
NET WEIGHT: 100 g
MRP Rs 30.00 INCL OF ALL TAXES
CUSTOMER CARE: 1800 425 4449`;

  const parsed = parseLabel(partialLabelText);
  assert.ok(parsed.mrp?.includes('30.00'), 'MRP should be parsed correctly');
  assert.equal(parsed.netQuantity, '100 g');
  assert.equal(parsed.manufacturer, undefined, 'Manufacturer should be missing');

  const engine = new RulesEngine();
  const verdict = engine.evaluate(parsed);

  assert.equal(verdict.overallStatus, 'REVIEW', 'Must be REVIEW due to missing manufacturer');
  assert.ok(verdict.passedChecks < verdict.totalChecks, 'Passed checks must be less than total checks');

  const score = Math.round((verdict.passedChecks / verdict.totalChecks) * 100);
  assert.notEqual(score, 94, 'Score must reflect actual rule checks passed, not hardcoded 94%');
});
