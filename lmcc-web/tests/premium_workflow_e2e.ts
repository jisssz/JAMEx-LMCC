/** Run: npx tsx tests/premium_workflow_e2e.ts
 * BASE_URL optionally targets an existing loopback server. All API requests and
 * external non-OCR requests are blocked; OCR itself is never mocked.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import puppeteer, { type Page } from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.BASE_URL || 'http://127.0.0.1:4196';
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Local servers only');
const output = '/var/folders/nc/vdy5sldd27j80j6xtqp_g7_c0000gn/T/opencode/premium-workflow-' + Date.now();
const results: { name: string; status: string; detail?: string }[] = [];
const logs: string[] = [];
const blocked: string[] = [];
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
async function click(page: Page, text: string) {
  await page.waitForFunction(t => [...document.querySelectorAll('button')].some(b => b.textContent?.includes(t) && !b.disabled), {}, text);
  await page.evaluate(t => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent?.includes(t) && !b.disabled);
    if (!button) throw new Error('Button missing: ' + t);
    button.click();
  }, text);
}
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ name, status: 'PASS' }); }
  catch (e) { results.push({ name, status: 'FAIL', detail: String(e) }); }
  console.log(results.at(-1));
}
await fs.mkdir(output, { recursive: true });
const server = process.env.BASE_URL ? undefined : spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4196', '--strictPort'], { cwd: root, stdio: 'pipe' });
server?.stderr?.on('data', d => logs.push(String(d)));
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server?.exitCode != null) throw new Error('Dedicated Vite failed to start');
    try { ready = (await fetch(base)).ok; } catch { /* starting */ }
    if (ready) break;
    await delay(250);
  }
  assert(ready, 'Server ready');
  browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('console', m => logs.push(m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e)));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    const local = url.origin === new URL(base).origin;
    const ocr = ['cdn.jsdelivr.net', 'tessdata.projectnaptha.com'].includes(url.hostname);
    if (url.pathname.startsWith('/api/') || (!local && !ocr && !['blob:', 'data:'].includes(url.protocol)) || !['GET', 'HEAD'].includes(request.method())) {
      blocked.push(request.method() + ' ' + request.url());
      void request.abort('internetdisconnected');
    } else void request.continue();
  });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: output });
  await page.goto(base + '/scan?mode=upload', { waitUntil: 'networkidle0' });
  await check('Non-Lays fixture upload', async () => {
    const input = await page.$('input[type=file]');
    assert(input);
    await input.uploadFile(path.join(root, 'tests/fixtures/hyson_panel2_back.jpg'));
    await page.waitForFunction(() => document.body.innerText.includes('hyson_panel2_back.jpg'));
    await page.screenshot({ path: path.join(output, 'upload.png'), fullPage: true });
  });
  let session: any;
  await check('Real Tesseract OCR and actual results with backend unavailable', async () => {
    await click(page, 'Continue to OCR Extraction');
    await page.waitForFunction(() => location.pathname === '/results', { timeout: 180000 });
    session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lmcc_active_inspection_session') || 'null'));
    assert(session && !session.isDemo, 'Real session');
    assert(session.extractedLabel.rawText.length > 30, 'Real OCR text');
    assert(!/lay.?s classic/i.test(session.productName || ''), 'No demo contamination');
    assert(logs.some(l => /OCR.*(START|complet)|Tesseract/i.test(l)), 'OCR diagnostics');
    await fs.writeFile(path.join(output, 'session.json'), JSON.stringify(session, null, 2));
    await page.screenshot({ path: path.join(output, 'results.png'), fullPage: true });
  });
  if (session) {
    await check('Single upload produces exactly one panel', async () => {
      assert.equal(session.panels.length, 1);
    });
    await check('Missing declarations require review', async () => {
      assert.equal(session.verdict.overallStatus, 'REVIEW');
      assert(session.verdict.flaggedChecks > 0);
      assert(!session.extractedLabel.mrp, 'No invented MRP');
    });
    await check('Save actual OCR report locally', async () => {
      await click(page, 'Save to History');
      await page.waitForFunction(() => /Inspection recorded|Inspection saved/.test(document.body.innerText));
      await fs.writeFile(path.join(output, 'save-message.txt'), await page.evaluate(() => document.body.innerText));
    });
    await check('Offline save confirmation does not claim server persistence', async () => {
      assert(!await page.evaluate(() => document.body.innerText.includes('recorded to local and server')));
    });
    for (const route of ['history', 'reports']) await check('Local ' + route + ' survives navigation', async () => {
      await page.goto(base + '/' + route, { waitUntil: 'networkidle0' });
      await page.waitForFunction(name => document.body.innerText.includes(name), {}, session.extractedLabel.productName || 'Scanned Package');
      await page.screenshot({ path: path.join(output, route + '.png'), fullPage: true });
    });
    for (const format of ['PDF', 'CSV']) await check(format + ' file export', async () => {
      await page.select('#report-format', format);
      await click(page, 'Export ' + format);
      let files: string[] = [];
      for (let i = 0; i < 40; i++) {
        files = (await fs.readdir(output)).filter(f => f.endsWith('.' + format.toLowerCase()));
        if (files.length) break;
        await delay(250);
      }
      assert(files.length, 'Downloaded file exists');
      const data = await fs.readFile(path.join(output, files[0]));
      assert(data.length > 100, 'Nonempty export');
      if (format === 'PDF') assert(data.toString().startsWith('%PDF-'));
      else assert(data.toString().includes(session.extractedLabel.productName || 'Scanned Package'), 'CSV contains actual product');
    });
  }
  await page.goto(base + '/scan?mode=upload', { waitUntil: 'networkidle0' });
  await check('Enhancement comparison displays distinct image views', async () => {
    const toggle = await page.$('input[type=checkbox]');
    assert(toggle);
    await toggle.click();
    await page.screenshot({ path: path.join(output, 'comparison.png'), fullPage: true });
    assert(await page.evaluate(() => /Original/.test(document.body.innerText) && /Enhanced/.test(document.body.innerText)), 'Original and Enhanced views visible');
  });
  await check('Invalid text upload rejected visibly', async () => {
    const invalid = path.join(output, 'invalid.txt');
    await fs.writeFile(invalid, 'This is not an image');
    await (await page.$('input[type=file]'))!.uploadFile(invalid);
    await delay(1500);
    await page.screenshot({ path: path.join(output, 'invalid-upload.png'), fullPage: true });
    assert(await page.evaluate(() => /invalid|unsupported|please.*image|only.*(png|jpeg|image)/i.test(document.body.innerText)), 'Visible validation error');
  });
  await page.goto(base + '/scan?mode=upload', { waitUntil: 'networkidle0' });
  await check('Unreadable blank image uses real OCR and offers recovery', async () => {
    // A generated blank image is an input fixture, never fabricated OCR output.
    const data = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 800, 600);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    const blank = path.join(output, 'blank.png');
    await fs.writeFile(blank, Buffer.from(data, 'base64'));
    await (await page.$('input[type=file]'))!.uploadFile(blank);
    await page.waitForFunction(() => document.body.innerText.includes('blank.png'));
    await click(page, 'Continue to OCR Extraction');
    await page.waitForFunction(() => document.body.innerText.includes('No readable text detected'), { timeout: 180000 });
    await page.screenshot({ path: path.join(output, 'unreadable.png'), fullPage: true });
    assert(logs.some(l => l.includes('ALL panels returned empty OCR')));
    assert(await page.evaluate(() => document.body.innerText.includes('Try again')));
  });
} catch (e) {
  results.push({ name: 'Workflow setup/execution', status: 'FAIL', detail: String(e) });
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
  await fs.writeFile(path.join(output, 'evidence.json'), JSON.stringify({ results, blocked, logs }, null, 2));
  console.log(JSON.stringify({ output, results }, null, 2));
  if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
}
