// Diagnostics: renders ctx.diag.snapshot() as readable sections (overview, graphics, performance, audio with a per-path tally and a collapsible per-asset
// list, storage, blocked-by-policy, errors, recent log) with Copy (clipboard, or a selectable fallback).
// The REAL snapshot (src/app/diagnostics.js) is FLAT: {build, buildDate, caps:{renderer,vendor,maxTex,floatRT,ua,dpr,screen}, quality, drawCalls, fps, ...,
// storage:'ok'|'full'|'memory', storageBytes, audio:{state, loaded, paths:{id:'embedded'|'fetched'|'synth'|'failed'}, failedAssets, ...}, errors:[{kind,msg,t}],
// csp:[{blocked,directive,t}], manifest}. normalizeSnapshot() turns that into sections; an already-sectioned snapshot (webgl/perf/...) passes through.
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { safe } from './_shared.js';

export const meta = { id: 'diagnostics', layer: 'menu', music: 'menu', canvas: 'none' };

const SECTION_ORDER = ['overview', 'webgl', 'perf', 'audio', 'storage', 'csp', 'errors', 'log', 'build', 'other'];
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined && o[k] !== null;
const pick = (src, keys) => { const o = {}; if (src) for (const k of keys) if (has(src, k)) o[k] = src[k]; return o; };

/** Normalise a diagnostics snapshot into { sectionKey: object | array }. Pure; exported for tests. */
export function normalizeSnapshot(snap, log) {
  if (!isObj(snap)) return {};
  const sectioned = isObj(snap.webgl) || isObj(snap.perf) || isObj(snap.overview);
  if (sectioned) { const o = Object.assign({}, snap); if (log && !o.log) o.log = log; return o; }
  const out = {};
  const caps = isObj(snap.caps) ? snap.caps : {};
  out.overview = Object.assign({}, pick(snap, ['build', 'buildDate', 'timeToTitleMs']), pick(snap, ['quality', 'autoScale', 'pixelRatio']));
  out.webgl = Object.assign({ webgl2: !!(caps.renderer || caps.maxTex) }, pick(caps, ['renderer', 'vendor', 'maxTex', 'floatRT', 'screen', 'dpr', 'ua']));
  if (snap.caps === null || snap.caps === undefined) out.webgl.webgl2 = !!snap.webgl2;
  out.perf = pick(snap, ['fps', 'frameP50', 'frameP95', 'cpuMs', 'drawCalls', 'triangles', 'geometries', 'textures', 'programs', 'units', 'projectiles', 'fxLive', 'tick', 'heapMB']);
  if (isObj(snap.audio)) {
    const a = snap.audio, au = {};
    if (a.error) au.error = a.error;
    Object.assign(au, pick(a, ['state', 'ctxState', 'available', 'unlocked', 'muted', 'sampleRate']));
    if (has(a, 'voices')) au.voices = has(a, 'voiceBudget') ? `${a.voices} of ${a.voiceBudget}` : a.voices;
    if (has(a, 'voiceDrops')) au.voiceDrops = a.voiceDrops;
    if (isObj(a.loaded)) au.loaded = pick(a.loaded, ['embedded', 'fetched', 'synth', 'failed']);
    if (isObj(a.paths)) { const t = { embedded: 0, fetched: 0, synth: 0, failed: 0, pending: 0 }; for (const id of Object.keys(a.paths)) { const p = a.paths[id]; t[p] = (t[p] || 0) + 1; } au.assetPaths = Object.fromEntries(Object.entries(t).filter(([k, v]) => v || k !== 'pending')); }
    if (isObj(a.codecs)) au.codecs = a.codecs;
    if (isObj(a.manifest)) au.manifest = pick(a.manifest, ['sfx', 'music', 'core', 'notPublished']);
    if (isObj(a.tts)) au.tts = a.tts;
    out.audio = au;
    out.__assets = isObj(a.paths) ? Object.keys(a.paths).sort().map((id) => ({ id, path: a.paths[id] })) : [];
    out.__failed = Array.isArray(a.failedAssets) ? a.failedAssets : [];
  }
  out.storage = { status: snap.storage, bytes: snap.storageBytes };
  if (isObj(snap.manifest)) out.build = { manifestSfx: snap.manifest.sfx, manifestMusic: snap.manifest.music, coreAudio: snap.manifest.coreAudio };
  out.csp = Array.isArray(snap.csp) ? snap.csp : [];
  out.errors = Array.isArray(snap.errors) ? snap.errors : [];
  out.log = Array.isArray(snap.log) ? snap.log : (Array.isArray(log) ? log : []);
  const known = new Set(['build', 'buildDate', 'timeToTitleMs', 'caps', 'quality', 'autoScale', 'pixelRatio', 'drawCalls', 'triangles', 'geometries', 'textures', 'programs', 'fps', 'frameP50', 'frameP95', 'cpuMs', 'units', 'projectiles', 'fxLive', 'tick', 'heapMB', 'storage', 'storageBytes', 'audio', 'manifest', 'csp', 'errors', 'log', 'webgl2']);
  const other = {};
  for (const k of Object.keys(snap)) if (!known.has(k) && (typeof snap[k] !== 'function')) other[k] = snap[k];
  if (Object.keys(other).length) out.other = other;
  return out;
}

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.diag;
  const cleanups = [];
  let snap = {}, norm = {};
  let timer = 0;
  const body = K.h('div', { class: 'vw-diag__grid' });
  const sum = K.h('div', { class: 'vw-diag__sum', role: 'status', 'aria-label': 'Summary' });
  const label = (k) => (T.key[k] || k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
  const UNIT = { frameP50: ' ms', frameP95: ' ms', cpuMs: ' ms', heapMB: ' MB', timeToTitleMs: ' ms', sampleRate: ' Hz', bytes: ' bytes', storageBytes: ' bytes' };
  const fmtVal = (k, v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? K.fmtNum(v) : String(Math.round(v * 100) / 100)) : String(v); return s + (UNIT[k] && typeof v === 'number' ? UNIT[k] : ''); };

  function kvRows(obj, prefix) {
    const rows = [];
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === undefined || v === null) continue;
      const name = (prefix ? prefix + ' › ' : '') + label(k);
      if (isObj(v)) { rows.push(...kvRows(v, name)); continue; }
      if (Array.isArray(v)) {
        if (v.every((x) => isObj(x))) { rows.push(['list', name, v]); continue; }
        rows.push(['kv', name, v.join(', '), k]); continue;
      }
      rows.push(['kv', name, v, k]);
    }
    return rows;
  }
  function valueNode(k, v) {
    if (v === true) return K.chip(T.ok, { variant: 'olive', icon: 'check' });
    if (v === false) return K.chip(T.bad, { variant: 'danger', icon: 'warning' });
    if (k === 'ua' || k === 'renderer') return K.h('span', { class: 'vw-diag__val vw-mono vw-diag__long', text: String(v) });
    return K.h('span', { class: 'vw-diag__val vw-nums', text: fmtVal(k, v) });
  }
  const timeLabel = (t) => (t == null ? '' : (t > 500 ? (Number(t) / 1000).toFixed(1) : Number(t).toFixed(1)) + 's ');
  function assetsDetails() {
    const items = norm.__assets || [], failed = norm.__failed || [];
    const frag = [];
    if (failed.length) {
      if (T.fetchFail) frag.push(K.note(T.fetchFail, 'warn'));
      frag.push(K.h('ul', { class: 'vw-list vw-diag__failed' }, ...failed.map((f) => K.h('li', { class: 'vw-note vw-note--bad vw-mono', text: `${f.id || '?'}: ${f.err || 'failed'}${f.url ? ' (' + f.url + ')' : ''}` }))));
    }
    if (items.length) {
      const d = K.h('details', { class: 'vw-diag__assets-d', id: 'dg-assets' }, K.h('summary', { class: 'vw-small', text: T.assetsList(items.length) }),
        K.h('ul', { class: 'vw-chips vw-diag__assets' }, ...items.map((it) => K.chip(`${it.id}: ${it.path}`, { variant: it.path === 'synth' ? 'lava' : it.path === 'failed' ? 'danger' : it.path === 'embedded' ? 'gold' : 'sky', class: 'vw-chip--wrap' }))));
      frag.push(d);
    }
    return frag;
  }
  function sectionFor(key, val) {
    const title = T.sections[key] || label(key);
    let content;
    if (key === 'csp') {
      content = !val || !val.length ? K.note(T.cspNone, 'ok') : K.h('ul', { class: 'vw-list' }, ...val.map((x) => K.h('li', { class: 'vw-note vw-note--bad vw-mono', text: typeof x === 'string' ? x : isObj(x) && (x.directive || x.blocked) ? `${x.directive || 'policy'} blocked ${x.blocked || '?'}${x.t != null ? ' at ' + timeLabel(x.t).trim() : ''}` : JSON.stringify(x) })));
    } else if (key === 'errors') {
      content = !val || !val.length ? K.note(T.errorsNone, 'ok') : K.h('ol', { class: 'vw-diag__log vw-mono' }, ...val.map((e) => K.h('li', { class: 'vw-diag__log-error' }, K.h('span', { class: 'vw-dim', text: timeLabel(e.t) + (e.kind ? '[' + e.kind + '] ' : '') }), typeof e === 'string' ? e : (e.msg || JSON.stringify(e)))));
    } else if (key === 'log') {
      content = !val || !val.length ? K.note(T.none) : K.h('ol', { class: 'vw-diag__log vw-mono' }, ...val.slice(-40).map((l) => K.h('li', { class: 'vw-diag__log-' + (l.level || 'info') }, K.h('span', { class: 'vw-dim', text: timeLabel(l.t) }), String(l.msg != null ? l.msg : (typeof l === 'string' ? l : JSON.stringify(l))))));
    } else if (isObj(val)) {
      const rows = kvRows(val, '');
      content = K.h('dl', { class: 'vw-diag__kv' });
      for (const r of rows) {
        if (r[0] === 'kv') content.append(K.h('dt', { text: r[1] }), K.h('dd', {}, valueNode(r[3], r[2])));
        else content.append(K.h('dt', { text: r[1] }), K.h('dd', {}, K.h('ul', { class: 'vw-list vw-diag__assets' }, ...r[2].map((it) => K.h('li', { class: 'vw-mono vw-small', text: JSON.stringify(it) })))));
      }
      if (key === 'audio') { const extra = assetsDetails(); if (extra.length) return K.tablet(title, K.h('div', { class: 'vw-col' }, content, ...extra), { id: 'dg-' + key, tight: true }); }
    } else if (Array.isArray(val)) {
      content = val.length ? K.h('ul', { class: 'vw-list' }, ...val.map((x) => K.h('li', { class: 'vw-mono', text: typeof x === 'string' ? x : JSON.stringify(x) }))) : K.note(T.none);
    } else content = K.h('span', { class: 'vw-diag__val', text: String(val) });
    return K.tablet(title, content, { id: 'dg-' + key, tight: true });
  }

  function render() {
    let raw;
    try { raw = ctx.diag.snapshot() || {}; } catch (e) { raw = { other: { error: String((e && e.message) || e) } }; }
    snap = raw;
    const log = safe(() => ctx.diag.log, []) || [];
    norm = normalizeSnapshot(raw, Array.isArray(log) ? log : []);
    const keys = Object.keys(norm).filter((k) => k.slice(0, 2) !== '__');
    if (!keys.length) { body.replaceChildren(K.emptyState({ icon: 'bug', title: T.title, text: T.empty })); sum.replaceChildren(); return; }
    const ordered = SECTION_ORDER.filter((k) => keys.indexOf(k) >= 0).concat(keys.filter((k) => SECTION_ORDER.indexOf(k) < 0));
    const open = !!(body.querySelector('#dg-assets') && body.querySelector('#dg-assets').open);
    body.replaceChildren(...ordered.map((k) => sectionFor(k, norm[k])));
    if (open) { const d = body.querySelector('#dg-assets'); if (d) d.open = true; }
    // summary chips: the numbers people ask for first
    const w = norm.webgl || {}, p = norm.perf || {}, o = norm.overview || {}, st = norm.storage || {}, csp = norm.csp || [], er = norm.errors || [];
    const chips = [];
    chips.push(K.chip('WebGL 2 ' + (w.webgl2 === false ? 'missing' : 'ok'), { variant: w.webgl2 === false ? 'danger' : 'olive', icon: w.webgl2 === false ? 'warning' : 'check' }));
    const tier = o.quality || p.tier;
    if (tier) chips.push(K.chip('Tier ' + tier, { variant: 'gold' }));
    if (p.fps != null) chips.push(K.chip(`${Math.round(p.fps)} FPS`, { variant: 'sky' }));
    if (p.drawCalls != null) chips.push(K.chip(`${K.fmtNum(p.drawCalls)} draw calls`, { variant: 'sky' }));
    const sv = st.status || (isObj(st) ? undefined : st);
    if (sv) chips.push(K.chip('Storage ' + sv, { variant: sv === 'ok' ? 'olive' : 'danger' }));
    chips.push(K.chip(`${csp.length} policy violation${csp.length === 1 ? '' : 's'}`, { variant: csp.length ? 'danger' : 'olive' }));
    if (er.length) chips.push(K.chip(`${er.length} error${er.length === 1 ? '' : 's'}`, { variant: 'danger', icon: 'warning' }));
    sum.replaceChildren(...chips);
  }
  function reportText() {
    const nav = safe(() => navigator.userAgent, '');
    const vp = safe(() => `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x`, '');
    const v = ctx.version || {};
    const log = safe(() => ctx.diag.log, []) || [];
    const tail = Array.isArray(log) && log.length ? '\n\nlog (last 40):\n' + log.slice(-40).map((l) => `${timeLabel(l.t)}${l.msg != null ? l.msg : l}`).join('\n') : '';
    return `VOXELWARS diagnostics\nbuild: ${v.version || v.build || '1.0.0'} (${v.date || ''})\nua: ${nav}\nviewport: ${vp}\n\n` + JSON.stringify(snap, null, 2) + tail;
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
