// "Fix" buttons of the validator panel (pure; every fix is one undoable step on an EditSession).
import { propInfo } from '../../content/era_ancient/props/catalog.js';
import { LIMITS, PATH_RADII } from './consts.js';
import { clamp, zoneBox } from './geom.js';
import { buildNav, pathExists, findCarvePath, carveRamp, levelZone, raiseZone, zoneNavCells } from './paths.js';

const defaultZone = (W, k) => ({ x: (k === 'A' ? -1 : 1) * W * 0.28, z: 0, w: W * 0.22, d: W * 0.7 });

function fit(W, z) {
  const w = clamp(z.w, LIMITS.zoneMin, W), d = clamp(z.d, LIMITS.zoneMin, W);
  return { x: clamp(z.x, -W / 2 + w / 2, W / 2 - w / 2), z: clamp(z.z, -W / 2 + d / 2, W / 2 - d / 2), w, d };
}
/** Nearest walkable spot to (x, z) on the nav grid (spiral search), or the point itself. */
export function nearestWalkable(nav, x, z) {
  const cx = nav.cx(x), cz = nav.cz(z);
  for (let r = 0; r < 24; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const i = cx + dx + (cz + dz) * nav.n;
      if (cx + dx < 0 || cz + dz < 0 || cx + dx >= nav.n || cz + dz >= nav.n) continue;
      if (nav.walk[i] && !nav.block[i] && !nav.soft[i]) return { x: nav.worldX(cx + dx), z: nav.worldZ(cz + dz) };
    }
  }
  return { x, z };
}

function removeBlockers(t, list) { const log = t.log('props'); for (const p of list) log.remove(p); }

/** Run a carve-a-ramp fix in ONE undo step: widen the corridor up to three times until both radii pass. */
export function carveFix(sess) {
  const a = sess.arena, t = sess.tx('Carve a ramp');
  let carved = false;
  for (const width of [4, 6, 8]) {
    const nav = buildNav(a);
    if (PATH_RADII.every((r) => pathExists(nav, a, r).ok)) break;
    const line = findCarvePath(nav, a); if (!line) break;
    const res = carveRamp(a, t.rec, line, { width, paint: true });
    if (!res) break;
    removeBlockers(t, res.blockers); carved = true;
  }
  const cmd = t.commit();
  return !!cmd || carved;
}

/** Apply a fix by id. `issue.params` carries the zone key etc. Returns true when something changed. */
export function applyFix(sess, issue) {
  const a = sess.arena, W = a.worldSize(), p = issue.params || {};
  switch (issue.fix) {
    case 'add_zone': sess.setZone(p.zone, defaultZone(W, p.zone)); return true;
    case 'fit_zone': sess.setZone(p.zone, fit(W, a.zones[p.zone])); return true;
    case 'separate_zones': {
      const A = fit(W, a.zones.A), B = fit(W, a.zones.B);
      A.x = -W / 2 + A.w / 2 + 2; B.x = W / 2 - B.w / 2 - 2;
      if (zoneBox(A).x1 > zoneBox(B).x0) { A.w = B.w = W * 0.3; A.x = -W / 2 + A.w / 2 + 2; B.x = W / 2 - B.w / 2 - 2; }
      sess.beginGesture(); sess.setZone('A', fit(W, A)); sess.setZone('B', fit(W, B)); sess.endGesture();
      return true;
    }
    case 'level_zone': {
      const zn = a.zones[p.zone]; if (!zn) return false;
      const t = sess.tx('Level zone ' + p.zone), r = levelZone(a, t.rec, zn);
      removeBlockers(t, r.blockers); return !!t.commit();
    }
    case 'raise_zone': {
      const zn = a.zones[p.zone]; if (!zn) return false;
      const t = sess.tx('Raise zone ' + p.zone); raiseZone(a, t.rec, zn); return !!t.commit();
    }
    case 'carve_ramp': { const prev = sess.symmetry; sess.symmetry = 'off'; try { return carveFix(sess); } finally { sess.symmetry = prev; } }
    case 'remove_unknown': return sess.removeProps(a.props.filter((q) => !propInfo(q.t)), 'Remove unknown props') > 0;
    case 'trim_props': return sess.removeProps(a.props.slice(LIMITS.props), 'Trim props') > 0;
    case 'trim_hazards': return !!sess.removeHazards(a.hazards.slice(LIMITS.hazards));
    case 'trim_markers': return !!sess.removeMarkers(a.markers.slice(LIMITS.markers));
    case 'fit_markers': {
      const half = W / 2, t = sess.tx('Move markers'), log = t.log('markers');
      for (const m of a.markers) if (Math.abs(m.x) > half || Math.abs(m.z) > half) log.patch(m, { x: clamp(m.x, -half, half), z: clamp(m.z, -half, half) });
      return !!t.commit();
    }
    case 'add_objective_markers': return addObjectiveMarkers(sess, p);
    case 'name_default': sess.setName(String(a.name || '').trim().slice(0, LIMITS.nameMax) || 'Untitled Arena'); return true;
    default: return false;
  }
}

function addObjectiveMarkers(sess, p) {
  const a = sess.arena, nav = buildNav(a), W = a.worldSize();
  const zc = (k) => { const z = a.zones[k]; return z ? { x: z.x, z: z.z, w: z.w } : { x: (k === 'A' ? -1 : 1) * W * 0.28, z: 0, w: W * 0.2 }; };
  const spot = {
    hill: () => nearestWalkable(nav, 0, 0),
    vip_start: () => nearestWalkable(nav, zc('A').x, zc('A').z),
    exit: () => nearestWalkable(nav, zc('B').x, zc('B').z),
    general_spawn: () => { const b = zc('B'); return nearestWalkable(nav, b.x + b.w * 0.25, b.z); },
  };
  let changed = false;
  for (const type of p.missing || []) { const s = spot[type] && spot[type](); if (s && sess.addMarker({ type, x: s.x, z: s.z })) changed = true; }
  if ((p.missingProps || []).includes('gate_door')) {
    const ps = sess.beginPropStroke('Add a gate');
    ps.add([{ t: 'arch_gate', x: 0, z: 0, r: Math.PI / 2, s: 1, v: 0 }, { t: 'gate_door', x: 0, z: -2, r: Math.PI / 2, s: 1, v: 0 }, { t: 'gate_door', x: 0, z: 2, r: Math.PI / 2, s: 1, v: 0 }], { sym: false });
    ps.end(); changed = true;
  }
  void zoneNavCells;
  return changed;
}
