// _page.mjs: shared Playwright plumbing for the battle-side UI tests and tools/shot_uib.mjs.
// Bundles tests/ui_battle/harness.js with esbuild, serves it from a fake origin together with kit.css + hud.css + the cached Google fonts,
// aborts every other request (so nothing hits the network), and returns Playwright pages with console/pageerror capture.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function bundleHarness() {
  const r = await build({ entryPoints: [path.join(root, 'tests/ui_battle/harness.js')], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error', alias: { three: path.join(root, 'tests/ui_battle/_nothree.js') } });
  return r.outputFiles[0].text;
}

function pageHtml(js) {
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const fonts = fs.existsSync(path.join(root, '.cache/fonts_uib/local.css')) ? read('.cache/fonts_uib/local.css') : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>uib</title><style>${fonts}</style><style>${read('src/ui/kit.css')}</style><style>${read('src/ui/hud.css')}</style></head><body><div id="vw-root"></div><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
}

export async function launch() {
  return chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb'] });
}

/** open(browser, {width,height,touch,reducedMotion,js}) -> {page, logs, close()} ; call page.evaluate(() => __ui.setup({...})) to start. */
export async function open(browser, o) {
  o = o || {};
  const js = o.js || (await bundleHarness());
  const ctx = await browser.newContext({ viewport: { width: o.width || 1280, height: o.height || 720 }, deviceScaleFactor: o.scale || 1, hasTouch: !!o.touch, isMobile: !!o.touch && (o.width || 1280) < 900, reducedMotion: o.reducedMotion ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  const html = pageHtml(js);
  await page.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith('http://t/fonts/')) { const f = path.join(root, '.cache/fonts_uib', u.split('/fonts/')[1]); if (fs.existsSync(f)) return r.fulfill({ path: f, contentType: 'font/woff2' }); }
    if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
    return r.abort();
  });
  await page.goto('http://t/');
  await page.waitForFunction(() => window.__ready === true);
  return { page, logs, close: () => ctx.close() };
}
