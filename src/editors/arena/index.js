// Arena Builder screen (router id `arena_builder`, layer 'editor'): the complete editor of docs/spec/editors.md section 1. Layout: 3D viewport in the
// centre (host.js shared with the Voxel Painter), left toolbar of 16 tools, right inspector (Tool | Checks), bottom bar (size, name, Undo / Redo,
// Save, Share, Playtest). Edits go through an EditSession (undo, validators, autosave drafts); Playtest starts a Quick-battle-like session on the
// edited arena through ctx.game and comes back to the builder with the edits intact.

import * as K from '../../ui/kit.js';
import { newArenaFrom, EditSession } from './session.js';
import { createController } from './controller.js';
import { EditorView } from './view3d.js';
import { PropThumbs } from './thumbs.js';
import { buildToolPanel, buildChecksPanel } from './panels.js';
import { validateArena } from './validate.js';
import { applyFix } from './fixes.js';
import { libraryFor, draftFor, makeDraft, readDraft, looksLikeDraft } from './library.js';
import { openLibrary, exportDialog, importDialog, showShortcuts, askLeave, askResize, askName, askDiscardForNew, offerDraft, arenaFromTemplate } from './dialogs.js';
import { getS } from './strings.js';
import { defaultState } from './state.js';
import { eicon } from './icons.js';
import { TOOLS, TOOL_BY_ID, AUTOSAVE_MS, LIMITS, SIZE_ORDER, OBJECTIVE_BY_ID } from './consts.js';
import { SIZES } from '../../world/arena.js';

export const meta = { id: 'arena_builder', layer: 'editor', music: 'editor', canvas: 'scene' };

/** Survives screen remounts within a page session: the live document while a playtest is running (and its camera). */
let LIVE = null;

const safe = (fn, d) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };
/** Icon-only button with one of the builder's own glyphs (the kit builds buttons from its icon set only). */
function glyphButton(name, aria, o) { const b = K.iconButton('cube', aria, o); const old = b.querySelector('.vw-btn__icon'); if (old) old.replaceWith(eicon(name, { class: 'vw-btn__icon' })); return b; }

export function mount(root, ctx, params) {
  K.init(ctx);
  const S = getS(ctx), cleanups = [];
  const host = ctx.editorHost;
  // editors.md §0: tablet and up = at least 768 px wide (the shell's isPhone() also flags short desktop windows such as 960x540, which still have room); a landscape phone is too short for the panels
  const phone = window.innerWidth < 768 || window.innerHeight < 480;
  if (phone || !host) {
    // phones (and a build without the editor host) get the friendly notice instead of a dead editor
    if (phone) { setTimeout(() => ctx.nav.goto('phone_notice', { editor: 'arena_builder' }), 0); return { destroy() {} }; }
    root.appendChild(K.h('div', { class: 'vw-ed__fallback' }, K.tablet(S.phone.title, K.h('div', { class: 'vw-col' }, K.h('p', { text: S.phone.text }), K.button(S.common.back, { icon: 'back', id: 'ed-fallback-back', onClick: () => ctx.nav.goto('title') })), { icon: 'info', variant: 'gold' })));
    return { destroy() {}, onBack() { ctx.nav.goto('title'); return true; } };
  }

  // ------------------------------------------------------------------------------------------------ app object shared with panels / controller / dialogs
  const resume = !!(LIVE && LIVE.session && (LIVE.pending || (params && params.resume)));
  const session = resume ? LIVE.session : new EditSession(newArenaFrom('arenalab', 'medium', 1, S.untitled));
  const lib = libraryFor(ctx), draft = draftFor(ctx), thumbs = new PropThumbs(56);
  const st = defaultState();
  if (resume && LIVE.st) Object.assign(st, LIVE.st, { props: Object.assign({}, st.props, LIVE.st.props, { selected: null }), hazard: Object.assign({}, LIVE.st.hazard, { selected: null }), marker: Object.assign({}, LIVE.st.marker, { selected: null }) });
  const app = { ctx, K, S, st, session, host, lib, draft, thumbs, view: null, ctl: null, issues: null, brushWidgets: null };
  Object.defineProperty(app, 'modalOpen', { get: () => K.hasModal() });
  app.toast = (text, kind) => { try { K.toast(text, { kind: kind || 'info', ms: 2600 }); } catch (e) { /* ignore */ } };
  app.sfx = (c) => K.sfx(c);
  let alive = true;

  // ------------------------------------------------------------------------------------------------ DOM skeleton
  const $ = (id) => root.querySelector('#' + id);
  const toolBtns = new Map();
  const toolbar = K.h('nav', { class: 'vw-ed__tools', role: 'toolbar', 'aria-label': S.toolbar, 'aria-orientation': 'vertical', id: 'ed-tools' });
  const grid = K.h('div', { class: 'vw-ed__toolgrid' });
  for (const t of TOOLS) {
    const nm = S.tools[t.id].name, kbdLabel = K.keyLabel(t.key);
    const b = K.h('button', { type: 'button', class: 'vw-ed__tool', id: 'ed-tool-' + t.id, 'aria-label': `${nm} (${kbdLabel})`, 'aria-pressed': 'false', dataset: { tool: t.id, group: t.group } }, eicon(t.icon), K.h('span', { class: 'vw-ed__tool-k', 'aria-hidden': 'true', text: kbdLabel }));
    b.addEventListener('click', () => { K.sfx('ui_click'); app.ctl.setTool(t.id); });
    K.tooltip(b, `${nm} [${kbdLabel}]: ${S.tools[t.id].tip}`);
    toolBtns.set(t.id, b); grid.appendChild(b);
    if (t.id === 'stamp' || t.id === 'markers' || t.id === 'zones') b.classList.add('is-group-end');
  }
  toolbar.appendChild(grid);
  K.roving(grid, { selector: '.vw-ed__tool', orientation: 'both' });

  // top bar
  const backBtn = K.button(S.common.back, { icon: 'back', variant: 'secondary', sound: 'ui_back', id: 'ed-back', class: 'vw-ed__lbl-n', onClick: () => app.leave() });
  K.tooltip(backBtn, S.bar.back);
  const titleName = K.h('span', { class: 'vw-ed__title-name', id: 'ed-title-name' });
  const dirtyDot = K.h('span', { class: 'vw-ed__dirty vw-hide', id: 'ed-dirty', role: 'img', 'aria-label': S.status.unsaved });
  const title = K.h('div', { class: 'vw-ed__title' }, K.h('span', { class: 'vw-ed__title-k vw-micro', text: S.title }), K.h('span', { class: 'vw-ed__title-row' }, titleName, dirtyDot));
  const newBtn = K.button(S.bar.new, { icon: 'plus', variant: 'secondary', id: 'ed-new', class: 'vw-ed__lbl', onClick: () => app.openLibrary('templates') });
  K.tooltip(newBtn, S.dialogs.newTitle);
  const libBtn = K.button(S.bar.open, { icon: 'folder', variant: 'secondary', id: 'ed-library-btn', class: 'vw-ed__lbl', onClick: () => app.openLibrary('mine') });
  K.tooltip(libBtn, S.dialogs.libTitle);
  const statusBtn = K.button(S.checks.ready, { icon: 'check', variant: 'olive', id: 'ed-status', aria: S.checks.title, class: 'vw-ed__status', onClick: () => app.showChecks() });
  const statusLabel = { set textContent(t) { statusBtn.setLabel(t); }, get textContent() { const l = statusBtn.querySelector('.vw-btn__label'); return l ? l.textContent : ''; } };
  const topBtn = glyphButton('top', S.bar.topdown, { id: 'ed-topdown', variant: 'secondary', onClick: () => app.toggleTopDown() }); K.tooltip(topBtn, `${S.bar.topdown} [T]`);
  const frameBtn = glyphButton('target', S.bar.frame, { id: 'ed-frame', variant: 'secondary', onClick: () => app.frameArena() }); K.tooltip(frameBtn, `${S.bar.frame} [F]`);
  const overBtn = glyphButton('layers', S.bar.overlays, { id: 'ed-overlays', variant: 'secondary', pressed: true, onClick: () => { st.overlays = !st.overlays; app.view.setOverlays(st.overlays); overBtn.setPressed(st.overlays); } }); K.tooltip(overBtn, S.bar.overlays);
  const helpBtn = K.iconButton('help', S.bar.help, { id: 'ed-help', variant: 'ghost', onClick: () => app.showShortcuts() }); K.tooltip(helpBtn, `${S.bar.help} [?]`);
  const mute = K.muteButton(); cleanups.push(() => mute.destroy && mute.destroy());
  const top = K.h('header', { class: 'vw-ed__top' }, backBtn, title, K.h('span', { class: 'vw-spacer' }), newBtn, libBtn, statusBtn, K.h('div', { class: 'vw-ed__camtools', role: 'group', 'aria-label': 'Camera' }, topBtn, frameBtn, overBtn), helpBtn, mute);

  // viewport + overlays
  const hintEl = K.h('div', { class: 'vw-ed__hint', id: 'ed-hint', 'aria-live': 'off' });
  const readoutEl = K.h('div', { class: 'vw-ed__coords vw-nums', id: 'ed-coords', 'aria-hidden': 'true' });
  const symChip = K.h('div', { class: 'vw-ed__symchip vw-hide', id: 'ed-symchip' });
  const touchBar = K.h('div', { class: 'vw-ed__touch', id: 'ed-touchbar', role: 'toolbar', 'aria-label': 'Touch helpers' });
  const viewEl = K.h('main', { class: 'vw-ed__view', id: 'ed-view', tabindex: '0', role: 'application', 'aria-label': S.view.viewport }, hintEl, readoutEl, symChip, touchBar);

  // inspector
  const tabs = K.tabs([{ id: 'tool', label: S.checks.tool, icon: 'brush' }, { id: 'checks', label: S.checks.tab, icon: 'check', badge: 0 }], { value: st.panelTab, label: 'Inspector', id: 'ed-insp-tabs', onChange: (id) => app.showTab(id) });
  const inspHead = K.h('div', { class: 'vw-ed__insp-h' }, K.h('span', { class: 'vw-ed__insp-i', id: 'ed-insp-icon' }), K.h('h2', { class: 'vw-ed__insp-t', id: 'ed-insp-title' }), K.h('span', { class: 'vw-ed__insp-hint vw-small', id: 'ed-insp-hint' }));
  const inspBody = K.h('div', { class: 'vw-ed__insp-body vw-scroll', id: 'ed-insp-body' });
  const insp = K.h('aside', { class: 'vw-ed__insp vw-tablet vw-tablet--glass', id: 'ed-insp', 'aria-label': 'Inspector' }, tabs, inspHead, inspBody);

  // bottom bar
  const sizeSeg = K.segmented({ id: 'ed-size', label: S.bar.size, value: sizeKeyOf(session.arena.size), options: SIZE_ORDER.map((k) => ({ value: k, label: S.bar.sizes[k], sub: S.bar.sizeSub[k] })), onChange: (v) => app.changeSize(v) });
  const nameIn = K.h('input', { class: 'vw-input vw-ed__name', id: 'ed-name', type: 'text', maxlength: LIMITS.nameMax, 'aria-label': S.bar.name, value: session.arena.name, autocomplete: 'off', spellcheck: 'false' });
  nameIn.addEventListener('input', () => { session.setName(nameIn.value); app.syncName(nameIn); });
  const undoBtn = K.iconButton('undo', S.bar.undo, { id: 'ed-undo', onClick: () => app.undo() }); K.tooltip(undoBtn, `${S.bar.undoTip} [Ctrl+Z]`);
  const redoBtn = K.iconButton('redo', S.bar.redo, { id: 'ed-redo', onClick: () => app.redo() }); K.tooltip(redoBtn, `${S.bar.redoTip} [Ctrl+Shift+Z]`);
  const saveBtn = K.button(S.bar.save, { icon: 'save', id: 'ed-save', class: 'vw-ed__lbl', onClick: () => app.save() }); K.tooltip(saveBtn, `${S.bar.saveTip} [Ctrl+S]`);
  const shareBtn = K.button(S.bar.share, { icon: 'upload', id: 'ed-share', class: 'vw-ed__lbl', onClick: () => app.share() }); K.tooltip(shareBtn, S.bar.shareTip);
  const playBtn = K.button(S.bar.playtest, { icon: 'sword', variant: 'primary', id: 'ed-playtest', onClick: () => app.playtest() });
  K.tooltip(playBtn, () => (playBtn.getAttribute('aria-disabled') === 'true' ? S.bar.playtestBlocked : `${S.bar.playtestTip} [Ctrl+Enter]`));
  const bottom = K.h('footer', { class: 'vw-ed__bottom' }, K.h('div', { class: 'vw-ed__bar-size' }, sizeSeg), K.h('div', { class: 'vw-ed__bar-name' }, nameIn), K.h('div', { class: 'vw-ed__hist', role: 'group', 'aria-label': 'History' }, undoBtn, redoBtn), K.h('span', { class: 'vw-spacer' }), saveBtn, shareBtn, playBtn);

  const phoneNote = K.h('div', { class: 'vw-ed__tiny' }, K.tablet(S.phone.title, K.h('p', { text: S.phone.text }), { icon: 'info', variant: 'gold' }));
  const screen = K.h('div', { class: 'vw-ed', id: 'ed-root' }, top, toolbar, viewEl, insp, bottom, phoneNote);
  root.appendChild(screen);
  K.enter([toolbar], 'left', 0); K.enter([insp], 'right', 1); K.enter([bottom], 'fade', 2);

  // ------------------------------------------------------------------------------------------------ 3D host, view, controller
  host.show({ arena: session.arena });
  app.view = new EditorView(host, session);
  app.thumbs.onReady(() => {});
  app.ctl = createController(app);
  cleanups.push(host.onFrame((dt) => app.ctl.frame(dt)));
  let fitPending = !(resume && LIVE.cam);
  function insets() {
    const r = root.getBoundingClientRect(), v = viewEl.getBoundingClientRect();
    const ins = { left: Math.max(0, v.left - r.left), right: Math.max(0, r.right - v.right), top: Math.max(0, v.top - r.top), bottom: Math.max(0, r.bottom - v.bottom) };
    host.setInsets(ins);
    // the first real measurement arrives after layout: fit the arena to the free area once (a manual camera move is never overridden)
    if (fitPending && ins.left + ins.right > 40 && ins.top + ins.bottom > 20) { fitPending = false; host.frame({ mode: host.rig.mode === 'topdown' ? 'top' : 'oblique' }); }
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => insets()) : null; if (ro) ro.observe(viewEl);
  window.addEventListener('resize', insets); cleanups.push(() => { window.removeEventListener('resize', insets); if (ro) ro.disconnect(); });
  setTimeout(insets, 0); insets();
  if (resume && LIVE.cam) { const r = host.rig; Object.assign(r, LIVE.cam); r.snap(); } else host.frame({ mode: 'oblique' });   // after the insets, so the arena fits the free area

  // pointer events
  viewEl.addEventListener('pointerdown', (e) => { if (K.hasModal()) return; try { viewEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } viewEl.focus({ preventScroll: true }); app.ctl.onDown(e); });
  viewEl.addEventListener('pointermove', (e) => app.ctl.onMove(e));
  viewEl.addEventListener('pointerup', (e) => app.ctl.onUp(e));
  viewEl.addEventListener('pointercancel', (e) => app.ctl.onUp(e));
  viewEl.addEventListener('pointerenter', (e) => app.ctl.onEnter(e));
  viewEl.addEventListener('pointerleave', () => app.ctl.onLeave());
  viewEl.addEventListener('wheel', (e) => app.ctl.onWheel(e), { passive: false });
  viewEl.addEventListener('contextmenu', (e) => e.preventDefault());

  // keyboard (capture, so the game's global handlers never see editor keys)
  const typing = (t) => t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable || (t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'checkbox' && t.type !== 'button'));
  function onKeyDown(e) {
    if (!alive || K.hasModal()) return;
    const t = e.target;
    if (typing(t)) { if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); e.stopPropagation(); app.save(); } return; }
    if (t && t.tagName === 'INPUT' && t.type === 'range' && /^Arrow/.test(e.code)) return;
    if (e.code === 'Escape') { if (app.ctl.cancel()) { e.preventDefault(); e.stopPropagation(); } return; }
    if (e.repeat && !/^(Key[WASDQE]|Arrow)/.test(e.code)) { /* holding keys still repeats camera moves only */ }
    if (app.ctl.onKeyDown(e)) { e.preventDefault(); e.stopPropagation(); }
  }
  function onKeyUp(e) { app.ctl.onKeyUp(e); }
  window.addEventListener('keydown', onKeyDown, true); window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', () => app.ctl.clearKeys());
  cleanups.push(() => { window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('keyup', onKeyUp, true); });

  // ------------------------------------------------------------------------------------------------ app actions
  function sizeKeyOf(cells) { return SIZE_ORDER.find((k) => SIZES[k] === cells) || null; }
  app.setReadout = (txt) => { readoutEl.textContent = txt; };
  app.syncName = (from) => { if (from !== nameIn) nameIn.value = session.arena.name; if (app.infoName && from !== app.infoName) app.infoName.value = session.arena.name; paintTitle(); scheduleValidate(); };
  function paintTitle() {
    titleName.textContent = session.arena.name || S.untitled;
    dirtyDot.classList.toggle('vw-hide', !session.dirty);
    dirtyDot.setAttribute('aria-label', session.dirty ? S.status.unsaved : S.status.saved);
  }
  function paintHistory() { undoBtn.setDisabled(!session.undo.canUndo()); redoBtn.setDisabled(!session.undo.canRedo()); }
  function paintSymmetry() { const m = session.symmetry; symChip.classList.toggle('vw-hide', m === 'off'); symChip.textContent = S.symmetry.modes[m] || ''; }
  function paintSize() { sizeSeg.set(sizeKeyOf(session.arena.size), true); }

  app.onToolChanged = (id) => {
    for (const [k, b] of toolBtns) b.setAttribute('aria-pressed', String(k === id));
    hintEl.textContent = S.tools[id].hint;
    if (st.panelTab !== 'tool') { st.panelTab = 'tool'; tabs.select('tool', { silent: true }); }
    renderToolPanel();
    app.view.setActiveZone(st.zoneKey, id);
  };
  function paintInspHead() {
    const t = TOOL_BY_ID[st.tool];
    $('ed-insp-icon').replaceChildren(st.panelTab === 'checks' ? eicon('layers') : eicon(t.icon));
    $('ed-insp-title').textContent = st.panelTab === 'checks' ? S.checks.title : S.tools[st.tool].name;
    $('ed-insp-hint').textContent = st.panelTab === 'checks' ? S.checks.blocksPlaytest : S.tools[st.tool].tip;
  }
  let curPanel = null;
  function clearPanel() { if (curPanel && curPanel.destroy) curPanel.destroy(); curPanel = null; app.onFlattenTarget = app.onRampState = app.onStampRot = app.onPropSelection = app.onHazardSelection = app.onMarkerSelection = app.onPropRot = app.onPropScale = null; app.brushWidgets = null; }
  function renderToolPanel() {
    clearPanel(); paintInspHead();
    curPanel = buildToolPanel(app, st.tool);
    inspBody.replaceChildren(curPanel.el); inspBody.scrollTop = 0;
  }
  let checks = null;
  function renderChecksPanel() {
    clearPanel(); paintInspHead();
    checks = buildChecksPanel(app); curPanel = checks;
    inspBody.replaceChildren(checks.el); inspBody.scrollTop = 0;
    if (app.issues) checks.update(app.issues);
  }
  app.showTab = (id) => { st.panelTab = id; if (tabs.value !== id) tabs.select(id, { silent: true }); if (id === 'checks') { runValidate(); renderChecksPanel(); } else renderToolPanel(); };
  app.showChecks = () => { K.sfx('ui_panel_open'); app.showTab('checks'); };
  app.syncBrushWidgets = () => {
    const w = app.brushWidgets; if (!w) return;
    if (w.radius) w.radius.set(st.brush.radius, true); if (w.strength) w.strength.set(Math.round(st.strengths[st.tool] * 10), true); if (w.shape) w.shape.set(st.brush.shape, true); if (w.fall) w.fall.set(st.brush.falloff, true);
  };

  // validation (debounced; a few ms on small arenas, tens on large ones)
  let vTimer = 0;
  function runValidate() {
    vTimer = 0;
    if (!alive) return;
    const res = validateArena(session.arena, { objective: session.objective });
    app.issues = res;
    const n = res.issues.length;
    statusBtn.className = statusBtn.className.replace(/vw-btn--(olive|danger|primary|secondary)/g, '').trim() + ' vw-btn--' + (res.errors ? 'danger' : res.warnings ? 'primary' : 'olive');
    statusLabel.textContent = res.errors ? S.checks.errors(res.errors) : res.warnings ? S.checks.warnings(res.warnings) : S.checks.ready;
    const ic = statusBtn.querySelector('.vw-btn__icon'); if (ic) ic.replaceWith(eicon(res.errors || res.warnings ? 'hazards' : 'info', { class: 'vw-btn__icon' }));
    statusBtn.setAttribute('aria-label', `${S.checks.title}: ${statusLabel.textContent}`);
    tabs.setBadge('checks', n || null);
    playBtn.setAttribute('aria-disabled', res.canPlaytest ? 'false' : 'true'); playBtn.classList.toggle('is-soft-disabled', !res.canPlaytest);
    if (st.panelTab === 'checks' && checks) checks.update(res);
  }
  function scheduleValidate() { if (!alive) return; clearTimeout(vTimer); vTimer = setTimeout(runValidate, 280); }
  app.afterEdit = () => { paintTitle(); paintHistory(); scheduleValidate(); };
  app.validateNow = () => { clearTimeout(vTimer); runValidate(); return app.issues; };

  const offSession = session.on((e) => {
    switch (e.kind) {
      case 'history': paintHistory(); break;
      case 'objective': app.view.setHighlight(OBJECTIVE_BY_ID[session.objective].markers); paintTitle(); scheduleValidate(); break;
      case 'symmetry': paintSymmetry(); break;
      case 'all': app.view.setHighlight(OBJECTIVE_BY_ID[session.objective].markers); paintSize(); nameIn.value = session.arena.name; app.view.setSelection(null); st.props.selected = null; st.hazard.selected = null; st.marker.selected = null; paintTitle(); scheduleValidate(); host.rig.setArena(session.arena); break;
      case 'meta': paintTitle(); if (e.saved) paintTitle(); break;
      case 'terrain': if (!e.live) { paintTitle(); } scheduleValidate(); break;
      default: paintTitle(); scheduleValidate(); break;
    }
  });
  cleanups.push(offSession);

  app.undo = () => { const c = session.undo.done[session.undo.done.length - 1]; if (!c) { app.toast(S.toast.nothingUndo); K.sfx('ui_error'); return; } session.undo.undo(); K.sfx('ui_back'); app.toast(S.toast.undo(c.label || ''), 'info'); app.afterEdit(); };
  app.redo = () => { const c = session.undo.undone[session.undo.undone.length - 1]; if (!c) { app.toast(S.toast.nothingRedo); K.sfx('ui_error'); return; } session.undo.redo(); K.sfx('ui_confirm'); app.toast(S.toast.redo(c.label || ''), 'info'); app.afterEdit(); };
  app.toggleTopDown = () => { const r = host.rig; st.top = r.mode !== 'topdown'; r.setMode(st.top ? 'topdown' : 'orbit'); topBtn.setPressed(st.top); K.sfx('ui_tick'); };
  app.frameArena = () => { host.frame({ mode: host.rig.mode === 'topdown' ? 'top' : 'oblique' }); K.sfx('ui_tick'); };
  app.showShortcuts = () => showShortcuts(app);
  app.previewMusic = () => { try { const e = session.arena.env; ctx.audio.music.setMood(e.mood === 'auto' ? 'battle' : e.mood, { theme: e.theme }); } catch (err) { /* audio is optional */ } };

  app.applyFix = (issue) => {
    const ok = applyFix(session, issue);
    app.validateNow();
    if (ok) { K.sfx('ui_confirm'); app.toast(S.checks.fixedToast((S.checks.fixes[issue.fix] || (() => ''))(issue.params)), 'success'); }
    else { K.sfx('ui_error'); app.toast(S.checks.fixFailed, 'warn'); }
    paintTitle(); paintHistory();
    return ok;
  };
  app.applyFixById = (fix, params) => app.applyFix({ fix, params: params || {}, code: fix });

  app.generate = () => {
    session.generate(st.gen.recipe, st.gen.seed, st.gen.parts); host.frame({ mode: host.rig.mode === 'topdown' ? 'top' : 'oblique' });
    K.sfx('ui_confirm'); app.toast(S.toast.generated(st.gen.recipe), 'success'); app.afterEdit();
  };

  app.changeSize = async (key) => {
    const to = SIZES[key], from = session.arena.size;
    if (!to || to === from) return;
    const things = session.arena.props.length + session.arena.hazards.length + session.arena.markers.length;
    if (things > 0 || session.undo.depth > 0) {
      const yes = await askResize(app, from, to, things);
      if (!yes) { paintSize(); return; }
    }
    session.resize(key); host.frame({ mode: host.rig.mode === 'topdown' ? 'top' : 'oblique' }); K.sfx('ui_confirm'); app.afterEdit();
  };

  // ---- documents: new / open / import / draft
  async function replaceDocument(next, how) {
    if (session.dirty && !(await askDiscardForNew(app))) return false;
    session.load(next.arena, { objective: next.objective, tags: next.tags, id: next.id || null });
    host.frame({ mode: 'oblique' }); app.ctl.setTool(st.tool); paintTitle(); paintHistory(); paintSymmetry(); app.validateNow();
    if (how) app.toast(how, 'success');
    return true;
  }
  app.openLibrary = async (tab) => {
    const res = await openLibrary(app, tab); if (!res) return;
    if (res.action === 'import') return app.importCode();
    if (res.action === 'template') { const t = arenaFromTemplate(res, ctx.content); await replaceDocument(t, null); return; }
    if (res.action === 'open') {
      try { const r = await lib.open(res.item); await replaceDocument({ arena: r.arena, objective: r.objective, tags: r.tags, id: res.item.id }, S.toast.loaded(r.arena.name)); } catch (e) { app.toast(e.message || String(e), 'error'); K.sfx('ui_error'); }
    }
  };
  app.importCode = async () => {
    const r = await importDialog(app); if (!r) return;
    await replaceDocument({ arena: r.arena, objective: r.objective, tags: r.tags, id: null }, S.toast.imported(r.arena.name));
  };
  app.share = async () => { await exportDialog(app, session.arena, { objective: session.objective, tags: session.tags }); };

  // ---- save
  app.save = async (opts = {}) => {
    if (!lib.available) { app.toast(S.toast.storageBlocked, 'warn'); return false; }
    let name = session.arena.name;
    if (!session.id || opts.asNew || !String(name || '').trim()) {
      const nn = await askName(app, { title: opts.asNew ? S.bar.saveAs : S.dialogs.saveTitle, value: String(name || '').trim() || S.untitled, ok: S.common.save }); if (!nn) return false;
      session.setName(nn); nameIn.value = nn; if (app.infoName) app.infoName.value = nn;
    }
    const thumb = host.thumbnail({ w: 192, h: 108, maxChars: LIMITS.thumbChars });
    const r = await lib.save(session, { thumb, asNew: !!opts.asNew });
    if (r.item) session.id = r.item.id;
    if (r.ok) { session.markSaved(); draft.clear(); lastDraftRev = session.rev; K.sfx('ui_confirm'); app.toast(S.dialogs.saveOk(r.item.name), 'success'); paintTitle(); return true; }
    K.sfx('ui_error'); app.toast(r.status === 'full' ? S.dialogs.saveFull : S.dialogs.saveBlocked, 'error'); return false;
  };

  // ---- autosave draft (every 20 s, only when something changed)
  let lastDraftRev = session.rev, draftBusy = false;
  async function autosave(force) {
    if (draftBusy || !alive && !force) return;
    if (!force && (session.rev === lastDraftRev || !session.dirty)) return;
    draftBusy = true;
    try { const rec = await makeDraft(session); const ok = draft.save(rec); if (ok !== false) lastDraftRev = session.rev; } catch (e) { /* storage is best effort */ }
    draftBusy = false;
  }
  const autoTimer = setInterval(() => autosave(false), AUTOSAVE_MS);
  cleanups.push(() => clearInterval(autoTimer));
  const onHide = () => { if (document.hidden) autosave(false); };
  document.addEventListener('visibilitychange', onHide); cleanups.push(() => document.removeEventListener('visibilitychange', onHide));
  app.autosaveNow = () => autosave(true);

  // ---- leave
  let leaving = false;
  app.leave = async () => {
    if (leaving || K.hasModal()) return false;
    leaving = true;
    try {
      if (session.dirty) {
        const c = await askLeave(app);
        if (c === 'cancel' || c === null || c === undefined) return false;
        if (c === 'save') { const ok = await app.save(); if (!ok) return false; }
        else if (c === 'keep') await autosave(true);
        else if (c === 'discard') draft.clear();
      } else draft.clear();
      LIVE = null;
      ctx.nav.goto('title');
      return true;
    } finally { leaving = false; }
  };

  // ---- playtest
  app.playtest = async () => {
    const res = app.validateNow();
    if (!res.canPlaytest) { K.sfx('ui_error'); app.toast(S.dialogs.playtestBlocked, 'error'); app.showChecks(); return false; }
    try {
      await autosave(true);
      const a = session.arena, g = ctx.game;
      const need = OBJECTIVE_BY_ID[session.objective], have = new Set(a.markers.map((m) => m.type));
      const okObj = need && need.markers.every((t) => have.has(t)) && (!need.props.length || a.props.some((p) => need.props.includes(p.t)));
      const objective = okObj ? session.objective : 'eliminate';
      LIVE = { session, st: JSON.parse(JSON.stringify(Object.assign({}, st, { settings: undefined, props: Object.assign({}, st.props, { selected: null }), hazard: Object.assign({}, st.hazard, { selected: null }), marker: Object.assign({}, st.marker, { selected: null }), ramp: { width: st.ramp.width, a: null } }))), cam: cameraState(), pending: true };
      const sizeName = sizeKeyOf(a.size) || 'medium';
      host.hide();
      const setup = g.newSetup('quick', { arena: { data: a.toJSON(), size: sizeName, seed: a.seed || 1, env: {} }, rules: { objective } });
      await g.begin(setup);
      g.autoFill(0, {}); g.autoFill(1, {});
      ctx.nav.goto('placement', { setup, arenaName: a.name });                 // the glue already opened it; this remount shows the arena's own name
      installReturnChip();
      return true;
    } catch (e) {
      console.warn('playtest failed', e); app.toast(S.toast.playtestErr, 'error');
      if (LIVE) LIVE.pending = false;
      if (!host.visible) { host.show({ arena: session.arena }); app.view.reload(); }
      return false;
    }
  };
  function cameraState() { const r = host.rig; return { tx: r.tx, ty: r.ty, tz: r.tz, yaw: r.yaw, pitch: r.pitch, dist: r.dist, mode: r.mode }; }
  function installReturnChip() { installReturn(ctx, S); }

  // ------------------------------------------------------------------------------------------------ initial paint
  app.view.setOverlays(st.overlays); app.view.setHighlight(OBJECTIVE_BY_ID[session.objective].markers);
  app.onToolChanged(st.tool); app.ctl.setTool(st.tool);
  paintTitle(); paintHistory(); paintSymmetry(); paintSize();
  app.validateNow();
  // touch helpers (only on touch devices): Move camera, Lower (Shift), Rotate (R), Scale (Alt+wheel)
  if (safe(() => ctx.platform.isTouch, false)) {
    const camT = K.button(S.view.touchCamera, { id: 'ed-touch-cam', size: 'sm', icon: 'hand', pressed: false, onClick: () => { st.touchCamera = !st.touchCamera; camT.setPressed(st.touchCamera); } });
    const lowT = K.button(S.view.touchLower, { id: 'ed-touch-lower', size: 'sm', icon: 'chevD', pressed: false, onClick: () => { st.touchLower = !st.touchLower; lowT.setPressed(st.touchLower); } });
    const rotT = K.button(S.view.touchRotate, { id: 'ed-touch-rot', size: 'sm', icon: 'refresh', onClick: () => app.ctl.rotateBy(1) });
    const sclP = K.iconButton('plus', S.view.touchScale + ' +', { id: 'ed-touch-scale-up', onClick: () => app.ctl.scaleBy(1) }), sclM = K.iconButton('minus', S.view.touchScale + ' -', { id: 'ed-touch-scale-down', onClick: () => app.ctl.scaleBy(-1) });
    touchBar.append(camT, lowT, rotT, sclM, sclP);
  } else touchBar.classList.add('vw-hide');
  if (resume) { LIVE.pending = false; if (draft) lastDraftRev = session.rev; }
  else startUpOffers();

  async function startUpOffers() {
    let d = null; try { d = draft.load(); } catch (e) { d = null; }
    if (looksLikeDraft(d)) {
      const info = { name: d.name || S.untitled, savedAt: d.savedAt || 0 };
      const c = await offerDraft(app, info);
      if (!alive) return;
      if (c === 'continue') { const r = await readDraft(d); if (r && alive) { session.load(r.arena, { objective: r.objective, tags: r.tags, id: r.id }); host.frame({ mode: 'oblique' }); app.ctl.setTool(st.tool); app.validateNow(); paintTitle(); paintHistory(); app.toast(S.toast.loaded(r.arena.name), 'success'); return; } }
      else draft.clear();
    }
    if (!alive) return;
    app.openLibrary(lib.list().length ? 'mine' : 'templates');
  }

  // test / tooling hook: data only (like window.__vw), removed on destroy
  const hook = window.__vw || (window.__vw = {});
  hook.arenaBuilder = app;

  return {
    destroy() {
      alive = false; clearTimeout(vTimer);
      try { if (session.dirty && !(LIVE && LIVE.pending)) autosave(true); } catch (e) { /* ignore */ }
      if (LIVE && LIVE.pending) { LIVE.cam = cameraState(); LIVE.st = LIVE.st || null; }
      if (app.ctl) app.ctl.dispose();
      clearPanel();
      if (app.view) app.view.dispose();
      thumbs.dispose();
      host.hide();
      cleanups.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
      if (hook.arenaBuilder === app) delete hook.arenaBuilder;
      screen.remove();
    },
    onKey() { return false; },
    onBack() { if (K.hasModal()) return false; app.leave(); return true; },
  };
}

// ---------------------------------------------------------------------------------------------------------------- return from playtest
let chipTimer = 0;
/** A small "Back to the Arena Builder" chip over the placement / battle screens while a playtest of the builder is active. */
function installReturn(ctx, S) {
  removeReturn();
  const ui = document.getElementById('vw-ui'); if (!ui) return;
  const chip = K.button(S.dialogs.playtestBack, { icon: 'hammer', variant: 'secondary', size: 'sm', id: 'ed-return', onClick: () => { try { ctx.game.exitToMenu(); } catch (e) { /* ignore */ } removeReturn(); ctx.nav.goto('arena_builder', { resume: true }); } });
  const wrap = K.h('div', { class: 'vw-ed__return', id: 'ed-return-wrap' }, chip); ui.appendChild(wrap);
  chipTimer = setInterval(() => {
    const cur = ctx.nav.current();
    if (!LIVE || !LIVE.session) { removeReturn(); return; }
    if (cur === 'arena_builder') { removeReturn(); return; }
    wrap.classList.toggle('vw-hide', !(cur === 'placement' || cur === 'battle'));
    if (cur !== 'placement' && cur !== 'battle' && cur !== 'results' && cur !== 'pause' && cur !== 'countdown') removeReturn();
  }, 400);
}
function removeReturn() { clearInterval(chipTimer); chipTimer = 0; const w = document.getElementById('ed-return-wrap'); if (w) w.remove(); }
