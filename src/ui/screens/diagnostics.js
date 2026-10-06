// Diagnostics: renders ctx.diag.snapshot() (WebGL2/renderer/GPU strings, tier, FPS/ms, draw calls, triangles, units, JS heap,
// audio state + per-asset load path + codecs, storage status, CSP violations, log) with Copy (clipboard, or a selectable fallback).
// The snapshot shape is read generically (any top-level object becomes a section), with friendly labels for the known keys.
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { safe } from './_shared.js';

export const meta = { id: 'diagnostics', layer: 'menu', music: 'menu', canvas: 'none' };

const SECTION_ORDER = ['webgl', 'perf', 'audio', 'storage', 'csp', 'log', 'build'];
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.diag;
  const cleanups = [];
  let snap = {};
  let timer = 0;
  const body = K.h('div', { class: 'vw-diag__grid' });
  const sum = K.h('div', { class: 'vw-diag__sum', role: 'status', 'aria-label': 'Summary' });
  const label = (k) => (T.key[k] || k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
  const fmtVal = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? K.fmtNum(v) : String(Math.round(v * 100) / 100)) : String(v));

  function kvRows(obj, prefix) {
    const rows = [];
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const name = (prefix ? prefix + ' › ' : '') + label(k);
      if (isObj(v)) { rows.push(...kvRows(v, name)); continue; }
      if (Array.isArray(v)) {
        if (v.every((x) => isObj(x))) { rows.push(['list', name, v]); continue; }
        rows.push(['kv', name, v.join(', ')]); continue;
      }
      rows.push(['kv', name, v]);
    }
    return rows;
  }
  function valueNode(v) {
    if (v === true) return K.chip(T.ok, { variant: 'olive', icon: 'check' });
    if (v === false) return K.chip(T.bad, { variant: 'danger', icon: 'warning' });
    return K.h('span', { class: 'vw-diag__val vw-nums', text: fmtVal(v) });
  }
  function sectionFor(key, val) {
    const title = T.sections[key] || label(key);
    let content;
    if (key === 'csp') {
      content = !val || !val.length ? K.note(T.cspNone, 'ok') : K.h('ul', { class: 'vw-list' }, ...val.map((x) => K.h('li', { class: 'vw-note vw-note--bad vw-mono', text: typeof x === 'string' ? x : JSON.stringify(x) })));
    } else if (key === 'log') {
      content = !val || !val.length ? K.note(T.none) : K.h('ol', { class: 'vw-diag__log vw-mono' }, ...val.map((l) => K.h('li', { class: 'vw-diag__log-' + (l.level || 'info') }, K.h('span', { class: 'vw-dim', text: (l.t != null ? Number(l.t).toFixed(1) + 's ' : '') }), K.h('b', { text: (l.level || 'info') + ' ' }), K.h('span', { text: l.msg || (typeof l === 'string' ? l : JSON.stringify(l)) }))));
    } else if (isObj(val)) {
      const rows = kvRows(val, '');
      content = K.h('dl', { class: 'vw-diag__kv' });
      for (const r of rows) {
        if (r[0] === 'kv') { content.append(K.h('dt', { text: r[1] }), K.h('dd', {}, valueNode(r[2]))); }
        else {
          content.append(K.h('dt', { text: r[1] }), K.h('dd', {}, K.h('ul', { class: 'vw-list vw-diag__assets' }, ...r[2].map((it) => K.h('li', {}, K.chip(it.path || it.kind || '', { variant: it.path === 'synth' ? 'lava' : it.path === 'failed' ? 'danger' : it.path === 'embedded' ? 'gold' : 'sky' }), K.h('span', { class: 'vw-mono', text: ' ' + (it.id || '') }))))));
        }
      }
    } else if (Array.isArray(val)) {
      content = val.length ? K.h('ul', { class: 'vw-list' }, ...val.map((x) => K.h('li', { class: 'vw-mono', text: typeof x === 'string' ? x : JSON.stringify(x) }))) : K.note(T.none);
    } else content = K.h('span', { class: 'vw-diag__val', text: fmtVal(val) });
    return K.tablet(title, content, { id: 'dg-' + key, tight: true });
  }

  function render() {
    try { snap = ctx.diag.snapshot() || {}; } catch (e) { snap = { other: { error: String((e && e.message) || e) } }; }
    const keys = Object.keys(snap);
    if (!keys.length) { body.replaceChildren(K.emptyState({ icon: 'bug', title: T.title, text: T.empty })); sum.replaceChildren(); return; }
    const ordered = SECTION_ORDER.filter((k) => keys.indexOf(k) >= 0).concat(keys.filter((k) => SECTION_ORDER.indexOf(k) < 0));
    body.replaceChildren(...ordered.map((k) => sectionFor(k, snap[k])));
    // summary chips: the numbers people ask for first
    const w = snap.webgl || {}, p = snap.perf || {}, st = snap.storage || {}, csp = snap.csp || [];
    const chips = [];
    chips.push(K.chip('WebGL 2 ' + (w.webgl2 === false ? 'missing' : 'ok'), { variant: w.webgl2 === false ? 'danger' : 'olive', icon: w.webgl2 === false ? 'warning' : 'check' }));
    if (p.tier) chips.push(K.chip('Tier ' + p.tier, { variant: 'gold' }));
    if (p.fps != null) chips.push(K.chip(`${Math.round(p.fps)} FPS`, { variant: 'sky' }));
    if (p.drawCalls != null) chips.push(K.chip(`${K.fmtNum(p.drawCalls)} draw calls`, { variant: 'sky' }));
    if (st.status) chips.push(K.chip('Storage ' + st.status, { variant: st.status === 'ok' ? 'olive' : 'danger' }));
    chips.push(K.chip(`${csp.length} policy violation${csp.length === 1 ? '' : 's'}`, { variant: csp.length ? 'danger' : 'olive' }));
    sum.replaceChildren(...chips);
  }
  function reportText() {
    const nav = safe(() => navigator.userAgent, '');
    const vp = safe(() => `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x`, '');
    const v = ctx.version || {};
    return `VOXELWARS diagnostics\nbuild: ${v.version || v.build || '1.0.0'} (${v.date || ''})\nua: ${nav}\nviewport: ${vp}\n\n` + JSON.stringify(snap, null, 2);
  }

  const copyBtn = K.button(T.copy, { icon: 'copy', variant: 'primary', id: 'dg-copy', onClick: () => K.copyText(reportText(), { title: T.copy, done: T.copied }) });
  const refreshBtn = K.button(T.refresh, { icon: 'refresh', id: 'dg-refresh', onClick: render });
  const live = K.toggle({ id: 'dg-live', label: T.live, value: false, onChange: (v) => { clearInterval(timer); if (v) timer = setInterval(render, 1000); } });
  cleanups.push(() => clearInterval(timer));
  const frame = K.pageFrame({ id: 'dg', title: T.title, sub: T.sub, onBack: () => ctx.nav.back(), actions: [] });
  frame.content.appendChild(K.h('div', { class: 'vw-col' },
    K.h('div', { class: 'vw-row vw-wrapflex vw-diag__bar' }, copyBtn, refreshBtn, K.h('label', { class: 'vw-check vw-small', for: 'dg-live' }, live, K.h('span', { text: T.live + ' – ' + T.liveHint }))),
    sum, body));
  frame.mount(root);
  render();
  K.enter(Array.from(body.children), 'pop', 0);
  cleanups.push(frame.destroy);
  return K.withExit(root, { destroy() { cleanups.forEach((f) => f()); }, onBack() { return K.hasModal(); } });
}
