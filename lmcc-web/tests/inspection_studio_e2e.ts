import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const base = process.env.STUDIO_BASE_URL || 'http://localhost:4191';
const server = process.env.STUDIO_BASE_URL ? null : spawn('npx', ['vite', 'preview', '--port', '4191', '--strictPort'], {
  cwd: process.env.STUDIO_BUILD_DIR || process.cwd(), stdio: 'pipe',
});
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Preview is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const page = await browser.newPage();
  const errors: string[] = [];
  const missing: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) missing.push(response.url()); });
  for (const width of [1440, 1280, 1024, 900, 768, 560, 390, 320]) {
    await page.setViewport({ width, height: 1000 });
    await page.goto(`${base}/?intro=false`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.studio-canvas canvas');
    assert.equal(await page.$eval('.studio-canvas', el => getComputedStyle(el).opacity), '1');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    assert.ok(await page.$eval('.studio-result', el => el.textContent?.includes('NEEDS REVIEW')));
    if (process.env.STUDIO_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.STUDIO_SCREENSHOT_DIR}/studio-${width}.png`, fullPage: true });
    console.log(`PASS ${width}px: WebGL, sample result, no overflow`);
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${base}/?intro=false`, { waitUntil: 'networkidle0' });
  await page.mouse.move(1100, 300);
  await page.waitForFunction(() => document.querySelector('.inspection-studio')?.getAttribute('style')?.includes('--pointer-x'));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() => (document.querySelector('.inspection-studio') as HTMLElement)?.dataset.running === 'false');
  console.log('PASS pointer tracking and offscreen pause');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`${base}/?intro=false`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('.studio-scanner', el => getComputedStyle(el).animationName), 'none');
  assert.equal(await page.$eval('.inspection-studio', el => (el as HTMLElement).dataset.running), 'false');
  console.log('PASS reduced motion');
  await page.evaluate(() => {
    const canvas = document.querySelector('.studio-canvas canvas') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await page.waitForSelector('.studio-static-package');
  console.log('PASS WebGL context-loss fallback');
  await page.evaluateOnNewDocument(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return getContext.apply(this, [type, ...args] as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.goto(`${base}/?intro=false`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.studio-static-package');
  if (process.env.STUDIO_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.STUDIO_SCREENSHOT_DIR}/studio-fallback.png` });
  console.log('PASS no-WebGL fallback');
  // OGL logs its expected renderer error when WebGL is explicitly disabled.
  const unexpected = errors.filter(error => !error.includes('unable to create webgl context'));
  assert.deepEqual(unexpected, [], 'Unexpected hero browser errors');
  assert.deepEqual(missing, [], 'Missing same-origin hero resources');
  console.log('PASS hero console and resource checks');
  await page.click('.studio-primary');
  await page.waitForFunction(() => location.pathname === '/scan');
  await page.waitForSelector('main');
  for (const route of ['/scan?mode=upload', '/rules', '/history']) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle0' });
    assert.equal(new URL(page.url()).pathname, route.split('?')[0]);
    assert.ok(await page.$('main, h1'));
    if (route.includes('upload')) await page.waitForSelector('input[type="file"]');
  }
  console.log('PASS live scan CTA, upload, rules, history direct navigation');
} finally {
  await browser.close(); server?.kill();
}
