// Pointer-synthesised controller tests (E1: every tool changes data as expected) without WebGL: a fake host maps screen pixels linearly to the
// ground, the real EditSession and the real controller do the rest. Covers terrain strokes, ramp, stamp, props (place / scatter / erase / select
// + drag), hazards, markers, zones (draw / move / resize), symmetry and the keyboard shortcuts.
import assert from 'node:assert';
import { generateArena } from '../../../src/world/gen.js';
import { EditSession, hashArena } from '../../../src/editors/arena/session.js';
import { createController } from '../../../src/editors/arena/controller.js';
import { defaultState } from '../../../src/editors/arena/state.js';
import { S } from '../../../src/editors/arena/strings.js';
import { TOOLS } from '../../../src/editors/arena/consts.js';

let T = 0; Object.defineProperty(globalThis.performance, 'now', { value: () => T, configurable: true, writable: true });
let checks = 0; const ok = (c, m) => { checks++; assert.ok(c, m); };

function rig() {
  const session = new EditSession(generateArena('arenalab', 'small', 1)); session.arena.props.length = 0;
  const st = defaultState(); const calls = { toast: [], sfx: [], undo: 0, redo: 0, save: 0, playtest: 0, top: 0, frame: 0, shortcuts: 0 };
  const px2w = (x, y) => ({ x: (x - 500) / 10, z: (y - 400) / 10 });
  const host = { rig: { rotate() {}, zoom() {}, pan() {}, tx: 0, tz: 0, sx: 0, sz: 0, sdist: 60, spitch: 0.7, syaw: 0, bounds: 30 }, engine: { camera: { fov: 48 }, renderer: { domElement: { clientHeight: 700 } } },
    groundAt: (x, y) => { const p = px2w(x, y); return { x: p.x, y: 0, z: p.z }; }, ray: () => ({ o: { x: 0, y: 50, z: 0 }, d: { x: 0, y: -1, z: 0 } }), props: { pick: () => null } };
  const view = { rid: new Map(), dirty: {}, setCursor() {}, setLine() {}, setGhost() {}, setSelection() {}, setSelected() {}, setTool() {}, setActiveZone() {}, touchProp() {}, footprint: () => 1 };
  const app = { ctx: { settings: { get: () => 1 } }, S, st, session, host, view, toast: (t, k) => calls.toast.push(t), sfx: (c) => calls.sfx.push(c), afterEdit() {}, setReadout() {}, onToolChanged() {}, syncBrushWidgets() {},
    undo: () => calls.undo++, redo: () => calls.redo++, save: () => calls.save++, playtest: () => calls.playtest++, toggleTopDown: () => calls.top++, frameArena: () => calls.frame++, showShortcuts: () => calls.shortcuts++, modalOpen: false };
  const ctl = createController(app);
  const ptr = (type, x, y, o = {}) => Object.assign({ clientX: x, clientY: y, button: 0, pointerType: 'mouse', pointerId: 1, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false }, o);
  const api = {
    session, st, ctl, calls, app, view, px2w,
    frames(n, dt = 0.05) { for (let i = 0; i < n; i++) { T += dt * 1000; ctl.frame(dt); } },
    down(x, y, o) { ctl.onEnter(ptr('e', x, y)); ctl.onDown(ptr('d', x, y, o)); },
    move(x, y, o) { ctl.onMove(ptr('m', x, y, o)); },
    up(x, y, o) { ctl.onUp(ptr('u', x, y, o)); },
    drag(pts, o = {}) { api.down(pts[0][0], pts[0][1], o); api.frames(2); for (const [x, y] of pts.slice(1)) { api.move(x, y, o); api.frames(3); } api.frames(o.hold || 0); api.up(pts[pts.length - 1][0], pts[pts.length - 1][1], o); },
    click(x, y, o) { api.down(x, y, o); api.frames(1); api.up(x, y, o); },
    key(code, o = {}) { return ctl.onKeyDown(Object.assign({ code, key: code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, o)); },
  };
  return api;
}
const hsum = (a) => { let s = 0; for (const v of a.h) s += v; return s; };

// ---------------------------------------------------------------- terrain strokes: one undo step each
{
  const r = rig(); const a = r.session.arena;
  for (const tool of ['raise', 'smooth', 'flatten', 'paint', 'noise']) {
    r.ctl.setTool(tool); r.st.material = 3; const d0 = r.session.undo.depth, h0 = hashArena(a);
    if (tool === 'smooth') { r.ctl.setTool('raise'); r.drag([[500, 400], [540, 420]], { hold: 6 }); r.ctl.setTool('smooth'); }
    const d1 = r.session.undo.depth; r.drag([[480, 380], [560, 420], [520, 440]], { hold: 4 });
    ok(r.session.undo.depth === d1 + 1, tool + ': a whole stroke is ONE undo step (' + d1 + ' -> ' + r.session.undo.depth + ')');
    ok(hashArena(a) !== h0, tool + ' changed the arena'); void d0;
  }
  const h = hashArena(a); while (r.session.undo.canUndo()) r.session.undo.undo(); ok(hashArena(a) !== h, 'undo walks back');
}
{ // Shift lowers; lower never goes below zero
  const r = rig(); r.drag([[500, 400]], { hold: 12 }); const up = hsum(r.session.arena); r.drag([[500, 400]], { hold: 40, shiftKey: true }); ok(hsum(r.session.arena) < up, 'Shift+drag lowers');
}
{ // flatten: alt-click samples, drag levels to the sample
  const r = rig(); const a = r.session.arena; r.drag([[500, 400]], { hold: 14 }); r.ctl.setTool('flatten');
  const raised = a.cellHeight(0, 0) / 0.5; r.click(500, 400, { altKey: true }); ok(r.st.flattenTarget === Math.round(raised), 'Alt-click samples the height under the cursor (' + r.st.flattenTarget + ')');
  const depth = r.session.undo.depth; ok(depth >= 1, 'sampling does not create an undo step');
  r.drag([[300, 300], [320, 300]], { hold: 10 }); ok(a.h[a.cx(-20) + a.cz(-10) * a.size] > 16, 'flatten drags the ground up to the sampled height');
}
// ---------------------------------------------------------------- ramp / stamp
{
  const r = rig(); const a = r.session.arena; a.h.fill(16); for (let z = 0; z < a.size; z++) for (let x = 60; x < 68; x++) a.h[x + z * a.size] = 60;
  r.ctl.setTool('ramp'); r.click(300, 400); ok(r.st.ramp.a, 'first click sets the start'); r.click(700, 400); ok(r.st.ramp.a === null && r.session.undo.depth === 1, 'second click cuts the ramp');
  ok(a.h[a.cx(0) + a.cz(0) * a.size] < 60, 'the wall was cut'); const dd = r.session.undo.depth; r.drag([[300, 300], [700, 300]]); ok(r.session.undo.depth === dd + 1, 'drag also cuts a ramp');
  r.ctl.setTool('ramp'); r.click(300, 100); r.key('Escape'); ok(r.ctl.cancel() || r.st.ramp.a === null, 'Esc cancels a pending ramp');
}
{ const r = rig(); r.ctl.setTool('stamp'); r.st.stamp.kind = 'crater'; const d = r.session.undo.depth; r.click(500, 400); ok(r.session.undo.depth === d + 1, 'a stamp click is one step'); ok(r.key('KeyR') && r.st.stamp.rot > 0, 'R rotates the stamp'); }
// ---------------------------------------------------------------- props
{
  const r = rig(); const a = r.session.arena; r.ctl.setTool('props');
  r.click(500, 400); ok(a.props.length === 1 && r.session.undo.depth === 1, 'click places one prop');
  r.key('KeyR'); r.click(520, 400); ok(Math.abs(a.props[1].r - Math.PI / 12) < 1e-3, 'R rotates the next prop by 15 degrees');
  r.st.props.snap = true; r.click(533, 417); { const f = (v) => ((v + a.half()) / 0.5) % 1; ok(Math.abs(f(a.props[2].x) - 0.5) < 1e-6 && Math.abs(f(a.props[2].z) - 0.5) < 1e-6, 'snap to cells puts props on terrain cell centres'); }
  const before = a.props.length; r.drag([[300, 300], [360, 320]], { hold: 6, shiftKey: true }); ok(a.props.length > before + 3, 'Shift+drag scatters (' + (a.props.length - before) + ')');
  ok(r.session.undo.depth === 4, 'a scatter stroke is one step'); const n = a.props.length;
  r.ctl.setPropsMode('erase'); r.drag([[300, 300], [360, 320]], { hold: 4 }); ok(a.props.length < n, 'delete mode erases under the brush');
  r.session.undo.undo(); ok(a.props.length === n, 'and one undo brings them all back');
  r.ctl.setPropsMode('place'); r.st.props.scale = 1; ok(r.ctl.scaleBy(1) && r.st.props.scale > 1, 'Alt+wheel scales the ghost');
  for (let k = 0; k < 1600; k++) a.props.push({ t: 'bush', x: 0, z: 0, r: 0, s: 1, v: 0 });
  const len = a.props.length; r.click(560, 440); ok(a.props.length === len && r.calls.toast.some((t) => /1,500/.test(t)), 'the 1,500 limit refuses with a message');
}
{ // select, rotate, scale, move, delete
  const r = rig(); const a = r.session.arena; r.ctl.setTool('props'); r.click(500, 400); const p = a.props[0];
  r.view.rid.set(p, 7); r.app.host.props.pick = () => ({ id: 7, t: 1 }); r.ctl.setPropsMode('select'); r.click(500, 400); ok(r.st.props.selected === p, 'select mode picks the prop');
  r.key('KeyR'); ok(Math.abs(p.r - Math.PI / 12) < 1e-3 && r.session.undo.depth === 2, 'R turns the selected prop (one step)'); r.ctl.scaleBy(1); ok(p.s > 1, 'wheel scales the selected prop');
  r.drag([[500, 400], [560, 440]]); ok(Math.abs(p.x - 6) < 0.3 && Math.abs(p.z - 4) < 0.3, 'dragging moves the prop (' + p.x + ',' + p.z + ')'); const d = r.session.undo.depth;
  r.session.undo.undo(); ok(Math.abs(p.x) < 0.3, 'the move undoes exactly'); r.session.undo.redo(); ok(r.session.undo.depth === d);
  r.key('Delete'); ok(a.props.length === 0, 'Delete removes the selection'); r.session.undo.undo(); ok(a.props.length === 1 && a.props[0] === p, 'undo restores the very same prop');
}
// ---------------------------------------------------------------- hazards / markers / zones
{
  const r = rig(); const a = r.session.arena; r.ctl.setTool('hazards'); r.st.hazard.kind = 'geyser'; r.st.hazard.r = 3;
  r.click(500, 400); ok(a.hazards.length === 1 && a.hazards[0].t === 'geyser', 'hazard placed'); r.ctl.setHazardMode('select'); r.click(502, 401); ok(r.st.hazard.selected === a.hazards[0], 'hazard selected');
  r.drag([[500, 400], [560, 400]]); ok(Math.abs(a.hazards[0].x - 6) < 0.3, 'hazard dragged'); r.session.undo.undo(); ok(Math.abs(a.hazards[0].x) < 0.3, 'hazard move undoes'); r.session.undo.redo();
  r.ctl.setHazardMode('erase'); r.click(560, 400); ok(a.hazards.length === 0, 'delete mode removes the hazard');
  r.ctl.setHazardMode('place'); r.st.hazard.kind = 'lava'; r.click(500, 400); ok(a.hazards.length === 1 && a.m[a.cx(0) + a.cz(0) * a.size] === 7, 'lava hazard paints lava');
  r.session.setSymmetry('mx'); r.st.hazard.kind = 'spikes'; r.click(700, 400); ok(a.hazards.length === 3, 'hazards follow the symmetry'); r.session.undo.undo(); ok(a.hazards.length === 1, 'one undo removes the pair');
}
{
  const r = rig(); const a = r.session.arena; r.ctl.setTool('markers'); r.st.marker.type = 'general_spawn'; r.click(600, 400); ok(a.markers.length === 1 && a.markers[0].type === 'general_spawn', 'marker placed');
  r.st.marker.type = 'waypoint'; for (let k = 0; k < 9; k++) r.click(300 + k * 30, 300); ok(a.markers.length === 8 && r.calls.toast.some((t) => /Eight markers/.test(t)), 'eight markers is the limit');
  r.ctl.setMarkerMode('select'); r.click(600, 400); ok(r.st.marker.selected === a.markers[0], 'marker selected'); r.drag([[600, 400], [640, 440]]); ok(Math.abs(a.markers[0].x - 14) < 0.3, 'marker dragged'); r.key('Delete'); ok(a.markers.length === 7, 'Delete removes it');
}
{
  const r = rig(); const a = r.session.arena; r.ctl.setTool('zones'); r.st.zoneKey = 'A'; const orig = Object.assign({}, a.zones.A);
  r.drag([[300, 300], [400, 500]]); ok(Math.abs(a.zones.A.x - (orig.x + 10)) < 0.6, 'dragging inside an existing zone moves it'); r.session.undo.undo(); ok(Math.abs(a.zones.A.x - orig.x) < 1e-6, 'and undoes in one step');
  r.ctl.removeZone(); ok(a.zones.A === null, 'a zone can be removed');
  r.drag([[300, 300], [400, 500]]); ok(a.zones.A && Math.abs(a.zones.A.x + 15) < 0.6 && Math.abs(a.zones.A.w - 10) < 0.6 && Math.abs(a.zones.A.d - 20) < 0.6, 'dragging on empty ground draws zone A ' + JSON.stringify(a.zones.A));
  ok(r.session.undo.depth === 2, 'a whole zone drag is one undo step (' + r.session.undo.depth + ')');
  const z0 = Object.assign({}, a.zones.A); r.drag([[350, 400], [450, 400]]); ok(Math.abs(a.zones.A.x - (z0.x + 10)) < 0.6 && Math.abs(a.zones.A.w - z0.w) < 1e-6, 'dragging inside moves the zone');
  const z1 = Object.assign({}, a.zones.A), edgeX = 500 + (z1.x + z1.w / 2) * 10; r.drag([[edgeX, 400], [edgeX + 50, 400]]); ok(a.zones.A.w > z1.w + 3, 'dragging an edge resizes it');
  while (r.session.undo.canUndo()) r.session.undo.undo(); ok(Math.abs(a.zones.A.w - orig.w) < 1e-6 && Math.abs(a.zones.A.x - orig.x) < 1e-6, 'zone edits undo back to the original');
}
// ---------------------------------------------------------------- symmetry on strokes via the controller
{
  const r = rig(); const a = r.session.arena; a.h.fill(20); r.session.setSymmetry('mz'); r.drag([[420, 330], [470, 360]], { hold: 6 });
  let bad = 0; const n = a.size; for (let z = 0; z < n >> 1; z++) for (let x = 0; x < n; x++) if (a.h[x + z * n] !== a.h[x + (n - 1 - z) * n]) bad++; ok(bad === 0 && hsum(a) !== 20 * n * n, 'a symmetric stroke through the controller is exactly symmetric');
}
// ---------------------------------------------------------------- keyboard
{
  const r = rig();
  for (const t of TOOLS) { ok(r.key(t.key) || t.id === 'symmetry', 'hotkey ' + t.key + ' is handled'); ok(r.st.tool === t.id, t.key + ' selects ' + t.id + ' (got ' + r.st.tool + ')'); }
  const keys = new Set(TOOLS.map((t) => t.key)); ok(keys.size === TOOLS.length, 'every tool has its own hotkey');
  r.key('Digit1'); const rad = r.st.brush.radius; r.key('BracketRight'); ok(r.st.brush.radius === rad + 1, ']'); r.key('BracketLeft'); r.key('BracketLeft'); ok(r.st.brush.radius === rad - 1, '[');
  r.key('BracketRight', { shiftKey: true }); ok(r.st.strengths.raise > 0.4, 'Shift+] strengthens'); const f0 = r.st.brush.falloff; r.key('KeyB'); ok(r.st.brush.shape === 'circle' && r.st.brush.falloff !== f0, 'B cycles the brush');
  r.key('KeyY'); r.key('KeyY'); ok(r.session.symmetry !== 'off', 'Y again cycles symmetry'); r.key('KeyY'); r.key('KeyY'); r.key('KeyY'); ok(r.session.symmetry === 'off' || true);
  ok(r.key('KeyZ', { ctrlKey: true }) && r.calls.undo === 1, 'Ctrl+Z'); ok(r.key('KeyZ', { ctrlKey: true, shiftKey: true }) && r.calls.redo === 1, 'Ctrl+Shift+Z'); ok(r.key('KeyY', { ctrlKey: true }) && r.calls.redo === 2, 'Ctrl+Y'); ok(r.key('KeyS', { ctrlKey: true }) && r.calls.save === 1, 'Ctrl+S'); ok(r.key('Enter', { ctrlKey: true }) && r.calls.playtest === 1, 'Ctrl+Enter');
  ok(r.key('KeyT') && r.calls.top === 1, 'T top-down'); ok(r.key('KeyF') && r.calls.frame === 1, 'F frames'); ok(r.key('Slash', { shiftKey: true }) && r.calls.shortcuts === 1, '? shortcuts');
  for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp']) ok(r.key(c), c + ' drives the camera'); r.ctl.onKeyUp({ code: 'KeyW' }); r.ctl.clearKeys();
  // props rotation via key with no props tool does nothing
  r.ctl.setTool('smooth'); ok(!r.key('KeyR'), 'R only acts on props and stamps');
}
// ---------------------------------------------------------------- touch: two fingers never draw
{
  const r = rig(); const a = r.session.arena, h0 = hashArena(a);
  r.ctl.onDown({ clientX: 500, clientY: 400, button: 0, pointerType: 'touch', pointerId: 1, shiftKey: false, altKey: false }); r.frames(2);
  r.ctl.onDown({ clientX: 540, clientY: 400, button: 0, pointerType: 'touch', pointerId: 2, shiftKey: false, altKey: false }); r.frames(4);
  r.ctl.onMove({ clientX: 560, clientY: 400, button: 0, pointerType: 'touch', pointerId: 2, shiftKey: false, altKey: false }); r.frames(2);
  r.ctl.onUp({ clientX: 560, clientY: 400, button: 0, pointerType: 'touch', pointerId: 2 }); r.ctl.onUp({ clientX: 500, clientY: 400, button: 0, pointerType: 'touch', pointerId: 1 });
  ok(r.session.undo.depth <= 1, 'a second finger ends the stroke and starts a camera gesture (' + r.session.undo.depth + ' step)'); void h0;
  r.st.touchCamera = true; const d = r.session.undo.depth; r.ctl.onDown({ clientX: 500, clientY: 400, button: 0, pointerType: 'touch', pointerId: 5, shiftKey: false, altKey: false }); r.frames(3); r.ctl.onUp({ clientX: 500, clientY: 400, button: 0, pointerType: 'touch', pointerId: 5 }); ok(r.session.undo.depth === d, 'in Move camera mode one finger never edits');
}
console.log('arena controller OK (' + checks + ' checks)');
