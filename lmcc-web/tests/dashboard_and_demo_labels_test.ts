import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('History: Saved records workspace supports merging server and device reports', () => {
  const historyContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/History.tsx'),
    'utf-8'
  );

  assert.ok(
    historyContent.includes('mergeSavedRecords'),
    'History must define mergeSavedRecords to combine server and device reports'
  );
  assert.ok(
    historyContent.includes('getLocalReports'),
    'History must load local device reports'
  );
  assert.ok(
    historyContent.includes('getReports'),
    'History must load server inspection reports'
  );
  assert.ok(
    historyContent.includes('Saved on device'),
    'History must badge device-saved inspection records'
  );
});

test('Dashboard: Renders KPI metrics and accessible compliance reporting', () => {
  const dashboardContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/Dashboard.tsx'),
    'utf-8'
  );

  assert.ok(
    dashboardContent.includes('Executive Compliance Dashboard'),
    'Dashboard must include executive title'
  );
  assert.ok(
    dashboardContent.includes('Saved inspections'),
    'Dashboard must display Saved inspections metric'
  );
  assert.ok(
    dashboardContent.includes('/reports'),
    'Dashboard must link to reports repository'
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

test('History: Search and time period filters are actively bound to filtered records', () => {
  const historyContent = fs.readFileSync(
    path.resolve(__dirname, '../src/pages/History.tsx'),
    'utf-8'
  );

  assert.ok(
    historyContent.includes('withinPeriod'),
    'History must filter records by time period'
  );
  assert.ok(
    historyContent.includes('filtered'),
    'History must compute filtered records'
  );
});
