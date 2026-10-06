// _lib.mjs: tiny assertion + page helpers for tests/ui_battle/*.test.mjs (same check()/finish() style as tests/ui/lib.mjs).
import { launch, open } from './_page.mjs';

let failed = 0, total = 0;
export function check(name, cond, detail) {
  total++;
  if (cond) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + detail : '')); }
}
export function finish(label) {
  if (failed) { console.log(`${label}: ${failed}/${total} FAILED`); process.exit(1); }
  console.log(`${label}: all ${total} checks passed`);
}
export { launch, open };

/** Open a harness page and run `setupExpr` (a JS expression string evaluated in the page, usually __ui.setup(...)). */
export async function openWith(browser, o, setupExpr) {
  const p = await open(browser, o);
  if (setupExpr) await p.page.evaluate(setupExpr);
  return p;
}

/** Complete in-page layout-read instrumentation: counts layout reads performed while a HUD update() is on the stack. */
export const LAYOUT_PROBE = `(() => {
  window.__lr = { depth: 0, count: 0, names: {} };
  const hit = (n) => { if (window.__lr.depth > 0) { window.__lr.count++; window.__lr.names[n] = (window.__lr.names[n] || 0) + 1; } };
  const getters = ['offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft', 'clientWidth', 'clientHeight', 'clientTop', 'clientLeft', 'scrollWidth', 'scrollHeight', 'scrollTop', 'scrollLeft'];
  for (const n of getters) for (const proto of [HTMLElement.prototype, Element.prototype]) { const d = Object.getOwnPropertyDescriptor(proto, n); if (d && d.get && !d.get.__wrapped) { const g = d.get; const w = function () { hit(n); return g.call(this); }; w.__wrapped = true; Object.defineProperty(proto, n, { get: w, configurable: true }); } }
  for (const n of ['getBoundingClientRect', 'getClientRects']) { const f = Element.prototype[n]; Element.prototype[n] = function () { hit(n); return f.apply(this, arguments); }; }
  const gcs = window.getComputedStyle; window.getComputedStyle = function () { hit('getComputedStyle'); return gcs.apply(this, arguments); };
  const wrapUpdate = (hud) => { if (hud.__probed) return; hud.__probed = true; const u = hud.update; hud.update = function () { window.__lr.depth++; try { return u.apply(this, arguments); } finally { window.__lr.depth--; } }; };
  window.__probeHud = wrapUpdate;
})()`;
