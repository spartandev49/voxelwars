// The right-hand tabs of the Soldier Workshop: Stats, Abilities, Colours, Personality, Voxel Paint. Each builder returns {el, refresh(info)}; refresh is cheap and
// only touches what changed (the Workshop calls it once per animation frame after any edit).
import * as K from '../../ui/kit.js';
import { PALETTES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, METAL_KEYS, EMBLEM_IDS, BODY_TYPES } from '../../content/era_ancient/blueprints.js';
import { SKIN_NAMES, METALS } from '../../content/era_ancient/blueprints.js';
import * as C from '../../content/era_ancient/custom.js';
import { PART_ORDER, PART_NAMES } from '../painter/paintdoc.js';
import { emblemIcon } from './icons.js';
import { statsTotal, poolLeft } from './state.js';
import { WS } from './text.js';

const h = K.h, SVGNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, ...kids) => { const el = document.createElementNS(SVGNS, tag); for (const k of Object.keys(attrs || {})) el.setAttribute(k, String(attrs[k])); for (const c of kids) if (c) el.appendChild(c); return el; };
const hex6 = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
const fmt1 = (v) => (Math.round(v * 10) / 10).toString();

// ------------------------------------------------------------------------------------------------ Stats
export function statsPanel(env) {
  const { doc } = env;
  const pool = K.progress({ max: C.STAT_POINTS, tone: 'gold', tall: true, aria: WS.pool, id: 'ws-pool' });
  const poolNote = h('div', { class: 'vw-small vw-dim', id: 'ws-pool-note', 'aria-live': 'polite' });
  const rows = {};
  const sliderBox = h('div', { class: 'vw-col ws-stats' });
  let lastErr = 0;
  for (const k of C.STAT_KEYS) {
    const T = WS.stat[k], effect = h('span', { class: 'ws-stat__fx vw-small' }), nextEl = h('span', { class: 'ws-stat__next vw-micro vw-dim' });
    const slider = K.slider({
      min: 0, max: C.STAT_CAPS[k], step: 1, value: doc.cs.stats[k], label: T.name, id: 'ws-stat-' + k, valueWidth: '3.6rem', format: (v) => `${v}/${C.STAT_CAPS[k]}`,
      onInput: (v) => { const got = doc.setStat(k, v); if (got !== v) { slider.set(got, true); const t = performance.now(); if (t - lastErr > 400) { lastErr = t; K.sfx('ui_error'); } } },
    });
    K.tooltip(slider, T.tip);
    const row = h('div', { class: 'ws-stat' }, h('div', { class: 'ws-stat__head' }, h('span', { class: 'ws-stat__name', text: T.name }), effect), slider, nextEl);
    rows[k] = { slider, effect, nextEl }; sliderBox.appendChild(row);
  }
  const resetBtn = K.button(WS.reset, { icon: 'refresh', variant: 'ghost', size: 'sm', id: 'ws-stats-reset', onClick: () => doc.resetStats() });
  // derived numbers
  const dl = h('dl', { class: 'ws-derived', id: 'ws-derived' });
  const dv = {};
  for (const k of ['hp', 'dmg', 'dps', 'cd', 'speed', 'armor', 'range', 'radius', 'size', 'power']) { dv[k] = h('dd'); dl.append(h('dt', { text: WS.derived[k] }), dv[k]); }
  // radar
  const R = 54, cx = 70, cy = 70, N = C.STAT_KEYS.length;
  const pt = (i, f) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
  const rings = [0.33, 0.66, 1].map((f) => svg('polygon', { points: C.STAT_KEYS.map((_, i) => pt(i, f).join(',')).join(' '), fill: 'none', stroke: 'rgba(185,194,224,.35)', 'stroke-width': 1 }));
  const spokes = C.STAT_KEYS.map((_, i) => svg('line', { x1: cx, y1: cy, x2: pt(i, 1)[0], y2: pt(i, 1)[1], stroke: 'rgba(185,194,224,.25)', 'stroke-width': 1 }));
  const labels = C.STAT_KEYS.map((k, i) => { const [x, y] = pt(i, 1.2); const t = svg('text', { x, y: y + 3, 'text-anchor': 'middle', 'font-size': 8, fill: '#b9c2e0', 'font-weight': 600 }); t.textContent = WS.stat[k].short; return t; });
  const poly = svg('polygon', { fill: 'rgba(255,201,60,.42)', stroke: '#ffc93c', 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
  const radar = svg('svg', { viewBox: '0 0 140 140', class: 'ws-radar', role: 'img', 'aria-label': WS.radar, id: 'ws-radar' }, ...rings, ...spokes, poly, ...labels);
  const powerTag = h('div', { class: 'ws-power vw-display', id: 'ws-power' });
  // body
  const typeSeg = K.segmented({ id: 'ws-body-type', label: WS.body, value: doc.cs.blueprint.body.type, options: Object.keys(BODY_TYPES).map((t) => ({ value: t, label: WS.bodyType[t] })), onChange: (v) => doc.setBodyType(v), fill: true });
  const heightSlider = K.slider({ min: C.HEIGHT_MIN, max: C.HEIGHT_MAX, step: 0.01, value: doc.cs.height, label: WS.height, id: 'ws-height', valueWidth: '3.6rem', format: (v) => v.toFixed(2), onInput: (v) => doc.setHeight(v), ticks: [{ v: 1, label: '1' }] });
  K.tooltip(heightSlider, WS.heightTip);
  const sizeNote = h('div', { class: 'vw-small vw-dim', id: 'ws-size-note' });
  const el = h('div', { class: 'vw-col ws-panel', id: 'ws-panel-stats' },
    h('div', { class: 'ws-pool' }, h('div', { class: 'vw-row vw-between' }, h('span', { class: 'vw-label', text: WS.pool }), resetBtn), pool, poolNote),
    sliderBox, h('div', { class: 'ws-radarbox' }, radar, h('div', { class: 'vw-col vw-grow' }, h('div', { class: 'vw-label', text: WS.radar }), powerTag, dl)),
    K.divider(), h('div', { class: 'vw-label', text: WS.body }), typeSeg, heightSlider, sizeNote);
  return {
    el,
    refresh(info) {
      const st = doc.cs.stats, total = statsTotal(st), left = poolLeft(st);
      pool.set(total, `${total} / ${C.STAT_POINTS}`, false);
      poolNote.textContent = left > 0 ? WS.poolLeft(left) : WS.poolFull;
      const ev = info.ev;
      for (const k of C.STAT_KEYS) {
        const r = rows[k]; if (+r.slider.get() !== st[k]) r.slider.set(st[k], true);
        r.effect.textContent = k === 'hp' ? `${ev.hp} hp` : k === 'damage' ? `${fmt1(ev.dmg)} per hit` : k === 'attackSpeed' ? `every ${ev.cd.toFixed(2)} s` : k === 'speed' ? `${ev.speed.toFixed(2)} u/s` : k === 'armor' ? `${Math.round(ev.armor * 100)}% blocked` : k === 'range' ? `${ev.range.toFixed(1)} u` : `+${ev.moraleBonus} morale`;
        r.nextEl.textContent = WS.nextPoint(env.nextCost(k));
      }
      dv.hp.textContent = String(ev.hp); dv.dmg.textContent = fmt1(ev.dmg); dv.dps.textContent = fmt1(ev.dps); dv.cd.textContent = `${ev.cd.toFixed(2)} s`; dv.speed.textContent = `${ev.speed.toFixed(2)} u/s`;
      dv.armor.textContent = `${Math.round(ev.armor * 100)}%`; dv.range.textContent = `${ev.range.toFixed(1)} u`; dv.radius.textContent = `${ev.radius.toFixed(2)} u`;
      const eff = info.comp.eff; dv.size.textContent = eff.map((x) => x.toFixed(2)).join(' x '); dv.power.textContent = fmt1(ev.power);
      powerTag.textContent = `${Math.round(ev.power * 10)}`;
      poly.setAttribute('points', C.STAT_KEYS.map((k, i) => pt(i, Math.max(0.04, st[k] / C.STAT_CAPS[k])).join(',')).join(' '));
      if (typeSeg.get() !== doc.cs.blueprint.body.type) typeSeg.set(doc.cs.blueprint.body.type, true);
      if (Math.abs(+heightSlider.get() - doc.cs.height) > 1e-6) heightSlider.set(doc.cs.height, true);
      sizeNote.textContent = `Effective size ${eff.map((x) => x.toFixed(2)).join(' x ')} (width x height x depth), collider ${ev.radius.toFixed(2)} u.`;
    },
  };
}

// ------------------------------------------------------------------------------------------------ Abilities
export function abilitiesPanel(env) {
  const { doc } = env;
  const aiSeg = K.segmented({ id: 'ws-ai', label: WS.aiTitle, value: doc.cs.ai, options: C.AI_STYLES.map((a) => ({ value: a, label: WS.ai[a][0] })), onChange: (v) => doc.setAI(v), fill: true });
  const aiNote = h('p', { class: 'vw-small vw-dim', id: 'ws-ai-note' });
  const count = h('div', { class: 'vw-label', id: 'ws-ab-count' });
  const list = h('div', { class: 'vw-col ws-abilities', role: 'group', 'aria-label': WS.abilities });
  const cards = {};
  for (const id of Object.keys(C.ABILITY_PRESETS)) {
    const T = C.ABILITY_TEXT[id] || { name: id, desc: '' };
    const cost = h('span', { class: 'ws-ab__cost' }), why = h('span', { class: 'ws-ab__why vw-micro' });
    const b = h('button', { type: 'button', class: 'ws-ab', id: 'ws-ab-' + id, 'aria-pressed': 'false', dataset: { id } }, h('span', { class: 'ws-ab__main' }, h('span', { class: 'ws-ab__name', text: T.name }), cost), h('span', { class: 'ws-ab__desc vw-small', text: T.desc }), why);
    b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') === 'true') { K.sfx('ui_error'); K.toast(why.textContent || WS.abilityLocked, { kind: 'warn', sound: false }); return; } K.sfx('ui_toggle'); doc.toggleAbility(id); });
    cards[id] = { b, cost, why }; list.appendChild(b);
  }
  const el = h('div', { class: 'vw-col ws-panel', id: 'ws-panel-abilities' }, h('div', { class: 'vw-label', text: WS.aiTitle }), aiSeg, aiNote, K.divider(), h('div', { class: 'vw-row vw-between' }, h('span', { class: 'vw-label', text: WS.abilities }), count), list);
  return {
    el,
    refresh() {
      const cs = doc.cs, bp = cs.blueprint, have = cs.abilities || [];
      if (aiSeg.get() !== cs.ai) aiSeg.set(cs.ai, true);
      aiNote.textContent = (WS.ai[cs.ai] || WS.ai.charge)[1];
      count.textContent = WS.abilitiesSub(have.length);
      for (const id of Object.keys(cards)) {
        const c = cards[id], on = have.indexOf(id) >= 0, reason = C.abilityReason(id, bp), full = !on && have.length >= C.MAX_ABILITIES;
        c.b.setAttribute('aria-pressed', String(on)); c.b.classList.toggle('is-on', on);
        const blocked = !on && (reason || full);
        c.b.setAttribute('aria-disabled', blocked ? 'true' : 'false'); c.b.classList.toggle('is-blocked', !!blocked);
        c.why.textContent = !on && reason ? reason : full ? 'Two abilities at most. Drop one first.' : '';
        const d = env.abilityCost(id); c.cost.textContent = d === null ? '' : (on ? `+${d} drachmae` : `${d >= 0 ? '+' : ''}${d} drachmae`);
      }
    },
  };
}

// ------------------------------------------------------------------------------------------------ Colours
function colorInput(label, id, value, onInput) {
  const col = h('input', { type: 'color', class: 'ws-color', id, 'aria-label': label, value });
  col.value = value;
  const hex = h('input', { type: 'text', class: 'vw-input ws-hex', maxlength: '7', 'aria-label': label + ' hex', id: id + '-hex', spellcheck: 'false', autocomplete: 'off', value });
  hex.value = value;
  col.addEventListener('input', () => { hex.value = col.value; onInput(col.value); });
  hex.addEventListener('change', () => { const v = hex.value.trim(); const f = v.startsWith('#') ? v : '#' + v; if (/^#[0-9a-fA-F]{6}$/.test(f)) { col.value = f.toLowerCase(); hex.value = f.toLowerCase(); onInput(f.toLowerCase()); } else { hex.value = col.value; K.sfx('ui_error'); } });
  const el = h('div', { class: 'ws-colorrow' }, col, hex);
  el.set = (v) => { if (col.value !== v) col.value = v; if (hex.value !== v && document.activeElement !== hex) hex.value = v; };
  return el;
}
function swatchRow(id, label, colors, names, onPick) {
  const wrap = h('div', { class: 'ws-swatches', role: 'radiogroup', 'aria-label': label, id }), btns = [];
  colors.forEach((c, i) => {
    const b = h('button', { type: 'button', class: 'ws-swatch', role: 'radio', 'aria-checked': 'false', 'aria-label': names ? names[i] : c, style: { '--sw': c }, dataset: { color: c } });
    if (names) K.tooltip(b, names[i]);
    b.addEventListener('click', () => { K.sfx('ui_select'); onPick(c, i); }); btns.push(b); wrap.appendChild(b);
  });
  wrap.set = (v) => { let any = false; btns.forEach((b) => { const on = b.dataset.color.toLowerCase() === String(v).toLowerCase(); b.setAttribute('aria-checked', String(on)); b.classList.toggle('is-on', on); if (on) any = true; }); wrap.dataset.custom = any ? '' : '1'; };
  return wrap;
}
export function coloursPanel(env) {
  const { doc } = env, bp = () => doc.cs.blueprint;
  const pal = h('div', { class: 'ws-palettes', role: 'group', 'aria-label': WS.palettes });
  PALETTES.forEach((p, i) => {
    const b = h('button', { type: 'button', class: 'ws-pal', id: 'ws-pal-' + i, 'aria-label': WS.palette(i) }, ...['primary', 'secondary', 'trim', 'cloth'].map((k) => h('i', { style: { background: p[k] } })));
    K.tooltip(b, WS.palette(i)); b.addEventListener('click', () => { K.sfx('ui_select'); doc.applyPalette(i); }); pal.appendChild(b);
  });
  const pickers = {};
  const pickerBox = h('div', { class: 'vw-col' });
  for (const k of ['primary', 'secondary', 'trim', 'cloth']) {
    const ci = colorInput(WS.colour[k], 'ws-color-' + k, bp().colors[k], (v) => doc.setColor(k, v)); pickers[k] = ci;
    pickerBox.appendChild(h('div', { class: 'ws-field' }, h('span', { class: 'ws-field__label', text: WS.colour[k] }), ci));
  }
  const tintRow = h('div', { class: 'vw-row vw-wrapflex ws-tintrow' }, K.button('Show the tint map', { icon: 'eye', size: 'sm', variant: 'secondary', id: 'ws-show-tint', onClick: () => env.setTint('map') }), h('span', { class: 'vw-small vw-dim', text: WS.clothNote }));
  const metal = K.segmented({ id: 'ws-metal', label: WS.metal, value: bp().colors.metal, options: METAL_KEYS.map((m) => ({ value: m, label: WS.metals[m] })), onChange: (v) => doc.setMetal(v), class: 'vw-seg--compact' });
  const metalDots = h('div', { class: 'ws-metaldots', 'aria-hidden': 'true' }, ...METAL_KEYS.map((m) => h('i', { style: { background: hex6(METALS[m][2]) }, title: WS.metals[m] })));
  const emblems = h('div', { class: 'ws-emblems', role: 'radiogroup', 'aria-label': WS.emblem }), embBtns = {};
  for (const e of EMBLEM_IDS) {
    const b = h('button', { type: 'button', class: 'ws-emblem', role: 'radio', 'aria-checked': 'false', 'aria-label': WS.emblems[e], id: 'ws-emblem-' + e }, h('span', { class: 'ws-emblem__ico' }), h('span', { class: 'ws-emblem__name vw-micro', text: WS.emblems[e] }));
    b.addEventListener('click', () => { K.sfx('ui_select'); doc.setEmblem(e); }); embBtns[e] = b; emblems.appendChild(b);
  }
  const skin = swatchRow('ws-skin', WS.skin, SKIN_TONES, SKIN_NAMES, (c) => doc.setBodyColor('skin', c));
  const hair = swatchRow('ws-hair', WS.hair, HAIR_COLORS, null, (c) => doc.setBodyColor('hair', c));
  const eyes = swatchRow('ws-eyes', WS.eyes, EYE_COLORS, null, (c) => doc.setEyes(c));
  const skinCustom = colorInput(WS.skin + ' custom', 'ws-skin-custom', bp().body.skin, (v) => doc.setBodyColor('skin', v));
  const hairCustom = colorInput(WS.hair + ' custom', 'ws-hair-custom', bp().body.hair, (v) => doc.setBodyColor('hair', v));
  let lastSig = '';
  const el = h('div', { class: 'vw-col ws-panel', id: 'ws-panel-colours' },
    h('div', { class: 'vw-label', text: WS.palettes }), pal, K.divider(), pickerBox, tintRow, K.divider(),
    h('div', { class: 'vw-label', text: WS.metal }), metal, metalDots, K.divider(), h('div', { class: 'vw-label', text: WS.emblem }), emblems, K.divider(),
    h('div', { class: 'vw-label', text: WS.skin }), skin, skinCustom, h('div', { class: 'vw-label', text: WS.hair }), hair, hairCustom, h('div', { class: 'vw-label', text: WS.eyes }), eyes);
  return {
    el,
    refresh() {
      const b = bp();
      for (const k of ['primary', 'secondary', 'trim', 'cloth']) pickers[k].set(b.colors[k]);
      if (metal.get() !== b.colors.metal) metal.set(b.colors.metal, true);
      skin.set(b.body.skin); hair.set(b.body.hair); eyes.set(b.head.eyes); skinCustom.set(b.body.skin); hairCustom.set(b.body.hair);
      for (const e of EMBLEM_IDS) embBtns[e].setAttribute('aria-checked', String(b.emblem === e));
      const sig = b.colors.secondary;
      if (sig !== lastSig) { lastSig = sig; for (const e of EMBLEM_IDS) { const ico = embBtns[e].firstChild; ico.replaceChildren(emblemIcon(e, sig, 32)); } }
    },
  };
}

// ------------------------------------------------------------------------------------------------ Personality
export function personalityPanel(env) {
  const { doc } = env;
  const mk = (id, label, get, set, ph) => {
    const input = h('input', { type: 'text', class: 'vw-input', id, maxlength: String(C.QUOTE_MAX), 'aria-label': label, autocomplete: 'off', spellcheck: 'true', placeholder: ph || '' });
    const count = h('span', { class: 'vw-micro vw-dim ws-count' });
    input.addEventListener('input', () => { set(input.value); count.textContent = `${input.value.length}/${C.QUOTE_MAX}`; });
    const row = h('div', { class: 'ws-field ws-field--stack' }, h('span', { class: 'ws-field__label', text: label }), h('div', { class: 'ws-inputrow' }, input, count));
    return { row, sync() { const v = get(); if (document.activeElement !== input && input.value !== v) input.value = v; count.textContent = `${v.length}/${C.QUOTE_MAX}`; } };
  };
  const catchF = mk('ws-catch', WS.catchphrase, () => doc.cs.text.catch || '', (v) => doc.setCatch(v));
  const deathF = [0, 1, 2].map((i) => mk('ws-death-' + i, WS.lastWord(i), () => (doc.cs.text.deaths || [])[i] || '', (v) => doc.setDeath(i, v)));
  const pitch = K.slider({ min: C.PITCH_MIN, max: C.PITCH_MAX, step: 0.01, value: doc.cs.text.pitch, label: WS.pitch, id: 'ws-pitch', valueWidth: '3.6rem', format: (v) => v.toFixed(2), onInput: (v) => doc.setPitch(v), ticks: [{ v: 1, label: '1' }] });
  const hear = K.button(WS.hearIt, { icon: 'volume', size: 'sm', variant: 'secondary', id: 'ws-hear', sound: false, onClick: () => K.sfx('ui_confirm', { pitch: doc.cs.text.pitch }) });
  const surprise = K.button(WS.surprise, { icon: 'dice', size: 'sm', variant: 'secondary', id: 'ws-quotes-dice', onClick: () => doc.surpriseQuotes() });
  const el = h('div', { class: 'vw-col ws-panel', id: 'ws-panel-personality' }, h('div', { class: 'vw-row vw-between' }, h('span', { class: 'vw-label', text: WS.personality }), surprise), catchF.row, h('div', { class: 'vw-label', text: WS.lastWords }), ...deathF.map((d) => d.row), K.divider(), pitch, hear);
  return { el, refresh() { catchF.sync(); deathF.forEach((d) => d.sync()); if (Math.abs(+pitch.get() - doc.cs.text.pitch) > 1e-6) pitch.set(doc.cs.text.pitch, true); } };
}

// ------------------------------------------------------------------------------------------------ Voxel Paint
export function paintPanel(env) {
  const { doc } = env;
  const rows = h('div', { class: 'vw-col ws-paintlist', id: 'ws-paint-list' }), counts = {};
  for (const pid of PART_ORDER) {
    const cnt = h('span', { class: 'vw-small vw-dim' });
    const b = K.button(WS.paintEdit, { icon: 'brush', size: 'sm', variant: 'ghost', id: 'ws-paint-' + pid, onClick: () => env.openPainter(pid) });
    rows.appendChild(h('div', { class: 'ws-paintrow' }, h('span', { class: 'ws-paintrow__name', text: PART_NAMES[pid] }), cnt, b)); counts[pid] = cnt;
  }
  const open = K.button(WS.paintOpen, { icon: 'brush', variant: 'primary', id: 'ws-paint-open', onClick: () => env.openPainter(null) });
  const clear = K.button(WS.paintClear, { icon: 'trash', variant: 'ghost', size: 'sm', id: 'ws-paint-clear', onClick: () => doc.clearPaint() });
  const el = h('div', { class: 'vw-col ws-panel', id: 'ws-panel-paint' }, h('p', { class: 'vw-small', text: WS.paintIntro }), h('div', { class: 'vw-row vw-wrapflex' }, open, clear), h('p', { class: 'vw-micro vw-dim', text: WS.paintCap }), rows);
  return {
    el,
    refresh() {
      const paint = doc.cs.blueprint.paint || {}; let any = false;
      for (const pid of PART_ORDER) { const r = paint[pid]; let n = 0; if (r && Array.isArray(r.rle)) for (let i = 0; i < r.rle.length; i += 2) if (r.rle[i + 1]) n += r.rle[i]; if (n) any = true; counts[pid].textContent = WS.paintCount(n); counts[pid].classList.toggle('is-painted', n > 0); }
      clear.disabled = !any;
    },
  };
}
