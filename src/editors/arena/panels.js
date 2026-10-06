// Arena Builder inspector panels: one per tool (16) plus the Checks panel. Each builder returns {el, destroy()} and talks to the shared
// `app` object (state `app.st`, `app.session`, `app.view`, `app.ctl`, kit `app.K`, copy `app.S`). Controls reflect session events, so undo / redo
// moves sliders back. All text goes through textContent via the kit builders.

import { MATERIALS } from '../../world/arena.js';
import { RECIPES } from '../../world/gen.js';
import { PROP_CATALOG, PROP_CATEGORIES, propInfo } from '../../content/era_ancient/props/catalog.js';
import { variantCount, hasPropModel } from '../../content/era_ancient/props/models/index.js';
import { LIMITS, BRUSH, STAMPS, HAZARDS, MARKER_TYPES, OBJECTIVES, OBJECTIVE_BY_ID, SYMMETRY, THEMES, MOODS, PATH_RADII, HAZARD_RADIUS, MARKER_RADIUS } from './consts.js';
import { WEATHERS } from '../../world/arena.js';

const hex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
const deg = (r) => ((Math.round((r * 180) / Math.PI) % 360) + 360) % 360;

export const PLACEABLE = Object.keys(PROP_CATALOG).filter((k) => PROP_CATALOG[k].place !== false && hasPropModel(k));

/** Little helper: a labelled stack of controls inside a panel. */
function sec(K, title, ...kids) { return K.h('section', { class: 'vw-ed__sec' }, title ? K.h('h3', { class: 'vw-ed__sec-t vw-label', text: title }) : null, ...kids); }
function note(K, text, kind) { return K.h('p', { class: 'vw-ed__note' + (kind ? ' vw-ed__note--' + kind : ''), text }); }
function panel(K, ...kids) { return K.h('div', { class: 'vw-ed__panel' }, ...kids); }

/** Radius / strength / shape / falloff block shared by the brush tools. */
function brushBlock(app, o = {}) {
  const { K, S, st } = app, B = S.brush;
  const radius = K.slider({ id: 'ed-brush-radius', min: BRUSH.radiusMin, max: BRUSH.radiusMax, step: 0.5, value: st.brush.radius, label: B.radius, format: (v) => B.unitU(v), valueWidth: '3.6rem', onInput: (v) => { st.brush.radius = v; app.ctl.refreshCursor(); } });
  const strength = o.strength === false ? null : K.slider({ id: 'ed-brush-strength', min: 1, max: 10, step: 1, value: Math.round(st.strengths[st.tool] * 10), label: B.strength, valueWidth: '2.6rem', onInput: (v) => { st.strengths[st.tool] = v / 10; } });
  const shape = o.shape === false ? null : K.segmented({ id: 'ed-brush-shape', label: B.shape, value: st.brush.shape, fill: true, options: BRUSH.shapes.map((v) => ({ value: v, label: B.shapes[v] })), onChange: (v) => { st.brush.shape = v; app.ctl.refreshCursor(); } });
  const fall = o.falloff === false ? null : K.segmented({ id: 'ed-brush-falloff', label: B.falloff, value: st.brush.falloff, fill: true, options: BRUSH.falloffs.map((v) => ({ value: v, label: B.falloffs[v] })), onChange: (v) => { st.brush.falloff = v; } });
  const el = sec(K, B.title, K.field(B.radius, radius, { stack: true }), strength ? K.field(B.strength, strength, { stack: true }) : null, shape ? K.field(B.shape, shape, { stack: true }) : null, fall ? K.field(B.falloff, fall, { stack: true }) : null);
  app.brushWidgets = { radius, strength, shape, fall };
  return el;
}

// ------------------------------------------------------------------------------------------------------------- tool panels
function raisePanel(app) { const { K, S } = app; return { el: panel(K, brushBlock(app), note(K, S.raise.hintShift)) }; }
function smoothPanel(app) { return { el: panel(app.K, brushBlock(app)) }; }
function flattenPanel(app) {
  const { K, S, st } = app;
  const lab = K.h('output', { class: 'vw-ed__readout', id: 'ed-flatten-target', 'aria-live': 'polite' });
  const paint = () => { lab.textContent = st.flattenTarget === null ? S.flatten.unset : (st.flattenTarget * 0.5).toFixed(1) + ' u'; };
  const sl = K.slider({ id: 'ed-flatten-height', min: 0, max: 60, step: 0.5, value: st.flattenTarget === null ? 8 : st.flattenTarget * 0.5, label: S.flatten.target, format: (v) => v.toFixed(1) + ' u', valueWidth: '4rem', onInput: (v) => { st.flattenTarget = Math.round(v * 2); paint(); } });
  const auto = K.button(S.flatten.auto, { id: 'ed-flatten-auto', size: 'sm', variant: 'ghost', onClick: () => { st.flattenTarget = null; paint(); } });
  paint();
  app.onFlattenTarget = () => { paint(); sl.set(st.flattenTarget === null ? 8 : st.flattenTarget * 0.5, true); };
  return { el: panel(K, brushBlock(app), sec(K, S.flatten.target, K.field(S.flatten.target, sl, { stack: true }), K.h('div', { class: 'vw-row vw-between' }, lab, auto))), destroy() { app.onFlattenTarget = null; } };
}
function paintPanel(app) {
  const { K, S, st } = app, grid = K.h('div', { class: 'vw-ed__swatches', role: 'radiogroup', 'aria-label': S.paint.material });
  const btns = [];
  MATERIALS.forEach((m, i) => {
    const b = K.h('button', { type: 'button', class: 'vw-ed__swatch', role: 'radio', 'aria-checked': String(st.material === i), 'aria-label': S.paint.materials[i] || m.name, id: 'ed-mat-' + m.key, style: { '--c': hex(m.top[0]) } }, K.h('span', { class: 'vw-ed__swatch-n', text: S.paint.materials[i] || m.name }));
    b.addEventListener('click', () => { K.sfx('ui_click'); st.material = i; btns.forEach((x, k) => x.setAttribute('aria-checked', String(k === i))); });
    K.tooltip(b, S.paint.materials[i] || m.name);
    btns.push(b); grid.appendChild(b);
  });
  K.roving(grid, { selector: '.vw-ed__swatch', orientation: 'both' });
  return { el: panel(K, sec(K, S.paint.material, grid), brushBlock(app)) };
}
function waterPanel(app) {
  const { K, S, session } = app, a = () => session.arena;
  const read = K.h('output', { class: 'vw-ed__readout', id: 'ed-water-read', 'aria-live': 'polite' });
  const paint = () => { read.textContent = a().water > 0 ? S.water.surface((a().water * 0.5).toFixed(1)) : S.water.none; };
  const sl = K.slider({ id: 'ed-water-level', min: 0, max: 60, step: 0.5, value: a().water * 0.5, label: S.water.level, format: (v) => (v === 0 ? 'None' : v.toFixed(1) + ' u'), valueWidth: '4rem', onInput: (v) => { session.setWater(Math.round(v * 2)); paint(); } });
  const lava = K.toggle({ id: 'ed-water-lava', label: S.water.lava, value: !!a().lava, onChange: (v) => { session.setWater(undefined, v); } });
  paint();
  const off = session.on((e) => { if (e.kind === 'water' || e.kind === 'all') { sl.set(a().water * 0.5, true); lava.set(!!a().lava, true); paint(); } });
  return { el: panel(K, sec(K, S.tools.water.name, K.field(S.water.level, sl, { stack: true }), K.field(S.water.lava, lava), read, note(K, S.water.tip))), destroy: off };
}
function noisePanel(app) {
  const { K, S, st } = app;
  const sc = K.slider({ id: 'ed-noise-scale', min: 4, max: 40, step: 1, value: st.noise.scale, label: S.noise.scale, valueWidth: '3rem', onInput: (v) => { st.noise.scale = v; } });
  const seed = K.h('output', { class: 'vw-ed__readout', id: 'ed-noise-seed', text: String(st.noise.seed) });
  const re = K.button(S.noise.reroll, { id: 'ed-noise-reroll', size: 'sm', icon: 'dice', onClick: () => { st.noise.seed = 1 + Math.floor(Math.random() * 99999); seed.textContent = String(st.noise.seed); } });
  return { el: panel(K, brushBlock(app), sec(K, S.noise.scale, K.field(S.noise.scale, sc, { stack: true }), K.h('div', { class: 'vw-row vw-between' }, K.h('span', { class: 'vw-label', text: S.noise.seed }), seed, re))) };
}
function rampPanel(app) {
  const { K, S, st } = app;
  const w = K.slider({ id: 'ed-ramp-width', min: 2, max: 12, step: 0.5, value: st.ramp.width, label: S.ramp.width, format: (v) => v.toFixed(1) + ' u', valueWidth: '4rem', onInput: (v) => { st.ramp.width = v; app.ctl.refreshCursor(); } });
  const state = K.h('p', { class: 'vw-ed__note', id: 'ed-ramp-state', role: 'status', 'aria-live': 'polite' });
  const cancel = K.button(S.common.cancel, { id: 'ed-ramp-cancel', size: 'sm', variant: 'ghost', onClick: () => { st.ramp.a = null; app.ctl.refreshCursor(); paint(); } });
  const paint = () => { state.textContent = st.ramp.a ? S.ramp.first : S.ramp.pick; cancel.classList.toggle('vw-hide', !st.ramp.a); };
  app.onRampState = paint; paint();
  return { el: panel(K, sec(K, S.tools.ramp.name, K.field(S.ramp.width, w, { stack: true }), state, cancel), note(K, S.tools.ramp.tip)), destroy() { app.onRampState = null; } };
}
function stampPanel(app) {
  const { K, S, st } = app, grid = K.h('div', { class: 'vw-ed__tiles', role: 'radiogroup', 'aria-label': S.stamp.kind });
  const btns = {};
  for (const k of STAMPS) {
    const b = K.h('button', { type: 'button', class: 'vw-ed__tile', role: 'radio', 'aria-checked': String(st.stamp.kind === k), id: 'ed-stamp-' + k }, K.h('span', { text: S.stamp.kinds[k] }));
    b.addEventListener('click', () => { K.sfx('ui_click'); st.stamp.kind = k; for (const q in btns) btns[q].setAttribute('aria-checked', String(q === k)); app.ctl.refreshCursor(); });
    btns[k] = b; grid.appendChild(b);
  }
  K.roving(grid, { selector: '.vw-ed__tile', orientation: 'both' });
  const size = K.slider({ id: 'ed-stamp-size', min: 3, max: 20, step: 0.5, value: st.stamp.radius, label: S.stamp.size, format: (v) => v + ' u', valueWidth: '3.6rem', onInput: (v) => { st.stamp.radius = v; app.ctl.refreshCursor(); } });
  const hgt = K.slider({ id: 'ed-stamp-height', min: 1, max: 10, step: 1, value: Math.round(st.stamp.strength * 10), label: S.stamp.height, valueWidth: '2.6rem', onInput: (v) => { st.stamp.strength = v / 10; } });
  const rot = K.h('output', { class: 'vw-ed__readout', id: 'ed-stamp-rot' });
  const paintRot = () => { rot.textContent = deg(st.stamp.rot) + '°'; };
  const rb = K.button(S.stamp.rotate, { id: 'ed-stamp-rotate', size: 'sm', icon: 'refresh', hint: 'KeyR', onClick: () => { st.stamp.rot += Math.PI / 12; paintRot(); app.ctl.refreshCursor(); } });
  paintRot(); app.onStampRot = paintRot;
  return { el: panel(K, sec(K, S.stamp.kind, grid), sec(K, '', K.field(S.stamp.size, size, { stack: true }), K.field(S.stamp.height, hgt, { stack: true }), K.h('div', { class: 'vw-row vw-between' }, rot, rb))), destroy() { app.onStampRot = null; } };
}

function propsPanel(app) {
  const { K, S, st, session } = app, P = S.props, pp = st.props;
  const offs = [];
  const modeTip = K.h('p', { class: 'vw-ed__note', id: 'ed-props-modetip', text: P.modeTip[pp.mode] });
  const mode = K.segmented({ id: 'ed-props-mode', label: P.modes.place, value: pp.mode, fill: true, options: ['place', 'select', 'erase'].map((m) => ({ value: m, label: P.modes[m], title: P.modeTip[m] })), onChange: (v) => { pp.mode = v; modeTip.textContent = P.modeTip[v]; app.ctl.setPropsMode(v); renderSel(); } });
  const search = K.searchBox({ id: 'ed-props-search', label: P.search, placeholder: P.searchPh, value: pp.q, onInput: (v) => { pp.q = v.trim().toLowerCase(); renderGrid(); } });
  const catBtns = {};
  const cats = K.h('div', { class: 'vw-chips vw-ed__cats', role: 'group', 'aria-label': P.cats.nature });
  for (const c of ['all'].concat(PROP_CATEGORIES)) {
    const ch = K.chip(c === 'all' ? P.all : P.cats[c] || c, { pressed: pp.cat === c, id: 'ed-props-cat-' + c, onClick: () => { pp.cat = c; for (const k in catBtns) catBtns[k].setPressed(k === c); renderGrid(); } });
    catBtns[c] = ch; cats.appendChild(ch);
  }
  const grid = K.h('div', { class: 'vw-ed__propgrid', role: 'radiogroup', 'aria-label': S.tools.props.name, id: 'ed-props-grid' });
  K.roving(grid, { selector: '.vw-ed__prop', orientation: 'both' });
  const cards = new Map();
  function renderGrid() {
    cards.clear(); const frag = document.createDocumentFragment(); let n = 0;
    for (const t of PLACEABLE) {
      const info = PROP_CATALOG[t];
      if (pp.cat !== 'all' && info.cat !== pp.cat) continue;
      if (pp.q && (info.name + ' ' + t.replace(/_/g, ' ')).toLowerCase().indexOf(pp.q) < 0) continue;
      const th = app.thumbs.get(t), canvas = K.h('span', { class: 'vw-ed__prop-art', 'aria-hidden': 'true' });
      if (th) canvas.appendChild(th.cloneNode ? cloneCanvas(th) : th);
      const b = K.h('button', { type: 'button', class: 'vw-ed__prop', role: 'radio', 'aria-checked': String(pp.type === t), id: 'ed-prop-' + t, dataset: { type: t }, 'aria-label': info.name }, canvas, K.h('span', { class: 'vw-ed__prop-n', text: info.name }));
      b.addEventListener('click', () => { K.sfx('ui_select'); pickType(t); });
      K.tooltip(b, P.info(info.r, info.h, info.hp === Infinity ? P.indestructible : P.hpOf(info.hp)));
      cards.set(t, b); frag.appendChild(b); n++;
    }
    grid.replaceChildren(n ? frag : K.emptyState({ icon: 'search', title: P.empty }));
  }
  offs.push(app.thumbs.onReady((t, c) => { const b = cards.get(t); if (b && c) { const art = b.querySelector('.vw-ed__prop-art'); if (art && !art.firstChild) art.appendChild(cloneCanvas(c)); } }));
  function pickType(t) {
    pp.type = t; cards.forEach((b, k) => b.setAttribute('aria-checked', String(k === t)));
    const sc = (propInfo(t) || {}).scale || [0.7, 1.6]; pp.scale = Math.min(sc[1], Math.max(sc[0], pp.scale)); buildScale();
    setVariants(t); app.ctl.refreshCursor();
  }
  const rot = K.slider({ id: 'ed-props-rot', min: 0, max: 355, step: 5, value: deg(pp.rot), label: P.rotation, format: (v) => v + '°', valueWidth: '3.6rem', onInput: (v) => { pp.rot = (v * Math.PI) / 180; app.ctl.refreshCursor(); } });
  const scaleBox = K.h('div', { id: 'ed-props-scalebox' });
  let scale = null;
  function buildScale() {
    const sc0 = (propInfo(pp.type) || {}).scale || [0.7, 1.6];
    scale = K.slider({ id: 'ed-props-scale', min: sc0[0], max: sc0[1], step: 0.05, value: Math.min(sc0[1], Math.max(sc0[0], pp.scale)), label: P.scale, format: (v) => v.toFixed(2) + 'x', valueWidth: '4rem', onInput: (v) => { pp.scale = v; app.ctl.refreshCursor(); } });
    scaleBox.replaceChildren(scale);
  }
  buildScale();
  const varSeg = K.h('div', { class: 'vw-ed__variants' });
  function setVariants(t) {
    const n = Math.min(4, variantCount(t)); const opts = [{ value: -1, label: P.variantRandom }].concat(Array.from({ length: n }, (_, i) => ({ value: i, label: String(i + 1) })));
    if (pp.variant >= n) pp.variant = -1;
    const seg = K.segmented({ id: 'ed-props-variant', label: P.variant, value: pp.variant, fill: true, options: opts, onChange: (v) => { pp.variant = v; app.ctl.refreshCursor(); } });
    varSeg.replaceChildren(seg);
  }
  const density = K.slider({ id: 'ed-props-density', min: 1, max: 12, step: 1, value: pp.density, label: P.density, valueWidth: '2.6rem', onInput: (v) => { pp.density = v; } });
  const radius = K.slider({ id: 'ed-brush-radius', min: BRUSH.radiusMin, max: BRUSH.radiusMax, step: 0.5, value: st.brush.radius, label: S.brush.radius, format: (v) => S.brush.unitU(v), valueWidth: '3.6rem', onInput: (v) => { st.brush.radius = v; app.ctl.refreshCursor(); } });
  const snap = K.toggle({ id: 'ed-props-snap', label: P.snap, value: pp.snap, onChange: (v) => { pp.snap = v; } });
  const rr = K.toggle({ id: 'ed-props-randrot', label: P.randomRot, value: pp.randRot, onChange: (v) => { pp.randRot = v; } });
  const counter = K.h('output', { class: 'vw-ed__readout', id: 'ed-props-count', 'aria-live': 'polite' });
  const paintCount = () => { counter.textContent = P.count(session.arena.props.length, LIMITS.props); counter.classList.toggle('is-over', session.arena.props.length >= LIMITS.props); };
  // selected prop box
  const selBox = K.h('div', { class: 'vw-ed__selbox', id: 'ed-props-selected' });
  function renderSel() {
    selBox.replaceChildren();
    selBox.classList.toggle('vw-hide', pp.mode !== 'select');
    const p = pp.selected;
    if (pp.mode !== 'select') return;
    if (!p || session.arena.props.indexOf(p) < 0) { selBox.appendChild(K.h('p', { class: 'vw-ed__note', text: P.none })); return; }
    const info = propInfo(p.t) || {};
    const r = K.slider({ id: 'ed-sel-rot', min: 0, max: 355, step: 5, value: deg(p.r), label: P.rotation, format: (v) => v + '°', valueWidth: '3.6rem', onChange: (v) => app.ctl.patchSelectedProp({ r: (v * Math.PI) / 180 }) });
    const s2 = K.slider({ id: 'ed-sel-scale', min: (info.scale || [0.7, 1.6])[0], max: (info.scale || [0.7, 1.6])[1], step: 0.05, value: p.s, label: P.scale, format: (v) => v.toFixed(2) + 'x', valueWidth: '4rem', onChange: (v) => app.ctl.patchSelectedProp({ s: v }) });
    selBox.append(K.h('div', { class: 'vw-card__name', text: info.name || p.t }), K.field(P.rotation, r, { stack: true }), K.field(P.scale, s2, { stack: true }),
      K.h('div', { class: 'vw-row vw-wrapflex' }, K.button(P.dupSel, { id: 'ed-sel-dup', size: 'sm', icon: 'copy', onClick: () => app.ctl.duplicateSelectedProp() }), K.button(P.removeSel, { id: 'ed-sel-del', size: 'sm', variant: 'danger', icon: 'trash', hint: 'Delete', onClick: () => app.ctl.deleteSelectedProp() })));
  }
  app.onPropSelection = renderSel;
  offs.push(session.on((e) => { if (e.kind === 'props' || e.kind === 'all') { paintCount(); if (pp.mode === 'select') renderSel(); } }));
  renderGrid(); setVariants(pp.type); paintCount(); renderSel(); app.thumbs.prefetch(PLACEABLE);
  const el = panel(K, mode, modeTip, search, cats, grid, selBox,
    sec(K, '', K.field(P.rotation, rot, { stack: true }), K.field(P.scale, scaleBox, { stack: true }), K.field(P.variant, varSeg, { stack: true }),
      K.field(P.density, density, { stack: true }), K.field(S.brush.radius, radius, { stack: true }), K.field(P.snap, snap), K.field(P.randomRot, rr), counter));
  app.onPropRot = () => { rot.set(deg(pp.rot), true); };
  app.onPropScale = () => { if (scale) scale.set(pp.scale, true); };
  return { el, destroy() { offs.forEach((f) => f()); app.onPropSelection = null; app.onPropRot = null; app.onPropScale = null; } };
}
function cloneCanvas(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); n.className = 'vw-ed__prop-cv'; return n; }

function hazardsPanel(app) {
  const { K, S, st, session } = app, H = S.hazards, hz = st.hazard, offs = [];
  const mode = K.segmented({ id: 'ed-hz-mode', label: H.modes.place, value: hz.mode, fill: true, options: ['place', 'select', 'erase'].map((m) => ({ value: m, label: H.modes[m] })), onChange: (v) => { hz.mode = v; app.ctl.setHazardMode(v); } });
  const grid = K.h('div', { class: 'vw-ed__tiles', role: 'radiogroup', 'aria-label': S.tools.hazards.name }), btns = {};
  const tip = K.h('p', { class: 'vw-ed__note', id: 'ed-hz-tip', text: H.tips[hz.kind] });
  const radius = K.slider({ id: 'ed-hz-radius', min: HAZARD_RADIUS.min, max: 12, step: 0.5, value: hz.r, label: H.radius, format: (v) => v + ' u', valueWidth: '3.6rem', onInput: (v) => { hz.r = v; app.ctl.refreshCursor(); } });
  for (const k of HAZARDS) {
    const b = K.h('button', { type: 'button', class: 'vw-ed__tile', role: 'radio', 'aria-checked': String(hz.kind === k.id), id: 'ed-hz-' + k.id, style: { '--c': hex(k.color) } }, K.h('span', { class: 'vw-ed__dot', 'aria-hidden': 'true' }), K.h('span', { text: H.kinds[k.id] }));
    b.addEventListener('click', () => { K.sfx('ui_click'); hz.kind = k.id; hz.r = k.r; radius.set(k.r, true); for (const q in btns) btns[q].setAttribute('aria-checked', String(q === k.id)); tip.textContent = H.tips[k.id]; app.ctl.refreshCursor(); });
    btns[k.id] = b; grid.appendChild(b);
  }
  K.roving(grid, { selector: '.vw-ed__tile', orientation: 'both' });
  const count = K.h('output', { class: 'vw-ed__readout', id: 'ed-hz-count', 'aria-live': 'polite' });
  const selBox = K.h('div', { class: 'vw-ed__selbox', id: 'ed-hz-selected' });
  const paint = () => { count.textContent = H.count(session.arena.hazards.length, LIMITS.hazards); count.classList.toggle('is-over', session.arena.hazards.length >= LIMITS.hazards); };
  function renderSel() {
    selBox.replaceChildren(); selBox.classList.toggle('vw-hide', hz.mode !== 'select');
    const h = hz.selected;
    if (hz.mode !== 'select') return;
    if (!h || session.arena.hazards.indexOf(h) < 0) { selBox.appendChild(K.h('p', { class: 'vw-ed__note', text: H.none })); return; }
    const r = K.slider({ id: 'ed-hz-sel-radius', min: HAZARD_RADIUS.min, max: HAZARD_RADIUS.max, step: 0.5, value: h.r, label: H.radius, format: (v) => v + ' u', valueWidth: '3.6rem', onChange: (v) => app.ctl.patchSelectedHazard({ r: v }) });
    selBox.append(K.h('div', { class: 'vw-card__name', text: H.kinds[h.t] || h.t }), K.field(H.radius, r, { stack: true }), K.button(H.del, { id: 'ed-hz-del', size: 'sm', variant: 'danger', icon: 'trash', hint: 'Delete', onClick: () => app.ctl.deleteSelectedHazard() }));
  }
  app.onHazardSelection = renderSel;
  offs.push(session.on((e) => { if (e.kind === 'hazards' || e.kind === 'all') { paint(); if (hz.mode === 'select') renderSel(); } }));
  paint(); renderSel();
  return { el: panel(K, mode, sec(K, S.tools.hazards.name, grid, tip, K.field(H.radius, radius, { stack: true }), count), selBox), destroy() { offs.forEach((f) => f()); app.onHazardSelection = null; } };
}

function zonesPanel(app) {
  const { K, S, st, session } = app, Z = S.zones, offs = [];
  const seg = K.segmented({ id: 'ed-zone-key', label: Z.zone, value: st.zoneKey, fill: true, options: [{ value: 'A', label: Z.A }, { value: 'B', label: Z.B }], onChange: (v) => { st.zoneKey = v; app.view.setActiveZone(v, 'zones'); fill(); } });
  const body = K.h('div', { class: 'vw-col', id: 'ed-zone-body' });
  const W = () => session.arena.worldSize();
  let sliders = null, shape = '';
  function fill() {
    const zn = session.arena.zones[st.zoneKey];
    body.replaceChildren(); sliders = null; shape = zn ? 'zone' + st.zoneKey + W() : 'none' + st.zoneKey;
    if (!zn) { body.append(K.h('p', { class: 'vw-ed__note', text: Z.missing }), K.button(S.checks.fixes.add_zone({ zone: st.zoneKey }), { id: 'ed-zone-add', size: 'sm', variant: 'primary', onClick: () => app.applyFixById('add_zone', { zone: st.zoneKey }) })); return; }
    const mk = (key, label, min, max) => K.slider({ id: 'ed-zone-' + key, min, max, step: 0.5, value: zn[key], label, format: (v) => v.toFixed(1) + ' u', valueWidth: '4rem', onInput: (v) => { const cur = Object.assign({}, session.arena.zones[st.zoneKey]); cur[key] = v; session.setZone(st.zoneKey, cur); } });
    const half = W() / 2;
    sliders = { x: mk('x', Z.x, -half, half), z: mk('z', Z.z, -half, half), w: mk('w', Z.w, LIMITS.zoneMin, W()), d: mk('d', Z.d, LIMITS.zoneMin, W()) };
    body.append(K.field(Z.x, sliders.x, { stack: true }), K.field(Z.z, sliders.z, { stack: true }), K.field(Z.w, sliders.w, { stack: true }), K.field(Z.d, sliders.d, { stack: true }),
      K.h('div', { class: 'vw-row vw-wrapflex' }, K.button(Z.mirror, { id: 'ed-zone-mirror', size: 'sm', icon: 'mirror', onClick: () => app.ctl.mirrorZone() }), K.button(Z.center, { id: 'ed-zone-reset', size: 'sm', icon: 'refresh', onClick: () => app.ctl.resetZones() }), K.button(Z.remove, { id: 'ed-zone-remove', size: 'sm', variant: 'danger', icon: 'trash', onClick: () => app.ctl.removeZone() })));
  }
  offs.push(session.on((e) => {
    if (e.kind !== 'zones' && e.kind !== 'all') return;
    const zn = session.arena.zones[st.zoneKey], want = zn ? 'zone' + st.zoneKey + W() : 'none' + st.zoneKey;
    if (want !== shape) { fill(); return; }
    if (sliders && zn) for (const k of ['x', 'z', 'w', 'd']) if (Math.abs(sliders[k].get() - zn[k]) > 0.01) sliders[k].set(zn[k], true);
  }));
  fill();
  return { el: panel(K, seg, K.h('p', { class: 'vw-ed__note', text: Z.hint }), body), destroy() { offs.forEach((f) => f()); } };
}

function symmetryPanel(app) {
  const { K, S, session } = app, Y = S.symmetry;
  const seg = K.segmented({ id: 'ed-sym-mode', label: S.tools.symmetry.name, value: session.symmetry, fill: true, options: SYMMETRY.map((m) => ({ value: m, label: Y.modes[m], title: Y.tips[m] })), onChange: (v) => { session.setSymmetry(v); tip.textContent = Y.tips[v]; app.toast(S.toast.symmetry(Y.modes[v])); } });
  const tip = K.h('p', { class: 'vw-ed__note', id: 'ed-sym-tip', text: Y.tips[session.symmetry] });
  const off = session.on((e) => { if (e.kind === 'symmetry') { seg.set(session.symmetry, true); tip.textContent = Y.tips[session.symmetry]; } });
  return { el: panel(K, sec(K, S.tools.symmetry.name, seg, tip, note(K, Y.note))), destroy: off };
}

function generatePanel(app) {
  const { K, S, st, session } = app, G = S.generate;
  const names = {}; for (const p of app.ctx.content.arenas || []) names[p.recipe] = p.name;
  const sel = K.select({ id: 'ed-gen-recipe', label: G.recipe, value: st.gen.recipe, options: RECIPES.map((r) => ({ value: r, label: names[r] || r.charAt(0).toUpperCase() + r.slice(1) })), onChange: (v) => { st.gen.recipe = v; } });
  const seed = K.h('input', { class: 'vw-input', id: 'ed-gen-seed', type: 'text', inputmode: 'numeric', maxlength: 10, 'aria-label': G.seed, value: String(st.gen.seed) });
  seed.addEventListener('input', () => { const v = parseInt(seed.value.replace(/\D/g, ''), 10); if (Number.isFinite(v)) st.gen.seed = v >>> 0; });
  const parts = K.segmented({ id: 'ed-gen-parts', label: G.parts, value: st.gen.parts, fill: true, options: ['terrain', 'props', 'both'].map((p) => ({ value: p, label: G[p], title: G.partsTip[p] })), onChange: (v) => { st.gen.parts = v; tip.textContent = G.partsTip[v]; } });
  const tip = K.h('p', { class: 'vw-ed__note', id: 'ed-gen-tip', text: G.partsTip[st.gen.parts] });
  const go = () => app.generate();
  const roll = K.button(G.roll, { id: 'ed-gen-roll', icon: 'dice', onClick: () => { st.gen.seed = 1 + Math.floor(Math.random() * 999999); seed.value = String(st.gen.seed); go(); } });
  const apply = K.button(G.apply, { id: 'ed-gen-apply', variant: 'primary', icon: 'wand', onClick: go });
  void session;
  return { el: panel(K, sec(K, G.recipe, K.field(G.recipe, sel, { stack: true }), K.field(G.seed, seed, { stack: true }), K.field(G.parts, parts, { stack: true }), tip, K.h('div', { class: 'vw-row vw-wrapflex' }, apply, roll), note(K, G.note))) };
}

function environmentPanel(app) {
  const { K, S, session } = app, E = S.env, env = () => session.arena.env, offs = [];
  const time = K.slider({ id: 'ed-env-time', min: 0, max: 24, step: 0.25, value: env().time, label: E.time, format: (v) => E.clock(v), valueWidth: '4rem', onInput: (v) => session.setEnv({ time: v }) });
  const weather = K.select({ id: 'ed-env-weather', label: E.weather, value: env().weather, options: WEATHERS.map((w) => ({ value: w, label: E.weathers[w] })), onChange: (v) => { session.setEnv({ weather: v }); wtip.textContent = E.weatherTip[v]; } });
  const wtip = K.h('p', { class: 'vw-ed__note', id: 'ed-env-wtip', text: E.weatherTip[env().weather] });
  const fog = K.slider({ id: 'ed-env-fog', min: 0, max: 1, step: 0.05, value: env().fog, label: E.fog, format: (v) => Math.round(v * 100) + '%', valueWidth: '3.6rem', onInput: (v) => session.setEnv({ fog: v }) });
  const wind = K.slider({ id: 'ed-env-wind', min: 0, max: 1, step: 0.05, value: env().wind, label: E.wind, format: (v) => Math.round(v * 100) + '%', valueWidth: '3.6rem', onInput: (v) => session.setEnv({ wind: v }) });
  const theme = K.select({ id: 'ed-env-theme', label: E.theme, value: env().theme, options: THEMES.map((t) => ({ value: t, label: E.themes[t] })), onChange: (v) => session.setEnv({ theme: v }) });
  const mood = K.select({ id: 'ed-env-mood', label: E.mood, value: env().mood, options: MOODS.map((m) => ({ value: m, label: E.moods[m] })), onChange: (v) => session.setEnv({ mood: v }) });
  const hear = K.button(E.preview, { id: 'ed-env-hear', size: 'sm', icon: 'music', onClick: () => app.previewMusic() });
  offs.push(session.on((e) => { if (e.kind === 'env' || e.kind === 'all') { const v = env(); time.set(v.time, true); weather.set(v.weather, true); fog.set(v.fog, true); wind.set(v.wind, true); theme.set(v.theme, true); mood.set(v.mood, true); wtip.textContent = E.weatherTip[v.weather]; } }));
  return { el: panel(K, sec(K, E.time, K.field(E.time, time, { stack: true })), sec(K, E.weather, K.field(E.weather, weather, { stack: true }), wtip, K.field(E.fog, fog, { stack: true }), K.field(E.wind, wind, { stack: true })), sec(K, E.mood, K.field(E.theme, theme, { stack: true }), K.field(E.mood, mood, { stack: true }), hear)), destroy() { offs.forEach((f) => f()); } };
}

function infoPanel(app) {
  const { K, S, session } = app, I = S.info, a = () => session.arena, offs = [];
  const name = K.h('input', { class: 'vw-input', id: 'ed-info-name', type: 'text', maxlength: LIMITS.nameMax, 'aria-label': I.name, value: a().name, spellcheck: 'false', autocomplete: 'off' });
  const nameN = K.h('span', { class: 'vw-ed__count', id: 'ed-info-name-n', text: I.nameCount(a().name.length) });
  name.addEventListener('input', () => { session.setName(name.value); nameN.textContent = I.nameCount(name.value.length); app.syncName(name); });
  const author = K.h('input', { class: 'vw-input', id: 'ed-info-author', type: 'text', maxlength: LIMITS.authorMax, 'aria-label': I.author, value: a().author, spellcheck: 'false', autocomplete: 'off' });
  author.addEventListener('input', () => session.setAuthor(author.value));
  const desc = K.h('textarea', { class: 'vw-input vw-ed__desc', id: 'ed-info-desc', maxlength: LIMITS.descMax, rows: 4, 'aria-label': I.desc, spellcheck: 'true' }); desc.value = a().desc;
  const descN = K.h('span', { class: 'vw-ed__count', id: 'ed-info-desc-n', text: I.descCount(a().desc.length) });
  desc.addEventListener('input', () => { session.setDesc(desc.value); descN.textContent = I.descCount(desc.value.length); });
  const tags = K.h('div', { class: 'vw-chips', id: 'ed-info-tags', 'aria-label': I.tags });
  const tagIn = K.h('input', { class: 'vw-input', id: 'ed-info-tag-in', type: 'text', maxlength: LIMITS.tagMax, 'aria-label': I.tags, placeholder: I.tagsPh, autocomplete: 'off', spellcheck: 'false' });
  function paintTags() { tags.replaceChildren(...session.tags.map((t) => K.chip(t + '  ×', { id: 'ed-tag-' + t.replace(/\W/g, '_'), aria: 'Remove tag ' + t, variant: 'sky', onClick: () => { session.setTags(session.tags.filter((x) => x !== t)); paintTags(); } }))); }
  const addTag = () => { const v = tagIn.value.trim(); if (!v) return; if (session.tags.length >= LIMITS.tagsMax) { app.toast(I.tagsMax, 'warn'); return; } session.setTags(session.tags.concat(v)); tagIn.value = ''; paintTags(); };
  tagIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
  paintTags();
  offs.push(session.on((e) => { if ((e.kind === 'meta' || e.kind === 'all') && document.activeElement !== name) { name.value = a().name; nameN.textContent = I.nameCount(a().name.length); } if (e.kind === 'all') { author.value = a().author; desc.value = a().desc; descN.textContent = I.descCount(a().desc.length); paintTags(); } }));
  app.infoName = name;
  return { el: panel(K, sec(K, I.name, K.field(I.name, name, { stack: true }), nameN, K.field(I.author, author, { stack: true })), sec(K, I.desc, desc, descN), sec(K, I.tags, tags, K.h('div', { class: 'vw-row' }, tagIn, K.button(I.addTag, { id: 'ed-info-tag-add', size: 'sm', onClick: addTag })))), destroy() { offs.forEach((f) => f()); app.infoName = null; } };
}

function markersPanel(app) {
  const { K, S, st, session } = app, M = S.markers, mk = st.marker, offs = [];
  const mode = K.segmented({ id: 'ed-mk-mode', label: M.modes.place, value: mk.mode, fill: true, options: ['place', 'select', 'erase'].map((m) => ({ value: m, label: M.modes[m] })), onChange: (v) => { mk.mode = v; app.ctl.setMarkerMode(v); } });
  const grid = K.h('div', { class: 'vw-ed__tiles', role: 'radiogroup', 'aria-label': S.tools.markers.name }), btns = {};
  const tip = K.h('p', { class: 'vw-ed__note', id: 'ed-mk-tip', text: M.tips[mk.type] });
  const radius = K.slider({ id: 'ed-mk-radius', min: MARKER_RADIUS.min, max: MARKER_RADIUS.max, step: 0.5, value: mk.r, label: M.radius, format: (v) => v + ' u', valueWidth: '3.6rem', onInput: (v) => { mk.r = v; app.ctl.refreshCursor(); } });
  for (const t of MARKER_TYPES) {
    const b = K.h('button', { type: 'button', class: 'vw-ed__tile', role: 'radio', 'aria-checked': String(mk.type === t.id), id: 'ed-mk-' + t.id, style: { '--c': hex(t.color) } }, K.h('span', { class: 'vw-ed__dot', 'aria-hidden': 'true' }), K.h('span', { text: M.types[t.id] }));
    b.addEventListener('click', () => { K.sfx('ui_click'); mk.type = t.id; mk.r = t.r; radius.set(t.r, true); for (const q in btns) btns[q].setAttribute('aria-checked', String(q === t.id)); tip.textContent = M.tips[t.id]; app.ctl.refreshCursor(); });
    btns[t.id] = b; grid.appendChild(b);
  }
  K.roving(grid, { selector: '.vw-ed__tile', orientation: 'both' });
  const count = K.h('output', { class: 'vw-ed__readout', id: 'ed-mk-count', 'aria-live': 'polite' });
  const selBox = K.h('div', { class: 'vw-ed__selbox', id: 'ed-mk-selected' });
  function renderSel() {
    selBox.replaceChildren(); selBox.classList.toggle('vw-hide', mk.mode !== 'select');
    const m = mk.selected; if (mk.mode !== 'select') return;
    if (!m || session.arena.markers.indexOf(m) < 0) { selBox.appendChild(K.h('p', { class: 'vw-ed__note', text: M.none })); return; }
    const r = K.slider({ id: 'ed-mk-sel-radius', min: MARKER_RADIUS.min, max: MARKER_RADIUS.max, step: 0.5, value: m.r, label: M.radius, format: (v) => v + ' u', valueWidth: '3.6rem', onChange: (v) => app.ctl.patchSelectedMarker({ r: v }) });
    selBox.append(K.h('div', { class: 'vw-card__name', text: M.types[m.type] || m.type }), K.field(M.radius, r, { stack: true }), K.button(M.del, { id: 'ed-mk-del', size: 'sm', variant: 'danger', icon: 'trash', hint: 'Delete', onClick: () => app.ctl.deleteSelectedMarker() }));
  }
  // objective picker
  const objBox = K.h('div', { class: 'vw-ed__objectives', role: 'radiogroup', 'aria-label': M.objective, id: 'ed-obj' });
  const reqBox = K.h('div', { class: 'vw-ed__reqs', id: 'ed-obj-reqs', 'aria-live': 'polite' });
  function paintObj() {
    objBox.replaceChildren();
    for (const o of OBJECTIVES) {
      const b = K.h('button', { type: 'button', class: 'vw-ed__obj', role: 'radio', 'aria-checked': String(session.objective === o.id), id: 'ed-obj-' + o.id }, K.h('span', { class: 'vw-ed__obj-n', text: M.objectives[o.id] }), K.h('span', { class: 'vw-ed__obj-s', text: M.needsText[o.id] }));
      b.addEventListener('click', () => { K.sfx('ui_confirm'); session.setObjective(o.id); });
      objBox.appendChild(b);
    }
    K.roving(objBox, { selector: '.vw-ed__obj', orientation: 'vertical' });
    reqBox.replaceChildren();
    const o = OBJECTIVE_BY_ID[session.objective], have = new Set(session.arena.markers.map((m) => m.type));
    for (const t of o.markers) reqBox.appendChild(K.chip((have.has(t) ? '✓ ' : '✗ ') + M.types[t], { variant: have.has(t) ? 'olive' : 'danger', class: 'vw-ed__req' }));
    for (const t of o.props) { const ok = session.arena.props.some((p) => p.t === t); reqBox.appendChild(K.chip((ok ? '✓ ' : '✗ ') + (PROP_CATALOG[t] || {}).name, { variant: ok ? 'olive' : 'danger', class: 'vw-ed__req' })); }
    app.view.setHighlight(o.markers.filter((t) => !have.has(t)));
  }
  const paint = () => { count.textContent = M.count(session.arena.markers.length, LIMITS.markers); count.classList.toggle('is-over', session.arena.markers.length >= LIMITS.markers); };
  app.onMarkerSelection = renderSel;
  offs.push(session.on((e) => { if (e.kind === 'markers' || e.kind === 'all' || e.kind === 'props') { paint(); paintObj(); if (mk.mode === 'select') renderSel(); } if (e.kind === 'objective') paintObj(); }));
  paint(); paintObj(); renderSel();
  return { el: panel(K, mode, sec(K, S.tools.markers.name, grid, tip, K.field(M.radius, radius, { stack: true }), count), selBox, sec(K, M.objective, objBox, reqBox, note(K, M.objectiveNote))), destroy() { offs.forEach((f) => f()); app.onMarkerSelection = null; app.view.setHighlight([]); } };
}

const BUILDERS = { raise: raisePanel, smooth: smoothPanel, flatten: flattenPanel, paint: paintPanel, water: waterPanel, noise: noisePanel, ramp: rampPanel, stamp: stampPanel, props: propsPanel, hazards: hazardsPanel, zones: zonesPanel, symmetry: symmetryPanel, generate: generatePanel, environment: environmentPanel, info: infoPanel, markers: markersPanel };

export function buildToolPanel(app, id) { const b = BUILDERS[id]; return b ? b(app) : { el: app.K.h('div') }; }

// ------------------------------------------------------------------------------------------------------------- checks
/** Validator panel: issues with Fix buttons, the A -> B path rows, the limit counters. Returns {el, update(result), destroy()}. */
export function buildChecksPanel(app) {
  const { K, S } = app, C = S.checks;
  const head = K.h('p', { class: 'vw-ed__note', id: 'ed-checks-head', role: 'status', 'aria-live': 'polite' });
  const list = K.h('ul', { class: 'vw-ed__issues', id: 'ed-issues' });
  const pathBox = K.h('div', { class: 'vw-ed__pathbox', id: 'ed-path' });
  const limits = K.h('div', { class: 'vw-ed__limits', id: 'ed-limits' });
  const el = K.h('div', { class: 'vw-ed__panel', id: 'ed-checks' }, head, list, sec(K, C.path, pathBox), sec(K, C.limits, limits), note(K, C.blocksPlaytest));
  function update(res) {
    if (!res) return;
    head.textContent = res.issues.length ? [res.errors ? C.errors(res.errors) : '', res.warnings ? C.warnings(res.warnings) : ''].filter(Boolean).join(' · ') : C.allClear;
    head.classList.toggle('is-ok', !res.issues.length); head.classList.toggle('is-bad', res.errors > 0);
    list.replaceChildren(...res.issues.map((i) => {
      const txt = (C.issues[i.code] || (() => i.code))(i.params, S);
      const li = K.h('li', { class: 'vw-ed__issue vw-ed__issue--' + i.severity, dataset: { code: i.code }, id: 'ed-issue-' + i.id.replace(/[^\w]/g, '_') },
        K.chip(i.severity === 'error' ? C.sevError : C.sevWarn, { variant: i.severity === 'error' ? 'danger' : 'gold' }), K.h('span', { class: 'vw-ed__issue-t', text: txt }));
      if (i.fix) li.appendChild(K.button(C.fixes[i.fix] ? C.fixes[i.fix](i.params) : C.fix, { size: 'sm', variant: 'primary', id: 'ed-fix-' + i.fix + (i.params.zone ? '-' + i.params.zone : ''), onClick: () => app.applyFix(i) }));
      return li;
    }));
    pathBox.replaceChildren();
    for (const r of PATH_RADII) { const v = res.info.path[r]; pathBox.appendChild(K.chip(v === undefined ? 'Radius ' + r + ': -' : (v ? C.pathOk(r) : C.pathBad(r)), { variant: v === undefined ? undefined : v ? 'olive' : 'danger', id: 'ed-path-' + String(r).replace('.', '_') })); }
    for (const k of ['A', 'B']) { const z = res.info.zones[k]; if (z) pathBox.appendChild(K.h('div', { class: 'vw-ed__small', text: C.zoneWalk(k, z.walkable) })); }
    const a = app.session.arena, types = new Set(a.props.map((p) => p.t)).size;
    limits.replaceChildren(
      K.h('div', { class: 'vw-ed__lim' }, K.h('span', { text: C.props }), K.h('span', { class: 'vw-nums', text: `${a.props.length.toLocaleString('en-US')} / 1,500` })),
      K.h('div', { class: 'vw-ed__lim' }, K.h('span', { text: C.types }), K.h('span', { class: 'vw-nums', text: `${types} / 41` })),
      K.h('div', { class: 'vw-ed__lim' }, K.h('span', { text: C.hazards }), K.h('span', { class: 'vw-nums', text: `${a.hazards.length} / 60` })),
      K.h('div', { class: 'vw-ed__lim' }, K.h('span', { text: C.markers }), K.h('span', { class: 'vw-nums', text: `${a.markers.length} / 8` })));
  }
  return { el, update, destroy() {} };
}
