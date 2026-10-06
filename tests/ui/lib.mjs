// Shared Playwright plumbing for tests/ui/*.test.mjs: bundle the registry entry once, open pages at given viewports.
import { ensureFonts, writeRegistryEntry, bundle, pageHtml, launch } from '../../tools/shot_ui.mjs';

let cache = null;
export async function build() {
  if (cache) return cache;
  const fonts = ensureFonts();
  const js = await bundle(writeRegistryEntry());
  cache = { fonts, html: pageHtml(js, fonts) };
  return cache;
}
/** Open a page at a viewport; returns { b, p, logs, ui(fn,...args), run(name), close() }. `opts.touch` makes a touch context. */
export async function open(viewport, opts) {
  const { fonts, html } = await build();
  const L = await launch(html, fonts, viewport || [1280, 720]);
  if (opts && opts.reducedMotion) await L.p.emulateMedia({ reducedMotion: 'reduce' });
  await L.p.goto('https://t/');
  await L.p.waitForFunction(() => !!window.__ui);
  await L.p.evaluate(() => document.fonts && document.fonts.ready);
  const api = {
    b: L.b, p: L.p, logs: L.logs,
    async run(name) { const r = await L.p.evaluate((n) => window.__ui.run(n), name); await L.p.waitForTimeout(120); await settle(L.p); return r; },
    async close() { await L.b.close(); },
    ev: (fn, arg) => L.p.evaluate(fn, arg),
  };
  return api;
}
export async function settle(p) {
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { const t = a.effect && a.effect.getComputedTiming(); if (t && isFinite(t.endTime)) a.finish(); } catch (e) { /* ignore */ } } });
  await p.waitForTimeout(60);
}
let failed = 0;
export function check(name, cond, detail) {
  if (cond) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}
export function finish(label) {
  if (failed) { console.log(`${label}: ${failed} failure(s)`); process.exit(1); }
  console.log(`${label}: all passed`);
}
