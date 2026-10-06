// Headless renderer runner for animation review (adapted from tools/shot.mjs).
//   import { runJobs } from './shot_anim.mjs';  await runJobs([{out, ppu, cellW, rowH, cols, labelW, rows:[...]}], {waitMs})
//   node tools/shot_anim.mjs jobs.json           (jobs.json = array of jobs)
// Bundles tools/anim_page.js with esbuild, loads it in headless Chromium (SwiftShader WebGL2) with three r128 from .cache/cdn,
// calls window.__film.render(job) per job and screenshots the page.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// VoxSkin refuses models with more than 24 parts (spec allows 48; see docs/requests/anim.md). The review renderer lifts the limit
// at bundle time so composed models (horse + rider, chariot, howdah) can be inspected.
const liftPartLimit = {
  name: 'lift-part-limit',
  setup(b) {
    b.onLoad({ filter: /render[\\/]voxskin\.js$/ }, (args) => {
      let s = fs.readFileSync(args.path, 'utf8');
      s = s.replace('this.P > 24', 'this.P > 48');
      return { contents: s, loader: 'js' };
    });
  },
};

export async function runJobs(jobs, opts = {}) {
  const t0 = Date.now();
  const bundle = await build({ entryPoints: [path.join(root, 'tools/anim_page.js')], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error', loader: { '.json': 'json' }, plugins: [liftPartLimit] });
  const js = bundle.outputFiles[0].text;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#dfe5ec}canvas{display:block}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script></head><body><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
  const browser = await chromium.launch({ executablePath: EXE, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.route('**/*', (r) => {
    const u = r.request().url();
    if (u.includes('three.min.js')) return r.fulfill({ path: path.join(root, '.cache/cdn/three.min.js'), contentType: 'text/javascript' });
    if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
    return r.abort();
  });
  await page.goto('http://t/');
  await page.waitForFunction('window.__film && window.__film.ready', null, { timeout: 30000 });
  const results = [];
  for (const job of jobs) {
    const W = Math.round(job.labelW + job.cols * job.cellW * job.ppu), H = Math.round(job.rows.length * job.rowH * job.ppu + (job.title ? 22 : 4) + 10);
    await page.setViewportSize({ width: W, height: H });
    const info = await page.evaluate((j) => window.__film.render(j), job);
    await page.waitForTimeout(opts.waitMs || 120);
    const out = path.resolve(root, job.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    results.push({ out: job.out, info });
  }
  await browser.close();
  const seen = new Set();
  for (const l of logs) { if (seen.has(l)) continue; seen.add(l); if (!opts.quiet || /error|ANIM:|PAGEERROR/i.test(l)) console.log(l); }
  console.log(`rendered ${jobs.length} image(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  await runJobs(Array.isArray(jobs) ? jobs : [jobs]);
}
