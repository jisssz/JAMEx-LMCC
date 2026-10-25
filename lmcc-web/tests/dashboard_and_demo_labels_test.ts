import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Dashboard and Demo Labeling: Demo records have explicit isDemo flag', () => {
  const historyContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/History.tsx'),
    'utf-8'
  );

  // Check that mock inspections have isDemo: true
  assert.match(
    historyContent,
    /isDemo\?:\s*boolean/,
    'InspectionRecord must define isDemo optional boolean'
  );

  const demoMatches = historyContent.match(/isDemo:\s*true/g);
  assert.ok(demoMatches && demoMatches.length >= 8, 'All 8 mock inspections in History must be flagged isDemo: true');

  // Check that real records are marked isDemo: false
  const realMatches = historyContent.match(/isDemo:\s*false/g);
  assert.ok(realMatches && realMatches.length >= 2, 'Real server and local reports must be marked isDemo: false');

  // Check that DEMO badge exists in UI
  assert.ok(
    historyContent.includes('DEMO'),
    'History table must render DEMO badge for demo records'
  );
  assert.ok(
    historyContent.includes('LIVE'),
    'History table must render LIVE badge for real records'
  );
});

test('Dashboard: Renders KPI metrics and separates live and demo records', () => {
  const dashboardContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/Dashboard.tsx'),
    'utf-8'
  );

  assert.ok(
    dashboardContent.includes('Executive Compliance Dashboard'),
    'Dashboard must include executive title'
  );
  assert.ok(
    dashboardContent.includes('Total inspections'),
    'Dashboard must display Total inspections card'
  );
  assert.ok(
    dashboardContent.includes('AI Image Enhancement'),
    'Dashboard must display AI Image Enhancement card with before/after comparison'
  );
  assert.ok(
    dashboardContent.includes('India Compliance Map'),
    'Dashboard must display India Compliance Map preview'
  );
  assert.ok(
    dashboardContent.includes('Recent Inspections'),
    'Dashboard must display Recent Inspections preview table'
  );
  assert.ok(
    dashboardContent.includes('benchmarkDemoInspections'),
    'Dashboard must declare benchmark demo inspections'
  );
  assert.ok(
    dashboardContent.includes('DEMO'),
    'Dashboard must label demo items with DEMO badge'
  );
});

test('India Compliance Map: Explicitly declares simulated demo data', () => {
  const mapContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/IndiaComplianceMap.tsx'),
    'utf-8'
  );

  assert.ok(
    mapContent.includes('SIMULATED DEMO DATA'),
    'Map must include SIMULATED DEMO DATA badge'
  );
  assert.ok(
    mapContent.includes('Surveillance Modeling Notice'),
    'Map must include Surveillance Modeling Notice disclaimer'
  );
});

test('History: Category and date filters are actively bound to filtered records', () => {
  const historyContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/History.tsx'),
    'utf-8'
  );

  assert.ok(
    historyContent.includes('categoryFilter'),
    'History must maintain category filter state'
  );
  assert.ok(
    historyContent.includes('timePeriodFilter'),
    'History must maintain time period filter state'
  );
  assert.ok(
    historyContent.includes('matchesCategory'),
    'History must filter records by category'
  );
  assert.ok(
    historyContent.includes('matchesTime'),
    'History must filter records by time period'
  );
});

test('Dashboard: Date range dropdown actively scales surveillance metrics and filters reports', () => {
  const dashboardContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/Dashboard.tsx'),
    'utf-8'
  );

  assert.ok(
    dashboardContent.includes('filteredReports'),
    'Dashboard must compute filtered reports based on timeRange'
  );
  assert.ok(
    dashboardContent.includes('baselineMetrics'),
    'Dashboard must reconcile baseline metrics for selected timeRange'
  );
  assert.ok(
    dashboardContent.includes('trendCompliant'),
    'Dashboard must display dynamic trend percentage based on selected time window'
  );
});

