// Voxel Painter (router id `painter`, layer editor): spec/editors.md §3. Paints the canonical hum1 part grids of the soldier being built in the Workshop.
// 3D view (orbit, click a face) and 2D slice view (layer slider, onion skin), ten tools, mirror axes, 1,500-voxel cap per part, palette with HSV picker,
// live mini preview of the whole soldier. The paint is stored as bp.paint[part] = diffPaint(edited, generated) in the soldier draft (the Workshop reads it back).
import * as K from '../../ui/kit.js';
import { RNG } from '../../core/rng.js';
import * as C from '../../content/era_ancient/custom.js';
import { checkSoldier } from '../../save/validate.js';
import { importShare } from '../../save/share.js';
import { PaintDoc, PART_ORDER, PART_NAMES, OPPOSITE, SWATCHES, PAINT_CAP, DIM, voxelOf, hexToRgbInt } from './paintdoc.js';
import { PartView } from './view3d.js';
import { SliceView, sliceDims } from './slice.js';
import { hsvPicker } from './hsv.js';
import { toHex, parseHex, pushRecent, encodePalette, decodePalette } from './palette.js';
import { lineCells } from './paintdoc.js';
import { SoldierStage } from '../soldier/stage.js';
import { draftOf, roster, unlockedKeys } from '../soldier/drafts.js';
import { openShare, openHelp } from '../soldier/dialogs.js';
import { setIn } from '../soldier/state.js';
import { PT } from '../soldier/text.js';

export const meta = { id: 'painter', layer: 'editor', music: 'editor', canvas: 'none' };

const h = K.h;
const guard = (fn, d) => { try { const v = fn(); return v === undefined ? d : v; } catch (e) { return d; } };
const plain = (o) => JSON.parse(JSON.stringify(o));
const TOOLS = [
  ['pencil', 'brush', 'KeyP', 'P'], ['eraser', 'eraser', 'KeyE', 'E'], ['paint', 'palette', 'KeyC', 'C'], ['fill', 'flask', 'KeyG', 'G'], ['line', 'line', 'KeyL', 'L'],
  ['box', 'block', 'KeyB', 'B'], ['picker', 'crosshair', 'KeyI', 'I'], ['select', 'pointer', 'KeyS', 'S'], ['tint', 'flag', 'KeyT', 'T'], ['glow', 'sparkle', 'KeyH', 'H'],
];
const ADD_TOOLS = new Set(['pencil', 'line', 'box']);
const RECENT_KEY = 'painter.recent';

export function mount(root, ctx, params = {}) {
  K.init(ctx);
  const cleanups = []; let alive = true;
  if (guard(() => ctx.platform.isPhone() && window.innerWidth < 768, false)) { setTimeout(() => { if (alive) ctx.nav.goto('phone_notice', { editor: 'workshop' }); }, 0); return { destroy() { alive = false; } }; }
  guard(() => ctx.audio.music.setMood('editor'), null);

  // ---------------------------------------------------------------- the soldier whose paint we edit (the Workshop's draft)
  const draftCh = draftOf(ctx, 'soldier'), painterDraft = draftOf(ctx, 'painter');
  const unlocked = unlockedKeys(ctx);
  const rng = new RNG(((Date.now() ^ ((performance.now() * 1000) | 0)) >>> 0) || 1);
  let cs = null, dirtyFlag = true;
  const dr = draftCh.load();
  if (params.id) { const it = roster.get(ctx, params.id); const r = it && checkSoldier(it, {}); if (r && r.ok) { cs = plain(r.soldier); dirtyFlag = false; } }
  if (!cs && dr && dr.cs) { const r = checkSoldier(dr.cs, {}); if (r.ok) { cs = plain(r.soldier); dirtyFlag = dr.dirty !== false; } }
  if (!cs) cs = C.newSoldier(rng);
  let def = C.customDef(cs), pd = new PaintDoc(def.model.blueprint, C.compileOptsOf(def));
  const pdMeta = guard(() => painterDraft.load(), null);

  // ---------------------------------------------------------------- tool state
  const touch = guard(() => ctx.platform.isTouch, false);
  const S = { pid: PART_ORDER.indexOf(params.part) >= 0 ? params.part : (pdMeta && PART_ORDER.indexOf(pdMeta.part) >= 0 ? pdMeta.part : 'head'), tool: 'pencil', size: 1, hollow: false, fillMode: '3d', material: 'normal', rgb: 0xc8453c, view: touch ? 'slice' : '3d', axis: 'y', onion: true, grid: true, orbit: false, anchor: null, last: '', animate: false };
  let recent = guard(() => ctx.save.store.get(RECENT_KEY, []), []) || []; if (!Array.isArray(recent)) recent = [];
  recent = recent.filter((e) => e && Number.isInteger(e.rgb) && ['normal', 'team', 'glow'].indexOf(e.material) >= 0).slice(0, 24);
  const part = () => pd.part(S.pid);
  const val = () => voxelOf(S.rgb, S.material);

  // ---------------------------------------------------------------- frame
  const undoBtn = K.iconButton('undo', PT.undo, { id: 'pt-undo', variant: 'secondary', onClick: () => doUndo() });
  const redoBtn = K.iconButton('redo', PT.redo, { id: 'pt-redo', variant: 'secondary', onClick: () => doRedo() });
  K.tooltip(undoBtn, PT.undo + ' (Ctrl+Z)'); K.tooltip(redoBtn, PT.redo + ' (Ctrl+Shift+Z)');
  const shareBtn = K.button(PT.exportSoldier, { icon: 'upload', variant: 'secondary', id: 'pt-share', onClick: () => doShare() });
  const helpBtn = K.iconButton('help', 'Shortcuts', { id: 'pt-help', variant: 'ghost', onClick: () => openHelp(PT.helpTitle, PT.helpRows) }); K.tooltip(helpBtn, 'Shortcuts (?)');
  const frame = K.pageFrame({ id: 'pt', title: PT.title, sub: PT.sub, night: true, backLabel: PT.back, actions: [undoBtn, redoBtn, shareBtn, helpBtn], onBack: () => done() });
  root.classList.add('pt-root');
  const layout = h('div', { class: 'pt' }); frame.content.appendChild(layout); frame.mount(root); cleanups.push(frame.destroy);

  // ---------------------------------------------------------------- left: parts, tools, options
  const partList = h('div', { class: 'pt-parts vw-scroll', role: 'listbox', 'aria-label': PT.parts, id: 'pt-parts' }), partRows = {};
  for (const pid of PART_ORDER) {
    const cnt = h('span', { class: 'pt-part__cnt vw-micro' });
    const b = h('button', { type: 'button', class: 'pt-part', role: 'option', 'aria-selected': 'false', id: 'pt-part-' + pid, dataset: { pid } }, h('span', { class: 'pt-part__name', text: PART_NAMES[pid] }), cnt);
    b.addEventListener('click', () => { K.sfx('ui_select'); selectPart(pid); }); partRows[pid] = { b, cnt }; partList.appendChild(b);
  }
  K.roving(partList, { selector: '.pt-part', orientation: 'vertical' });
  const toolGrid = h('div', { class: 'pt-tools', role: 'radiogroup', 'aria-label': PT.tools, id: 'pt-tools' }), toolBtns = {};
  for (const [id, icon, code, key] of TOOLS) {
    const b = h('button', { type: 'button', class: 'pt-tool', role: 'radio', 'aria-checked': 'false', id: 'pt-tool-' + id, 'aria-label': PT.tool[id], 'aria-keyshortcuts': key, dataset: { tool: id } }, K.icon(icon));
    K.tooltip(b, `${PT.tool[id]} (${key}): ${PT.toolTip[id]}`); b.addEventListener('click', () => { K.sfx('ui_click'); setTool(id); }); toolBtns[id] = b; toolGrid.appendChild(b);
  }
  K.roving(toolGrid, { selector: '.pt-tool', orientation: 'both' });
  const sizeSeg = K.segmented({ id: 'pt-size', label: PT.brush, value: 1, fill: true, options: [1, 2, 3].map((n) => ({ value: n, label: String(n) })), onChange: (v) => { S.size = v; refreshHover(); } });
  const hollowChip = K.chip(PT.boxHollow, { pressed: false, id: 'pt-hollow', onClick: () => { S.hollow = !S.hollow; hollowChip.setPressed(S.hollow); } });
  const fillSeg = K.segmented({ id: 'pt-fillmode', label: 'Fill', value: '3d', options: [{ value: '3d', label: PT.fillMode['3d'] }, { value: 'layer', label: PT.fillMode.layer }], onChange: (v) => { S.fillMode = v; } });
  const mirrorChips = {};
  const mirrorRow = h('div', { class: 'pt-mirror', role: 'group', 'aria-label': PT.mirror }, h('span', { class: 'vw-label', text: PT.mirror }));
  for (const a of ['x', 'y', 'z']) { const c = K.chip(PT.mirrorAxis[a], { pressed: false, id: 'pt-mirror-' + a, onClick: () => toggleMirror(a) }); K.tooltip(c, `Mirror across the ${a.toUpperCase()} axis (${a.toUpperCase()})`); mirrorChips[a] = c; mirrorRow.appendChild(c); }
  const sizeBox = h('div', { class: 'pt-sizebox' }, h('span', { class: 'vw-label', text: PT.brush }), sizeSeg);
  const options = h('div', { class: 'vw-col pt-options' }, sizeBox, h('div', { class: 'vw-row vw-wrapflex' }, hollowChip), fillSeg, mirrorRow);

  // ---------------------------------------------------------------- centre: views
  const viewHost = h('div', { class: 'pt-view', id: 'pt-view' });
  const host3d = h('div', { class: 'pt-view__3d' }), hostSlice = h('div', { class: 'pt-view__slice vw-hide' });
  viewHost.append(host3d, hostSlice);
  const view = new PartView(host3d, { palette: () => guard(() => ctx.settings.get('palette'), 'classic'), onTool: (ev) => on3d(ev) });
  cleanups.push(() => view.destroy());
  if (!view.ok) host3d.appendChild(K.emptyState({ icon: 'cube', title: '3D view unavailable', text: 'This browser did not give the painter a WebGL view. The slice view still works.' }));
  const slice = new SliceView(hostSlice, { onTool: (ev) => onSlice(ev), onLayer: (n) => syncLayer(n) });
  cleanups.push(() => slice.destroy());
  const viewSeg = K.segmented({ id: 'pt-viewseg', label: 'View', value: S.view, options: [{ value: '3d', label: PT.view3d, icon: 'cube' }, { value: 'slice', label: PT.viewSlice, icon: 'grid' }], onChange: (v) => setView(v) });
  const orbitBtn = K.button('Orbit', { icon: 'hand', variant: 'secondary', size: 'sm', pressed: false, id: 'pt-orbit', onClick: () => { S.orbit = !S.orbit; orbitBtn.setPressed(S.orbit); view.setOrbitMode(S.orbit); } }); K.tooltip(orbitBtn, 'Left-drag turns the view (touch and trackpads). Right-drag always does.');
  const axisSeg = K.segmented({ id: 'pt-axis', label: PT.axis, value: 'y', class: 'vw-seg--compact', options: ['x', 'y', 'z'].map((a) => ({ value: a, label: a.toUpperCase() })), onChange: (v) => { S.axis = v; slice.setAxis(v); syncLayer(slice.layer); } });
  const layerSlider = K.slider({ min: 0, max: 15, step: 1, value: 0, label: PT.layer, id: 'pt-layer', valueWidth: '3.4rem', format: (v) => `${v}`, onInput: (v) => slice.setLayer(v) });
  const onionToggle = K.toggle({ id: 'pt-onion', label: PT.onion, value: true, onChange: (v) => { S.onion = v; slice.setOnion(v); } });
  const gridToggle = K.toggle({ id: 'pt-grid', label: PT.grid, value: true, onChange: (v) => { S.grid = v; slice.setGrid(v); } });
  const sliceBar = h('div', { class: 'pt-slicebar vw-hide' }, h('span', { class: 'vw-label', text: PT.axis }), axisSeg, h('div', { class: 'pt-slicebar__layer' }, layerSlider), h('label', { class: 'ws-hudrow' }, h('span', { class: 'vw-micro', text: PT.onion }), onionToggle), h('label', { class: 'ws-hudrow' }, h('span', { class: 'vw-micro', text: PT.grid }), gridToggle));
  const mk = (label, icon, id, fn, tip) => { const b = K.button(label, { icon, size: 'sm', variant: 'secondary', id, onClick: fn }); if (tip) K.tooltip(b, tip); return b; };
  const resetBtn = mk(PT.reset, 'refresh', 'pt-reset', () => doOp(() => part().reset()), 'Put the generated voxels back (undoable)');
  const clearBtn = mk(PT.clear, 'trash', 'pt-clear', () => { const r = part().clear(); handleResult(r, 'clear'); afterEdit(); }, 'Erase everything in this part (undoable)');
  const oppBtn = mk(PT.copyOpp, 'copy', 'pt-opp', () => { const o = OPPOSITE[S.pid]; if (!o) return; const r = pd.copyToOpposite(S.pid); handleResult(r); K.toast(`Copied to ${PART_NAMES[o].toLowerCase()}.`, { kind: 'success', sound: false, ms: 1500 }); afterEdit(); }, 'Copy this limb, flipped left-right, onto the opposite limb');
  const rotBtn = mk(PT.rotate, 'refresh', 'pt-rotate', () => doOp(() => part().rotateSelection()), 'Rotate the selection a quarter turn');
  const flipBtn = mk(PT.flipX, 'mirror', 'pt-flip', () => doOp(() => part().flipSelection(S.axis === 'x' ? 'z' : 'x')), 'Flip the selection left-right');
  const delBtn = mk(PT.del, 'x', 'pt-delsel', () => doOp(() => part().deleteSelection()), 'Delete the selected voxels (Delete)');
  const selTools = h('div', { class: 'vw-row vw-wrapflex pt-seltools vw-hide' }, rotBtn, flipBtn, delBtn);
  const actions = h('div', { class: 'pt-actions' }, resetBtn, clearBtn, oppBtn);
  const left = K.tablet(null, h('div', { class: 'pt-left__body' }, h('div', { class: 'vw-label', text: PT.parts }), partList, options, actions), { id: 'pt-left', class: 'pt-left', variant: 'glass', tight: true, headless: true });
  const toolbar = h('div', { class: 'pt-toolbar' }, toolGrid, viewSeg, orbitBtn);
  const status = h('div', { class: 'pt-status vw-small', id: 'pt-status', role: 'status', 'aria-live': 'off' }), hint = h('div', { class: 'pt-hint vw-micro', id: 'pt-hint' });
  const centre = h('div', { class: 'pt-centre' }, toolbar, sliceBar, selTools, h('div', { class: 'pt-viewwrap' }, viewHost), h('div', { class: 'pt-statusrow' }, status, hint));

  // ---------------------------------------------------------------- right: colour, palette, mini preview
  const swatchBox = h('div', { class: 'ws-swatches pt-swatches', role: 'radiogroup', 'aria-label': PT.swatches, id: 'pt-swatches' }), swatchBtns = [];
  SWATCHES.forEach((c) => { const b = h('button', { type: 'button', class: 'ws-swatch', role: 'radio', 'aria-checked': 'false', 'aria-label': c, style: { '--sw': c }, dataset: { color: c } }); b.addEventListener('click', () => { K.sfx('ui_select'); setColor(hexToRgbInt(c)); }); swatchBtns.push(b); swatchBox.appendChild(b); });
  const picker = hsvPicker({ value: S.rgb, onChange: (rgb) => setColor(rgb, { fromPicker: true }) });
  const hexInput = h('input', { type: 'text', class: 'vw-input ws-hex', id: 'pt-hex', maxlength: '7', 'aria-label': PT.hex, spellcheck: 'false', autocomplete: 'off', value: toHex(S.rgb) }); hexInput.value = toHex(S.rgb);
  hexInput.addEventListener('change', () => { const v = parseHex(hexInput.value); if (v === null) { hexInput.value = toHex(S.rgb); K.sfx('ui_error'); return; } setColor(v); });
  const colorChip = h('div', { class: 'pt-colorchip', id: 'pt-colorchip', 'aria-hidden': 'true' });
  const matSeg = K.segmented({ id: 'pt-material', label: 'Material', value: 'normal', class: 'vw-seg--compact', options: [{ value: 'normal', label: PT.material.normal }, { value: 'team', label: PT.material.team }, { value: 'glow', label: PT.material.glow }], onChange: (v) => { S.material = v; refreshColorUI(); } });
  K.tooltip(matSeg, 'Team tint: the team colour multiplies the colour. Glow: the voxel shines and feeds the bloom.');
  const recentBox = h('div', { class: 'ws-swatches pt-recent', role: 'group', 'aria-label': PT.recent, id: 'pt-recent' });
  const palBtns = h('div', { class: 'vw-row vw-wrapflex' }, K.button(PT.exportPalette, { size: 'sm', variant: 'ghost', icon: 'upload', id: 'pt-pal-export', onClick: () => exportPalette() }), K.button(PT.importPalette, { size: 'sm', variant: 'ghost', icon: 'download', id: 'pt-pal-import', onClick: () => importPalette() }), K.button(PT.importPaint, { size: 'sm', variant: 'ghost', icon: 'folder', id: 'pt-paint-import', onClick: () => importPaintCode() }));
  const stageHost = h('div', { class: 'pt-mini__view', id: 'pt-mini' });
  const stage = new SoldierStage(stageHost, { animator: guard(() => ctx.game.animator, undefined), palette: () => guard(() => ctx.settings.get('palette'), 'classic'), reduceMotion: () => K.reduced(), label: 'Mini preview of the whole soldier wearing your paint.' });
  cleanups.push(() => stage.destroy());
  const animToggle = K.toggle({ id: 'pt-animate', label: 'Animate', value: false, onChange: (v) => { S.animate = v; stage.setClip(v ? 'walk' : 'idle'); } });
  const mini = h('div', { class: 'pt-mini' }, h('div', { class: 'vw-row vw-between' }, h('span', { class: 'vw-label', text: PT.mini }), h('label', { class: 'ws-hudrow' }, h('span', { class: 'vw-micro', text: 'Animate' }), animToggle)), stageHost);
  const right = K.tablet(null, h('div', { class: 'pt-right__body vw-scroll' }, h('div', { class: 'vw-label', text: PT.palette }), h('div', { class: 'pt-colorrow' }, colorChip, hexInput), picker, matSeg, h('div', { class: 'vw-label', text: PT.swatches }), swatchBox, h('div', { class: 'vw-label', text: PT.recent }), recentBox, palBtns, K.divider(), mini), { id: 'pt-right', class: 'pt-right', variant: 'glass', tight: true, headless: true });

  // ---------------------------------------------------------------- bottom: cap meter
  const capBar = K.progress({ max: PAINT_CAP, tone: 'gold', tall: true, aria: 'Painted voxels in this part', id: 'pt-cap' }); const capNote = h('span', { class: 'vw-micro vw-dim', text: PT.capNote });
  const bottom = h('footer', { class: 'pt-bottom vw-tablet vw-tablet--glass' }, h('div', { class: 'pt-bottom__cap' }, h('span', { class: 'vw-label', text: PT.parts + ': ' }), h('b', { id: 'pt-partname' }), capBar, capNote), h('span', { class: 'vw-spacer' }), K.button(PT.back, { icon: 'check', variant: 'primary', id: 'pt-done', onClick: () => done() }));
  layout.append(left, centre, right, bottom);

  // ---------------------------------------------------------------- helpers: UI sync
  function refreshColorUI() {
    colorChip.style.background = toHex(S.rgb); colorChip.dataset.material = S.material; hexInput.value = toHex(S.rgb);
    swatchBtns.forEach((b) => { const on = b.dataset.color.toLowerCase() === toHex(S.rgb) && S.material === 'normal'; b.setAttribute('aria-checked', String(on)); b.classList.toggle('is-on', on); });
    if (matSeg.get() !== S.material) matSeg.set(S.material, true);
    recentBox.replaceChildren(...recent.slice(0, 12).map((e) => { const b = h('button', { type: 'button', class: 'ws-swatch pt-recent__sw', 'aria-label': toHex(e.rgb) + (e.material !== 'normal' ? ' ' + PT.material[e.material] : ''), style: { '--sw': toHex(e.rgb) }, dataset: { material: e.material } }); b.addEventListener('click', () => { S.material = e.material; setColor(e.rgb); }); return b; }));
  }
  function setColor(rgb, o = {}) { S.rgb = rgb & 0xffffff; if (!o.fromPicker) picker.set(S.rgb); refreshColorUI(); }
  function remember() { recent = pushRecent(recent, { rgb: S.rgb, material: S.material }); guard(() => ctx.save.store.set(RECENT_KEY, recent), null); refreshColorUI(); }
  function syncLayer(n) { const cnt = slice.layerCount(); layerSlider.input.max = String(cnt - 1); layerSlider.set(Math.min(n, cnt - 1), true); }
  function setTool(id) {
    S.tool = id; S.anchor = null; clearPreview();
    for (const [k, b] of Object.entries(toolBtns)) { b.setAttribute('aria-checked', String(k === id)); b.classList.toggle('is-on', k === id); b.tabIndex = k === id ? 0 : -1; }
    hollowChip.classList.toggle('vw-hide', id !== 'box'); fillSeg.classList.toggle('vw-hide', id !== 'fill');
    sizeSeg.classList.toggle('vw-hide', ['fill', 'box', 'picker', 'select'].indexOf(id) >= 0);
    selTools.classList.toggle('vw-hide', id !== 'select' || !part().sel);
    hint.textContent = PT.toolTip[id]; refreshHover();
  }
  function setView(v) {
    S.view = v; viewSeg.set(v, true); host3d.classList.toggle('vw-hide', v !== '3d'); hostSlice.classList.toggle('vw-hide', v !== 'slice'); sliceBar.classList.toggle('vw-hide', v !== 'slice'); orbitBtn.classList.toggle('vw-hide', v !== '3d');
    if (v === 'slice') { slice.setPart(part()); syncLayer(slice.layer); slice.draw(); } else { view.dirty = true; view._resize && view._resize(); }
    refreshHover();
  }
  function selectPart(pid) {
    S.pid = pid; S.anchor = null; const p = part();
    for (const k of PART_ORDER) { const on = k === pid; partRows[k].b.setAttribute('aria-selected', String(on)); partRows[k].b.classList.toggle('is-on', on); }
    view.setPart(p); slice.setPart(p); S.axis = S.axis; slice.setAxis(S.axis); syncLayer(slice.layer);
    for (const a of ['x', 'y', 'z']) mirrorChips[a].setPressed(!!p.mirror[a]);
    oppBtn.classList.toggle('vw-hide', !OPPOSITE[pid]); selTools.classList.toggle('vw-hide', S.tool !== 'select' || !p.sel);
    view.setSelection(p.sel); slice.setSelection(p.sel); clearPreview(); afterEdit(); refreshHover();
  }
  function toggleMirror(a) { const p = part(); p.mirror[a] = !p.mirror[a]; mirrorChips[a].setPressed(p.mirror[a]); view.setMirror(p.mirror); K.sfx('ui_toggle'); refreshHover(); }
  function afterEdit() {
    const p = part(); view.rebuild(); slice.draw();
    capBar.set(p.diff, PT.capLabel(p.diff, PAINT_CAP), p.diff >= PAINT_CAP); capBar.classList.toggle('is-hot', p.diff > PAINT_CAP * 0.9);
    bottom.querySelector('#pt-partname').textContent = PART_NAMES[S.pid];
    for (const pid of PART_ORDER) { const n = pd.part(pid).diff; partRows[pid].cnt.textContent = n ? n.toLocaleString('en-US') : ''; partRows[pid].b.classList.toggle('is-painted', n > 0); }
    undoBtn.disabled = !p.undo.canUndo(); redoBtn.disabled = !p.undo.canRedo();
    view.setSelection(p.sel); slice.setSelection(p.sel); selTools.classList.toggle('vw-hide', S.tool !== 'select' || !p.sel);
    schedulePreview(); schedulePersist();
  }

  // ---------------------------------------------------------------- tools
  let lastCapToast = 0;
  function handleResult(r, label) {
    if (!r) return true;
    if (!r.ok) {
      K.sfx('ui_error'); const t = performance.now();
      if (t - lastCapToast > 700) { lastCapToast = t; K.toast(r.reason === 'cap' ? (label === 'clear' ? PT.clearFail : PT.capOver(r.would, PAINT_CAP)) : r.reason === 'empty-seed' ? PT.emptySeed : 'That did not work here.', { kind: 'warn', sound: false }); }
      return false;
    }
    return true;
  }
  function doOp(fn) { const r = fn(); handleResult(r); afterEdit(); return r; }
  function doUndo() { const p = part(); if (p.doUndo()) { K.sfx('ui_tick'); afterEdit(); } }
  function doRedo() { const p = part(); if (p.doRedo()) { K.sfx('ui_tick'); afterEdit(); } }
  const keyOf = (c) => c ? c.join(',') : '';
  /** One tool action on a target. t = {cell, add, normal, kind, plane} (plane: slice axis or null) */
  function apply(t, e, phase) {
    const p = part(), v = val(), tool = S.tool, plane = t.plane || undefined;
    if (!t.cell && !t.add) return;
    const shift = !!(e && e.shiftKey);
    if (tool === 'pencil') { const c = t.add; if (!c) return; if (keyOf(c) === S.last) return; S.last = keyOf(c); handleResult(p.pencil(c[0], c[1], c[2], v, S.size, plane)); }
    else if (tool === 'eraser') { const c = t.hit; if (!c) return; if (keyOf(c) === S.last) return; S.last = keyOf(c); handleResult(p.eraser(c[0], c[1], c[2], S.size, plane)); }
    else if (tool === 'paint') { const c = t.hit; if (!c) return; if (keyOf(c) === S.last) return; S.last = keyOf(c); handleResult(p.recolor(c[0], c[1], c[2], v, S.size, plane)); }
    else if (tool === 'tint' || tool === 'glow') { const c = t.hit; if (!c) return; if (keyOf(c) === S.last) return; S.last = keyOf(c); handleResult(p.flag(c[0], c[1], c[2], tool === 'tint' ? 'team' : 'glow', !shift, S.size, plane)); }
    afterEdit();
  }
  function pickColor(c) {
    if (!c) return; const value = part().pick(c[0], c[1], c[2]); if (!value) return;
    S.material = ((value >>> 24) & 4) ? 'glow' : ((value >>> 24) & 2) ? 'team' : 'normal'; setColor(value & 0xffffff); K.sfx('ui_select'); K.toast(`Picked ${toHex(value & 0xffffff)}${S.material !== 'normal' ? ' (' + PT.material[S.material].toLowerCase() + ')' : ''}.`, { kind: 'info', sound: false, ms: 1100 });
  }
  function clearPreview() { view.setPreview(null); slice.setPreview(null); }
  function previewCells(a, b) {
    if (S.tool === 'line') return lineCells(a, b).slice(0, 700);
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]), z0 = Math.min(a[2], b[2]), z1 = Math.max(a[2], b[2]), out = [];
    for (let y = y0; y <= y1 && out.length < 700; y++) for (let z = z0; z <= z1 && out.length < 700; z++) for (let x = x0; x <= x1 && out.length < 700; x++) { if (S.tool === 'box' && S.hollow && x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1) continue; out.push([x, y, z]); }
    return out;
  }
  /** shared pointer logic for both views: t = {cell, add, hit, plane, e, type, down} */
  function pointer(type, t, e) {
    const p = part(), tool = S.tool;
    if (type === 'leave' || type === 'cancel') { if (type === 'cancel') { p.endStroke(); S.anchor = null; clearPreview(); afterEdit(); } view.setCursor(null); slice.setHover(null); status.textContent = ''; return; }
    if (type === 'down') {
      if (e && e.altKey) { pickColor(t.hit); return; }
      S.last = '';
      if (tool === 'picker') { pickColor(t.hit); return; }
      if (tool === 'fill') {
        const c = t.hit || (t.plane ? t.cell : null); if (!c) return;
        const axis = t.plane || (t.normal ? (t.normal[0] ? 'x' : t.normal[1] ? 'y' : 'z') : 'y');
        const r = p.fill(c[0], c[1], c[2], val(), S.fillMode === 'layer' || t.plane ? 'layer' : '3d', axis); if (handleResult(r)) remember(); afterEdit(); return;
      }
      if (tool === 'line' || tool === 'box') { const c = t.add || t.cell; if (c) { S.anchor = c.slice(); } return; }
      if (tool === 'select') { const c = t.hit || t.add || t.cell; if (c) { S.anchor = c.slice(); S.selShift = !!(e && e.shiftKey); } return; }
      K.sfx(tool === 'eraser' ? 'ui_erase' : 'ui_place'); p.beginStroke(PT.tool[tool]); apply(t, e, 'down'); S.stroking = true; return;
    }
    if (type === 'move') {
      updateHover(t);
      if (!t.down) return;
      if (S.stroking) apply(t, e, 'move');
      else if (S.anchor && (tool === 'line' || tool === 'box')) { const c = t.add || t.cell; if (c) { const cells = previewCells(S.anchor, planar(S.anchor, c, t.plane)); view.setPreview(cells, S.rgb); slice.setPreview(cells); } }
      else if (S.anchor && tool === 'select') { const c = t.hit || t.add || t.cell; if (c) { const sel = selBox(S.anchor, c, t.plane); view.setSelection(sel); slice.setSelection(sel); } }
      return;
    }
    if (type === 'up') {
      if (S.stroking) { p.endStroke(); S.stroking = false; remember(); afterEdit(); return; }
      if (S.anchor && (tool === 'line' || tool === 'box')) {
        const c = t.add || t.cell; const a = S.anchor; S.anchor = null; clearPreview();
        if (c) { const b = planar(a, c, t.plane); const r = tool === 'line' ? p.line(a, b, val(), S.size, t.plane || undefined) : p.box(a, b, val(), S.hollow); if (handleResult(r)) remember(); }
        afterEdit(); return;
      }
      if (S.anchor && tool === 'select') { const c = t.hit || t.add || t.cell || S.anchor; const a = S.anchor; S.anchor = null; const sel = selBox(a, c, t.plane); p.select([sel.x0, sel.y0, sel.z0], [sel.x1, sel.y1, sel.z1]); afterEdit(); }
    }
  }
  /** in a slice both ends share the layer; a box tool drag in the slice stays flat */
  function planar(a, b, axis) { if (!axis) return b; const o = b.slice(); const i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2; o[i] = a[i]; return o; }
  function selBox(a, b, axis) {
    const g = part().grid, lo = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], hi = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
    if (axis && S.selShift) { const i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2; lo[i] = 0; hi[i] = [g.sx, g.sy, g.sz][i] - 1; }
    return { x0: lo[0], y0: lo[1], z0: lo[2], x1: hi[0], y1: hi[1], z1: hi[2] };
  }
  // 3D events
  function on3d(ev) {
    if (ev.type === 'cancel' || ev.type === 'leave') { pointer(ev.type, {}, ev.e); return; }
    const k = ev.pick || {}; const t = { cell: k.kind ? k.cell : null, hit: k.kind === 'voxel' ? k.cell : null, add: k.add, normal: k.normal, plane: null, down: ev.down };
    pointer(ev.type, t, ev.e);
  }
  function onSlice(ev) {
    if (ev.type === 'cancel' || ev.type === 'leave') { pointer(ev.type, {}, ev.e); return; }
    const c = ev.cell;   // in a slice every tool works on the cell under the pointer (the tools ignore empty cells where that makes sense)
    pointer(ev.type, { cell: c, hit: c, add: c, normal: null, plane: S.axis, down: ev.down }, ev.e);
  }
  function updateHover(t) {
    const tool = S.tool, p = part(); let cell = null, erase = false;
    if (S.view === '3d') { cell = ADD_TOOLS.has(tool) ? t.add : t.hit; erase = tool === 'eraser'; view.setCursor(cell, { color: S.rgb, erase, size: ['pencil', 'eraser', 'paint', 'tint', 'glow'].indexOf(tool) >= 0 ? S.size : 1 }); }
    else { cell = t.cell; const mirrors = []; if (cell) { const tmp = []; p.mirrored(cell[0], cell[1], cell[2], tmp); for (let i = 3; i < tmp.length; i += 3) mirrors.push([tmp[i], tmp[i + 1], tmp[i + 2]]); } slice.setHover(cell, ['pencil', 'eraser', 'paint', 'tint', 'glow'].indexOf(tool) >= 0 ? S.size : 1, mirrors); }
    status.textContent = cell ? PT.hover(cell[0], cell[1], cell[2]) + (p.get(cell[0], cell[1], cell[2]) ? '  ·  ' + toHex(p.get(cell[0], cell[1], cell[2]) & 0xffffff) : '') : '';
  }
  function refreshHover() { if (S.view === '3d') view.setCursor(null); else slice.setHover(null); }

  // ---------------------------------------------------------------- mini preview and persistence
  let prevTimer = 0, persistTimer = 0, lastPersist = 0;
  function currentSoldier() { return setIn(cs, ['blueprint', 'paint'], pd.toPaint()); }
  function schedulePreview() {
    if (prevTimer) return;
    prevTimer = setTimeout(() => {
      prevTimer = 0; if (!alive) return;
      try { const c = C.compileCustom(currentSoldier()); stage.setSoldier({ model: c.compiled.model, scale: c.eff }); } catch (e) { guard(() => ctx.diag.error('painter', 'preview: ' + (e && e.message)), null); }
    }, 140);
  }
  function persist(force) {
    if (!force && !dirtyFlag) return;
    const next = currentSoldier(); const r = checkSoldier(next, {});
    if (!r.ok) return;                                    // paint that would be rejected is never written over a good draft
    cs = next; draftCh.save({ v: 1, cs: next, dirty: true, savedAt: Date.now() }); guard(() => painterDraft.save({ v: 1, part: S.pid, savedAt: Date.now() }), null); dirtyFlag = false; lastPersist = Date.now();
  }
  function schedulePersist() { dirtyFlag = true; clearTimeout(persistTimer); persistTimer = setTimeout(() => persist(false), 1200); }
  const autosave = setInterval(() => persist(false), 20000); cleanups.push(() => clearInterval(autosave));

  // ---------------------------------------------------------------- dialogs: palette, import paint, share
  async function exportPalette() {
    const list = (recent.length ? recent : SWATCHES.map((c) => ({ rgb: hexToRgbInt(c), material: 'normal' })));
    await K.textModal({ title: PT.exportPalette, text: encodePalette(list), readOnly: true, note: PT.paletteNote, label: PT.paletteCode });
  }
  async function importPalette() {
    const out = await K.textModal({ title: PT.importPalette, text: '', note: PT.paletteNote, label: PT.paletteCode, placeholder: 'VWPAL1:c8453c,f2d36bT', ok: 'Import', onSubmit: (t) => { const d = decodePalette(t); return d.ok ? null : d.error; } });
    if (out === null) return; const d = decodePalette(out); if (d.ok) { recent = d.list.slice(0, 24); guard(() => ctx.save.store.set(RECENT_KEY, recent), null); const first = recent[0]; if (first) { S.material = first.material; setColor(first.rgb); } refreshColorUI(); K.toast(`Imported ${d.list.length} colour${d.list.length === 1 ? '' : 's'}.`, { kind: 'success' }); }
  }
  async function importPaintCode() {
    const out = await K.textModal({ title: PT.importPaint, text: '', note: PT.importPaintNote, label: 'VW1.soldier code', placeholder: 'VW1.soldier....', ok: 'Import', onSubmit: async (t) => { try { await importShare(t.trim(), 'soldier', {}); return null; } catch (e) { return (e && e.message) || 'That code could not be read.'; } } });
    if (out === null) return;
    try {
      const r = await importShare(out.trim(), 'soldier', {}); const rle = r.value.blueprint.paint[S.pid];
      if (!rle) { K.toast(PT.importPaintNone, { kind: 'warn' }); return; }
      handleResult(part().applyRLE(rle)); afterEdit(); K.toast('Paint imported.', { kind: 'success' });
    } catch (e) { K.toast((e && e.message) || 'That code could not be read.', { kind: 'error' }); }
  }
  async function doShare() { persist(true); const r = checkSoldier(currentSoldier(), { unlocked }); if (!r.ok) { K.toast(r.errors[0], { kind: 'error' }); return; } await openShare(ctx, plain(r.soldier)); }

  // ---------------------------------------------------------------- leaving
  function done() { persist(true); K.sfx('ui_confirm'); ctx.nav.goto('workshop', { resume: true }); }
  function onBack() { if (K.hasModal()) return false; if (part().sel && S.tool === 'select') { part().clearSelection(); afterEdit(); return true; } if (S.anchor) { S.anchor = null; clearPreview(); return true; } persist(true); ctx.nav.goto('workshop', { resume: true }); return true; }

  // ---------------------------------------------------------------- keyboard
  const onKeyDown = (e) => {
    if (!alive || K.hasModal()) return;
    const t = e.target, editable = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    const mod = e.ctrlKey || e.metaKey, code = e.code; const eat = () => { e.preventDefault(); e.stopPropagation(); };
    if (mod && code === 'KeyZ' && !editable) { eat(); if (e.shiftKey) doRedo(); else doUndo(); return; }
    if (mod && code === 'KeyY' && !editable) { eat(); doRedo(); return; }
    if (mod || e.altKey) return;
    if (editable) return;
    if (code === 'Space') { view.spaceDown = true; if (t === document.body || t === view.canvas || t === slice.canvas) e.preventDefault(); return; }
    const tool = TOOLS.find((x) => x[2] === code);
    if (tool) { eat(); setTool(tool[0]); return; }
    if (code === 'KeyX' || code === 'KeyY' || code === 'KeyZ') { eat(); toggleMirror(code.slice(3).toLowerCase()); return; }
    if (code === 'BracketLeft') { eat(); sizeSeg.set(Math.max(1, S.size - 1)); return; } if (code === 'BracketRight') { eat(); sizeSeg.set(Math.min(3, S.size + 1)); return; }
    if (e.key === '?' || (e.shiftKey && code === 'Slash')) { eat(); openHelp(PT.helpTitle, PT.helpRows); return; }
    const p = part();
    if (code === 'Delete' || code === 'Backspace') { if (p.sel) { eat(); doOp(() => p.deleteSelection()); } return; }
    if (code === 'PageUp' || code === 'PageDown') { if (S.view === 'slice') { eat(); slice.setLayer(slice.layer + (code === 'PageUp' ? 1 : -1)); } return; }
    if (/^Arrow/.test(code) && S.view === '3d' && !(p.sel && S.tool === 'select')) { eat(); view.orbit(code === 'ArrowLeft' ? 0.14 : code === 'ArrowRight' ? -0.14 : 0, code === 'ArrowUp' ? -0.1 : code === 'ArrowDown' ? 0.1 : 0); return; }
    if (p.sel && /^Arrow/.test(code) && S.tool === 'select') {
      eat(); const n = e.shiftKey ? 5 : 1; const d = code === 'ArrowLeft' ? [-1, 0, 0] : code === 'ArrowRight' ? [1, 0, 0] : code === 'ArrowUp' ? (e.ctrlKey ? [0, 0, -1] : [0, 1, 0]) : [0, -1, 0];
      doOp(() => p.moveSelection(d[0] * n, d[1] * n, d[2] * n)); return;
    }
  };
  const onKeyUp = (e) => { if (e.code === 'Space') view.spaceDown = false; };
  window.addEventListener('keydown', onKeyDown, true); window.addEventListener('keyup', onKeyUp, true); cleanups.push(() => { window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('keyup', onKeyUp, true); });

  // ---------------------------------------------------------------- start
  setTool('pencil'); setView(S.view); selectPart(S.pid); refreshColorUI(); schedulePreview();
  K.enter([left, centre, right, bottom], 'fade', 0);
  guard(() => { window.__pt = { pd, S, view, slice, stage, part, afterEdit, get cs() { return cs; } }; }, null);
  return { destroy() { alive = false; clearTimeout(prevTimer); clearTimeout(persistTimer); persist(false); cleanups.forEach((f) => guard(f, null)); guard(() => { delete window.__pt; }, null); }, onBack };
}
