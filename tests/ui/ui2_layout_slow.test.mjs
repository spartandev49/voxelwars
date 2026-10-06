// UI2 (no horizontal scroll / clipped text at 1280x720, 1920x1080, 820x1180, 390x844) and UI3 (tap targets >= 44 px, text contrast >= 4.5:1 on DOM panels).
// Scans every scenario in tests/ui/scenarios.js at every viewport in a real Chromium page.
import { open, check, finish } from './lib.mjs';

const SIZES = [[1280, 720], [1920, 1080], [820, 1180], [390, 844]];
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const UI_SCALE = +((process.argv.find((a) => a.startsWith('--scale=')) || '').slice(8)) || 1;      // node tests/ui/ui2_layout.test.mjs --scale=1.3 re-runs the scan at UI scale 130%
const ONLY_SIZE = (process.argv.find((a) => a.startsWith('--size=')) || '').slice(7);

/* ---- runs inside the page ---- */
function scanPage() {
  const vw = window.innerWidth;
  const out = { hscroll: [], offscreen: [], clipped: [], small: [], contrast: [] };
  const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${(el.textContent || '').trim() ? ' "' + el.textContent.trim().slice(0, 28) + '"' : ''}`;
  const SKIP_ROOT = (el) => el === document.documentElement || el === document.body || el.id === 'vw-root' || (el.classList && el.classList.contains('vw-screen'));
  const hidden = (el) => !!el.closest('.vw-hide,[hidden],.vw-sr,.vw-bg,#vw-stage,.vw-cloud,svg');
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const clipAncestor = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { if (SKIP_ROOT(p)) continue; const cs = getComputedStyle(p); if (cs.overflowX !== 'visible') return p; } return null; };

  // 1. page-level horizontal scroll
  const de = document.documentElement;
  if (de.scrollWidth > vw + 1) out.hscroll.push(`documentElement scrollWidth ${de.scrollWidth} > ${vw}`);
  document.querySelectorAll('.vw-screen, #vw-root').forEach((s) => { if (s.scrollWidth > s.clientWidth + 1) out.hscroll.push(`${desc(s)} scrollWidth ${s.scrollWidth} > ${s.clientWidth}`); });

  // 2. offscreen elements (right edge beyond the viewport without a clipping scroller)
  const all = Array.from(document.querySelectorAll('#vw-root *'));
  for (const el of all) {
    if (hidden(el) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && el.closest('.vw-tip,.vw-toasts')) continue;
      let clippedOk = false;
      for (let p = el.parentElement; p; p = p.parentElement) { if (SKIP_ROOT(p)) continue; if (getComputedStyle(p).overflowX !== 'visible') { const cr = p.getBoundingClientRect(); if (cr.right <= vw + 1 && cr.left >= -1) { clippedOk = true; break; } } }
      if (clippedOk) continue;
      if (el.closest('.vw-modal-wrap') && cs.position === 'absolute') continue;
      out.offscreen.push(desc(el) + ` [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
  }

  // 3. clipped text: a text node whose box is cut by an overflow:hidden/clip ancestor
  const walker = document.createTreeWalker(document.getElementById('vw-root'), NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.trim() && n.parentElement && !hidden(n.parentElement) && visible(n.parentElement)) texts.push(n);
  const range = document.createRange();
  for (const n of texts) {
    range.selectNodeContents(n);
    const tr = range.getBoundingClientRect();
    if (tr.width < 1) continue;
    for (let p = n.parentElement; p; p = p.parentElement) {
      if (SKIP_ROOT(p)) break;
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') break;
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
        const pr = p.getBoundingClientRect();
        if (cs.textOverflow === 'ellipsis') break;
        if (tr.right > pr.right + 1.5 || tr.left < pr.left - 1.5) { out.clipped.push(`${desc(n.parentElement)} text [${Math.round(tr.left)}..${Math.round(tr.right)}] in ${desc(p)} [${Math.round(pr.left)}..${Math.round(pr.right)}]`); break; }
      }
    }
  }

  // 4. tap targets (>= 44 css px both ways)
  const interactive = Array.from(document.querySelectorAll('#vw-root button, #vw-root [role=button], #vw-root [role=tab], #vw-root [role=radio], #vw-root [role=switch], #vw-root [role=menuitem], #vw-root select, #vw-root input:not([type=hidden]), #vw-root summary, #vw-root a.vw-btn'));
  for (const el of interactive) {
    if (hidden(el) || !visible(el)) continue;
    if (el.closest('.vw-md, .vw-table, .vw-credit-link') && el.tagName === 'A') continue;
    let target = el;
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio') && el.closest('label')) target = el.closest('label');
    if (el.classList.contains('vw-sr')) continue;
    const r = target.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) out.small.push(`${desc(target)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  // inline links inside prose are exempt (WCAG), anchors elsewhere are not
  for (const a of document.querySelectorAll('#vw-root a[href]')) {
    if (hidden(a) || !visible(a) || a.closest('.vw-md, .vw-table, .vw-lib, .vw-credit-link, .vw-note, p, li')) continue;
    const r = a.getBoundingClientRect(); if (r.height < 43.5) out.small.push(desc(a) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // 5. contrast on DOM panels
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  function bgOf(el) {
    const stack = [];
    for (let p = el; p; p = p.parentElement) {
      if (p.id === 'vw-root' || p === document.body || p === document.documentElement) return null;     // no panel: sits on the scene/sky (judged by contact sheets)
      const cs = getComputedStyle(p);
      if (cs.backgroundImage !== 'none') return null;                                                // gradient/image: unknown
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; }
    }
    if (!stack.length) return null;
    let base = stack[stack.length - 1].a >= 0.99 ? stack[stack.length - 1] : { r: 20, g: 22, b: 58, a: 1 };
    for (let i = stack.length - (stack[stack.length - 1].a >= 0.99 ? 2 : 1); i >= 0; i--) base = over(stack[i], base);
    return base;
  }
  const SKIPC = '.vw-progress__label,.vw-logo,.vw-logo *,.vw-page__title,.vw-page__sub,.vw-menu__label,.vw-splash__note,.vw-splash__ver,.vw-tip,[disabled],[aria-disabled="true"],.is-disabled,.vw-slider__tick,.vw-tab__badge';
  const seen = new Set();
  for (const n of texts) {
    const el = n.parentElement;
    if (seen.has(el) || el.closest(SKIPC)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    const bg = bgOf(el); if (!bg) continue;
    let fg = parse(cs.color); if (!fg) continue;
    let op = 1; for (let p = el; p && p !== document.body; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity);
    if (op < 0.99) { if (op < 0.5) continue; fg = Object.assign({}, fg, { a: fg.a * op }); }
    const f = over(fg, bg);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const r = ratio(f, bg);
    if (r < need) out.contrast.push(`${desc(el)} ${r.toFixed(2)}:1 < ${need}`);
  }
  return out;
}

const issues = {};
for (const sz of SIZES) {
  if (ONLY_SIZE && ONLY_SIZE !== sz.join('x')) continue;
  const L = await open(sz);
  if (UI_SCALE !== 1) await L.ev((v) => window.__ui.app.settings.set('uiScale', v), UI_SCALE);
  const names = await L.ev(() => window.__ui.scenarios.map((s) => s.name));
  for (const n of names) {
    if (ONLY.length && !ONLY.some((o) => n.startsWith(o))) continue;
    const ran = await L.run(n);
    if (ran === false) continue;
    const r = await L.ev(scanPage);
    const key = `${n} @${sz[0]}x${sz[1]}${UI_SCALE !== 1 ? ' x' + UI_SCALE : ''}`;
    const total = r.hscroll.length + r.offscreen.length + r.clipped.length + r.small.length + r.contrast.length;
    check(`${key}: layout, tap targets, contrast`, total === 0, total ? JSON.stringify({ hscroll: r.hscroll.slice(0, 4), offscreen: r.offscreen.slice(0, 5), clipped: r.clipped.slice(0, 5), small: r.small.slice(0, 6), contrast: r.contrast.slice(0, 6) }) : '');
    issues[key] = total;
  }
  const errs = L.logs.filter((l) => /error/i.test(l));
  check(`console clean @${sz[0]}x${sz[1]}`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await L.close();
}
finish('ui2_layout');
