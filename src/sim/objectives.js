// Objectives (world.md §5): eliminate | kill_general | hold_hill | protect_vip | survive_waves | destroy | timeout (a time limit on any of them).
// createObjective(world, spec) -> { id, type, playerTeam, update(w,dt), start(w), blocksElimination, progress, state, hud() }
//   spec = { type, params:{...}, markerIds:[...], timeLimit?, onTimeout?:'lose'|'draw'|'win', playerTeam?:0 }
// Markers come from arena.markers ({id,type:'hill|exit|vip_start|general_spawn|waypoint',x,z,r}); the objective reads them by id or by type.
// The world calls update() every running tick; objectives end the battle with world.end(winner,'objective') (or 'time' for a timeout) and emit
// objective_update{id,state,progress} when the state changes or progress moves by >= 2% (at most 4 per second).
import { ST } from './consts.js';

class Objective {
  constructor(w, spec) {
    this.w = w; this.spec = spec; this.type = spec.type; this.id = spec.id || spec.type; this.params = spec.params || {};
    this.playerTeam = spec.playerTeam === 1 ? 1 : 0; this.enemy = 1 - this.playerTeam;
    this.progress = 0; this.state = 'active'; this.blocksElimination = false; this.timeLimit = spec.timeLimit || 0; this.onTimeout = spec.onTimeout || 'lose';
    this.markers = this._markers(spec.markerIds); this._lastP = -1; this._lastState = ''; this._lastEmit = -9; this.done = false;
  }
  _markers(ids) {
    const all = this.w.arena.markers || [];
    if (ids && ids.length) return all.filter((m) => ids.includes(m.id));
    return all;
  }
  marker(type) { for (const m of this.markers) if (m.type === type) return m; return null; }
  _emit(force) {
    const w = this.w;
    if (!force && Math.abs(this.progress - this._lastP) < 0.02 && this.state === this._lastState) return;
    if (!force && w.time - this._lastEmit < 0.25 && this.state === this._lastState) return;
    this._lastP = this.progress; this._lastState = this.state; this._lastEmit = w.time;
    const e = w.P.objective_update; e.id = this.id; e.state = this.state; e.progress = this.progress; w.emit('objective_update', e);
  }
  win() { if (this.done) return; this.done = true; this.progress = 1; this.state = 'complete'; this._emit(true); this.w.end(this.playerTeam, 'objective'); }
  lose() { if (this.done) return; this.done = true; this.state = 'failed'; this._emit(true); this.w.end(this.enemy, 'objective'); }
  start(w) { this._emit(true); }
  update(w, dt) {
    if (this.done) return;
    this.step(w, dt);
    if (this.done) return;
    if (this.timeLimit > 0 && w.time >= this.timeLimit) {
      this.done = true; this.state = 'failed'; this._emit(true);
      w.end(this.onTimeout === 'win' ? this.playerTeam : this.onTimeout === 'draw' ? -1 : this.enemy, 'time');
      return;
    }
    this._emit(false);
  }
  step() {}
  hud() { return { id: this.id, type: this.type, progress: this.progress, state: this.state, markers: this.markers, timeLimit: this.timeLimit }; }
}

class Eliminate extends Objective {
  step(w) { const total = w.stats[this.enemy].startCount || 1; this.progress = 1 - w.stats[this.enemy].alive / total; }
}

/** Kill the enemy general(s); the general avoids contact (ai guard). The player loses if all of its own flagged generals die (when it has any). */
class KillGeneral extends Objective {
  start(w) { this.gens = []; this.mine = []; this.total = 1; this._scan(w); super.start(w); }
  /** (Re)collect generals: also picks up reinforcements / wave spawns that arrive later. */
  _scan(w) {
    for (const u of w.units) {
      if (!u.alive || !u.general) continue;
      if (u.team === this.enemy && !this.gens.includes(u)) { u.guard = true; if (u.squad && u.squad.units.length === 1) u.squad.order = 'hold'; this.gens.push(u); }
      else if (u.team === this.playerTeam && this.params.loseOnGeneral && !this.mine.includes(u)) this.mine.push(u);
    }
    this.total = Math.max(this.total, this.gens.length, 1);
  }
  step(w) {
    if (!this.gens.length || (w.tickN % 30) === 0) this._scan(w);
    let alive = 0; for (const g of this.gens) if (g.alive) alive++;
    this.progress = 1 - alive / this.total;
    if (this.gens.length && alive === 0) this.win();
    else if (this.mine.length) { let a = 0; for (const g of this.mine) if (g.alive) a++; if (a === 0) this.lose(); }
  }
}

/** Keep >= 1 allied unit inside the hill circle with no enemy inside for `time` cumulative seconds. */
class HoldHill extends Objective {
  start(w) { this.hill = this.marker('hill') || this.markers[0] || { x: 0, z: 0, r: 6 }; this.need = this.params.time || 60; this.held = 0; super.start(w); }
  step(w, dt) {
    const h = this.hill, r = h.r || 6, r2 = r * r; let mine = 0, theirs = 0;
    for (const u of w.units) {
      if (!u.alive || u.state === ST.DOWN) continue;
      const dx = u.x - h.x, dz = u.z - h.z; if (dx * dx + dz * dz > r2) continue;
      if (u.team === this.playerTeam) mine++; else theirs++;
    }
    if (mine > 0 && theirs === 0) { this.held += dt; this.state = 'held'; } else this.state = mine === 0 && theirs === 0 ? 'empty' : 'contested';
    this.progress = Math.min(1, this.held / this.need);
    if (this.held >= this.need) this.win();
  }
}

/** The VIP (unit.vip on the player's team, else the player's first hero) must survive `time` seconds or reach the exit marker. */
class ProtectVip extends Objective {
  start(w) {
    this.vip = null;
    for (const u of w.units) if (u.alive && u.team === this.playerTeam && u.vip) { this.vip = u; break; }
    if (!this.vip) for (const u of w.units) if (u.alive && u.team === this.playerTeam && u.def.role === 'hero') { this.vip = u; u.vip = true; break; }
    this.exit = this.marker('exit'); this.need = this.params.time || 100; super.start(w);
  }
  step(w) {
    if (!this.vip) this.start(w);
    const v = this.vip;
    if (!v) { if (w.tickN > 3) this.lose(); return; }
    if (!v.alive) { this.lose(); return; }
    let p = w.time / this.need;
    if (this.exit) {
      const d = Math.hypot(v.x - this.exit.x, v.z - this.exit.z);
      if (d <= (this.exit.r || 4)) { this.win(); return; }
      if (this.params.reachOnly) p = 0;
    }
    this.progress = Math.min(1, p);
    if (!this.exit || !this.params.reachOnly) if (w.time >= this.need) this.win();
  }
}

/** Survive N waves (waves.js drives the spawning). Enemy elimination does not end the battle while waves remain. */
class SurviveWaves extends Objective {
  start(w) { this.blocksElimination = true; this.target = this.params.waves || 4; super.start(w); }
  step(w) {
    const ws = w.waves; if (!ws) return;
    this.progress = Math.min(1, ws.cleared / this.target);
    if (ws.cleared >= this.target) { this.blocksElimination = false; this.win(); }
  }
}

/** Destroy listed props: params.props = ['gate_door', ...] (types) or [{type, count}], params.eliminate = also eliminate the enemy. */
class Destroy extends Objective {
  start(w) {
    this.list = (this.params.props || []).map((p) => (typeof p === 'string' ? { type: p, count: 0 } : { type: p.type, count: p.count || 0 }));
    for (const it of this.list) { if (!it.count) it.count = w.props.filter((p) => p.type === it.type).length; it.base = w.props.filter((p) => p.type === it.type && !p.dead).length; }
    this.blocksElimination = !!this.params.eliminate; super.start(w);
  }
  step(w) {
    let need = 0, got = 0;
    for (const it of this.list) { const alive = w.props.filter((p) => p.type === it.type && !p.dead).length; const destroyed = Math.max(0, it.base - alive); need += it.count; got += Math.min(it.count, destroyed); }
    this.propsDone = need > 0 && got >= need;
    if (this.params.eliminate) { const total = w.stats[this.enemy].startCount || 1; const killed = 1 - w.stats[this.enemy].alive / total; this.progress = need ? (got / need) * 0.5 + (this.propsDone ? killed * 0.5 : 0) : killed; if (this.propsDone && w.stats[this.enemy].alive <= 0) this.win(); }
    else { this.progress = need ? got / need : 0; if (this.propsDone) this.win(); }
  }
}

export function createObjective(w, spec) {
  if (!spec || spec.type === undefined) return null;
  switch (spec.type) {
    case 'eliminate': return new Eliminate(w, spec);
    case 'kill_general': return new KillGeneral(w, spec);
    case 'hold_hill': return new HoldHill(w, spec);
    case 'protect_vip': return new ProtectVip(w, spec);
    case 'survive_waves': return new SurviveWaves(w, spec);
    case 'destroy': return new Destroy(w, spec);
    case 'timeout': return new Eliminate(w, Object.assign({}, spec, { type: 'eliminate', timeLimit: spec.timeLimit || (spec.params && spec.params.time) || 120 }));
    default: throw new Error('unknown objective ' + spec.type);
  }
}
