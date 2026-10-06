// Placement UI over the 3D scene: soldier palette (faction tabs, search, role filter, hover turntable), tools panel (team, budgets, brush,
// formation, order, mirror, undo/redo, presets, auto-fill, scout report), bottom bar (unit caps, types, FIGHT). The canvas itself is driven by Game;
// this screen only sets tools (ctx.game.tools.*) and reads ctx.game.info.*. Pointer events outside the panels pass through to the canvas.
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { safe, unitsOf, factionIds, AI_STYLES, seenHint, setSeenHint } from './_shared.js';
import { factionColor, factionName, ROLES, ROLE_LABEL, ROLE_ICON } from '../unitinfo.js';

export const meta = { id: 'placement', layer: 'battle', music: 'battle', canvas: 'scene' };

const MODES = ['single', 'line', 'block', 'scatter', 'erase', 'select'];
const MODE_ICON = { single: 'pin', line: 'line', block: 'block', scatter: 'scatter', erase: 'eraser', select: 'pointer' };
const DEFAULT_COUNT = { melee: 9, ranged: 8, cavalry: 5, siege: 1, support: 3, hero: 1, monster: 1, swarm: 8, beast: 6 };

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.placement;
  const G = ctx.game;
  const cleanups = [];
  const units = ctx.content.units;
  const list = unitsOf(ctx);
  const factions = factionIds(ctx);
  const setup = (params && params.setup) || safe(() => G.setup, null) || null;
  const S = { team: 0, tab: null, search: '', role: 'all', sel: null, mode: 'single', count: 9, countTouched: false, style: 'balanced', sheet: null };

  /* ------------------------------------------------------------ helpers */
  const arenaName = () => {
    const id = safe(() => setup.arena.presetId, null);
    const a = id && (ctx.content.arenas || []).find((x) => x.id === id);
    return (params && params.arenaName) || (a && a.name) || T.arena('Arena');
  };
  const customDefs = () => safe(() => ctx.save.soldiers.list(), []).map((cs) => safe(() => ctx.content.customDef(cs), null) || cs.def || { id: cs.id, name: cs.name, role: cs.role || 'melee', cost: cs.cost || 0, faction: 'custom', tags: [], text: {} });
  const budget = (t) => safe(() => G.info.budget(t), { spent: 0, cap: 0, left: 0 });
  const counts = (t) => safe(() => G.info.counts(t), { total: 0, cap: 0, types: 0, typeCap: 16, byType: [] });
  const defOf = (id) => units[id] || customDefs().find((d) => d.id === id);
  const setBrush = (b) => safe(() => G.tools.setBrush(b), null);
  const factionColorOf = (f) => (f === 'custom' ? '#ff7eb6' : factionColor(ctx.content.factions, f));

  /* ------------------------------------------------------------ top bar */
  const backBtn = K.button(T0.common.back, { icon: 'back', variant: 'secondary', sound: 'ui_back', id: 'pl-back', onClick: () => ctx.nav.back() });
  K.tooltip(backBtn, T.backTip);
  const helpBtn = K.iconButton('help', T.help, { id: 'pl-help', variant: 'ghost', onClick: () => showHints(0) });
  const mute = K.muteButton(); cleanups.push(() => mute.destroy && mute.destroy());
  const title = K.h('div', { class: 'vw-pl__title' }, K.h('span', { class: 'vw-pl__arena', text: arenaName() }), K.h('span', { class: 'vw-pl__sub vw-micro', text: T0.quick.armies }));
  const top = K.h('header', { class: 'vw-pl__top' }, backBtn, title, K.h('span', { class: 'vw-spacer' }), helpBtn, mute);

  /* ------------------------------------------------------------ palette */
  const tabItems = factions.map((f) => ({ id: f, label: factionName(ctx.content.factions, f), dot: factionColorOf(f) })).concat([{ id: 'custom', label: T.mine, icon: 'hammer' }]);
  S.tab = (setup && safe(() => setup.armies.A.faction, null)) && setup.armies.A.faction !== 'mixed' && factions.indexOf(setup.armies.A.faction) >= 0 ? setup.armies.A.faction : factions[0];
  const tabs = K.tabs(tabItems, { id: 'pl-faction', label: T.palette, value: S.tab, scroll: true, onChange: (id) => { S.tab = id; renderCards(); } });
  const search = K.searchBox({ id: 'pl-search', label: T.search, placeholder: T.searchPh, onInput: (v) => { S.search = v.trim().toLowerCase(); renderCards(); } });
  const roleChips = K.h('div', { class: 'vw-chips vw-pl__roles', role: 'group', 'aria-label': T.allRoles });
  const roleBtns = {};
  const roleSet = ['all'].concat(ROLES.filter((r) => list.some((u) => u.role === r)));
  for (const r of roleSet) {
    const c = K.chip(r === 'all' ? T.allRoles : ROLE_LABEL[r], { pressed: r === 'all', id: 'pl-role-' + r, onClick: () => { S.role = r; for (const k in roleBtns) roleBtns[k].setPressed(k === r); renderCards(); } });
    roleBtns[r] = c; roleChips.appendChild(c);
  }
  const cardList = K.h('div', { class: 'vw-pl__cards vw-scroll', role: 'group', 'aria-label': T.palette, id: 'pl-cards' });
  cleanups.push(K.roving(cardList, { selector: '.vw-card', orientation: 'vertical' }));
  const palette = K.h('aside', { class: 'vw-pl__pal vw-tablet vw-tablet--glass', 'aria-label': T.palette, id: 'pl-palette' },
    K.h('div', { class: 'vw-pl__pal-head' }, K.h('h2', { class: 'vw-tablet__title', text: T.palette }), K.h('button', { type: 'button', class: 'vw-pl__sheet-x', 'aria-label': T0.common.close, onclick: () => setSheet(null) }, K.icon('x'))), tabs, search, roleChips, cardList);

  const cardEls = new Map();
  function visibleDefs() {
    let defs = S.tab === 'custom' ? customDefs() : list.filter((u) => u.faction === S.tab);
    if (S.role !== 'all') defs = defs.filter((u) => u.role === S.role);
    if (S.search) defs = defs.filter((u) => (u.name + ' ' + u.role + ' ' + (u.tags || []).join(' ')).toLowerCase().indexOf(S.search) >= 0);
    return defs;
  }
  function renderCards() {
    cardEls.clear();
    const defs = visibleDefs();
    if (!defs.length) {
      cardList.replaceChildren(S.tab === 'custom' && !S.search && S.role === 'all'
        ? K.emptyState({ icon: 'hammer', title: T.mine, text: T.mineEmpty, action: { label: T0.title.workshop.name, variant: 'secondary', size: 'sm', onClick: () => ctx.nav.goto(safe(() => ctx.platform.isPhone(), false) ? 'phone_notice' : 'workshop', { editor: 'workshop' }) } })
        : K.emptyState({ icon: 'search', title: T0.common.search, text: T.noMatch }));
      return;
    }
    const frag = document.createDocumentFragment();
    for (const d of defs) {
      const c = K.card(d, { compact: true, counters: 'beats', factions: ctx.content.factions, selected: S.sel === d.id, onClick: () => pick(d) });
      c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') previewIn(d, c); });
      c.addEventListener('pointerleave', previewOut);
      c.addEventListener('focus', () => { let kb = false; try { kb = c.matches(':focus-visible'); } catch (e) { kb = false; } if (kb) previewIn(d, c); });
      c.addEventListener('blur', previewOut);
      cardEls.set(d.id, c); frag.appendChild(c);
    }
    cardList.replaceChildren(frag);
    lastSig = ''; refresh(true);
  }
  function pick(d) {
    S.sel = d.id;
    cardEls.forEach((c, id) => c.setSelected(id === d.id));
    if (!S.countTouched) { S.count = DEFAULT_COUNT[d.role] || 5; countSlider.set(S.count, true); }
    if (S.mode === 'erase' || S.mode === 'select') setMode('single');
    setBrush({ defId: d.id, team: S.team, mode: S.mode, count: S.count });
    if (matchesPhone()) setSheet(null);
  }

  /* hover turntable preview (floating, non-interactive) */
  const prevBox = K.h('div', { class: 'vw-pl__prev vw-hide', 'aria-hidden': 'true' }, K.h('div', { class: 'vw-pl__prev-stage' }), K.h('div', { class: 'vw-pl__prev-name vw-display' }), K.h('div', { class: 'vw-pl__prev-blurb vw-small' }));
  let prevTurn = null, prevTimer = 0;
  function previewIn(d, el) {
    if (!ctx.preview || typeof ctx.preview.turntable !== 'function' || matchesPhone()) return;
    clearTimeout(prevTimer);
    prevTimer = setTimeout(() => {
      previewOut();
      const stage = prevBox.querySelector('.vw-pl__prev-stage');
      prevBox.querySelector('.vw-pl__prev-name').textContent = d.name;
      prevBox.querySelector('.vw-pl__prev-blurb').textContent = (d.text && d.text.blurb) || '';
      prevBox.classList.remove('vw-hide');
      const r = el.getBoundingClientRect(), pr = palette.getBoundingClientRect();
      prevBox.style.left = Math.round(pr.right + 12) + 'px';
      prevBox.style.top = Math.round(Math.max(60, Math.min(window.innerHeight - 290, r.top + r.height / 2 - 140))) + 'px';
      try { prevTurn = ctx.preview.turntable(stage, { unitId: d.id, clip: 'idle', size: 180, interactive: false }); } catch (e) { prevTurn = null; }
    }, 260);
  }
  function previewOut() {
    clearTimeout(prevTimer);
    if (prevTurn) { try { prevTurn.destroy(); } catch (e) { /* ignore */ } prevTurn = null; }
    prevBox.classList.add('vw-hide');
  }
  cleanups.push(previewOut);

  /* ------------------------------------------------------------ tools panel */
  const teamSeg = K.segmented({ id: 'pl-team', label: T.team, value: 0, fill: true, options: [{ value: 0, label: T.teamA }, { value: 1, label: T.teamB }], onChange: (v) => { S.team = v; teamSeg.dataset.team = String(v); setBrush({ team: v }); const f = safe(() => setup.armies[v ? 'B' : 'A'].faction, null); if (f && f !== 'mixed' && f !== S.tab && factions.indexOf(f) >= 0) tabs.select(f); lastSig = ''; refresh(true); } });
  teamSeg.dataset.team = '0';
  const barA = K.progress({ id: 'pl-budget-a', tone: 'team-a', tall: true, aria: T.teamA + ' ' + T.budget });
  const barB = K.progress({ id: 'pl-budget-b', tone: 'team-b', tall: true, aria: T.teamB + ' ' + T.budget });
  const budgetBox = K.h('div', { class: 'vw-col vw-pl__budgets' }, K.h('div', { class: 'vw-label', text: T.budget }), K.h('div', { class: 'vw-pl__brow' }, K.chip('A', { variant: 'team-a' }), barA), K.h('div', { class: 'vw-pl__brow' }, K.chip('B', { variant: 'team-b' }), barB));

  const modeBtns = {};
  const modeGrid = K.h('div', { class: 'vw-pl__modes', role: 'radiogroup', 'aria-label': T.brush, id: 'pl-brush' });
  for (const m of MODES) {
    const b = K.h('button', { type: 'button', class: 'vw-pl__mode', role: 'radio', 'aria-checked': String(m === S.mode), tabindex: m === S.mode ? '0' : '-1', id: 'pl-mode-' + m, dataset: { mode: m } }, K.icon(MODE_ICON[m]), K.h('span', { text: T.brushes[m] }));
    b.addEventListener('click', () => { K.sfx('ui_click'); setMode(m); });
    K.tooltip(b, T.brushTip[m]);
    modeBtns[m] = b; modeGrid.appendChild(b);
  }
  modeGrid.addEventListener('keydown', (e) => {
    const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) return;
    e.preventDefault(); const i = MODES.indexOf(S.mode); const n = (i + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + MODES.length) % MODES.length;
    K.sfx('ui_tick'); setMode(MODES[n]); modeBtns[MODES[n]].focus();
  });
  function setMode(m) {
    S.mode = m;
    for (const k in modeBtns) { modeBtns[k].setAttribute('aria-checked', String(k === m)); modeBtns[k].tabIndex = k === m ? 0 : -1; }
    setBrush({ mode: m });
    const needs = m === 'line' || m === 'block' || m === 'scatter';
    formRow.classList.toggle('vw-hide', m !== 'block'); countRow.classList.toggle('vw-hide', !needs);
  }
  const formSel = K.select({ id: 'pl-formation', label: T.formation, value: 'block', options: (ctx.content.formations || Object.keys(T0.quick.formations)).map((k) => ({ value: k, label: T0.quick.formations[k] || k })), onChange: (v) => setBrush({ formation: v }) });
  const countSlider = K.slider({ id: 'pl-count', min: 1, max: 40, step: 1, value: S.count, label: T.count, format: (v) => String(v), valueWidth: '2.6rem', onInput: (v) => { S.count = v; S.countTouched = true; setBrush({ count: v }); } });
  const orderSeg = K.segmented({ id: 'pl-order', label: T.order, value: 'advance', class: 'vw-seg--compact', fill: true, options: ['advance', 'hold', 'retreat', 'focus'].map((k) => ({ value: k, label: T.orders[k], title: T.orderTip[k] })), onChange: (v) => setBrush({ order: v }) });
  const mirrorTog = K.toggle({ id: 'pl-mirror', label: T.mirror, value: false, onChange: (v) => setBrush({ mirror: v }) });
  const formRow = K.field(T.formation, formSel, { class: 'vw-pl__row', stack: true });
  const countRow = K.field(T.count, countSlider, { class: 'vw-pl__row', stack: true });
  formRow.classList.add('vw-hide'); countRow.classList.add('vw-hide');

  const undoBtn = K.iconButton('undo', T.undo, { id: 'pl-undo', onClick: () => { G.tools.undo(); lastSig = ''; refresh(true); } });
  const redoBtn = K.iconButton('redo', T.redo, { id: 'pl-redo', onClick: () => { G.tools.redo(); lastSig = ''; refresh(true); } });
  K.tooltip(undoBtn, `${T.undo} (Ctrl+Z)`); K.tooltip(redoBtn, `${T.redo} (Ctrl+Shift+Z)`);
  const clearBtn = K.button(T.clear, { icon: 'trash', variant: 'danger', size: 'sm', id: 'pl-clear', onClick: async () => {
    const both = await K.modal({ title: T.clearAsk.title, body: T.clearAsk.text, alert: true, icon: 'warning', dismissValue: null, focus: 'cancel',
      buttons: [{ label: T0.common.cancel, value: null, cancel: true }, { label: T.clearAsk.yes + ' ' + (S.team ? 'B' : 'A'), variant: 'danger', value: 'one' }, { label: T.clearAll, variant: 'danger', value: 'both' }] });
    if (!both) return;
    G.tools.clear(both === 'both' ? undefined : S.team); lastSig = ''; refresh(true);
  } });
  const saveBtn = K.button(T.savePreset, { icon: 'save', size: 'sm', id: 'pl-save-army', onClick: () => savePreset() });
  const loadBtn = K.button(T.loadPreset, { icon: 'folder', size: 'sm', id: 'pl-load-army', onClick: () => loadPreset() });
  const exportBtn = K.button(T.presetExport, { icon: 'upload', size: 'sm', variant: 'ghost', id: 'pl-export-army', onClick: async () => { let code = ''; try { code = String(await G.tools.exportArmy()); } catch (e) { K.toast(String(e && e.message || e), { kind: 'error' }); return; } K.copyText(code, { title: T.presetExport }); } });
  const importBtn = K.button(T.presetImport, { icon: 'download', size: 'sm', variant: 'ghost', id: 'pl-import-army', onClick: async () => {
    const txt = await K.textModal({ title: T.presetImport, ok: T0.common.apply, placeholder: 'VW1.army...', rows: 5, onSubmit: async (t) => { try { await G.tools.importArmy(t.trim()); return null; } catch (e) { return (e && e.message) || 'That code was not understood.'; } } });
    if (txt != null) { K.toast(T.importOk, { kind: 'success' }); lastSig = ''; refresh(true); }
  } });
  const styleSel = K.select({ id: 'pl-style', label: T0.quick.style, value: S.style, options: AI_STYLES.map((k) => ({ value: k, label: T0.quick.styles[k] })), onChange: (v) => { S.style = v; } });
  const fillFaction = (t) => { const f = safe(() => setup.armies[t ? 'B' : 'A'].faction, null); return f || 'mixed'; };
  const fillMine = K.button(T.autoFillMine, { icon: 'wand', size: 'sm', id: 'pl-fill-mine', onClick: () => { G.tools.autoFill(0, { style: S.style, faction: fillFaction(0), budget: budget(0).cap }); lastSig = ''; refresh(true); K.sfx('ui_place'); } });
  const fillEnemy = K.button(T.autoFillEnemy, { icon: 'wand', size: 'sm', id: 'pl-fill-enemy', onClick: () => { G.tools.autoFill(1, { style: S.style, faction: fillFaction(1), budget: budget(1).cap }); lastSig = ''; refresh(true); K.sfx('ui_place'); } });
  K.tooltip(fillMine, T.autoFillTip); K.tooltip(fillEnemy, T.autoFillTip);

  const scoutList = K.h('ul', { class: 'vw-pl__scout-list', 'aria-live': 'polite', id: 'pl-scout' });
  const section = (id, label, icon, open, ...kids) => {
    const d = K.h('details', { class: 'vw-pl__sec', id }, K.h('summary', { class: 'vw-pl__sum' }, K.icon(icon), K.h('span', { text: label }), K.icon('chevD', { class: 'vw-pl__sum-chev' })), K.h('div', { class: 'vw-pl__sec-body' }, ...kids));
    if (open) d.setAttribute('open', '');
    d.querySelector('summary').addEventListener('click', () => K.sfx('ui_tick'));
    return d;
  };
  const histBar = K.h('div', { class: 'vw-toolbar vw-pl__hist', role: 'toolbar', 'aria-label': 'History' }, undoBtn, redoBtn, clearBtn);
  const tools = K.h('aside', { class: 'vw-pl__tools vw-tablet vw-tablet--glass', 'aria-label': 'Placement tools', id: 'pl-tools' },
    K.h('div', { class: 'vw-pl__pal-head' }, K.h('h2', { class: 'vw-tablet__title', text: T.tools }), K.h('button', { type: 'button', class: 'vw-pl__sheet-x', 'aria-label': T0.common.close, onclick: () => setSheet(null) }, K.icon('x'))),
    K.h('div', { class: 'vw-pl__tools-pin' }, histBar, K.h('div', { class: 'vw-col vw-pl__top-ctl' }, K.h('div', { class: 'vw-label', text: T.team }), teamSeg, budgetBox)),
    K.h('div', { class: 'vw-pl__tools-scroll vw-scroll' },
      section('pl-sec-brush', T.brush, 'brush', true, modeGrid, formRow, countRow, K.field(T.order, orderSeg, { stack: true, class: 'vw-pl__row' }), K.field(T.mirror, mirrorTog, { class: 'vw-pl__row' })),
      section('pl-sec-army', T.presets, 'save', true,
        K.h('div', { class: 'vw-chips' }, saveBtn, loadBtn, exportBtn, importBtn),
        K.h('div', { class: 'vw-label vw-pl__lbl', text: T.autoFill }), styleSel, K.h('div', { class: 'vw-chips' }, fillMine, fillEnemy))));
  const scoutStrip = K.h('section', { class: 'vw-pl__scout-strip', 'aria-label': T.scout, id: 'pl-scout-strip' }, K.h('div', { class: 'vw-pl__scout-h' }, K.icon('eye'), K.h('span', { class: 'vw-display', text: T.scout })), scoutList);
  const mid = K.h('div', { class: 'vw-pl__mid' }, scoutStrip);

  /* ------------------------------------------------------------ bottom bar */
  const capBar = K.progress({ id: 'pl-cap', tone: 'olive', thin: false, aria: T.count_(0, 0), label: '' });
  const typeBar = K.progress({ id: 'pl-types', tone: 'sky', thin: false, aria: T.types(0, 16), label: '' });
  const fightBtn = K.button(T.fight, { id: 'pl-fight', variant: 'primary', size: 'xl', icon: 'sword', sound: 'ui_confirm', onClick: () => fight() });
  K.tooltip(fightBtn, () => (fightBtn.getAttribute('aria-disabled') === 'true' ? T.fightEmpty : T.fightTip));
  const palToggle = K.button(T.palette, { icon: 'users', id: 'pl-open-pal', class: 'vw-pl__tgl', onClick: () => setSheet(S.sheet === 'pal' ? null : 'pal') });
  const toolToggle = K.button(T.tools, { icon: 'brush', id: 'pl-open-tools', class: 'vw-pl__tgl', onClick: () => setSheet(S.sheet === 'tools' ? null : 'tools') });
  const bottom = K.h('footer', { class: 'vw-pl__bottom' },
    K.h('div', { class: 'vw-pl__tgls' }, palToggle, toolToggle),
    K.h('div', { class: 'vw-pl__counts' }, K.h('div', { class: 'vw-pl__count' }, K.h('span', { class: 'vw-label', text: T.soldiersLabel }), capBar), K.h('div', { class: 'vw-pl__count' }, K.h('span', { class: 'vw-label', text: T.typesLabel }), typeBar)),
    fightBtn);
  async function fight() {
    const a = counts(0).total, b = counts(1).total;
    if (!a || !b) { K.toast(T.fightEmpty, { kind: 'warn' }); K.sfx('ui_error'); return; }
    G.fight();
  }

  /* ------------------------------------------------------------ presets */
  async function savePreset() {
    if (!counts(S.team).total) { K.toast(T.fightEmpty, { kind: 'warn' }); return; }
    const input = K.h('input', { class: 'vw-input', id: 'pl-preset-name', type: 'text', maxlength: 32, 'aria-label': T.presetName, value: 'My Army ' + (safe(() => ctx.save.armies.list().length, 0) + 1) });
    const err = K.h('p', { class: 'vw-note vw-note--bad vw-hide', role: 'alert' });
    const res = await K.modal({ title: T.savePreset, icon: 'save', dismissValue: null, body: () => K.h('div', { class: 'vw-col' }, K.h('label', { class: 'vw-label', for: 'pl-preset-name', text: T.presetName }), input, err),
      buttons: [{ label: T0.common.cancel, value: null, cancel: true }, { label: T0.common.save, variant: 'primary', keep: true, id: 'pl-preset-ok', onClick: (api) => { const n = input.value.trim(); if (!n) { err.textContent = 'Give the army a name, even a silly one.'; err.classList.remove('vw-hide'); K.sfx('ui_error'); input.focus(); return; } api.close(n); } }] });
    if (res) { try { G.tools.saveArmy(res); K.toast(T.presetSaved(res), { kind: 'success' }); } catch (e) { K.toast(String((e && e.message) || e), { kind: 'error' }); } }
  }
  async function loadPreset() {
    const items = safe(() => ctx.save.armies.list(), []);
    const body = (api) => {
      if (!items.length) return K.emptyState({ icon: 'folder', title: T.loadPreset, text: T.presetNone });
      const ul = K.h('ul', { class: 'vw-list' });
      items.forEach((a) => {
        const row = K.h('li', { class: 'vw-pl__preset' }, K.h('div', { class: 'vw-grow' }, K.h('div', { class: 'vw-card__name', text: a.name }), K.h('div', { class: 'vw-small vw-dim', text: `${a.n || '?'} ${T0.common.units} · ${K.fmtNum(a.cost || 0)} ${T0.common.drachmae}` })),
          K.button(T0.common.load, { size: 'sm', variant: 'primary', onClick: () => api.close(a.id) }),
          K.iconButton('trash', T0.common.delete + ' ' + a.name, { variant: 'danger', onClick: async () => { if (await K.ask({ title: T0.common.delete + '?', text: a.name, yes: T0.common.delete, danger: true })) { ctx.save.armies.remove(a.id); row.remove(); } } }));
        ul.appendChild(row);
      });
      return ul;
    };
    const id = await K.modal({ title: T.loadPreset, icon: 'folder', dismissValue: null, body, buttons: [{ label: T0.common.close, value: null, cancel: true }] });
    if (id) { try { G.tools.loadArmy(id); K.toast(T.presetLoaded(safe(() => ctx.save.armies.get(id).name, ''))); lastSig = ''; refresh(true); } catch (e) { K.toast(String((e && e.message) || e), { kind: 'error' }); } }
  }

  /* ------------------------------------------------------------ refresh (poll + events, writes only on change) */
  let lastSig = '', lastScout = '';
  function refresh(force) {
    const b0 = budget(0), b1 = budget(1), c0 = counts(0), c1 = counts(1);
    const ct = S.team ? c1 : c0, bt = S.team ? b1 : b0;
    const sig = [b0.spent, b0.cap, b1.spent, b1.cap, c0.total, c1.total, c0.types, c1.types, S.team, safe(() => G.tools.canUndo(), 0), safe(() => G.tools.canRedo(), 0)].join('|');
    if (!force && sig === lastSig) return;
    lastSig = sig;
    barA.setMax(b0.cap || 1); barA.set(b0.spent, `${K.fmtNum(b0.spent)} / ${K.fmtNum(b0.cap)}`, b0.spent > b0.cap);
    barB.setMax(b1.cap || 1); barB.set(b1.spent, `${K.fmtNum(b1.spent)} / ${K.fmtNum(b1.cap)}`, b1.spent > b1.cap);
    capBar.setMax(ct.cap || 1); capBar.set(ct.total, T.count_(ct.total, ct.cap));
    typeBar.setMax(ct.typeCap || 16); typeBar.set(ct.types, T.types(ct.types, ct.typeCap || 16));
    capBar.classList.toggle('is-over', ct.cap && ct.total >= ct.cap); typeBar.classList.toggle('is-over', ct.types >= (ct.typeCap || 16));
    undoBtn.setDisabled(!safe(() => G.tools.canUndo(), false)); redoBtn.setDisabled(!safe(() => G.tools.canRedo(), false));
    const ok = c0.total > 0 && c1.total > 0;
    fightBtn.setAttribute('aria-disabled', ok ? 'false' : 'true'); fightBtn.classList.toggle('is-soft-disabled', !ok);
    const byType = {}; (ct.byType || []).forEach((x) => { byType[x.defId] = x.n; });
    const typesFull = ct.types >= (ct.typeCap || 16), capFull = ct.cap && ct.total >= ct.cap;
    cardEls.forEach((c, id) => {
      const d = defOf(id); if (!d) return;
      c.setCount(byType[id] || 0);
      let why = '';
      if (capFull) why = T.capFull(ct.cap); else if (typesFull && !byType[id]) why = T.typesFull; else if (bt.left < d.cost) why = T.cantAfford;
      c.setDisabled(!!why, why);
    });
    refreshScout();
  }
  function refreshScout() {
    let adv = []; try { adv = G.info.scout(S.team) || []; } catch (e) { adv = []; }
    const key = S.team + JSON.stringify(adv.map((a) => [a.id, a.text]));
    if (key === lastScout) return; lastScout = key;
    scoutStrip.classList.toggle('is-empty', !adv.length);
    if (!adv.length) { scoutList.replaceChildren(K.h('li', { class: 'vw-pl__adv vw-pl__adv--empty', text: T.scoutEmpty })); return; }
    scoutList.replaceChildren(...adv.map((a) => {
      const sev = a.severity || a.kind || 'tip';
      const li = K.h('li', { class: 'vw-pl__adv vw-pl__adv--' + sev },
        K.h('div', { class: 'vw-pl__adv-h' }, K.chip(sev === 'weak' ? T.scoutBad : sev === 'strong' ? T.scoutGood : T.scoutTip, { variant: sev === 'weak' ? 'danger' : sev === 'strong' ? 'olive' : 'gold' }), K.h('span', { class: 'vw-pl__adv-t', text: a.text })));
      const cs = (a.counters || []).filter((id) => units[id]);
      if (cs.length) li.appendChild(K.h('div', { class: 'vw-chips vw-pl__adv-c' }, ...cs.map((id) => K.chip(units[id].name, { variant: 'sky', id: 'pl-counter-' + id, onClick: () => { const d = units[id]; tabs.select(d.faction); S.search = ''; search.input.value = ''; S.role = 'all'; for (const k in roleBtns) roleBtns[k].setPressed(k === 'all'); renderCards(); pick(d); const c = cardEls.get(id); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); } }))));
      return li;
    }));
  }
  const iv = setInterval(() => refresh(false), 250);
  cleanups.push(() => clearInterval(iv));
  const offs = ['placement', 'placed', 'placement_changed', 'brush'].map((ev) => safe(() => G.on(ev, () => { lastSig = ''; refresh(true); }), null)).filter(Boolean);
  const offHover = safe(() => G.on('placement_hover', (p) => { if (p && p.reason) K.showTip({ x: p.sx || 0, y: p.sy || 0, text: p.reason, kind: 'bad' }); else K.hideTip(); }), null);
  cleanups.push(() => offs.forEach((f) => f()), () => { if (offHover) offHover(); K.hideTip(); });

  /* ------------------------------------------------------------ tutorial hints (dismiss permanently) */
  let hintEl = null;
  function showHints(i) {
    hideHints();
    const list2 = T.hints.list;
    if (i >= list2.length) { setSeenHint(ctx, 'placementTutorial', true); return; }
    const h = list2[i];
    const body = matchesPhone() && h.p ? h.p : h.d;
    const never = K.h('input', { type: 'checkbox', id: 'pl-hint-never', class: 'vw-pl__check' });
    hintEl = K.h('div', { class: 'vw-pl__hint vw-tablet vw-tablet--glass', role: 'dialog', 'aria-label': T.hints.title, 'aria-live': 'polite', id: 'pl-hint' },
      K.h('div', { class: 'vw-tablet__body vw-col' },
        K.h('div', { class: 'vw-row vw-between' }, K.chip(T.hints.step(i + 1, list2.length), { variant: 'gold' }), K.h('span', { class: 'vw-label', text: T.hints.title })),
        K.h('h3', { class: 'vw-card__name', text: h.t }), K.h('p', { text: body }),
        K.h('label', { class: 'vw-check vw-small', for: 'pl-hint-never' }, never, K.h('span', { text: T.hints.never })),
        K.h('div', { class: 'vw-row vw-wrapflex' },
          K.button(i + 1 < list2.length ? T0.common.next : T0.common.gotIt, { variant: 'primary', size: 'sm', id: 'pl-hint-next', onClick: () => { if (never.checked) setSeenHint(ctx, 'placementTutorial', true); showHints(i + 1); } }),
          K.button(T.hints.dismiss, { variant: 'ghost', size: 'sm', id: 'pl-hint-dismiss', sound: 'ui_back', onClick: () => { if (never.checked || i + 1 >= list2.length) setSeenHint(ctx, 'placementTutorial', true); hideHints(); } }))));
    root.appendChild(hintEl);
    K.anim(hintEl, [{ opacity: 0, transform: 'translateY(-12px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
  }
  function hideHints() { if (hintEl) { hintEl.remove(); hintEl = null; } }
  cleanups.push(hideHints);

  /* ------------------------------------------------------------ phone sheets */
  const matchesPhone = () => (window.matchMedia ? window.matchMedia('(max-width: 900px)').matches : false);
  function setSheet(which) {
    S.sheet = which;
    screen.classList.toggle('is-sheet-pal', which === 'pal'); screen.classList.toggle('is-sheet-tools', which === 'tools');
    palToggle.setPressed(which === 'pal'); toolToggle.setPressed(which === 'tools');
  }

  const screen = K.h('div', { class: 'vw-pl' }, top, palette, mid, tools, bottom, prevBox);
  root.appendChild(screen);
  cleanups.push(K.toastInset(matchesPhone() ? 11.5 : 6.4));
  renderCards(); setMode('single'); refresh(true);
  setBrush({ team: 0, mode: 'single', formation: 'block', count: S.count, order: 'advance', mirror: false });
  K.enter(palette, 'left', 0); K.enter(tools, 'right', 1); K.enter(bottom, 'fade', 3);
  if (!seenHint(ctx, 'placementTutorial')) setTimeout(() => showHints(0), 500);

  return {
    destroy() { cleanups.forEach((f) => f()); },
    onKey(e) {
      if (K.hasModal()) return false;
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return false;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) G.tools.redo(); else G.tools.undo(); lastSig = ''; refresh(true); return true; }
      if (mod && e.code === 'KeyY') { e.preventDefault(); G.tools.redo(); lastSig = ''; refresh(true); return true; }
      if (mod || e.altKey) return false;
      if (e.code === 'KeyB') { setMode(MODES[(MODES.indexOf(S.mode) + 1) % MODES.length]); K.sfx('ui_tick'); return true; }
      if (e.key === 'Delete' || e.key === 'Backspace') { setMode('erase'); return true; }
      if (e.code === 'Space') { if (document.activeElement === fightBtn) return false; e.preventDefault(); fightBtn.focus(); return true; }
      if (e.key === '?' || e.code === 'KeyH') { showHints(0); return true; }
      return false;
    },
    onBack() { if (K.hasModal()) return false; if (S.sheet) { setSheet(null); return true; } if (hintEl) { hideHints(); return true; } ctx.nav.back(); return true; },
  };
}
