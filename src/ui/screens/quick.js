// Quick Battle setup: arena carousel + conditions + rules + army panels, "Quick Fight" (one tap) and "Place armies".
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { generateArena } from '../../world/gen.js';
import { BUDGETS, AI_STYLES, qualityCaps, totalStars, factionIds, timeName, setThumb, safe, seenHint, setSeenHint } from './_shared.js';
import { factionColor, factionName } from '../unitinfo.js';

export const meta = { id: 'quick', layer: 'menu', music: 'menu', canvas: 'none' };

let LAST = null;   // survives screen remounts within a session (back from placement keeps your choices)

function defaults(ctx) {
  const ids = factionIds(ctx).filter((f) => f !== 'mythic');
  const a = ids[Math.floor(Math.random() * ids.length)];
  let b = ids[Math.floor(Math.random() * ids.length)];
  if (b === a) b = ids[(ids.indexOf(a) + 1) % ids.length];
  return {
    arena: 'marathon', size: 'medium', seed: 1337, weather: 'default', timeAuto: true, time: 12,
    budget: 'battle', custom: 8000, difficulty: 'normal', friendlyFire: false, morale: true, speed: 1, freePlacement: false,
    gore: safe(() => ctx.settings.get('gore'), 'red'), corpses: safe(() => ctx.settings.get('corpses'), 'fade'), formation: 'block', mirror: false, timeLimit: 0, mood: 'auto', mutators: [],
    A: { faction: a, style: 'balanced' }, B: { faction: b, style: 'balanced' }, adv: seenHint(ctx, 'quickAdvanced'),
  };
}

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.quick;
  const cleanups = [];
  const S = LAST || (LAST = defaults(ctx));
  const arenas = ctx.content.arenas;
  if (params && params.arena && arenas.some((a) => a.id === params.arena)) { S.arena = params.arena; const pa = arenas.find((a) => a.id === params.arena); if (pa.size && pa.id !== 'random') S.size = pa.size; }
  const caps = () => qualityCaps(ctx);
  const stars = totalStars(ctx);
  let busy = false;
  const arenaIdx = () => Math.max(0, arenas.findIndex((a) => a.id === S.arena));
  const curArena = () => arenas[arenaIdx()] || arenas[0];
  const budgetValue = () => (S.budget === 'custom' ? S.custom : BUDGETS[S.budget]);

  /* ---------------------------------------------------------------- arena carousel */
  const img = K.h('img', { class: 'vw-qb__thumb-img', alt: '', width: 384, height: 216 });
  const thumbBox = K.h('div', { class: 'vw-qb__thumb-fallback vw-hide', 'aria-hidden': 'true' }, K.icon('map'));
  const nameEl = K.h('h3', { class: 'vw-qb__arena-name', 'aria-live': 'polite' });
  const blurbEl = K.h('p', { class: 'vw-qb__arena-blurb' });
  const tacticsEl = K.h('div', { class: 'vw-chips' });
  const recEl = K.chip('', { variant: 'gold', class: 'vw-chip--wrap', id: 'qb-recommended', onClick: () => applyRecommended() });
  const recLabel = recEl.querySelector('span');
  K.tooltip(recEl, T.recommendedTip);
  const seedRow = K.h('div', { class: 'vw-qb__seed vw-row vw-wrapflex vw-hide' });
  const seedInput = K.h('input', { class: 'vw-input vw-qb__seed-input', id: 'qb-seed', type: 'text', inputmode: 'numeric', 'aria-label': T.random.seed, value: String(S.seed), maxlength: 10 });
  const rerollBtn = K.button(T.random.reroll, { icon: 'dice', size: 'sm', id: 'qb-reroll', onClick: () => { S.seed = Math.floor(Math.random() * 1e9); seedInput.value = String(S.seed); paintArena(); } });
  const copySeedBtn = K.button(T.random.copy, { icon: 'copy', size: 'sm', variant: 'ghost', id: 'qb-copy-seed', onClick: () => K.copyText(String(S.seed), { done: T.copySeed }) });
  seedRow.append(K.h('label', { class: 'vw-label', for: 'qb-seed', text: T.random.seed }), seedInput, rerollBtn, copySeedBtn);
  seedInput.addEventListener('change', () => { const v = parseInt(seedInput.value, 10); S.seed = isFinite(v) && v >= 0 ? v >>> 0 : S.seed; seedInput.value = String(S.seed); paintArena(); });

  const strip = K.h('div', { class: 'vw-qb__strip vw-scroll', role: 'radiogroup', 'aria-label': T.arena });
  const stripBtns = arenas.map((a, i) => {
    const im = K.h('img', { class: 'vw-qb__mini-img', alt: '', width: 96, height: 54, loading: 'lazy' });
    const fb = K.h('span', { class: 'vw-qb__mini-fb vw-hide', 'aria-hidden': 'true' });
    const b = K.h('button', { type: 'button', class: 'vw-qb__mini', role: 'radio', 'aria-checked': 'false', tabindex: '-1', id: 'qb-arena-' + a.id, dataset: { arena: a.id } }, K.h('span', { class: 'vw-qb__mini-art' }, im, fb), K.h('span', { class: 'vw-qb__mini-name', text: a.id === 'random' ? T.random.name : a.name }));
    setThumb(im, ctx, a.id, fb);
    b.addEventListener('click', () => { K.sfx('ui_click'); setArena(a.id); });
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') K.sfx('ui_hover'); });
    strip.appendChild(b);
    return b;
  });
  strip.addEventListener('keydown', (e) => {
    const k = e.key; if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
    e.preventDefault(); let i = arenaIdx();
    i = k === 'Home' ? 0 : k === 'End' ? arenas.length - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + arenas.length) % arenas.length;
    K.sfx('ui_tick'); setArena(arenas[i].id); stripBtns[i].focus();
  });
  const prev = K.iconButton('chevL', T.arenaPrev, { id: 'qb-arena-prev', onClick: () => step(-1) });
  const next = K.iconButton('chevR', T.arenaNext, { id: 'qb-arena-next', onClick: () => step(1) });
  const hero = K.h('div', { class: 'vw-qb__hero', role: 'group', 'aria-roledescription': 'carousel', 'aria-label': T.arena },
    K.h('div', { class: 'vw-qb__thumb' }, img, thumbBox, K.h('div', { class: 'vw-qb__nav vw-qb__nav--l' }, prev), K.h('div', { class: 'vw-qb__nav vw-qb__nav--r' }, next)),
    K.h('div', { class: 'vw-qb__arena-info' }, nameEl, blurbEl, K.h('div', { class: 'vw-row vw-wrapflex' }, tacticsEl, recEl)));
  function step(d) { const i = (arenaIdx() + d + arenas.length) % arenas.length; K.sfx('ui_tick'); setArena(arenas[i].id); }
  function setArena(id) { S.arena = id; const a = curArena(); if (a.size && S.arena !== 'random') S.size = a.size; paintArena(); paintSummary(); sizeSeg.set(S.size, true); }
  function applyRecommended() {
    const want = curArena().recommendedBudget || 8000;
    const presets = Object.keys(BUDGETS);
    const best = presets.reduce((a, k) => (Math.abs(BUDGETS[k] - want) < Math.abs(BUDGETS[a] - want) ? k : a), presets[0]);
    if (Math.abs(BUDGETS[best] - want) <= 1500) { S.budget = best; } else { S.budget = 'custom'; S.custom = Math.max(500, Math.min(40000, Math.round(want / 500) * 500)); customSlider.set(S.custom, true); }
    budgetSeg.set(S.budget, true); customRow.classList.toggle('vw-hide', S.budget !== 'custom'); paintSummary(); K.toast(T.recommendedApplied(budgetValue()), { kind: 'success', ms: 1800 });
  }
  function paintArena() {
    const a = curArena();
    nameEl.textContent = a.id === 'random' ? T.random.name : a.name;
    blurbEl.textContent = a.id === 'random' ? T.random.blurb : a.blurb;
    tacticsEl.replaceChildren(...(a.tactics || []).map((t) => K.chip(t, { variant: 'sky' })));
    recLabel.textContent = T.recommended(a.recommendedBudget || 8000);
    seedRow.classList.toggle('vw-hide', a.id !== 'random');
    stripBtns.forEach((b) => { const on = b.dataset.arena === a.id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; b.classList.toggle('is-on', on); });
    if (a.id === 'random') {
      let url = '';
      try { const ar = generateArena('random', 'small', S.seed); const cv = document.createElement('canvas'); cv.width = 384; cv.height = 216; url = (ctx.preview && ctx.preview.arena) ? ctx.preview.arena(cv, ar, { w: 384, h: 216 }) : ''; } catch (e) { url = ''; }
      if (url && typeof url === 'string') { img.src = url; img.classList.remove('vw-hide'); thumbBox.classList.add('vw-hide'); } else setThumb(img, ctx, a.id, thumbBox);
    } else setThumb(img, ctx, a.id, thumbBox);
    const cur = stripBtns[arenaIdx()];
    if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* ignore */ } }
  }

  /* ---------------------------------------------------------------- conditions */
  const sizeSeg = K.segmented({ id: 'qb-size', label: T.size, value: S.size, options: ['small', 'medium', 'large'].map((k) => ({ value: k, label: T.sizes[k], sub: T.sizeSub[k] })), onChange: (v) => { S.size = v; paintSummary(); } });
  const weatherSel = K.select({ id: 'qb-weather', label: T.weather, value: S.weather, options: Object.keys(T.weathers).map((k) => ({ value: k, label: T.weathers[k] })), onChange: (v) => { S.weather = v; weatherTip.textContent = T.weatherTip[v] || ''; paintSummary(); } });
  const weatherTip = K.h('p', { class: 'vw-field__hint vw-qb__wtip', text: T.weatherTip[S.weather] || '' });
  const timeOut = K.h('span', { class: 'vw-qb__time-name', 'aria-live': 'polite' });
  const timeAuto = K.chip(T.auto, { pressed: S.timeAuto, id: 'qb-time-auto', onClick: () => { S.timeAuto = !S.timeAuto; paintTime(); paintSummary(); } });
  const timeSlider = K.slider({ id: 'qb-time', min: 0, max: 24, step: 0.5, value: S.time, label: T.time, format: (v) => K.fmtClock(v), valueWidth: '3.6rem', ticks: [{ v: 0, label: '00' }, { v: 6, label: '06' }, { v: 12, label: '12' }, { v: 18, label: '18' }, { v: 24, label: '24' }],
    onInput: (v) => { S.time = v; if (S.timeAuto) { S.timeAuto = false; } paintTime(); paintSummary(); } });
  function paintTime() { timeAuto.setPressed(S.timeAuto); timeOut.textContent = S.timeAuto ? T.arenaDefault : `${K.fmtClock(S.time)} · ${timeName(T, S.time)}`; timeSlider.classList.toggle('is-auto', S.timeAuto); }
  const conditions = K.tablet(T.conditions, K.h('div', { class: 'vw-col' },
    K.field(T.size, sizeSeg, { stack: true }),
    K.field(T.weather, K.h('div', { class: 'vw-col vw-grow' }, weatherSel, weatherTip), { stack: true }),
    K.field(T.time, K.h('div', { class: 'vw-col vw-grow' }, K.h('div', { class: 'vw-row vw-between vw-wrapflex' }, timeOut, timeAuto), timeSlider), { stack: true })), { id: 'qb-conditions', icon: 'sun' });
  conditions.setAttribute('data-adv-only', '');

  /* ---------------------------------------------------------------- rules */
  const budgetSeg = K.segmented({ id: 'qb-budget', label: T.budget, value: S.budget, options: Object.keys(T.budgets).map((k) => ({ value: k, label: T.budgets[k], sub: k === 'custom' ? '' : (T.budgetSub[k]) })), onChange: (v) => { S.budget = v; customRow.classList.toggle('vw-hide', v !== 'custom'); paintSummary(); } });
  const customSlider = K.slider({ id: 'qb-budget-custom', min: 500, max: 40000, step: 500, value: S.custom, label: T.budgets.custom, format: (v) => K.fmtNum(v), valueWidth: '4.6rem', onInput: (v) => { S.custom = v; paintSummary(); } });
  const customRow = K.h('div', { class: ['vw-qb__custom', S.budget !== 'custom' && 'vw-hide'] }, customSlider);
  const capNote = K.h('p', { class: 'vw-field__hint', id: 'qb-cap-note' });
  const paintCap = () => { const c = caps(); capNote.textContent = T.cappedBy(T0.settings.graphics.presets[c.id] || c.id, c.units); };
  const diffSeg = K.segmented({ id: 'qb-difficulty', label: T.difficulty, value: S.difficulty, options: ['easy', 'normal', 'hard'].map((k) => ({ value: k, label: T.difficulties[k], title: T.difficultyTip[k] })), onChange: (v) => { S.difficulty = v; diffHint.textContent = T.difficultyTip[v]; paintSummary(); } });
  const diffHint = K.h('p', { class: 'vw-field__hint', text: T.difficultyTip[S.difficulty] });
  const tog = (id, label, key, tip) => K.field(label, K.toggle({ id, label, value: S[key], onChange: (v) => { S[key] = v; } }), { info: tip, id: id + '-row' });
  const speedSeg = K.segmented({ id: 'qb-speed', label: T.speed, value: S.speed, options: [[0.25, '¼×'], [0.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×']].map(([v, l]) => ({ value: v, label: l })), onChange: (v) => { S.speed = v; } });
  const goreSeg = K.segmented({ id: 'qb-gore', label: T.gore, value: S.gore, options: Object.keys(T.gores).map((k) => ({ value: k, label: T.gores[k] })), onChange: (v) => { S.gore = v; } });
  const corpseSeg = K.segmented({ id: 'qb-corpses', label: T.corpses, value: S.corpses, options: Object.keys(T.corpsesOpts).map((k) => ({ value: k, label: T.corpsesOpts[k] })), onChange: (v) => { S.corpses = v; } });
  const formSel = K.select({ id: 'qb-formation', label: T.formation, value: S.formation, options: (ctx.content.formations || Object.keys(T.formations)).map((k) => ({ value: k, label: T.formations[k] || k })), onChange: (v) => { S.formation = v; } });
  const limitSeg = K.segmented({ id: 'qb-limit', label: T.timeLimit, value: S.timeLimit, options: Object.keys(T.timeLimits).map((k) => ({ value: +k, label: T.timeLimits[k] })), onChange: (v) => { S.timeLimit = v; } });
  const moodSel = K.select({ id: 'qb-mood', label: T.mood, value: S.mood, options: Object.keys(T.moods).map((k) => ({ value: k, label: T.moods[k] })), onChange: (v) => { S.mood = v; } });
  const mutBox = K.h('div', { class: 'vw-chips', role: 'group', 'aria-label': T.mutators, id: 'qb-mutators' });
  for (const m of (ctx.content.mutators || [])) {
    const locked = stars < (m.stars || 0);
    const c = K.chip(m.name, { pressed: S.mutators.indexOf(m.id) >= 0, id: 'qb-mut-' + m.id, icon: locked ? 'lock' : null, onClick: () => {
      if (locked) { K.sfx('ui_error'); K.toast(T.mutatorLocked(m.stars), { kind: 'warn' }); return; }
      const i = S.mutators.indexOf(m.id); if (i >= 0) S.mutators.splice(i, 1); else S.mutators.push(m.id); c.setPressed(S.mutators.indexOf(m.id) >= 0);
    } });
    if (locked) c.setAttribute('aria-disabled', 'true');
    K.tooltip(c, locked ? T.mutatorLocked(m.stars) : m.desc);
    mutBox.appendChild(c);
  }
  const advRules = K.h('div', { class: 'vw-col', 'data-adv-only': '' },
    K.field(T.friendlyFire, K.toggle({ id: 'qb-ff', label: T.friendlyFire, value: S.friendlyFire, onChange: (v) => { S.friendlyFire = v; } }), { info: T.friendlyFireTip }),
    K.field(T.morale, K.toggle({ id: 'qb-morale', label: T.morale, value: S.morale, onChange: (v) => { S.morale = v; } }), { info: T.moraleTip }),
    K.field(T.speed, speedSeg, { info: T.speedTip, stack: true }),
    K.field(T.freePlacement, K.toggle({ id: 'qb-free', label: T.freePlacement, value: S.freePlacement, onChange: (v) => { S.freePlacement = v; } }), { info: T.freePlacementTip }),
    K.field(T.mirror, K.toggle({ id: 'qb-mirror', label: T.mirror, value: S.mirror, onChange: (v) => { S.mirror = v; } }), { info: T.mirrorTip }),
    K.field(T.gore, goreSeg, { info: T.goreTip, stack: true }),
    K.field(T.corpses, corpseSeg, { stack: true }),
    K.field(T.formation, formSel),
    K.field(T.timeLimit, limitSeg, { stack: true }),
    K.field(T.mood, moodSel),
    K.field(T.mutators, mutBox, { hint: T.mutatorsHint, stack: true }));
  const rules = K.tablet(T.rules, K.h('div', { class: 'vw-col' },
    K.field(T.budget, K.h('div', { class: 'vw-col vw-grow' }, budgetSeg, customRow, capNote), { info: T.budgetTip, stack: true }),
    K.field(T.difficulty, K.h('div', { class: 'vw-col vw-grow' }, diffSeg, diffHint), { stack: true }),
    advRules), { id: 'qb-rules', icon: 'scroll' });

  /* ---------------------------------------------------------------- armies */
  function armyPanel(side) {
    const st = S[side];
    const chipsBox = K.h('div', { class: 'vw-chips', role: 'radiogroup', 'aria-label': `${side === 'A' ? T.armyA : T.armyB}: ${T.faction}` });
    const chips = [];
    const opts = factionIds(ctx).concat(['mixed']);
    for (const f of opts) {
      const label = f === 'mixed' ? T.mixed : factionName(ctx.content.factions, f);
      const c = K.chip(label, { pressed: st.faction === f, id: `qb-${side}-${f}`, onClick: () => { st.faction = f; paint(); paintSummary(); } });
      c.setAttribute('role', 'radio'); c.setAttribute('aria-checked', String(st.faction === f)); c.removeAttribute('aria-pressed');
      if (f !== 'mixed') c.insertBefore(K.h('span', { class: 'vw-tab__dot', style: { '--c': factionColor(ctx.content.factions, f) } }), c.firstChild);
      else K.tooltip(c, T.mixedTip);
      chips.push([f, c]); chipsBox.appendChild(c);
    }
    function paint() { chips.forEach(([f, c]) => { const on = st.faction === f; c.classList.toggle('is-on', on); c.setAttribute('aria-checked', String(on)); }); }
    paint();
    const styleSel = K.select({ id: `qb-${side}-style`, label: `${side === 'A' ? T.armyA : T.armyB}: ${T.style}`, value: st.style, options: AI_STYLES.map((k) => ({ value: k, label: T.styles[k] })), onChange: (v) => { st.style = v; } });
    const el = K.h('div', { class: 'vw-qb__army vw-qb__army--' + side.toLowerCase() },
      K.h('div', { class: 'vw-row' }, K.chip(side === 'A' ? 'A' : 'B', { variant: side === 'A' ? 'team-a' : 'team-b' }), K.h('h3', { class: 'vw-qb__army-title', text: side === 'A' ? T.armyA : T.armyB })),
      chipsBox,
      K.h('div', { class: 'vw-row vw-wrapflex vw-qb__army-style' }, K.h('span', { class: 'vw-label', text: T.autoFill }), styleSel));
    el.paint = paint;
    return el;
  }
  const armyA = armyPanel('A'), armyB = armyPanel('B');
  const mirrorBtn = K.button(T.mirrorArmies, { icon: 'mirror', size: 'sm', variant: 'ghost', id: 'qb-mirror-armies', onClick: () => { S.B.faction = S.A.faction; S.B.style = S.A.style; armyB.paint(); const sel = armyB.querySelector('select'); if (sel) sel.value = S.B.style; K.toast(T.mirrored, { kind: 'success' }); } });
  K.tooltip(mirrorBtn, T.mirrorArmiesTip);
  const armies = K.tablet(T.armies, K.h('div', { class: 'vw-col' }, K.h('div', { class: 'vw-qb__armies' }, armyA, armyB), K.h('div', { class: 'vw-row' }, mirrorBtn)), { id: 'qb-armies', icon: 'users' });

  /* ---------------------------------------------------------------- actions + summary */
  const summary = K.h('p', { class: 'vw-qb__summary', 'aria-live': 'polite' });
  function paintSummary() {
    const a = curArena();
    const wx = S.weather === 'default' ? null : T.weathers[S.weather];
    const bits = [a.id === 'random' ? T.random.name : a.name, T.sizes[S.size], T.budgets[S.budget] + ' ' + K.fmtNum(budgetValue()), T.difficulties[S.difficulty]];
    if (wx) bits.push(wx);
    if (!S.timeAuto) bits.push(K.fmtClock(S.time));
    summary.textContent = bits.join(' · ');
  }
  const quickBtn = K.button(T.quickFight, { id: 'qb-quick-fight', variant: 'primary', size: 'lg', icon: 'dice', sub: T.quickFightSub, onClick: () => quickFight() });
  const placeBtn = K.button(T.place, { id: 'qb-place', variant: 'secondary', size: 'lg', icon: 'users', onClick: () => placeArmies() });
  K.tooltip(placeBtn, T.placeSub);
  const actions = K.h('div', { class: 'vw-qb__actions' }, summary, K.h('div', { class: 'vw-qb__action-btns' }, placeBtn, quickBtn));

  function toSetup() {
    const a = curArena();
    const g = ctx.game;
    const setup = g.newSetup('quick');
    setup.arena = { presetId: a.id, size: S.size, seed: a.id === 'random' ? S.seed : (a.seed || S.seed), env: Object.assign({}, S.timeAuto ? {} : { time: S.time }) };
    setup.rules = Object.assign({}, setup.rules, {
      budget: budgetValue(), difficulty: S.difficulty, friendlyFire: S.friendlyFire, morale: S.morale, speed: S.speed, gore: S.gore, corpses: S.corpses, freePlacement: S.freePlacement, mirror: S.mirror,
      timeLimit: S.timeLimit * 60, weather: S.weather === 'default' ? null : S.weather, mood: S.mood, mutators: S.mutators.slice(), formation: S.formation,
    });
    setup.armies = { A: { faction: S.A.faction, style: S.A.style, placements: [], budget: budgetValue() }, B: { faction: S.B.faction, style: S.B.style, placements: [], budget: budgetValue() } };
    return setup;
  }
  const lock = (b) => { busy = b; [quickBtn, placeBtn].forEach((x) => x.setDisabled(b)); };
  async function placeArmies() {
    if (busy) return;
    lock(true); K.toast(T.starting, { kind: 'info', ms: 1500 });
    try { const setup = toSetup(); await ctx.game.begin(setup); if (ctx.nav.current() !== 'placement') ctx.nav.goto('placement', { from: 'quick', setup }); }
    catch (e) { K.toast(T.failed, { kind: 'error' }); lock(false); }
  }
  async function quickFight() {
    if (busy) return;
    lock(true); K.toast(T.starting, { kind: 'info', ms: 1500 });
    try {
      const pool = arenas.filter((x) => x.id !== 'arenalab');
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const keep = S.arena; S.arena = pick.id; if (pick.size && pick.id !== 'random') S.size = pick.size;
      const setup = toSetup(); S.arena = keep;
      const g = ctx.game;
      await g.begin(setup);
      const b = budgetValue();
      g.tools.autoFill(0, { style: 'balanced', faction: S.A.faction, budget: b });
      g.tools.autoFill(1, { style: 'balanced', faction: S.B.faction, budget: b });
      g.fight();
    } catch (e) { K.toast(T.failed, { kind: 'error' }); lock(false); }
  }

  /* ---------------------------------------------------------------- frame */
  const advSeg = K.segmented({ id: 'qb-mode', label: 'Setup detail', value: S.adv ? 'advanced' : 'simple', options: [{ value: 'simple', label: T.advanced.simple }, { value: 'advanced', label: T.advanced.advanced }], onChange: (v) => { S.adv = v === 'advanced'; setSeenHint(ctx, 'quickAdvanced', S.adv); paintMode(); } });
  advSeg.querySelectorAll('.vw-seg__opt').forEach((b) => { b.dataset.adv = b.dataset.value; });
  const frame = K.pageFrame({ id: 'qb', title: T.title, sub: T.sub, onBack: () => ctx.nav.back(), actions: [advSeg] });
  const grid = K.h('div', { class: 'vw-qb' },
    K.h('div', { class: 'vw-qb__col vw-qb__a' }, K.tablet(T.arena, K.h('div', { class: 'vw-col' }, hero, seedRow, strip), { id: 'qb-arena-tablet', icon: 'map' }), conditions),
    K.h('div', { class: 'vw-qb__col vw-qb__b' }, armies),
    K.h('div', { class: 'vw-qb__col vw-qb__c' }, rules));
  frame.content.classList.add('vw-wrap--wide');
  frame.content.appendChild(grid);
  frame.el.appendChild(actions);
  frame.mount(root);
  function paintMode() { grid.classList.toggle('is-simple', !S.adv); }
  paintMode(); paintArena(); paintTime(); paintCap(); paintSummary();
  K.enter(Array.from(grid.querySelectorAll('.vw-tablet')), 'pop', 0);
  K.enter(actions, 'fade', 4);
  const offSet = ctx.settings.on ? ctx.settings.on(paintCap) : null;
  cleanups.push(frame.destroy, () => { if (typeof offSet === 'function') offSet(); });
  setTimeout(() => { if (!safe(() => ctx.platform.isTouch, false)) { try { quickBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }, 80);

  return {
    destroy() { cleanups.forEach((f) => f()); },
    onBack() { if (K.hasModal()) return false; ctx.nav.back(); return true; },
  };
}
