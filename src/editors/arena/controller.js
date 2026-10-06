// Arena Builder controller: pointer + keyboard + camera logic for all 16 tools. The viewport element forwards pointer events here; the host calls
// frame() every frame (before the render). Terrain strokes are time/distance driven dabs on an EditSession stroke (one undo step per stroke);
// props, hazards, markers and zones are placed, picked, dragged and deleted through the session's list commands. Touch: one finger draws (or
// orbits in "Move camera" mode), two fingers pinch-zoom, pan and twist the camera; the modifier buttons stand in for Shift, R and Alt+wheel.

import { MAT } from '../../world/arena.js';
import { HSTEP } from '../../world/arena.js';
import { TOOLS, TOOL_BY_ID, BRUSH, BRUSH_CYCLE, HAZARD_BY_ID, MARKER_BY_ID, PROP_TOOL, LIMITS } from './consts.js';
import { propInfo } from '../../content/era_ancient/props/catalog.js';
import { variantCount } from '../../content/era_ancient/props/models/index.js';
import { clamp, TAU, zoneBox } from './geom.js';
import { RNG } from '../../core/rng.js';

const CUR_COLOR = { raise: 0x8bc34a, smooth: 0x6ec6ff, flatten: 0xffc93c, paint: 0xff7eb6, noise: 0xff7a2f, ramp: 0xffc93c, stamp: 0xffc93c, props: 0xf3f6fb, hazards: 0xff7a2f, markers: 0x6ec6ff, zones: 0xffffff };
const DEL = 0xee4b4b;
const now = () => performance.now();

export function createController(app) {
  const { st, session, host, view } = app;
  const rig = () => host.rig;
  const rng = new RNG((Date.now() >>> 0) || 1);
  const ctl = {
    pointer: { x: 0, y: 0, inside: false, down: false, button: -1, type: 'mouse', shift: false, alt: false, ctrl: false, id: -1 },
    hit: null, keys: new Set(), touches: new Map(), active: null, stroke: null, propStroke: null, gesture: null, camDrag: null,
    nextVariant: 0, nextRot: 0, spaceDown: false, lastDab: null, lastT: 0, lastReadout: '', _ghostOn: false,
  };
  const A = () => session.arena;
  const toast = (t, k) => app.toast(t, k);

  // ---------------------------------------------------------------- helpers
  function updateHit() {
    const p = ctl.pointer;
    if (!p.inside) { ctl.hit = null; return null; }
    ctl.hit = host.groundAt(p.x, p.y);
    return ctl.hit;
  }
  const snapPt = (x, z) => { const a = A(); return st.props.snap ? { x: a.worldX(a.cx(x)), z: a.worldZ(a.cz(z)) } : { x, z }; };
  function rollNext() { const pp = st.props, n = Math.min(4, variantCount(pp.type)); ctl.nextVariant = pp.variant >= 0 ? pp.variant : rng.int(0, Math.max(0, n - 1)); ctl.nextRot = pp.randRot ? rng.next() * TAU : pp.rot; }
  function propDef(x, z) {
    const pp = st.props, v = pp.variant >= 0 ? pp.variant : ctl.nextVariant, p = snapPt(x, z);
    return { t: pp.type, x: p.x, z: p.z, r: pp.randRot ? ctl.nextRot : pp.rot, s: pp.scale, v };
  }
  const pickProp = (id) => { for (const [o, rid] of view.rid) if (rid === id) return o; return null; };
  const nearest = (list, x, z, extra = 1) => { let best = null, bd = 1e9; for (const o of list) { const d = Math.hypot(o.x - x, o.z - z); if (d <= (o.r || 1) + extra && d < bd) { bd = d; best = o; } } return best; };
  const strokeOpts = () => ({ radius: st.brush.radius, strength: st.strengths[st.tool], shape: st.brush.shape, falloff: st.brush.falloff, material: st.material, seed: st.noise.seed, noiseScale: st.noise.scale, target: st.flattenTarget });

  // ---------------------------------------------------------------- cursor
  ctl.refreshCursor = function refreshCursor() {
    const p = ctl.pointer, h = ctl.hit, tool = st.tool;
    const ghostWanted = tool === 'props' && st.props.mode === 'place' && h && p.inside && !ctl.camDrag && !ctl.gesture;
    if (!h || !p.inside || ctl.camDrag || ctl.gesture) { view.setCursor(null); view.setLine(null); if (!ghostWanted) view.setGhost(null); return; }
    const x = h.x, z = h.z, t = TOOL_BY_ID[tool];
    let cur = null;
    if (t && t.brush) cur = { kind: st.brush.shape === 'square' ? 'square' : 'circle', x, z, r: st.brush.radius, color: tool === 'raise' && p.shift ? DEL : CUR_COLOR[tool] };
    else if (tool === 'ramp') { cur = { kind: 'circle', x, z, r: Math.max(0.8, st.ramp.width / 2), color: CUR_COLOR.ramp }; view.setLine(st.ramp.a, st.ramp.a ? { x, z } : null, st.ramp.width); }
    else if (tool === 'stamp') cur = { kind: st.stamp.kind === 'trench' || st.stamp.kind === 'ridge' ? 'rot' : 'circle', x, z, r: st.stamp.radius, rot: st.stamp.rot, color: CUR_COLOR.stamp };
    else if (tool === 'props') {
      const m = st.props.mode;
      if (m === 'place') {
        if (p.shift) cur = { kind: 'circle', x, z, r: st.brush.radius, color: CUR_COLOR.props };
        else { const d = propDef(x, z); view.setGhost(d); cur = { kind: 'circle', x: d.x, z: d.z, r: view.footprint(d), color: CUR_COLOR.props }; }
      } else if (m === 'erase') cur = { kind: 'circle', x, z, r: st.brush.radius, color: DEL };
      else cur = { kind: 'cross', x, z, r: 0.5, color: CUR_COLOR.props };
    } else if (tool === 'hazards') { const k = HAZARD_BY_ID[st.hazard.kind]; cur = st.hazard.mode === 'place' ? { kind: 'circle', x, z, r: st.hazard.r, color: k.color } : { kind: 'cross', x, z, r: 0.5, color: st.hazard.mode === 'erase' ? DEL : CUR_COLOR.props }; }
    else if (tool === 'markers') { const k = MARKER_BY_ID[st.marker.type]; cur = st.marker.mode === 'place' ? { kind: 'circle', x, z, r: st.marker.r, color: k.color } : { kind: 'cross', x, z, r: 0.5, color: st.marker.mode === 'erase' ? DEL : CUR_COLOR.props }; }
    else if (tool === 'zones') cur = { kind: 'cross', x, z, r: 0.5, color: CUR_COLOR.zones };
    if (!(tool === 'props' && st.props.mode === 'place' && !p.shift)) view.setGhost(null);
    if (tool !== 'ramp') view.setLine(null);
    view.setCursor(cur);
  };
  function readout() {
    const h = ctl.hit; const txt = h ? app.S.view.hover(h.x.toFixed(1), h.z.toFixed(1), (A().cellHeight(h.x, h.z)).toFixed(1)) : '';
    if (txt !== ctl.lastReadout) { ctl.lastReadout = txt; app.setReadout(txt); }
  }

  // ---------------------------------------------------------------- tool switching
  ctl.setTool = function setTool(id) {
    if (!TOOL_BY_ID[id]) return;
    ctl.endAll();
    st.tool = id; st.ramp.a = null;
    view.setTool(id); view.setSelection(null); view.setSelected({}); view.setLine(null); view.setGhost(null);
    st.props.selected = null; st.hazard.selected = null; st.marker.selected = null;
    if (id === 'props') rollNext();
    if (id === 'zones') view.setActiveZone(st.zoneKey, 'zones');
    app.onToolChanged(id);
    ctl.refreshCursor();
  };
  ctl.setPropsMode = (m) => { st.props.mode = m; st.props.selected = null; view.setSelection(null); if (m === 'place') rollNext(); ctl.refreshCursor(); };
  ctl.setHazardMode = (m) => { st.hazard.mode = m; st.hazard.selected = null; view.setSelected({}); view.setSelection(null); ctl.refreshCursor(); };
  ctl.setMarkerMode = (m) => { st.marker.mode = m; st.marker.selected = null; view.setSelected({}); view.setSelection(null); ctl.refreshCursor(); };

  // ---------------------------------------------------------------- pointer events (from the viewport element)
  ctl.onDown = function onDown(e) {
    const p = ctl.pointer;
    p.x = e.clientX; p.y = e.clientY; p.inside = true; p.shift = e.shiftKey; p.alt = e.altKey; p.ctrl = e.ctrlKey || e.metaKey; p.type = e.pointerType; p.id = e.pointerId;
    if (e.pointerType === 'touch') {
      ctl.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ctl.touches.size === 2) { ctl.endAll(); ctl.beginGesture(); return; }
      if (ctl.touches.size > 2) return;
    }
    p.down = true; p.button = e.button;
    if (e.button === 2) { ctl.camDrag = { kind: 'orbit', x: e.clientX, y: e.clientY }; ctl.refreshCursor(); return; }
    if (e.button === 1 || (e.button === 0 && ctl.spaceDown)) { ctl.camDrag = { kind: 'pan', x: e.clientX, y: e.clientY }; ctl.refreshCursor(); return; }
    if (e.button !== 0) return;
    if ((e.pointerType === 'touch' && st.touchCamera) || !TOOL_HAS_POINTER[st.tool]) { ctl.camDrag = { kind: e.shiftKey ? 'pan' : 'orbit', x: e.clientX, y: e.clientY }; return; }
    updateHit(); ctl.toolDown(e);
  };
  ctl.onMove = function onMove(e) {
    const p = ctl.pointer;
    p.x = e.clientX; p.y = e.clientY; p.inside = true; p.shift = e.shiftKey; p.alt = e.altKey; p.ctrl = e.ctrlKey || e.metaKey;
    if (e.pointerType === 'touch' && ctl.touches.has(e.pointerId)) {
      ctl.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ctl.gesture) { ctl.moveGesture(); return; }
    }
    const d = ctl.camDrag;
    if (d) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
      if (d.kind === 'orbit') rig().rotate(-dx * 0.006 * (app.ctx.settings.get('camSens') || 1), dy * 0.005 * (app.ctx.settings.get('camSens') || 1));
      else ctl.panBy(dx, dy);
    }
  };
  ctl.onUp = function onUp(e) {
    const p = ctl.pointer;
    p.shift = e.shiftKey; p.alt = e.altKey;
    if (e.pointerType === 'touch') { ctl.touches.delete(e.pointerId); if (ctl.gesture) { if (ctl.touches.size < 2) ctl.gesture = null; return; } }
    if (!p.down && !ctl.camDrag) return;
    updateHit(); ctl.toolUp(e);
    p.down = false; ctl.camDrag = null; p.button = -1;
    ctl.refreshCursor();
  };
  ctl.onLeave = function onLeave() { const p = ctl.pointer; if (!p.down) { p.inside = false; ctl.hit = null; ctl.refreshCursor(); app.setReadout(''); ctl.lastReadout = ''; } };
  ctl.onEnter = function onEnter(e) { const p = ctl.pointer; p.inside = true; p.x = e.clientX; p.y = e.clientY; };
  ctl.onWheel = function onWheel(e) {
    e.preventDefault();
    const dy = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120);
    if (e.altKey && ctl.scaleBy(dy < 0 ? 1 : -1)) return;
    rig().zoom(Math.exp(dy * 0.0012));
  };

  // ---------------------------------------------------------------- camera
  ctl.panBy = function panBy(dx, dy) {
    const r = rig(), fov = host.engine.camera.fov * Math.PI / 180, H = host.engine.renderer.domElement.clientHeight || 600;
    const upp = (2 * r.sdist * Math.tan(fov / 2)) / H, sy = Math.max(0.35, Math.sin(r.spitch));
    const rx = Math.cos(r.syaw), rz = -Math.sin(r.syaw), fx = -Math.sin(r.syaw), fz = -Math.cos(r.syaw);
    const mx = -dx * upp, mf = dy * upp / sy;
    r.tx = clamp(r.tx + rx * mx + fx * mf, -r.bounds, r.bounds); r.tz = clamp(r.tz + rz * mx + fz * mf, -r.bounds, r.bounds);
    r.sx = r.tx; r.sz = r.tz;
  };
  ctl.beginGesture = function beginGesture() {
    const t = [...ctl.touches.values()];
    if (t.length < 2) return;
    ctl.gesture = { cx: (t[0].x + t[1].x) / 2, cy: (t[0].y + t[1].y) / 2, dist: Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y), ang: Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x) };
    view.setCursor(null);
  };
  ctl.moveGesture = function moveGesture() {
    const t = [...ctl.touches.values()], g = ctl.gesture;
    if (!g || t.length < 2) return;
    const cx = (t[0].x + t[1].x) / 2, cy = (t[0].y + t[1].y) / 2, dist = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y), ang = Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x);
    if (g.dist > 8 && dist > 8) rig().zoom(g.dist / dist);
    ctl.panBy(cx - g.cx, cy - g.cy);
    let da = ang - g.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    rig().rotate(-da, 0);
    g.cx = cx; g.cy = cy; g.dist = dist; g.ang = ang;
  };

  // ---------------------------------------------------------------- pointer-down per tool
  function dab(x, z) {
    if (!ctl.stroke) return;
    const lower = st.tool === 'raise' && (ctl.pointer.shift || st.touchLower);
    ctl.stroke.dab(x, z, lower);
    if (st.tool === 'flatten' && st.flattenTarget === null && ctl.stroke.stroke.target !== null && ctl.stroke.stroke.target !== undefined) { /* auto target stays per stroke */ }
  }
  ctl.toolDown = function toolDown(e) {
    const h = ctl.hit, tool = st.tool, p = ctl.pointer, a = A();
    if (!h) return;
    const t = TOOL_BY_ID[tool];
    if (t && t.brush) {
      if (tool === 'flatten' && p.alt) { st.flattenTarget = Math.round(a.cellHeight(h.x, h.z) / HSTEP); if (app.onFlattenTarget) app.onFlattenTarget(); toast(app.S.flatten.sampled((st.flattenTarget * 0.5).toFixed(1))); app.sfx('ui_select'); p.down = false; return; }
      ctl.stroke = session.beginStroke(tool, strokeOpts());
      ctl.lastDab = { x: h.x, z: h.z }; ctl.lastT = now(); dab(h.x, h.z);
      ctl.active = { kind: 'stroke' }; return;
    }
    switch (tool) {
      case 'ramp': {
        if (!st.ramp.a) { st.ramp.a = { x: h.x, z: h.z }; ctl.active = { kind: 'ramp', moved: false, sx: p.x, sy: p.y }; app.sfx('ui_select'); if (app.onRampState) app.onRampState(); }
        else { ctl.finishRamp(h); }
        break;
      }
      case 'stamp': {
        const r = session.stamp(st.stamp.kind, h.x, h.z, { radius: st.stamp.radius, strength: st.stamp.strength, rot: st.stamp.rot });
        if (r) { app.sfx('ui_place'); app.afterEdit(); }
        break;
      }
      case 'props': ctl.propsDown(h); break;
      case 'hazards': ctl.hazardsDown(h); break;
      case 'markers': ctl.markersDown(h); break;
      case 'zones': ctl.zonesDown(h); break;
      default: break;
    }
  };

  // ---- ramp
  ctl.finishRamp = function finishRamp(h) {
    const a0 = st.ramp.a; st.ramp.a = null; view.setLine(null);
    if (!a0 || Math.hypot(h.x - a0.x, h.z - a0.z) < 1.5) { if (app.onRampState) app.onRampState(); return; }
    const r = session.ramp([a0, { x: h.x, z: h.z }], { width: st.ramp.width });
    if (r) { app.sfx('ui_place'); toast(app.S.ramp.done(r.removed)); app.afterEdit(); }
    if (app.onRampState) app.onRampState();
  };

  // ---- props
  ctl.propsDown = function propsDown(h) {
    const pp = st.props, p = ctl.pointer, a = A();
    if (pp.mode === 'place') {
      if (p.shift || st.touchLower) { ctl.propStroke = session.beginPropStroke('Scatter props'); ctl.active = { kind: 'scatter', last: { x: h.x, z: h.z }, t: 0, total: 0 }; ctl.scatter(h); return; }
      const added = session.addProp(propDef(h.x, h.z));
      if (!added.length) { toast(app.S.props.full, 'warn'); app.sfx('ui_error'); } else { app.sfx('ui_place'); rollNext(); app.afterEdit(); }
      ctl.refreshCursor();
    } else if (pp.mode === 'erase') {
      ctl.propStroke = session.beginPropStroke('Delete props'); ctl.active = { kind: 'erase', n: 0 }; ctl.eraseAt(h);
    } else {
      const ray = host.ray(p.x, p.y), hit = host.props.pick(ray.o, ray.d, 600), obj = hit ? pickProp(hit.id) : null;
      ctl.selectProp(obj);
      if (obj) ctl.active = { kind: 'propdrag', p: obj, ox: obj.x - h.x, oz: obj.z - h.z, orig: { x: obj.x, z: obj.z }, moved: false };
      void a;
    }
  };
  ctl.selectProp = function selectProp(obj) {
    st.props.selected = obj || null;
    view.setSelection(obj ? { x: obj.x, z: obj.z, r: view.footprint(obj) } : null);
    if (obj) app.sfx('ui_select');
    if (app.onPropSelection) app.onPropSelection();
  };
  ctl.scatter = function scatter(h) {
    const pp = st.props, a = A(), info = propInfo(pp.type) || { r: 0.5 }, R = st.brush.radius, ps = ctl.propStroke; if (!ps) return;
    const defs = [], minD = Math.max(0.6, info.r * pp.scale * 1.4);
    for (let i = 0, tries = 0; i < pp.density && tries < pp.density * 6; tries++) {
      const ang = rng.next() * TAU, d = Math.sqrt(rng.next()) * R, x = h.x + Math.cos(ang) * d, z = h.z + Math.sin(ang) * d;
      if (Math.abs(x) > a.half() - 0.6 || Math.abs(z) > a.half() - 0.6) continue;
      if (defs.some((q) => Math.hypot(q.x - x, q.z - z) < minD)) continue;
      const n = Math.min(4, variantCount(pp.type)), sp = snapPt(x, z);
      defs.push({ t: pp.type, x: sp.x, z: sp.z, r: pp.randRot || true ? rng.next() * TAU : pp.rot, s: clamp(pp.scale * (0.88 + rng.next() * 0.28), 0.3, 4), v: pp.variant >= 0 ? pp.variant : rng.int(0, Math.max(0, n - 1)) });
      i++;
    }
    const added = ps.add(defs);
    if (added.length) { ctl.active.total += added.length; app.sfx('ui_tick'); }
    if (defs.length && !added.length && !ctl.active.warned) { ctl.active.warned = true; toast(app.S.props.full, 'warn'); app.sfx('ui_error'); }
  };
  ctl.eraseAt = function eraseAt(h) {
    const ps = ctl.propStroke; if (!ps) return;
    const n = ps.remove(session.propsNear(h.x, h.z, st.brush.radius));
    if (n) { ctl.active.n += n; app.sfx('ui_erase'); }
  };
  ctl.patchSelectedProp = function patchSelectedProp(after) {
    const p = st.props.selected; if (!p) return;
    const ps = session.beginPropStroke('Edit prop'); ps.patch(p, after); ps.end(); view.setSelection({ x: p.x, z: p.z, r: view.footprint(p) }); app.afterEdit();
  };
  ctl.duplicateSelectedProp = function duplicateSelectedProp() {
    const p = st.props.selected; if (!p) return;
    const added = session.addProp({ t: p.t, x: p.x + 1.5, z: p.z + 1.5, r: p.r, s: p.s, v: p.v }, { sym: false });
    if (added.length) { ctl.selectProp(added[0]); app.sfx('ui_place'); app.afterEdit(); }
  };
  ctl.deleteSelectedProp = function deleteSelectedProp() {
    const p = st.props.selected; if (!p) return;
    session.removeProps([p], 'Delete prop'); ctl.selectProp(null); app.sfx('ui_erase'); app.afterEdit();
  };
  ctl.scaleBy = function scaleBy(dir) {
    if (st.tool !== 'props') return false;
    const pp = st.props, p = pp.selected, f = dir > 0 ? 1.06 : 1 / 1.06;
    if (pp.mode === 'select' && p) { const sc = (propInfo(p.t) || {}).scale || [0.7, 1.6]; const s = clamp(Math.round(p.s * f * 100) / 100, sc[0], sc[1]); if (s !== p.s) ctl.patchSelectedProp({ s }); return true; }
    if (pp.mode === 'place') { const sc = (propInfo(pp.type) || {}).scale || [0.7, 1.6]; pp.scale = clamp(Math.round(pp.scale * f * 100) / 100, sc[0], sc[1]); if (app.onPropScale) app.onPropScale(); ctl.refreshCursor(); return true; }
    return false;
  };
  ctl.rotateBy = function rotateBy(dir) {
    const step = PROP_TOOL.rotStep * dir;
    if (st.tool === 'stamp') { st.stamp.rot += step; if (app.onStampRot) app.onStampRot(); ctl.refreshCursor(); return true; }
    if (st.tool !== 'props') return false;
    const pp = st.props, p = pp.selected;
    if (pp.mode === 'select' && p) { ctl.patchSelectedProp({ r: Math.round((p.r + step) * 1000) / 1000 }); return true; }
    if (pp.mode === 'place') { pp.rot += step; if (app.onPropRot) app.onPropRot(); if (pp.randRot) rollNext(); ctl.refreshCursor(); return true; }
    return false;
  };

  // ---- hazards
  ctl.hazardsDown = function hazardsDown(h) {
    const hz = st.hazard, a = A();
    if (hz.mode === 'place') {
      const out = session.placeHazard({ t: hz.kind, x: h.x, z: h.z, r: hz.r });
      if (!out.length) { toast(app.S.hazards.full, 'warn'); app.sfx('ui_error'); } else { app.sfx('ui_place'); app.afterEdit(); }
    } else {
      const obj = nearest(a.hazards, h.x, h.z);
      if (hz.mode === 'erase') { if (obj) { session.removeHazards([obj]); app.sfx('ui_erase'); toast(app.S.hazards.removed); app.afterEdit(); } return; }
      hz.selected = obj || null; view.setSelected({ hazard: obj }); view.setSelection(obj ? { x: obj.x, z: obj.z, r: obj.r } : null); if (app.onHazardSelection) app.onHazardSelection();
      if (obj) { app.sfx('ui_select'); ctl.active = { kind: 'hzdrag', o: obj, ox: obj.x - h.x, oz: obj.z - h.z, orig: { x: obj.x, z: obj.z }, moved: false }; }
    }
  };
  ctl.patchSelectedHazard = function patchSelectedHazard(after) { const o = st.hazard.selected; if (!o) return; session.patchHazard(o, after); view.setSelection({ x: o.x, z: o.z, r: o.r }); app.afterEdit(); };
  ctl.deleteSelectedHazard = function deleteSelectedHazard() { const o = st.hazard.selected; if (!o) return; session.removeHazards([o]); st.hazard.selected = null; view.setSelected({}); view.setSelection(null); if (app.onHazardSelection) app.onHazardSelection(); app.sfx('ui_erase'); app.afterEdit(); };

  // ---- markers
  ctl.markersDown = function markersDown(h) {
    const mk = st.marker, a = A();
    if (mk.mode === 'place') {
      const before = a.markers.length, m = session.addMarker({ type: mk.type, x: h.x, z: h.z, r: mk.r });
      if (!m) { toast(app.S.markers.full, 'warn'); app.sfx('ui_error'); } else { app.sfx('ui_place'); if (a.markers.length === before) toast(app.S.markers.moved(app.S.markers.types[mk.type])); app.afterEdit(); }
    } else {
      const obj = nearest(a.markers, h.x, h.z, 1.2);
      if (mk.mode === 'erase') { if (obj) { session.removeMarkers([obj]); app.sfx('ui_erase'); toast(app.S.markers.removed); app.afterEdit(); } return; }
      mk.selected = obj || null; view.setSelected({ marker: obj }); view.setSelection(obj ? { x: obj.x, z: obj.z, r: obj.r } : null); if (app.onMarkerSelection) app.onMarkerSelection();
      if (obj) { app.sfx('ui_select'); ctl.active = { kind: 'mkdrag', o: obj, ox: obj.x - h.x, oz: obj.z - h.z, orig: { x: obj.x, z: obj.z }, moved: false }; }
    }
  };
  ctl.patchSelectedMarker = function patchSelectedMarker(after) { const o = st.marker.selected; if (!o) return; session.patchMarker(o, after); view.setSelection({ x: o.x, z: o.z, r: o.r }); app.afterEdit(); };
  ctl.deleteSelectedMarker = function deleteSelectedMarker() { const o = st.marker.selected; if (!o) return; session.removeMarkers([o]); st.marker.selected = null; view.setSelected({}); view.setSelection(null); if (app.onMarkerSelection) app.onMarkerSelection(); app.sfx('ui_erase'); app.afterEdit(); };

  // ---- zones
  ctl.zonesDown = function zonesDown(h) {
    const a = A(), key = st.zoneKey, zn = a.zones[key], W = a.worldSize();
    session.beginGesture();
    const tol = Math.max(1.2, rig().sdist * 0.028);
    if (zn) {
      const b = zoneBox(zn), nearX0 = Math.abs(h.x - b.x0) < tol, nearX1 = Math.abs(h.x - b.x1) < tol, nearZ0 = Math.abs(h.z - b.z0) < tol, nearZ1 = Math.abs(h.z - b.z1) < tol;
      const inX = h.x > b.x0 - tol && h.x < b.x1 + tol, inZ = h.z > b.z0 - tol && h.z < b.z1 + tol;
      if (inX && inZ && (nearX0 || nearX1 || nearZ0 || nearZ1)) { ctl.active = { kind: 'zone', mode: 'resize', key, orig: Object.assign({}, zn), edges: { l: nearX0, r: nearX1, t: nearZ0, b: nearZ1 }, W }; return; }
      if (h.x >= b.x0 && h.x <= b.x1 && h.z >= b.z0 && h.z <= b.z1) { ctl.active = { kind: 'zone', mode: 'move', key, orig: Object.assign({}, zn), ox: zn.x - h.x, oz: zn.z - h.z, W }; return; }
    }
    ctl.active = { kind: 'zone', mode: 'draw', key, sx: h.x, sz: h.z, W };
  };
  function zoneRectFor(act, h) {
    const W = act.W, lim = W / 2, min = LIMITS.zoneMin;
    let x0, x1, z0, z1;
    if (act.mode === 'draw') { x0 = Math.min(act.sx, h.x); x1 = Math.max(act.sx, h.x); z0 = Math.min(act.sz, h.z); z1 = Math.max(act.sz, h.z); if (x1 - x0 < min) x1 = x0 + min; if (z1 - z0 < min) z1 = z0 + min; }
    else if (act.mode === 'move') { const o = act.orig; const cx = clamp(h.x + act.ox, -lim + o.w / 2, lim - o.w / 2), cz = clamp(h.z + act.oz, -lim + o.d / 2, lim - o.d / 2); return { x: cx, z: cz, w: o.w, d: o.d }; }
    else { const o = act.orig, b = zoneBox(o); x0 = b.x0; x1 = b.x1; z0 = b.z0; z1 = b.z1; const e = act.edges; if (e.l) x0 = Math.min(h.x, x1 - min); if (e.r) x1 = Math.max(h.x, x0 + min); if (e.t) z0 = Math.min(h.z, z1 - min); if (e.b) z1 = Math.max(h.z, z0 + min); }
    x0 = clamp(x0, -lim, lim - min); x1 = clamp(x1, x0 + min, lim); z0 = clamp(z0, -lim, lim - min); z1 = clamp(z1, z0 + min, lim);
    return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
  }
  ctl.mirrorZone = function mirrorZone() {
    const a = A(), key = st.zoneKey, src = a.zones[key], other = key === 'A' ? 'B' : 'A'; if (!src) return;
    session.beginGesture(); session.setZone(other, { x: -src.x, z: -src.z, w: src.w, d: src.d }); session.endGesture(); app.sfx('ui_confirm'); app.afterEdit();
  };
  ctl.resetZones = function resetZones() {
    const W = A().worldSize(); session.beginGesture(); session.setZone('A', { x: -W * 0.28, z: 0, w: W * 0.22, d: W * 0.7 }); session.setZone('B', { x: W * 0.28, z: 0, w: W * 0.22, d: W * 0.7 }); session.endGesture(); app.sfx('ui_confirm'); app.afterEdit();
  };
  ctl.removeZone = function removeZone() { session.setZone(st.zoneKey, null); app.sfx('ui_erase'); app.afterEdit(); };

  // ---------------------------------------------------------------- pointer-up per tool
  ctl.toolUp = function toolUp() {
    const act = ctl.active, h = ctl.hit;
    if (ctl.stroke) { ctl.stroke.end(); ctl.stroke = null; app.afterEdit(); }
    if (ctl.propStroke) {
      const kind = act && act.kind; const total = act && (act.total || act.n) || 0;
      ctl.propStroke.end(); ctl.propStroke = null;
      if (kind === 'scatter' && total) toast(app.S.props.scattered(total)); else if (kind === 'erase' && total) toast(app.S.props.removed(total));
      app.afterEdit();
    }
    if (act) {
      if (act.kind === 'ramp') { if (act.moved && h) ctl.finishRamp(h); }
      else if (act.kind === 'propdrag' && act.moved) {
        const o = act.p, nx = o.x, nz = o.z; o.x = act.orig.x; o.z = act.orig.z;
        const ps = session.beginPropStroke('Move prop'); ps.patch(o, { x: nx, z: nz }); ps.end(); view.setSelection({ x: o.x, z: o.z, r: view.footprint(o) }); app.afterEdit();
      } else if (act.kind === 'hzdrag' && act.moved) { const o = act.o, nx = o.x, nz = o.z; o.x = act.orig.x; o.z = act.orig.z; session.patchHazard(o, { x: nx, z: nz }); view.setSelection({ x: o.x, z: o.z, r: o.r }); app.afterEdit(); }
      else if (act.kind === 'mkdrag' && act.moved) { const o = act.o, nx = o.x, nz = o.z; o.x = act.orig.x; o.z = act.orig.z; session.patchMarker(o, { x: nx, z: nz }); view.setSelection({ x: o.x, z: o.z, r: o.r }); app.afterEdit(); }
      else if (act.kind === 'zone') { session.endGesture(); app.afterEdit(); }
    }
    ctl.active = null;
  };
  /** Abort everything in flight (tool change, second finger, leaving). Commits strokes so no edit is lost. */
  ctl.endAll = function endAll() {
    if (ctl.stroke) { ctl.stroke.end(); ctl.stroke = null; app.afterEdit(); }
    if (ctl.propStroke) { ctl.propStroke.end(); ctl.propStroke = null; app.afterEdit(); }
    const act = ctl.active;
    if (act && act.kind === 'zone') session.endGesture();
    if (act && act.kind === 'propdrag') { act.p.x = act.orig.x; act.p.z = act.orig.z; view.touchProp(act.p); }
    if (act && act.kind === 'hzdrag') { act.o.x = act.orig.x; act.o.z = act.orig.z; session.patchHazard(act.o, {}); }
    if (act && act.kind === 'mkdrag') { act.o.x = act.orig.x; act.o.z = act.orig.z; session.patchMarker(act.o, {}); }
    ctl.active = null; ctl.pointer.down = false; ctl.camDrag = null; session.endGesture();
  };

  // ---------------------------------------------------------------- per frame
  ctl.frame = function frame(dt) {
    const p = ctl.pointer, r = rig();
    // keyboard camera
    const k = ctl.keys;
    if (k.size && !app.modalOpen) {
      const fast = k.has('ShiftLeft') || k.has('ShiftRight') ? 2.2 : 1;
      let rr = 0, ff = 0;
      if (k.has('KeyD') || k.has('ArrowRight')) rr += 1; if (k.has('KeyA') || k.has('ArrowLeft')) rr -= 1; if (k.has('KeyW') || k.has('ArrowUp')) ff += 1; if (k.has('KeyS') || k.has('ArrowDown')) ff -= 1;
      if (rr || ff) r.pan(rr * fast, ff * fast, dt);
      if (k.has('KeyQ')) r.rotate(1.6 * dt, 0); if (k.has('KeyE')) r.rotate(-1.6 * dt, 0);
    }
    if (!p.inside && !p.down) return;
    updateHit();
    const h = ctl.hit, act = ctl.active;
    if (h && !ctl.camDrag && !ctl.gesture) {
      if (ctl.stroke && p.down) {
        const l = ctl.lastDab, dx = h.x - l.x, dz = h.z - l.z, d = Math.hypot(dx, dz), sp = Math.max(0.35, st.brush.radius * 0.22), t = now();
        if (d >= sp) { const n = Math.min(40, Math.floor(d / sp)); for (let i = 1; i <= n; i++) dab(l.x + dx * i / n, l.z + dz * i / n); ctl.lastDab = { x: l.x + dx * n / n, z: l.z + dz * n / n }; ctl.lastT = t; }
        else if (st.tool !== 'paint' && t - ctl.lastT >= 45) { dab(h.x, h.z); ctl.lastT = t; }
      } else if (act && p.down) {
        switch (act.kind) {
          case 'scatter': { const t = now(); if (t - act.t > 110 && Math.hypot(h.x - act.last.x, h.z - act.last.z) >= Math.max(0.6, st.brush.radius * 0.35) || t - act.t > 450) { act.t = t; act.last = { x: h.x, z: h.z }; ctl.scatter(h); } break; }
          case 'erase': ctl.eraseAt(h); break;
          case 'propdrag': { const sp = snapPt(h.x + act.ox, h.z + act.oz), o = act.p; if (Math.hypot(sp.x - o.x, sp.z - o.z) > 0.02) { act.moved = true; o.x = Math.round(sp.x * 100) / 100; o.z = Math.round(sp.z * 100) / 100; view.touchProp(o); view.setSelection({ x: o.x, z: o.z, r: view.footprint(o) }); } break; }
          case 'hzdrag': { const o = act.o; const nx = h.x + act.ox, nz = h.z + act.oz; if (Math.hypot(nx - o.x, nz - o.z) > 0.02) { act.moved = true; o.x = nx; o.z = nz; view.dirty.hazards = true; view.setSelection({ x: o.x, z: o.z, r: o.r }); } break; }
          case 'mkdrag': { const o = act.o; const nx = h.x + act.ox, nz = h.z + act.oz; if (Math.hypot(nx - o.x, nz - o.z) > 0.02) { act.moved = true; o.x = nx; o.z = nz; view.dirty.markers = true; view.setSelection({ x: o.x, z: o.z, r: o.r }); } break; }
          case 'ramp': if (Math.hypot(p.x - act.sx, p.y - act.sy) > 6) act.moved = true; break;
          case 'zone': session.setZone(act.key, zoneRectFor(act, h)); break;
          default: break;
        }
      }
    }
    ctl.refreshCursor(); readout();
  };

  // ---------------------------------------------------------------- keyboard
  ctl.onKeyDown = function onKeyDown(e) {
    const code = e.code, mod = e.ctrlKey || e.metaKey;
    if (code === 'Space') { ctl.spaceDown = true; }
    if (mod) {
      if (code === 'KeyZ') { e.shiftKey ? app.redo() : app.undo(); return true; }
      if (code === 'KeyY') { app.redo(); return true; }
      if (code === 'KeyS') { app.save(); return true; }
      if (code === 'Enter') { app.playtest(); return true; }
      return false;
    }
    if (e.altKey) return false;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
      ctl.keys.add(code); ctl.pointer.shift = e.shiftKey;
      if (code.startsWith('Arrow') || code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' || code === 'KeyQ' || code === 'KeyE') return true;
      return false;
    }
    const tool = TOOLS.find((t) => t.key === code);
    if (tool) {
      if (tool.id === 'symmetry' && st.tool === 'symmetry') { const order = ['off', 'mx', 'mz', 'rot']; const n = order[(order.indexOf(session.symmetry) + 1) % order.length]; session.setSymmetry(n); app.toast(app.S.toast.symmetry(app.S.symmetry.modes[n])); app.sfx('ui_tick'); }
      else { app.sfx('ui_tick'); ctl.setTool(tool.id); }
      return true;
    }
    switch (code) {
      case 'BracketLeft': case 'BracketRight': {
        const up = code === 'BracketRight';
        if (e.shiftKey) { const t = st.tool; if (st.strengths[t] !== undefined) { st.strengths[t] = clamp(Math.round((st.strengths[t] + (up ? 0.1 : -0.1)) * 10) / 10, 0.1, 1); app.syncBrushWidgets(); } }
        else { st.brush.radius = clamp(st.brush.radius + (up ? 1 : -1), BRUSH.radiusMin, BRUSH.radiusMax); app.syncBrushWidgets(); ctl.refreshCursor(); }
        return true;
      }
      case 'KeyB': { const i = BRUSH_CYCLE.findIndex((b) => b.shape === st.brush.shape && b.falloff === st.brush.falloff), n = BRUSH_CYCLE[(i + 1) % BRUSH_CYCLE.length]; st.brush.shape = n.shape; st.brush.falloff = n.falloff; app.syncBrushWidgets(); app.toast(app.S.brush.cycleToast(app.S.brush.shapes[n.shape], app.S.brush.falloffs[n.falloff])); app.sfx('ui_tick'); ctl.refreshCursor(); return true; }
      case 'KeyR': return ctl.rotateBy(e.shiftKey ? -1 : 1);
      case 'KeyT': app.toggleTopDown(); return true;
      case 'KeyF': case 'Home': app.frameArena(); return true;
      case 'Delete': case 'Backspace': {
        if (st.tool === 'props' && st.props.selected) { ctl.deleteSelectedProp(); return true; }
        if (st.tool === 'hazards' && st.hazard.selected) { ctl.deleteSelectedHazard(); return true; }
        if (st.tool === 'markers' && st.marker.selected) { ctl.deleteSelectedMarker(); return true; }
        return false;
      }
      case 'Slash': if (e.shiftKey) { app.showShortcuts(); return true; } return false;
      default: return false;
    }
  };
  ctl.onKeyUp = function onKeyUp(e) { ctl.keys.delete(e.code); if (e.code === 'Space') ctl.spaceDown = false; ctl.pointer.shift = e.shiftKey; };
  ctl.clearKeys = () => { ctl.keys.clear(); ctl.spaceDown = false; };
  /** Esc: drop the transient state first. Returns true when something was cancelled. */
  ctl.cancel = function cancel() {
    if (ctl.active || ctl.stroke || ctl.propStroke || ctl.camDrag) { ctl.endAll(); ctl.refreshCursor(); return true; }
    if (st.ramp.a) { st.ramp.a = null; view.setLine(null); if (app.onRampState) app.onRampState(); return true; }
    if (st.props.selected) { ctl.selectProp(null); return true; }
    if (st.hazard.selected || st.marker.selected) { st.hazard.selected = null; st.marker.selected = null; view.setSelected({}); view.setSelection(null); if (app.onHazardSelection) app.onHazardSelection(); if (app.onMarkerSelection) app.onMarkerSelection(); return true; }
    return false;
  };
  ctl.dispose = function dispose() { ctl.endAll(); view.setCursor(null); view.setGhost(null); };
  rollNext();
  return ctl;
}

const TOOL_HAS_POINTER = { raise: true, smooth: true, flatten: true, paint: true, noise: true, ramp: true, stamp: true, props: true, hazards: true, markers: true, zones: true, water: false, symmetry: false, generate: false, environment: false, info: false };
export { MAT, TOOLS };
