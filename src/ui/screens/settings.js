// Settings: Graphics, Gameplay, Audio, Accessibility, Controls (rebinding with per-context conflict detection), Data, About.
// Every option applies immediately through ctx.settings.set and re-syncs when settings change elsewhere (auto-scale, mute button...).
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { QUALITY_CAPS, safe, todayKey } from './_shared.js';
import { CONTEXTS, KEY_ACTIONS, FIXED_KEYS, RESERVED, DEFAULT_KEYS, currentKeys, findConflict, setKey, resetKeys, domainOf } from '../keymap.js';

export const meta = { id: 'settings', layer: 'menu', music: 'menu', canvas: 'none' };

let LAST_TAB = 'graphics';
const PRESET_FLAGS = { potato: { shadows: false, bloom: false, clouds: false, resScale: 0.7 }, papyrus: { shadows: true, bloom: false, clouds: true, resScale: 1 }, marble: { shadows: true, bloom: true, clouds: true, resScale: 1 }, olympian: { shadows: true, bloom: true, clouds: true, resScale: 1 } };

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.settings;
  const cleanups = [];
  const syncs = [];
  const S = ctx.settings;
  const get = (k, d) => { const v = safe(() => S.get(k), d); return v === undefined ? d : v; };
  const set = (k, v) => S.set(k, v);
  const idOf = (k) => 'set-' + k.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  const tgl = (key, label, hint, o) => { const t = K.toggle({ id: idOf(key), value: !!get(key, false), label, onChange: (v) => { set(key, v); if (o && o.after) o.after(v); } }); syncs.push(() => t.set(!!get(key, false), true)); return K.field(label, t, { hint, id: idOf(key) + '-row' }); };
  const seg = (key, label, options, hint, o) => { const s = K.segmented({ id: idOf(key), label, value: get(key), options, onChange: (v) => { set(key, v); if (o && o.after) o.after(v); } }); syncs.push(() => s.set(get(key), true)); return K.field(label, s, { hint, stack: !(o && o.inline), id: idOf(key) + '-row' }); };
  const sld = (key, label, o) => { const s = K.slider(Object.assign({ id: idOf(key), value: +get(key, o.min), label, onInput: (v) => set(key, v) }, o)); syncs.push(() => s.set(get(key, o.min), true)); return s; };
  const pct = (v) => Math.round(v * 100) + '%';

  /* ---------------------------------------------------------------- Graphics */
  function graphics() {
    const capsEl = K.h('p', { class: 'vw-note', id: 'set-caps' });
    const paintCaps = () => { const c = QUALITY_CAPS[get('quality', 'marble')] || QUALITY_CAPS.marble; capsEl.textContent = T.graphics.caps(c); };
    const q = K.segmented({ id: idOf('quality'), label: T.graphics.quality, value: get('quality', 'marble'), options: Object.keys(T.graphics.presets).map((k) => ({ value: k, label: T.graphics.presets[k], sub: T.graphics.presetSub[k], title: (T.graphics.presetTip || {})[k] })),
      onChange: (v) => { set('quality', v); const f = PRESET_FLAGS[v]; if (f) for (const k of Object.keys(f)) set(k, f[k]); paintCaps(); } });
    syncs.push(() => { q.set(get('quality', 'marble'), true); paintCaps(); });
    paintCaps();
    return K.h('div', { class: 'vw-col' },
      K.field(T.graphics.quality, K.h('div', { class: 'vw-col vw-grow' }, q, capsEl), { hint: T.graphics.qualityTip, stack: true }),
      tgl('autoScale', T.graphics.autoScale, T.graphics.autoScaleHint),
      K.field(T.graphics.resScale, sld('resScale', T.graphics.resScale, { min: 0.5, max: 1, step: 0.05, format: pct, valueWidth: '3.6rem', ticks: [{ v: 0.5, label: '50%' }, { v: 0.75, label: '75%' }, { v: 1, label: '100%' }] }), { hint: T.graphics.resScaleHint, stack: true }),
      tgl('shadows', T.graphics.shadows, T.graphics.shadowsHint), tgl('bloom', T.graphics.bloom, T.graphics.bloomHint), tgl('clouds', T.graphics.clouds, T.graphics.cloudsHint), tgl('fpsCounter', T.graphics.fps, T.graphics.fpsHint));
  }

  /* ---------------------------------------------------------------- Gameplay */
  function gameplay() {
    return K.h('div', { class: 'vw-col' },
      seg('gore', T.gameplay.gore, Object.keys(T0.quick.gores).map((k) => ({ value: k, label: T0.quick.gores[k], title: (T0.quick.goreTips || {})[k] })), T.gameplay.goreHint),
      seg('corpses', T.gameplay.corpses, Object.keys(T0.quick.corpsesOpts).map((k) => ({ value: k, label: T0.quick.corpsesOpts[k], title: (T0.quick.corpseTips || {})[k] })), T.gameplay.corpsesHint),
      K.field(T.gameplay.camSens, sld('camSens', T.gameplay.camSens, { min: 0.25, max: 2, step: 0.05, format: (v) => v.toFixed(2) + '×', valueWidth: '4rem', ticks: [{ v: 0.25, label: '0.25' }, { v: 1, label: '1.0' }, { v: 2, label: '2.0' }] }), { hint: T.gameplay.camSensHint, stack: true }),
      tgl('edgeScroll', T.gameplay.edgeScroll, T.gameplay.edgeScrollHint), tgl('autoPauseBlur', T.gameplay.autoPause, T.gameplay.autoPauseHint));
  }

  /* ---------------------------------------------------------------- Audio */
  function audio() {
    const TEST = { master: 'ui_confirm', sfx: 'hit_blade', ui: 'ui_click', announcer: 'horn_war' };
    const bus = (b, label) => {
      const key = 'vol.' + b;
      const s = K.slider({ id: idOf(key), min: 0, max: 1, step: 0.05, value: +get(key, 0.8), label, format: pct, valueWidth: '3.6rem', onInput: (v) => { set(key, v); safe(() => ctx.audio.setVolume(b, v)); } });
      syncs.push(() => s.set(+get(key, 0.8), true));
      const row = K.h('div', { class: 'vw-row vw-set-bus' }, K.h('div', { class: 'vw-grow' }, s));
      if (TEST[b]) { const tb = K.button(T.audio.test, { size: 'sm', variant: 'ghost', id: idOf(key) + '-test', aria: `${T.audio.test}: ${label}`, sound: false, onClick: () => { K.sfx(TEST[b]); tb.setLabel(T.audio.playing); clearTimeout(tb._t); tb._t = setTimeout(() => tb.setLabel(T.audio.test), 900); } }); row.appendChild(tb); }
      return K.field(label, row, { stack: true, id: idOf(key) + '-row' });
    };
    const tts = tgl('tts', T.audio.tts, T.audio.ttsHint);
    tts.querySelector('.vw-field__label').appendChild(K.chip('Experimental', { variant: 'lava' }));
    return K.h('div', { class: 'vw-col' },
      tgl('muted', T.audio.muted, T.audio.mutedHint),
      bus('master', T.audio.master), bus('music', T.audio.music), bus('sfx', T.audio.sfx), bus('ui', T.audio.ui), bus('announcer', T.audio.announcer),
      tts, tgl('subtitles', T.audio.subtitles, T.audio.subtitlesHint));
  }

  /* ---------------------------------------------------------------- Accessibility */
  function access() {
    const swA = K.chip('Army A', { variant: 'team-a' }), swB = K.chip('Army B', { variant: 'team-b' });
    const prevRow = K.h('div', { class: 'vw-row vw-wrapflex', 'aria-label': T.access.preview }, swA, swB, K.h('span', { class: 'vw-small vw-dim', text: T.access.preview }));
    return K.h('div', { class: 'vw-col' },
      tgl('reduceMotion', T.access.reduce, T.access.reduceHint, { after: () => K.applyUiSettings(S) }),
      K.field(T.access.shake, sld('shake', T.access.shake, { min: 0, max: 1, step: 0.05, format: pct, valueWidth: '3.6rem', ticks: [{ v: 0, label: '0%' }, { v: 0.5, label: '50%' }, { v: 1, label: '100%' }] }), { hint: T.access.shakeHint, stack: true }),
      tgl('flashLimiter', T.access.flash, T.access.flashHint),
      K.field(T.access.uiScale, sld('uiScale', T.access.uiScale, { min: 0.8, max: 1.3, step: 0.05, format: pct, valueWidth: '3.6rem', ticks: [{ v: 0.8, label: '80%' }, { v: 1, label: '100%' }, { v: 1.3, label: '130%' }], onInput: (v) => { set('uiScale', v); K.applyUiSettings(S); } }), { hint: T.access.uiScaleHint, stack: true }),
      seg('palette', T.access.palette, Object.keys(T.access.palettes).map((k) => ({ value: k, label: T.access.palettes[k] })), T.access.paletteHint, { after: () => K.applyUiSettings(S) }),
      K.field(T.access.preview, prevRow, { stack: true }),
      tgl('highContrastUI', T.access.contrast, T.access.contrastHint, { after: () => K.applyUiSettings(S) }),
      tgl('subtitles', T.audio.subtitles, T.audio.subtitlesHint));
  }

  /* ---------------------------------------------------------------- Controls: rebinding */
  let listening = null;   // { id, btn, off }
  const keyCells = {};
  const rowEls = {};
  function paintKeys() {
    const keys = currentKeys(S);
    for (const a of KEY_ACTIONS) {
      const cell = keyCells[a.id]; if (!cell) continue;
      cell.replaceChildren(K.kbd(keys[a.id], { dark: true }), ...(a.alt || []).map((c) => K.kbd(c, { dark: true })));
      rowEls[a.id].classList.toggle('is-custom', keys[a.id] !== a.def);
      const r = rowEls[a.id].querySelector('.vw-key-reset'); if (r) r.classList.toggle('vw-hide', keys[a.id] === a.def);
    }
  }
  function stopListening() {
    if (!listening) return;
    listening.off(); listening.btn.setLabel(T.controls.rebind); listening.row.classList.remove('is-listening'); listening = null;
  }
  function startListening(a, btn, row) {
    stopListening();
    btn.setLabel(T.controls.listening); row.classList.add('is-listening');
    const onKey = async (e) => {
      if (e.repeat || ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].indexOf(e.code) >= 0) { e.preventDefault(); e.stopPropagation(); return; }
      e.preventDefault(); e.stopPropagation();
      if (e.code === 'Escape') { K.sfx('ui_back'); stopListening(); btn.focus(); return; }
      stopListening();
      btn.focus();
      const code = e.code;
      if (RESERVED.indexOf(code) >= 0) { K.sfx('ui_error'); K.toast(T.controls.reserved(K.keyLabel(code)), { kind: 'error' }); return; }
      const cf = findConflict(S, a.id, code);
      if (cf && cf.kind === 'fixed') { K.sfx('ui_error'); K.toast(T.controls.conflict(K.keyLabel(code), cf.label), { kind: 'error' }); return; }
      if (cf && cf.kind === 'action') {
        const swap = await K.modal({ title: T.controls.conflict(K.keyLabel(code), cf.label), icon: 'warning', dismissValue: false, focus: 'primary',
          body: `${a.label} → ${K.keyLabel(code)}\n\n${cf.label} → ${K.keyLabel(currentKeys(S)[a.id])}`,
          buttons: [{ label: T.controls.pickAnother, variant: 'secondary', value: false, cancel: true }, { label: T.controls.swap, variant: 'primary', value: true }] });
        if (!swap) return;
        const mine = currentKeys(S)[a.id];
        setKey(S, cf.id, mine); setKey(S, a.id, code); paintKeys(); K.toast(T.controls.saved(a.label, K.keyLabel(code)), { kind: 'success' });
        return;
      }
      setKey(S, a.id, code); paintKeys(); K.sfx('ui_confirm'); K.toast(T.controls.saved(a.label, K.keyLabel(code)), { kind: 'success' });
    };
    window.addEventListener('keydown', onKey, true);
    listening = { id: a.id, btn, row, off: () => window.removeEventListener('keydown', onKey, true) };
  }
  cleanups.push(stopListening);

  function controls() {
    const out = K.h('div', { class: 'vw-col' }, K.h('p', { class: 'vw-note', text: T.controls.hint }));
    for (const c of CONTEXTS) {
      const acts = KEY_ACTIONS.filter((a) => a.ctx === c.id), fixed = FIXED_KEYS[c.id] || [];
      const list = K.h('div', { class: 'vw-keys', role: 'list', 'aria-label': c.label });
      for (const a of acts) {
        const cell = K.h('div', { class: 'vw-key-cell' }); keyCells[a.id] = cell;
        const row = K.h('div', { class: 'vw-key-row', role: 'listitem', id: 'key-row-' + a.id }); rowEls[a.id] = row;
        const btn = K.button(T.controls.rebind, { size: 'sm', id: 'key-' + a.id, aria: `${T.controls.rebind}: ${a.label}`, onClick: () => { if (listening && listening.id === a.id) { stopListening(); return; } setTimeout(() => startListening(a, btn, row), 0); } });
        const rst = K.button(T.controls.reset, { size: 'sm', variant: 'ghost', class: 'vw-key-reset', id: 'key-reset-' + a.id, aria: `${T.controls.reset}: ${a.label}`, onClick: () => { setKey(S, a.id, DEFAULT_KEYS[a.id]); paintKeys(); } });
        row.append(K.h('span', { class: 'vw-key-label', text: a.label }), cell, K.h('span', { class: 'vw-key-btns' }, btn, rst));
        list.appendChild(row);
      }
      for (const f of fixed) {
        const keys = f.keys.length ? f.keys.map((k) => K.kbd(k, { dark: true })) : [K.h('span', { class: 'vw-small', text: f.text })];
        list.appendChild(K.h('div', { class: 'vw-key-row vw-key-row--fixed', role: 'listitem' }, K.h('span', { class: 'vw-key-label', text: f.label }), K.h('div', { class: 'vw-key-cell' }, ...keys), K.h('span', { class: 'vw-key-btns' }, K.chip(T.controls.fixed, { variant: 'dash' }))));
      }
      out.appendChild(K.h('section', { class: 'vw-keys-group', 'aria-label': c.label }, K.h('h3', { class: 'vw-keys-title vw-display', text: c.label }), list));
    }
    out.appendChild(K.h('div', { class: 'vw-row' }, K.button(T.controls.resetAll, { icon: 'refresh', variant: 'secondary', size: 'sm', id: 'key-reset-all', onClick: async () => { if (await K.ask({ title: T.controls.resetAllAsk.title, text: T.controls.resetAllAsk.text, yes: T.controls.resetAllAsk.yes })) { resetKeys(S); paintKeys(); } } })));
    out.appendChild(K.h('section', { class: 'vw-keys-group', 'aria-label': T.controls.mouse }, K.h('h3', { class: 'vw-keys-title vw-display', text: T.controls.mouse }),
      K.h('div', { class: 'vw-keys', role: 'list' }, ...T.controls.mouseList.map(([a, b]) => K.h('div', { class: 'vw-key-row vw-key-row--fixed', role: 'listitem' }, K.h('span', { class: 'vw-key-label', text: a }), K.h('span', { class: 'vw-small vw-dim vw-key-desc', text: b }))))));
    paintKeys();
    return out;
  }

  /* ---------------------------------------------------------------- Data */
  let paintStatusRef = null;
  function data() {
    const statusEl = K.h('div', { class: 'vw-col', id: 'set-storage' });
    let lastSt = null;
    const retry = K.button(T.data.retrySave, { icon: 'refresh', size: 'sm', variant: 'secondary', id: 'set-retry-save', onClick: () => {
      let left = -1; try { left = ctx.save.store.flushPending(); } catch (e) { left = -1; }
      K.toast(left === 0 ? T.data.retryOk : T.data.retryStill, { kind: left === 0 ? 'success' : 'warn' }); paintStatus();
    } });
    const paintStatus = () => {
      const st = safe(() => ctx.save.status(), 'ok'); lastSt = st;
      const chipEl = st === 'ok' ? K.chip(T.data.storageOk, { variant: 'olive', icon: 'check' }) : st === 'full' ? K.chip(T.data.storageFullChip, { variant: 'gold', icon: 'warning' }) : K.chip(T.data.storageMemoryChip, { variant: 'danger', icon: 'warning' });
      const msg = st === 'ok' ? T.data.storageHint : st === 'full' ? T.data.storageFull : T.data.storageMemory;
      statusEl.replaceChildren(K.h('div', { class: 'vw-row vw-wrapflex', role: 'status' }, chipEl), K.h('p', { class: st === 'ok' ? 'vw-small vw-dim' : 'vw-note vw-note--' + (st === 'full' ? 'warn' : 'bad'), text: msg }), st === 'full' ? K.h('div', { class: 'vw-row' }, retry) : null);
    };
    const iv = setInterval(() => { if (safe(() => ctx.save.status(), 'ok') !== lastSt) paintStatus(); }, 1000);
    cleanups.push(() => clearInterval(iv));
    paintStatus(); paintStatusRef = paintStatus;
    const exportBtn = K.button(T.data.exportBtn, { icon: 'download', id: 'set-export', onClick: doExport });
    const importFile = K.button(T.data.importBtn, { icon: 'upload', id: 'set-import-file', onClick: doImportFile });
    const importPaste = K.button(T.data.importPaste, { icon: 'copy', variant: 'ghost', id: 'set-import-paste', onClick: doImportPaste });
    const resetBtn = K.button(T.data.resetBtn, { icon: 'trash', variant: 'danger', id: 'set-reset-progress', onClick: doReset });
    const hintsBtn = K.button(T.data.hintsBtn, { icon: 'refresh', variant: 'secondary', id: 'set-reset-hints', onClick: () => { set('seenHints', {}); K.toast(T.data.hintsDone, { kind: 'success' }); } });
    return K.h('div', { class: 'vw-col' },
      K.field(T.data.storage, statusEl, { stack: true }),
      K.field(T.data.export, exportBtn, { hint: T.data.exportHint }),
      K.field(T.data.import, K.h('div', { class: 'vw-row vw-wrapflex' }, importFile, importPaste), { hint: T.data.importHint }),
      K.field(T.data.hints, hintsBtn, { hint: T.data.hintsHint }),
      tgl('beacon', T.data.beacon, T.data.beaconHint),
      K.field(T.data.reset, resetBtn, { hint: T.data.resetHint }));
  }
  async function doExport() {
    let text = '';
    try { text = await ctx.save.exportAll(); } catch (e) { K.toast(T.data.exportFail((e && e.message) || 'unknown error'), { kind: 'error', ms: 6000 }); return; }
    if (typeof text !== 'string') text = JSON.stringify(text);
    const name = `voxelwars-save-${todayKey()}.json`;
    let done = false;
    try { const dl = ctx.platform && ctx.platform.downloads; if (dl && dl.save) { const r = await dl.save(name, text); done = r !== false && r !== null && r !== undefined ? !!r : false; } } catch (e) { done = false; }
    if (done) { K.toast(T.data.exported, { kind: 'success' }); return; }
    await K.textModal({ title: T.data.exportText.title, text, readOnly: true, note: T.data.exportText.note });
  }
  async function doImportFile() {
    let f = null;
    try { f = ctx.platform && ctx.platform.pickFile ? await ctx.platform.pickFile('.json,application/json') : null; } catch (e) { f = null; }
    if (!f) { await doImportPaste(); return; }
    try { const r = await ctx.save.importAll(f); importDone(r); } catch (e) { importFailed(e); }
  }
  async function doImportPaste() {
    const res = await K.textModal({ title: T.data.importPasteTitle, note: T.data.importPasteNote, ok: T0.common.apply, rows: 8,
      onSubmit: async (t) => { try { lastImport = await ctx.save.importAll(t.trim()); return null; } catch (e) { return importMessage(e); } } });
    if (res != null) importDone(lastImport);
  }
  // ctx.save.importAll resolves {ok, warnings[], applied[], counts} and REJECTS with the first plain-English reason (e.result has the full list); nothing is applied on failure
  let lastImport = null;
  const importMessage = (e) => { const m = e && e.message; return m ? T.data.importFail(m) : ((T.data.importFailInfo && T.data.importFailInfo.body) || T.data.importFail('unknown error')); };
  function importFailed(e) { K.sfx('ui_error'); K.toast(importMessage(e), { kind: 'error', ms: 6000 }); }
  function importDone(r) {
    K.toast(T.data.importOk, { kind: 'success' });
    const w = r && Array.isArray(r.warnings) ? r.warnings.filter(Boolean) : [];
    if (w.length) K.toast(w.slice(0, 2).join(' '), { kind: 'warn', ms: 7000 });
    syncs.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });   // settings may have changed
    paintStatusRef && paintStatusRef();
  }
  async function doReset() {
    const ok = await K.ask({ title: T.data.resetAsk.title, text: T.data.resetAsk.text, yes: T.data.resetAsk.yes, danger: true });
    if (!ok) return;
    try {
      const p = ctx.save.progress;
      if (typeof p.reset === 'function') await p.reset();
      else if (typeof p.list === 'function') for (const it of p.list()) p.remove(it.id);
      K.toast(T.data.resetDone, { kind: 'success' });
    } catch (e) { K.toast(T.data.resetFail((e && e.message) || 'unknown error'), { kind: 'error' }); }
  }

  /* ---------------------------------------------------------------- About */
  function about() {
    const v = ctx.version || {};
    return K.h('div', { class: 'vw-col' },
      K.h('p', { class: 'vw-epigraph vw-set-about-line', text: T.about.line }),
      T.about.disclaimer ? K.h('p', { class: 'vw-note vw-set-about-disc', text: T.about.disclaimer }) : null,
      K.h('div', { class: 'vw-row vw-wrapflex' }, K.chip(`${T.about.version} ${v.version || v.build || '1.0.0'}`, { variant: 'gold' }), K.chip(`${T.about.build} ${v.date || ''}`, { variant: 'ink' })),
      K.h('h3', { class: 'vw-keys-title vw-display', text: T.about.honest }),
      K.h('ul', { class: 'vw-list vw-set-honest' }, ...T.about.honestList.map((t) => K.h('li', { class: 'vw-note', text: t }))),
      K.h('div', { class: 'vw-row vw-wrapflex' },
        K.button(T.about.diag, { icon: 'bug', id: 'set-open-diag', onClick: () => ctx.nav.goto('diagnostics') }),
        K.button(T.about.credits, { icon: 'laurel', id: 'set-open-credits', onClick: () => ctx.nav.goto('credits') }),
        K.button(T.open.stats, { icon: 'star', id: 'set-open-stats', onClick: () => ctx.nav.goto('stats') })));
  }

  /* ---------------------------------------------------------------- frame */
  const PANELS = { graphics, gameplay, audio, access, controls, data, about };
  const ICONS = { graphics: 'image', gameplay: 'gamepad', audio: 'volume', access: 'accessibility', controls: 'keyboard', data: 'database', about: 'info' };
  const ids = Object.keys(PANELS);
  const initial = params && params.tab && PANELS[params.tab] ? params.tab : LAST_TAB;
  const panelHost = K.h('div', { class: 'vw-set__panel' });
  const tabsEl = K.tabs(ids.map((id) => ({ id, label: T.tabs[id], icon: ICONS[id] })), { id: 'set-tabs', label: T.title, value: initial, vertical: true, onChange: (id) => showTab(id) });
  const mqPhone = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
  const applyTabsLayout = () => { const ph = !!(mqPhone && mqPhone.matches); tabsEl.classList.toggle('vw-tabs--vertical', !ph); tabsEl.classList.toggle('vw-tabs--scroll', ph); tabsEl.setAttribute('aria-orientation', ph ? 'horizontal' : 'vertical'); };
  applyTabsLayout();
  if (mqPhone && mqPhone.addEventListener) { mqPhone.addEventListener('change', applyTabsLayout); cleanups.push(() => mqPhone.removeEventListener('change', applyTabsLayout)); }
  let cur = null;
  function showTab(id) {
    stopListening();
    LAST_TAB = id; cur = id;
    syncs.length = 0; Object.keys(keyCells).forEach((k) => delete keyCells[k]);
    const body = PANELS[id]();
    const tab = K.tablet(T.tabs[id], body, { id: 'set-panel-' + id, icon: ICONS[id] });
    tab.setAttribute('role', 'tabpanel'); tab.setAttribute('aria-labelledby', 'set-tabs-' + id);
    panelHost.replaceChildren(tab);
    K.enter(tab, 'pop', 0);
    panelHost.scrollTop = 0;
  }
  const frame = K.pageFrame({ id: 'set', title: T.title, sub: T.sub, onBack: () => { stopListening(); ctx.nav.back(); } });
  frame.content.appendChild(K.h('div', { class: 'vw-set' }, K.h('nav', { class: 'vw-set__nav', 'aria-label': T.title }, tabsEl), panelHost));
  frame.mount(root);
  showTab(initial);
  const offSet = S.on ? S.on(() => { if (listening) return; syncs.forEach((f) => f()); }) : null;
  cleanups.push(frame.destroy, () => { if (typeof offSet === 'function') offSet(); });
  K.enter(tabsEl, 'left', 0);

  return K.withExit(root, {
    destroy() { cleanups.forEach((f) => f()); },
    onBack() { if (K.hasModal()) return true; if (listening) { stopListening(); return true; } return false; },   // false = let the router navigate back
  });
}
