/** Read-only route/UI audit. Run: npx tsx tests/premium_routes_e2e.ts
 * BASE_URL overrides local; BASELINE_URL overrides production; SKIP_BASELINE=1 skips baseline.
 * OUTPUT_DIR, CHROME_PATH and API_MODE=online|offline are optional. Outputs only under tmp by default.
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const output = resolve(process.env.OUTPUT_DIR || `${root}/tmp/premium-routes`);
const routes = ['/', '/dashboard', '/scan?mode=upload', '/image-enhancement', '/rules', '/history', '/india-map', '/reports', '/authority-dashboard', '/history/invalid-premium-audit', '/results', '/report'];
const sizes = [[320,844],[390,844],[768,1024],[1280,800],[1440,900],[1600,900]];
const env = await Promise.all(['.env', '.env.local', '.env.development', '.env.development.local'].map(f => readFile(resolve(root, 'lmcc-web', f), 'utf8').catch(() => '')));
const publicApi = env.some(s => /^VITE_API_URL\s*=\s*["']?https:\/\//m.test(s));
const offline = process.env.API_MODE ? process.env.API_MODE === 'offline' : !publicApi;
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
const records: any[] = [];
const interactions: any[] = [];
const pause = (ms = 450) => new Promise(r => setTimeout(r, ms));
async function settle(page: Page, route: string) {
  if (route === '/') {
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const skip = [...document.querySelectorAll('button')].find(e => /^skip/i.test(e.textContent?.trim() || ''));
      skip?.click();
    });
    await pause(1800);
  }
  // Reveal scroll-triggered sections before full-page capture.
  await page.evaluate(async () => {
    for(let y=0;y<document.body.scrollHeight;y+=innerHeight) {scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}
    scrollTo(0,0);
  });
  await pause(700);
}
async function inspect(page: Page) {
  return page.evaluate(() => {
    const visible = (e: Element) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0'; };
    const name = (e: Element) => e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(' ').map(id => document.getElementById(id)?.textContent || '').join(' ').trim() || (e as HTMLInputElement).labels?.[0]?.textContent?.trim() || e.textContent?.trim() || e.getAttribute('title') || e.querySelector('img')?.alt || '';
    const clipping: any[] = [];
    for (const e of document.querySelectorAll('h1,h2,h3,p,a,button,input,select,th,td,label')) {
      if (!visible(e) || e.closest('svg') || e.classList.contains('sr-only')) continue;
      const r = e.getBoundingClientRect();
      let scrollable = false;
      let clippedBy = '';
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p); const pr = p.getBoundingClientRect();
        if (['auto','scroll'].includes(s.overflowX) && p.scrollWidth > p.clientWidth) scrollable = true;
        if (['hidden','clip'].includes(s.overflowX) && (r.right > pr.right + 3 || r.left < pr.left - 3)) clippedBy = p.tagName + '.' + p.className;
      }
      if (!scrollable && (r.left < -3 || r.right > innerWidth + 3 || clippedBy)) clipping.push({ tag: e.tagName, text: name(e).slice(0,100), left: Math.round(r.left), right: Math.round(r.right), clippedBy });
    }
    const unnamed = [...document.querySelectorAll('button,a,input,select,textarea')].filter(e => visible(e) && !name(e) && (e as HTMLInputElement).type !== 'hidden').map(e => ({tag:e.tagName, type:e.getAttribute('type'), placeholder:e.getAttribute('placeholder'), html:e.outerHTML.slice(0,300)}));
    return { title:document.title, headings:[...document.querySelectorAll('h1')].map(e=>e.textContent), text:document.body.innerText, clipping, unnamed, bodyWidth:document.body.scrollWidth, viewport:innerWidth };
  });
}
try {
  const targets = [...(process.env.SKIP_BASELINE ? [] : [{name:'baseline', url:process.env.BASELINE_URL || 'https://lmcc-web-ten.vercel.app', sizes:[[1440,900],[390,844]]}]), {name:'current',url:process.env.BASE_URL || 'http://localhost:4197',sizes}];
  for (const target of targets) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    // tsx preserves function names with this helper inside serialized callbacks.
    await page.evaluateOnNewDocument('globalThis.__name = (fn) => fn');
    let active: any;
    page.on('dialog', async dialog => {
      if(active) (active.dialogs ||= []).push({type:dialog.type(),message:dialog.message()});
      await dialog.dismiss();
    });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = new URL(req.url());
      const api = ['fetch','xhr'].includes(req.resourceType()) && (url.origin !== new URL(target.url).origin || /^\/api\//.test(url.pathname));
      const write = !['GET','HEAD','OPTIONS'].includes(req.method());
      if (write || (target.name === 'current' && offline && api)) {
        active?.expectedNetwork.push({url:req.url(),method:req.method(),reason:write?'read-only write guard':'simulated backend offline'});
        void req.abort('blockedbyclient');
      } else void req.continue();
    });
    page.on('pageerror', e => active?.exceptions.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') active?.console.push(m.text()); });
    page.on('requestfailed', r => active?.network.push({url:r.url(),error:r.failure()?.errorText}));
    page.on('response', r => {if(r.status() >= 400) active?.httpErrors.push({url:r.url(),status:r.status()});});
    for (const [width,height] of target.sizes) {
      await page.setViewport({width,height,deviceScaleFactor:1});
      for (const route of routes) {
        active = {target:target.name,route,width,height,exceptions:[],console:[],network:[],expectedNetwork:[],httpErrors:[]};
        records.push(active);
        try {
          await page.goto(target.url + route,{waitUntil:'networkidle2',timeout:45000});
          await settle(page, route);
          active.finalUrl = page.url();
          active.audit = await inspect(page);
          active.screenshot = `${target.name}-${route === '/' ? 'home' : route.slice(1).replace(/[^a-z0-9-]/gi,'_')}-${width}x${height}.png`;
          await page.screenshot({path:resolve(output,active.screenshot),fullPage:true});
        } catch (e) {active.failure=String(e);}
      }
    }
    if (target.name === 'current') {
      await page.setViewport({width:390,height:844});
      for (const route of ['/','/rules','/india-map','/history','/reports']) {
        active = {target:'interaction',route,exceptions:[],console:[],network:[],expectedNetwork:[],httpErrors:[]};
        interactions.push(active);
        await page.goto(target.url+route,{waitUntil:'networkidle2'}); await settle(page, route);
        active.before = await inspect(page);
        if (route === '/') {
          const toggle = await page.$('button[aria-expanded]');
          if (toggle) {
            active.toggleLabel=await toggle.evaluate(e=>e.getAttribute('aria-label'));
            await toggle.focus(); await page.keyboard.press('Enter'); await pause();
            active.open=await toggle.evaluate(e=>e.getAttribute('aria-expanded'));
            await page.screenshot({path:resolve(output,'current-mobile-nav-open.png'),fullPage:true});
            await page.keyboard.press('Tab');
            active.tabFocus=await page.evaluate(()=>({text:document.activeElement?.textContent,tag:document.activeElement?.tagName}));
            await page.keyboard.press('Escape'); await pause();
            active.afterEscape=await toggle.evaluate(e=>({expanded:e.getAttribute('aria-expanded'),focus:document.activeElement===e}));
          } else active.missingToggle=true;
        } else if (route === '/india-map') {
          active.filters=[];
          const selects=await page.$$('select');
          for (const select of selects) {
            const options=await select.evaluate(e=>[...(e as HTMLSelectElement).options].map(o=>({value:o.value,text:o.text})));
            const before=await page.evaluate(()=>document.body.innerText);
            if(options[1]) await select.select(options[1].value);
            await page.evaluate(() => [...document.querySelectorAll('button')].find(e=>e.textContent?.trim()==='Apply Filters')?.click());
            await pause();
            const after=await page.evaluate(()=>document.body.innerText);
            active.filters.push({options,bodyTextChanged:before!==after});
          }
          active.disclosed=/simulated|demonstration|demo data/i.test(active.before.text);
        } else {
          const input=await page.$('input[type="search"],input[placeholder*="Search"],input[placeholder*="Topic"]');
          if(input) {
            if(route==='/rules') {await input.type('manufacturer');await pause();active.matching=await inspect(page);await input.click({clickCount:3});await page.keyboard.press('Backspace');}
            await input.type('zzzz-premium-no-results-987654'); await pause();
            active.noResults=await inspect(page);
            await page.screenshot({path:resolve(output,`current-${route.slice(1)}-no-results-mobile.png`),fullPage:true});
          } else active.missingSearch=true;
          active.filters=[];
          for(const select of await page.$$('select')) {
            if(input) {await input.click({clickCount:3});await page.keyboard.press('Backspace');}
            const options=await select.evaluate(e=>[...(e as HTMLSelectElement).options].map(o=>o.value));
            if(options[1]) await select.select(options[1]);await pause();
            active.filters.push({options,text:await page.evaluate(()=>document.body.innerText)});
            await select.select(options[0]);
          }
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  const summary = {offline, routeCaptures:records.filter(r=>r.screenshot).length, attempted:records.length, failures:records.filter(r=>r.failure).length, pageExceptions:records.reduce((n,r)=>n+r.exceptions.length,0), clippingCaptures:records.filter(r=>r.audit?.clipping.length).length, unnamedCaptures:records.filter(r=>r.audit?.unnamed.length).length};
  await writeFile(resolve(output,'audit.json'),JSON.stringify({summary,records,interactions},null,2));
  console.log(JSON.stringify({output,...summary},null,2));
  if(summary.failures || summary.pageExceptions) process.exitCode=1;
}
