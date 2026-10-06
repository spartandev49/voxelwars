// UI screenshot tool (owner UI-A). Mounts screens against src/ui/mockctx.js in headless Chromium and saves PNGs.
//   node tools/shot_ui.mjs                       every scenario in tests/ui/scenarios.js at the 4 standard viewports -> docs/sheets/ui_<name>_<w>x<h>.png
//   node tools/shot_ui.mjs --only=title,quick    only these scenario names (comma list, substring match)
//   node tools/shot_ui.mjs --sizes=1280x720      only these viewports
//   node tools/shot_ui.mjs --entry=tests/ui/kitchen.js --out=docs/sheets   shoot a standalone entry (one PNG per size)
//   node tools/shot_ui.mjs --list                list scenario names
//   node tools/shot_ui.mjs --all                  also register UI-B's screens (every non-underscore module in src/ui/screens; default = UI-A's own)
// Fonts: Bungee/Rubik/Cinzel are fetched once into .cache/fonts (via curl) and served locally so shots match the shipped look.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes('--' + n);
export const SIZES = [[1280, 720], [1920, 1080], [820, 1180], [390, 844]];

export function ensureFonts() {
  const dir = path.join(root, '.cache/fonts');
  fs.mkdirSync(dir, { recursive: true });
  const css = path.join(dir, 'fonts.css');
  if (!fs.existsSync(css)) {
    try {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      execFileSync('curl', ['-sS', '-m', '30', '-A', ua, '-o', css, 'https://fonts.googleapis.com/css2?family=Bungee&family=Cinzel:wght@500;700&family=Rubik:wght@400;500;600;700&display=swap']);
      const txt = fs.readFileSync(css, 'utf8');
      for (const u of new Set(txt.match(/https:\/\/fonts\.gstatic\.com[^)]*/g) || [])) {
        const f = u.replace('https://fonts.gstatic.com/', '').replace(/\//g, '_');
        if (!fs.existsSync(path.join(dir, f))) execFileSync('curl', ['-sS', '-m', '30', '-o', path.join(dir, f), u]);
      }
    } catch (e) { console.warn('font fetch failed (screens will use fallback fonts):', e.message); }
  }
  if (!fs.existsSync(css)) return null;
  let txt = fs.readFileSync(css, 'utf8');
  txt = txt.replace(/https:\/\/fonts\.gstatic\.com\/([^)]*)/g, (m, p) => 'https://t/fonts/' + p.replace(/\//g, '_'));
  return txt;
}

export function cssBundle() {
  return ['src/ui/boot.css', 'src/ui/kit.css', 'src/ui/screens.css', 'src/ui/hud.css', 'src/ui/editors.css'].filter((f) => fs.existsSync(path.join(root, f))).map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
}

/** Generate an entry that registers every non-underscore screen module in src/ui/screens/ by meta.id, then loads the scenario list. */
export const OWN_SCREENS = ['splash', 'title', 'quick', 'placement', 'settings', 'credits', 'diagnostics', 'codex', 'achievements', 'stats', 'fatal', 'phone_notice'];
export function writeRegistryEntry(all) {
  const dir = path.join(root, 'src/ui/screens');
  const every = all || process.env.UI_ALL === '1' || process.argv.includes('--all');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.js$/.test(f) && !f.startsWith('_') && (every || OWN_SCREENS.includes(f.replace(/\.js$/, '')))).sort() : [];
  const out = path.join(root, '.cache/ui');
  fs.mkdirSync(out, { recursive: true });
  const lines = files.map((f, i) => `import * as s${i} from '../../src/ui/screens/${f}';`);
  lines.push(`import { boot } from '../../tests/ui/harness.js';`);
  lines.push(`const mods = [${files.map((f, i) => `s${i}`).join(', ')}];`);
  lines.push(`boot(mods);`);
  const p = path.join(out, 'entry.js');
  fs.writeFileSync(p, lines.join('\n') + '\n');
  return p;
}

export async function bundle(entry) {
  const r = await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error', loader: { '.md': 'text' }, define: { __VW_VERSION__: '"1.0.0"', __VW_BUILD__: '"2026-10-06"' } });
  return r.outputFiles[0].text;
}

export function pageHtml(js, fontsCss) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>VOXELWARS</title>
<style>${fontsCss || ''}</style><style>${cssBundle()}</style></head><body><div id="vw-root"></div><script>${js.replace(/<\/script/g, '<\\/script')}</script></body></html>`;
}

export async function launch(html, fontsCss, viewport) {
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: viewport[0], height: viewport[1] }, deviceScaleFactor: 1, hasTouch: viewport[0] < 500, isMobile: false });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await p.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith('https://t/fonts/')) {
      const f = path.join(root, '.cache/fonts', decodeURIComponent(u.slice('https://t/fonts/'.length)));
      if (fs.existsSync(f)) return r.fulfill({ path: f, contentType: 'font/woff2' });
    }
    if (u.startsWith('https://t/')) return r.fulfill({ contentType: 'text/html', body: html });
    return r.abort();
  });
  return { b, p, logs };
}

/** Finish finite animations/transitions so slow software rendering cannot leave a screenshot mid-tween. */
export async function settle(p) {
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { const t = a.effect && a.effect.getComputedTiming(); if (t && isFinite(t.endTime)) a.finish(); } catch (e) { /* ignore */ } } });
  await p.waitForTimeout(80);
}

async function main() {
  const fonts = ensureFonts();
  const sizes = arg('sizes') ? arg('sizes').split(',').map((s) => s.split('x').map(Number)) : SIZES;
  const outDir = path.join(root, arg('out', 'docs/sheets'));
  fs.mkdirSync(outDir, { recursive: true });
  const wait = +arg('wait', 900);
  const entryArg = arg('entry');
  const entry = entryArg ? path.resolve(root, entryArg) : writeRegistryEntry();
  const js = await bundle(entry);
  const html = pageHtml(js, fonts);
  let first = true;
  for (const sz of sizes) {
    const { b, p, logs } = await launch(html, fonts, sz);
    await p.goto('https://t/');
    await p.waitForTimeout(400);
    await p.evaluate(() => document.fonts && document.fonts.ready);
    if (entryArg) {
      await p.waitForTimeout(wait);
      await settle(p);
      const f = path.join(outDir, 'ui_' + path.basename(entryArg, '.js') + `_${sz[0]}x${sz[1]}.png`);
      await p.screenshot({ path: f }); console.log(f);
    } else {
      const names = await p.evaluate(() => window.__ui.scenarios.map((s) => s.name));
      if (flag('list')) { console.log(names.join('\n')); await b.close(); return; }
      const only = arg('only') ? arg('only').split(',') : null;
      for (const n of names) {
        if (only && !only.some((o) => n === o || n.startsWith(o))) continue;
        await p.evaluate((nm) => window.__ui.run(nm), n);
        await p.waitForTimeout(wait);
        await settle(p);
        const f = path.join(outDir, `ui_${n}_${sz[0]}x${sz[1]}.png`);
        await p.screenshot({ path: f });
        if (first) console.log('shooting', n);
      }
      first = false;
    }
    if (logs.length) console.log(`[${sz.join('x')}] console:\n` + logs.slice(0, 20).join('\n'));
    await b.close();
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
