// Soldier Workshop (router id `workshop`, layer editor): spec/editors.md §2. Left = parts from the registry, centre = live 3D turntable, right = Stats / Abilities /
// Colours / Personality / Voxel Paint, bottom = name, cost, Save, Use in battle, Share, Randomise, Reset.
import * as K from '../../ui/kit.js';
import { RNG } from '../../core/rng.js';
import { PART_REGISTRY, listParts } from '../../content/era_ancient/blueprints.js';
import * as C from '../../content/era_ancient/custom.js';
import { checkSoldier, ValidationError } from '../../save/validate.js';
import { ClipLib } from '../../anim/clips.js';
import { SoldierDoc, PART_TABS, SLOT_DEFS, getSlot, checkIssues } from './state.js';
import { SoldierStage, ThumbMaker } from './stage.js';
import { statsPanel, abilitiesPanel, coloursPanel, personalityPanel, paintPanel } from './panels.js';
import { partIcon } from './icons.js';
import { unlockedKeys, draftOf, roster, testInBattle, purgeSkin } from './drafts.js';
import { openShare, openImport, openLibrary, askName, openHelp } from './dialogs.js';
import { WS } from './text.js';

export const meta = { id: 'workshop', layer: 'editor', music: 'editor', canvas: 'none' };

const h = K.h;
const guard = (fn, d) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };
const plain = (o) => JSON.parse(JSON.stringify(o));
const ATTACK = { slash: 'strike_slash_1', overhead: 'strike_overhead', thrust: 'strike_thrust', bash: 'strike_bash' };
function attackClipOf(def) {
  let id = 'strike_slash_1';
  if (def.ranged) { const p = def.ranged.proj; id = p === 'arrow' ? 'shoot_bow' : p === 'sunbeam' || p === 'scepter' || p === 'thunderbolt' ? 'cast' : 'throw'; }
  else if (def.melee && ATTACK[def.melee.style]) id = ATTACK[def.melee.style];
  return ClipLib.has(id) ? id : 'strike_slash_1';
}

export function mount(root, ctx, params = {}) {
  K.init(ctx);
  const cleanups = []; let alive = true, leaving = false;
  if (guard(() => ctx.platform.isPhone() && window.innerWidth < 768, false)) { setTimeout(() => { if (alive) ctx.nav.goto('phone_notice', { editor: 'workshop' }); }, 0); return { destroy() { alive = false; } }; }
  guard(() => ctx.audio.music.setMood('editor'), null);

  const unlocked = unlockedKeys(ctx);
  const draftCh = draftOf(ctx, 'soldier');
  const rng = new RNG(((Date.now() ^ ((performance.now() * 1000) | 0)) >>> 0) || 1);
  const reduced = () => K.reduced();

  // ---------------------------------------------------------------- the document
  const asDoc = (item) => { const r = checkSoldier(item, {}); return r.ok ? plain(r.soldier) : null; };
  let initial = null, askedDraft = null;
  const dr = draftCh.load();
  if (params.id) { const it = roster.get(ctx, params.id); initial = it && asDoc(it); }
  if (!initial && (params.resume || (!params.fresh && !params.id)) && dr && dr.cs) { const d = asDoc(dr.cs); if (d) { if (params.resume) initial = d; else askedDraft = { cs: d, dirty: dr.dirty !== false }; } }
  const doc = new SoldierDoc(initial || C.newSoldier(rng), { unlocked, rng });
  if (params.resume && dr && initial) { doc.savedRef = dr.dirty === false ? doc.cs : null; }

  // ---------------------------------------------------------------- derived info (def, compile) shared by every panel
  let info = null, lastRev = '', lastColorSig = '', lastComp = null;
  function compute() {
    const ev = C.evaluate(doc.cs), def = ev.def;
    let comp = info && info.comp;
    if (!comp || def.rev !== lastRev) { comp = C.compileFromDef(def); lastRev = def.rev; }
    info = { ev, def, comp };
    return info;
  }
  const env = {
    ctx, doc, get info() { return info; },
    nextCost: (k) => C.nextPointCost(doc.cs, k), abilityCost: (id) => guard(() => C.abilityCostDelta(doc.cs, id), null),
    setTint: (m) => setTint(m), openPainter: (pid) => openPainter(pid),
  };

  // ---------------------------------------------------------------- frame + layout
  const undoBtn = K.iconButton('undo', WS.undo, { id: 'ws-undo', variant: 'secondary', onClick: () => doc.doUndo() });
  const redoBtn = K.iconButton('redo', WS.redo, { id: 'ws-redo', variant: 'secondary', onClick: () => doc.doRedo() });
  K.tooltip(undoBtn, WS.undo + ' (Ctrl+Z)'); K.tooltip(redoBtn, WS.redo + ' (Ctrl+Shift+Z)');
  const libBtn = K.button(WS.library, { icon: 'users', variant: 'secondary', id: 'ws-library', onClick: () => showLibrary() });
  const impBtn = K.button(WS.importCode, { icon: 'download', variant: 'secondary', id: 'ws-import', onClick: () => importCode() });
  const helpBtn = K.iconButton('help', WS.help, { id: 'ws-help', variant: 'ghost', onClick: () => openHelp(WS.helpTitle, WS.helpRows) });
  K.tooltip(helpBtn, WS.help + ' (?)');
  const frame = K.pageFrame({ id: 'ws', title: WS.title, sub: WS.sub, night: true, actions: [undoBtn, redoBtn, libBtn, impBtn, helpBtn], onBack: () => { if (!onBack()) ctx.nav.back(); } });
  const layout = h('div', { class: 'ws' });
  frame.content.appendChild(layout);
  frame.mount(root); cleanups.push(frame.destroy);
  root.classList.add('ws-root');

  // ---------------------------------------------------------------- left: parts
  const cur = { tab: 'head', slot: 'head.helm', search: '', silly: false };
  const catBar = h('div', { class: 'ws-cats', role: 'tablist', 'aria-label': WS.partsTitle, id: 'ws-cats' }), catBtns = {};
  for (const t of PART_TABS) {
    const b = h('button', { type: 'button', class: 'ws-cat', role: 'tab', id: 'ws-cat-' + t.id, 'aria-selected': 'false', tabindex: '-1', dataset: { tab: t.id } }, K.icon(t.icon), h('span', { text: t.label }));
    b.addEventListener('click', () => { K.sfx('ui_click'); selectTab(t.id); });
    catBtns[t.id] = b; catBar.appendChild(b);
  }
  K.roving(catBar, { selector: '.ws-cat', orientation: 'both' });
  catBar.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const b = e.target.closest && e.target.closest('.ws-cat'); if (b) { e.preventDefault(); selectTab(b.dataset.tab); } } });
  catBar.addEventListener('focusin', (e) => { const b = e.target.closest && e.target.closest('.ws-cat'); if (b && b.dataset.tab !== cur.tab && catBar.matches(':focus-within')) { /* roving only moves focus; Enter selects */ } });
  const slotSeg = h('div', { class: 'ws-slots', role: 'tablist', 'aria-label': 'Slot' });
  const search = K.searchBox({ id: 'ws-search', label: WS.searchParts, placeholder: WS.searchParts, onInput: (v) => { cur.search = v.trim().toLowerCase(); renderList(); } });
  const sillyChip = K.chip(WS.onlySilly, { pressed: false, id: 'ws-silly', onClick: () => { cur.silly = !cur.silly; sillyChip.setPressed(cur.silly); renderList(); } });
  const listEl = h('div', { class: 'ws-parts vw-scroll', role: 'listbox', 'aria-label': WS.partsTitle, id: 'ws-parts' });
  const left = K.tablet(WS.partsTitle, h('div', { class: 'ws-left__body' }, catBar, slotSeg, h('div', { class: 'ws-searchrow' }, search, sillyChip), listEl), { id: 'ws-left', class: 'ws-left', variant: 'glass', tight: true, icon: 'hammer' });

  function selectTab(id) {
    const t = PART_TABS.find((x) => x.id === id); if (!t) return;
    cur.tab = id; if (!t.slots.some((s) => s.slot === cur.slot)) cur.slot = t.slots[0].slot;
    cur.search = ''; search.input.value = ''; cur.silly = false; sillyChip.setPressed(false);
    renderCats(); renderSlots(); renderList();
  }
  function selectSlot(slot) { cur.slot = slot; cur.search = ''; search.input.value = ''; cur.silly = false; sillyChip.setPressed(false); renderSlots(); renderList(); }
  function renderCats() { for (const t of PART_TABS) { const on = t.id === cur.tab; catBtns[t.id].setAttribute('aria-selected', String(on)); catBtns[t.id].classList.toggle('is-active', on); catBtns[t.id].tabIndex = on ? 0 : -1; } }
  function renderSlots() {
    const t = PART_TABS.find((x) => x.id === cur.tab); slotSeg.replaceChildren(); slotSeg.classList.toggle('vw-hide', t.slots.length < 2);
    for (const s of t.slots) {
      const b = h('button', { type: 'button', class: 'ws-slot', role: 'tab', 'aria-selected': String(s.slot === cur.slot), id: 'ws-slot-' + s.slot.replace('.', '-'), text: s.label });
      b.addEventListener('click', () => { K.sfx('ui_click'); selectSlot(s.slot); }); slotSeg.appendChild(b);
    }
  }
  function renderList() {
    const def = SLOT_DEFS[cur.slot], bp = doc.cs.blueprint, selected = getSlot(doc.cs, cur.slot);
    const all = listParts(def.cat, unlocked);
    sillyChip.classList.toggle('vw-hide', !all.some((p) => p.meta && (p.meta.kind === 'silly' || p.locked || PART_REGISTRY[def.cat][p.id].unlock)));
    let items = all;
    if (cur.silly) items = items.filter((p) => (p.meta && p.meta.kind === 'silly') || PART_REGISTRY[def.cat][p.id].unlock);
    if (cur.search) items = items.filter((p) => (p.name + ' ' + p.id).toLowerCase().indexOf(cur.search) >= 0);
    const top = listEl.scrollTop;
    if (!all.length) { listEl.replaceChildren(K.emptyState({ icon: 'cube', title: WS.nothingHere, text: WS.nothingHereSub })); return; }
    if (!items.length) { listEl.replaceChildren(K.emptyState({ icon: 'search', title: WS.noMatch })); return; }
    const frag = document.createDocumentFragment();
    for (const p of items) {
      const on = p.id === selected;
      const ico = h('span', { class: 'ws-part__ico' }); try { ico.appendChild(partIcon(def.cat, p.id, bp, 48)); } catch (e) { /* an icon must never break the picker */ }
      const style = p.meta && p.meta.style ? C.CLASS_LABEL[p.meta.style] : '';
      const b = h('button', { type: 'button', class: ['ws-part', on && 'is-on', p.locked && 'is-locked'], role: 'option', 'aria-selected': String(on), id: 'ws-part-' + def.cat + '-' + p.id, dataset: { id: p.id, cat: def.cat }, 'aria-label': p.name + (p.locked ? ', locked. ' + p.hint : '') },
        ico, h('span', { class: 'ws-part__name', text: p.name }), style ? h('span', { class: 'ws-part__meta vw-micro', text: style + (p.meta.twoHanded ? ' · 2H' : '') }) : null, p.locked ? h('span', { class: 'ws-part__lock' }, K.icon('lock')) : null);
      if (p.locked) K.tooltip(b, p.hint);
      b.addEventListener('click', () => { if (p.locked) { K.sfx('ui_error'); K.toast(p.hint, { kind: 'warn', sound: false, ms: 2800 }); return; } K.sfx('ui_select'); doc.setSlot(cur.slot, p.id); if (doc.notes.length) { K.toast(WS.dropped(doc.notes.join(', ')), { kind: 'warn', sound: false }); doc.notes = []; } });
      frag.appendChild(b);
    }
    listEl.replaceChildren(frag); listEl.scrollTop = top;
  }

  // ---------------------------------------------------------------- centre: stage
  const stageHost = h('div', { class: 'ws-stage__view', id: 'ws-stage' });
  const hoplite = () => { const d = guard(() => ctx.content.defs.hoplite, null); if (!d) return null; const mm = guard(() => ctx.content.modelFor(d, null), null); if (!mm || !mm.model) return null; const s = d.scale || 1, v = mm.scale || [1, 1, 1]; return { model: mm.model, scale: [v[0] * s, v[1] * s, v[2] * s] }; };
  const stage = new SoldierStage(stageHost, { animator: guard(() => ctx.game.animator, undefined), palette: () => guard(() => ctx.settings.get('palette'), 'classic'), ghost: hoplite, reduceMotion: reduced, label: 'Soldier preview. Drag to turn, scroll to zoom, arrow keys to turn.' });
  cleanups.push(() => stage.destroy());
  if (!stage.ok) stageHost.appendChild(K.emptyState({ icon: 'cube', title: '3D preview unavailable', text: 'This browser did not give the Workshop a WebGL view. Everything else still works.' }));
  const clipSeg = K.segmented({ id: 'ws-clip', label: WS.clip, value: 'idle', class: 'vw-seg--compact ws-clips', options: ['idle', 'walk', 'attack', 'block', 'death', 'cheer'].map((c) => ({ value: c, label: WS.clips[c] })), onChange: (v) => setClip(v) });
  const ghostToggle = K.toggle({ id: 'ws-ghost', label: WS.ghost, value: false, onChange: (v) => { stage.setGhost(v); } });
  K.tooltip(ghostToggle, WS.ghostTip);
  const tintSeg = K.segmented({ id: 'ws-tint', label: WS.tint, value: 'a', class: 'vw-seg--compact', options: [{ value: 'a', label: WS.tintOptions.a }, { value: 'b', label: WS.tintOptions.b }, { value: 'map', label: WS.tintOptions.map }], onChange: (v) => setTint(v) });
  K.tooltip(tintSeg, WS.tintTip);
  const spinToggle = K.toggle({ id: 'ws-spin', label: WS.spin, value: true, onChange: (v) => stage.setSpin(v) });
  const hud = h('div', { class: 'ws-stage__hud' },
    h('div', { class: 'ws-hud ws-hud--tr' }, h('label', { class: 'ws-hudrow' }, h('span', { class: 'vw-micro', text: WS.ghost }), ghostToggle), h('label', { class: 'ws-hudrow' }, h('span', { class: 'vw-micro', text: WS.spin }), spinToggle), tintSeg),
    h('div', { class: 'ws-hud ws-hud--bl' }, clipSeg), h('div', { class: 'ws-hud ws-hud--tl vw-micro', text: WS.stageHint }));
  const stageBox = h('div', { class: 'ws-stage' }, stageHost, hud);
  const checks = h('div', { class: 'ws-checks', id: 'ws-checks', role: 'status', 'aria-live': 'polite' });
  const centre = h('div', { class: 'ws-centre' }, stageBox, checks);
  function setClip(v) { const def = info && info.def; let id = v; if (v === 'attack') id = def ? attackClipOf(def) : 'strike_slash_1'; else if (v === 'block') id = ClipLib.has('block_hold') ? 'block_hold' : 'block_hit'; else if (v === 'death') id = 'death_back'; stage.setClip(id); }
  function setTint(m) { tintSeg.set(m, true); stage.setTintMode(m === 'map' ? 'map' : 'off'); stage.setTeam(m === 'b' ? 1 : 0); }
  function syncClipOptions() {
    const noShield = !info.def.shield; clipSeg.setDisabled('block', noShield);
    if (noShield && clipSeg.get() === 'block') { clipSeg.set('idle', true); stage.setClip('idle'); }
    else if (clipSeg.get() === 'attack') stage.setClip(attackClipOf(info.def), true);
  }

  // ---------------------------------------------------------------- right: tabs
  const panels = { stats: statsPanel(env), abilities: abilitiesPanel(env), colours: coloursPanel(env), personality: personalityPanel(env), paint: paintPanel(env) };
  const rightTabs = K.tabs(Object.keys(panels).map((k) => ({ id: k, label: WS.tabsRight[k] })), { id: 'ws-rtabs', label: 'Soldier settings', value: 'stats', scroll: true, onChange: (id) => showPanel(id) });
  const panelHost = h('div', { class: 'ws-panelhost vw-scroll', id: 'ws-panelhost', role: 'tabpanel' });
  const right = K.tablet(null, h('div', { class: 'ws-right__body' }, rightTabs, panelHost), { id: 'ws-right', class: 'ws-right', variant: 'glass', tight: true, headless: true });
  let activePanel = 'stats';
  function showPanel(id) { activePanel = id; panelHost.replaceChildren(panels[id].el); panelHost.scrollTop = 0; if (info) panels[id].refresh(info); }

  // ---------------------------------------------------------------- bottom bar
  const nameInput = h('input', { type: 'text', class: 'vw-input ws-name', id: 'ws-name', maxlength: String(C.NAME_MAX), 'aria-label': WS.name, autocomplete: 'off', spellcheck: 'false', value: doc.cs.name });
  nameInput.value = doc.cs.name;
  nameInput.addEventListener('input', () => doc.setName(nameInput.value));
  const diceBtn = K.iconButton('dice', WS.dice, { id: 'ws-dice', variant: 'secondary', onClick: () => doc.newName() }); K.tooltip(diceBtn, WS.dice);
  const costChip = K.chip('', { variant: 'gold', icon: 'coin', id: 'ws-cost' }); costChip.setAttribute('aria-live', 'polite');
  const roleChip = K.chip('', { variant: 'sky', id: 'ws-role' });
  const randBtn = K.iconButton('dice', WS.randomise, { variant: 'secondary', id: 'ws-randomise', onClick: () => randomise() }); K.tooltip(randBtn, WS.randomise + ': ' + WS.randomiseTip + ' (R)');
  const mutBtn = K.iconButton('wand', WS.mutate, { variant: 'secondary', id: 'ws-mutate', onClick: () => mutate() }); K.tooltip(mutBtn, WS.mutate + ': ' + WS.mutateTip + ' (M)');
  const resetBtn = K.iconButton('refresh', WS.resetAll, { variant: 'secondary', id: 'ws-reset', onClick: () => doc.reset() }); K.tooltip(resetBtn, WS.resetAll + ': ' + WS.resetTip);
  const saveBtn = K.button(WS.save, { icon: 'save', variant: 'primary', id: 'ws-save', onClick: () => save() }); K.tooltip(saveBtn, WS.save + ' (Ctrl+S)');
  const battleBtn = K.button(WS.useInBattle, { icon: 'sword', variant: 'olive', id: 'ws-battle', onClick: () => useInBattle() });
  const shareBtn = K.iconButton('upload', WS.share, { variant: 'secondary', id: 'ws-share', onClick: () => shareNow() }); K.tooltip(shareBtn, WS.share + ': get a code or a file to send to a friend');
  const bottom = h('footer', { class: 'ws-bottom vw-tablet vw-tablet--glass' },
    h('div', { class: 'ws-bottom__name' }, nameInput, diceBtn), h('div', { class: 'ws-bottom__chips' }, costChip, roleChip), h('span', { class: 'vw-spacer' }),
    h('div', { class: 'ws-bottom__tools' }, randBtn, mutBtn, resetBtn), h('div', { class: 'ws-bottom__btns' }, shareBtn, battleBtn, saveBtn));
  layout.append(left, centre, right, bottom);

  // ---------------------------------------------------------------- refresh pipeline (one per animation frame)
  let raf = 0, draftDirty = false, iconTimer = 0;
  function schedule() { if (!raf && alive) raf = requestAnimationFrame(() => { raf = 0; refresh(); }); }
  function refresh() {
    if (!alive) return;
    compute();
    const cs = doc.cs, def = info.def;
    // 3D
    if (info.comp !== lastComp) { lastComp = info.comp; stage.setSoldier({ model: info.comp.compiled.model, scale: info.comp.eff }); }
    syncClipOptions();
    // bottom
    if (document.activeElement !== nameInput && nameInput.value !== cs.name) nameInput.value = cs.name;
    costChip.querySelector('span').textContent = WS.cost(def.cost); roleChip.querySelector('span').textContent = `${C.CLASS_LABEL[def.weaponStyle] || def.role} · ${def.role}`;
    undoBtn.disabled = !doc.canUndo(); redoBtn.disabled = !doc.canRedo();
    saveBtn.classList.toggle('is-dirty', doc.dirty);
    // parts list: selection + icons when colours changed
    const bp = cs.blueprint, sig = [bp.colors.primary, bp.colors.secondary, bp.colors.trim, bp.colors.cloth, bp.colors.metal, bp.body.skin, bp.body.hair, bp.emblem].join('|');
    if (sig !== lastColorSig) { lastColorSig = sig; clearTimeout(iconTimer); iconTimer = setTimeout(() => { if (alive) renderList(); }, 160); } else markSelected();
    panels[activePanel].refresh(info);
    renderChecks();
    draftDirty = true;
  }
  function markSelected() {
    const selected = getSlot(doc.cs, cur.slot);
    for (const b of listEl.querySelectorAll('.ws-part')) { const on = b.dataset.id === selected; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); }
  }
  function renderChecks() {
    const issues = checkIssues(doc.cs, info.comp.compiled ? { compiled: info.comp.compiled, def: info.def } : null, unlocked);
    const sig = JSON.stringify(issues.map((i) => i.id + i.text));
    if (sig === checks.dataset.sig) return; checks.dataset.sig = sig;
    if (!issues.length) { checks.replaceChildren(K.chip(WS.checksOk, { variant: 'olive', icon: 'check', id: 'ws-checks-ok' })); return; }
    checks.replaceChildren(...issues.slice(0, 4).map((i) => h('div', { class: 'ws-issue ws-issue--' + i.level, role: 'listitem', id: 'ws-issue-' + i.id.replace(/[^a-z0-9]+/gi, '-') }, K.icon(i.level === 'error' ? 'warning' : i.level === 'warn' ? 'warning' : 'info'), h('span', { class: 'vw-grow', text: i.text }), i.fix ? K.button(i.fix.label, { size: 'sm', variant: 'secondary', id: 'ws-fix-' + i.fix.action, onClick: () => applyFix(i.fix) }) : null)));
  }
  function applyFix(f) {
    if (f.action === 'newName') doc.newName();
    else if (f.action === 'dropOff') doc.setSlot('off', 'none');
    else if (f.action === 'addRange') doc.setStat('range', doc.cs.stats.range + f.arg);
    else if (f.action === 'swapLocked') { const def = SLOT_DEFS[f.arg]; const safeOpt = listParts(def.cat, unlocked).find((p) => !p.locked && (p.id === 'none' || p.id === 'bare')) || listParts(def.cat, unlocked).find((p) => !p.locked); if (safeOpt) doc.setSlot(f.arg, safeOpt.id); }
  }

  // ---------------------------------------------------------------- randomise / mutate
  function randomise() { doc.randomize(); toastDropped(); K.sfx('ui_drop'); }
  function mutate() { doc.mutate(); toastDropped(); K.sfx('ui_drop'); }
  function toastDropped() { if (doc.notes.length) { K.toast(WS.dropped(doc.notes.join(', ')), { kind: 'warn', sound: false }); doc.notes = []; } }

  // ---------------------------------------------------------------- save / roster / battle / share
  let thumbs = null;
  const thumbFor = (item) => { if (!thumbs) thumbs = new ThumbMaker({ animator: guard(() => ctx.game.animator, undefined), palette: () => guard(() => ctx.settings.get('palette'), 'classic') }); const c = C.compileCustom(item); return thumbs.render(c.compiled.model, c.eff, 0); };
  cleanups.push(() => { if (thumbs) thumbs.destroy(); });
  async function showProblems(errors) {
    K.sfx('ui_error');
    await K.modal({ title: WS.saveBlocked, icon: 'warning', body: () => h('div', { class: 'vw-col' }, h('p', { text: WS.saveBlockedSub }), h('ul', { class: 'ws-list ws-list--bad' }, ...errors.slice(0, 8).map((e) => h('li', { text: e })))), buttons: [{ label: 'OK', variant: 'primary', value: true }] });
  }
  /** Validate, thumbnail and store the soldier. Returns the stored item or null. */
  async function save({ quiet } = {}) {
    const r = checkSoldier(doc.cs, { unlocked });
    if (!r.ok) { await showProblems(r.errors); return null; }
    const item = plain(r.soldier); item.thumb = guard(() => thumbFor(item), '') || undefined; item.savedAt = Date.now();
    const isNew = !roster.get(ctx, item.id);
    const put = roster.put(ctx, item);
    if (!put.ok) { K.sfx('ui_error'); await K.modal({ title: WS.libraryTitle, icon: 'warning', body: WS.libraryFull, buttons: [{ label: 'Open the roster', variant: 'primary', value: 'lib' }, { label: 'Close', variant: 'secondary', value: null, cancel: true }] }).then((v) => { if (v === 'lib') showLibrary(); }); return null; }
    doc.markSaved(); draftCh.clear(); draftDirty = false;
    if (!quiet) { K.toast(isNew ? WS.saved(item.name) : WS.saved(item.name), { kind: 'success' }); K.sfx('ui_confirm'); }
    return item;
  }
  let busy = false;
  async function useInBattle() {
    if (busy) return; busy = true; battleBtn.setDisabled(true);
    try {
      const item = await save({ quiet: true }); if (!item) return;
      if (!alive) return;
      K.toast(WS.saveFirst, { kind: 'info', sound: false, ms: 1600 });
      const ok = await testInBattle(ctx, item, C.customDef(item));
      if (!ok && alive) K.toast(WS.battleFail, { kind: 'error' });
    } catch (e) { guard(() => ctx.diag.error('workshop', String(e && e.message)), null); if (alive) K.toast(WS.battleFail, { kind: 'error' }); }
    finally { busy = false; if (alive) battleBtn.setDisabled(false); }
  }
  async function shareNow() { const r = checkSoldier(doc.cs, { unlocked }); if (!r.ok) { await showProblems(r.errors); return; } await openShare(ctx, plain(r.soldier)); }
  async function importCode() {
    const got = await openImport(ctx, { unlocked, makeThumb: (s) => guard(() => thumbFor(s), '') });
    if (!got) return;
    const item = plain(got); const taken = new Set(roster.list(ctx).map((x) => x.id));
    if (taken.has(item.id)) { item.id = C.freshId(rng, taken); }
    item.thumb = guard(() => thumbFor(item), '') || undefined; item.savedAt = Date.now();
    const put = roster.put(ctx, item);
    if (!put.ok) { K.sfx('ui_error'); K.toast(WS.libraryFull, { kind: 'error' }); return; }
    K.toast(WS.imported(item.name), { kind: 'success' }); loadItem(item);
  }
  function loadItem(item) { const d = asDoc(item); if (!d) { K.toast('That soldier could not be opened.', { kind: 'error' }); return; } doc.load(d, { saved: true }); nameInput.value = d.name; lastRev = ''; schedule(); }
  async function confirmDiscard(ask) { if (!doc.dirty) return true; return K.ask({ title: ask.title, text: ask.text, yes: ask.yes, no: ask.no, danger: false }); }
  async function showLibrary() {
    await openLibrary({
      ctx, list: () => roster.list(ctx), thumbFor: (it) => { const u = guard(() => thumbFor(it), ''); if (u) roster.put(ctx, Object.assign({}, it, { thumb: u })); return u; },
      edit: async (it) => { if (await confirmDiscard(WS.discardAsk)) loadItem(it); },
      duplicate: (it) => { const copy = plain(it); copy.id = C.freshId(rng, new Set(roster.list(ctx).map((x) => x.id))); copy.name = (it.name + ' II').slice(0, C.NAME_MAX); copy.blueprint = Object.assign({}, copy.blueprint, { name: copy.name }); copy.savedAt = Date.now(); const put = roster.put(ctx, copy); if (!put.ok) K.toast(WS.libraryFull, { kind: 'error' }); else K.toast(WS.duplicated(copy.name), { kind: 'success' }); },
      rename: async (it) => { const n = await askName(WS.renameTitle, it.name, WS.renameOk); if (n) { roster.put(ctx, Object.assign({}, it, { name: n, blueprint: Object.assign({}, it.blueprint, { name: n }) })); if (doc.cs.id === it.id) doc.setName(n); } },
      remove: async (it) => { const a = WS.deleteAsk(it.name); const yes = await K.ask({ title: a.title, text: a.text, yes: a.yes, no: a.no, danger: true }); if (yes) { roster.remove(ctx, it.id); K.toast(WS.deleted(it.name), { kind: 'info' }); } },
      share: async (it) => { await openShare(ctx, plain(it)); },
      use: async (it) => { if (busy) return; busy = true; try { K.toast(WS.saveFirst, { kind: 'info', sound: false, ms: 1200 }); await testInBattle(ctx, it, C.customDef(it)); } catch (e) { if (alive) K.toast(WS.battleFail, { kind: 'error' }); } finally { busy = false; } },
      createNew: async () => { if (await confirmDiscard(WS.newAsk)) { doc.load(C.newSoldier(rng), { saved: false }); doc.savedRef = null; draftDirty = true; nameInput.value = doc.cs.name; } },
    });
  }

  // ---------------------------------------------------------------- draft autosave (every 20 s) and the painter hand-over
  function flushDraft(force) { if (!(draftDirty || force)) return; draftDirty = false; if (doc.dirty) draftCh.save({ v: 1, cs: doc.cs, dirty: true, savedAt: Date.now() }); else if (force) draftCh.save({ v: 1, cs: doc.cs, dirty: false, savedAt: Date.now() }); }
  const draftTimer = setInterval(() => flushDraft(false), 20000); cleanups.push(() => clearInterval(draftTimer));
  function openPainter(pid) { flushDraft(true); leaving = true; ctx.nav.goto('painter', { part: pid || undefined, from: 'workshop' }); }

  // ---------------------------------------------------------------- keyboard
  const onKeyDown = (e) => {
    if (!alive || K.hasModal()) return;
    const t = e.target, editable = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    const mod = e.ctrlKey || e.metaKey, key = e.key, code = e.code;
    const eat = () => { e.preventDefault(); e.stopPropagation(); };
    if (mod && code === 'KeyZ' && !editable) { eat(); if (e.shiftKey) doc.doRedo(); else doc.doUndo(); return; }
    if (mod && code === 'KeyY' && !editable) { eat(); doc.doRedo(); return; }
    if (mod && code === 'KeyS') { eat(); save(); return; }
    if (editable || mod || e.altKey) return;
    if (key === '?' || (e.shiftKey && code === 'Slash')) { eat(); openHelp(WS.helpTitle, WS.helpRows); }
    else if (code === 'KeyR') { eat(); randomise(); } else if (code === 'KeyM') { eat(); mutate(); }
    else if (code === 'BracketLeft' || code === 'BracketRight') { eat(); const i = PART_TABS.findIndex((x) => x.id === cur.tab), n = (i + (code === 'BracketRight' ? 1 : -1) + PART_TABS.length) % PART_TABS.length; selectTab(PART_TABS[n].id); }
    else if (/^Digit[1-5]$/.test(code)) { eat(); const id = Object.keys(panels)[+code.slice(5) - 1]; if (id) { rightTabs.select(id); } }
    else if (code === 'Space' && (!t || t === document.body || t === stage.canvas)) { eat(); spinToggle.set(!spinToggle.get()); }
  };
  window.addEventListener('keydown', onKeyDown, true); cleanups.push(() => window.removeEventListener('keydown', onKeyDown, true));

  // ---------------------------------------------------------------- navigation guard
  function onBack() {
    if (K.hasModal()) return false;
    if (doc.dirty && !leaving) {
      K.ask({ title: WS.discardAsk.title, text: WS.discardAsk.text, yes: WS.discardAsk.yes, no: WS.discardAsk.no }).then((yes) => { if (yes && alive) { flushDraft(true); leaving = true; ctx.nav.back(); } });
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- start
  doc.onChange(() => { schedule(); });
  renderCats(); renderSlots(); renderList(); showPanel('stats'); compute(); refresh(); setTint('a');
  K.enter([left, centre, right, bottom], 'fade', 0);
  if (askedDraft) {
    setTimeout(async () => {
      if (!alive) return;
      const yes = await K.ask({ title: WS.draftAsk.title, text: WS.draftAsk.text, yes: WS.draftAsk.yes, no: WS.draftAsk.no });
      if (!alive) return;
      if (yes) { doc.load(askedDraft.cs, { saved: false }); doc.savedRef = askedDraft.dirty ? null : doc.cs; nameInput.value = doc.cs.name; lastRev = ''; schedule(); } else draftCh.clear();
    }, 250);
  }
  if (params.part) { /* the painter returns with a part focus only for its own use */ }
  // a test hook for the browser harness (data only)
  guard(() => { window.__ws = { doc, get info() { return info; }, stage, env }; }, null);
  return {
    destroy() { alive = false; cancelAnimationFrame(raf); clearTimeout(iconTimer); flushDraft(false); cleanups.forEach((f) => guard(f, null)); guard(() => { delete window.__ws; }, null); },
    onBack,
  };
}
