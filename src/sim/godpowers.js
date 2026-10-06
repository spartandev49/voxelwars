// God powers (units.md): the six player powers, each with a ground telegraph, an effect and a per-team cooldown.
//   zeus_lightning (6 s): bolt 90 magic aoe 3 + chain to 4 more targets.   meteor (20 s): 2 s telegraph, 140 fire aoe 5, crater r4.
//   earthquake (30 s): 5 s shake, r14: units stagger/fall, props damaged, walls collapse.   heal_wave (25 s): +60 hp to allies in r12.
//   wine_rain (30 s): 8 s, r12: everyone inside is tipsy (40% random movement, damage x0.6).   raise_chickens (15 s): 8 sacred chickens for the caster's team.
// API: world.godpowers.cast(power, x, z, team) -> bool (false: unknown, on cooldown, or battle not running); list(team) -> [{id,name,key,cd,cdMax,ready}].
// Events: telegraph (delay), god_power{kind,x,z,team} on the strike, explosion/lightning_arc/crater/status_apply/unit_heal/unit_spawn from the effects.
import { SE, ST } from './consts.js';
import { applyStatus, healUnit, staggerUnit, newHit, applyDamage } from './combat.js';
import { chainLightning, collect } from './abilities/util.js';

export const GOD_POWERS = [
  { id: 'zeus_lightning', name: 'Zeus Lightning', key: '1', cd: 6, delay: 0.35, r: 3 },
  { id: 'meteor', name: 'Meteor', key: '2', cd: 20, delay: 2.0, r: 5 },
  { id: 'earthquake', name: 'Earthquake', key: '3', cd: 30, delay: 0, r: 14, dur: 5 },
  { id: 'heal_wave', name: 'Heal Wave', key: '4', cd: 25, delay: 0.6, r: 12 },
  { id: 'wine_rain', name: 'Wine Rain', key: '5', cd: 30, delay: 0.4, r: 12, dur: 8 },
  { id: 'raise_chickens', name: 'Raise Chickens', key: '6', cd: 15, delay: 0.6, r: 3 },
];
const IDX = Object.create(null); GOD_POWERS.forEach((p, i) => { IDX[p.id] = i; });
const L = new Array(400);
const H = newHit();

export class GodPowers {
  constructor(w) {
    this.w = w; this.cd = new Float32Array(2 * GOD_POWERS.length); this.pending = []; this.active = [];
    this.casts = new Int32Array(GOD_POWERS.length);
  }
  info(id) { return GOD_POWERS[IDX[id]]; }
  list(team) { const n = GOD_POWERS.length; return GOD_POWERS.map((p, i) => ({ id: p.id, name: p.name, key: p.key, cd: Math.max(0, this.cd[team * n + i]), cdMax: p.cd, ready: this.cd[team * n + i] <= 0 })); }
  ready(power, team) { const i = IDX[power]; return i !== undefined && this.cd[team * GOD_POWERS.length + i] <= 0; }

  cast(power, x, z, team) {
    const w = this.w, i = IDX[power];
    if (i === undefined || (team !== 0 && team !== 1) || w.state !== 'running' || w.rules.godPowers === false) return false;
    const k = team * GOD_POWERS.length + i;
    if (this.cd[k] > 0) return false;
    this.cd[k] = GOD_POWERS[i].cd;
    const p = GOD_POWERS[i];
    // telegraph first, effect after the delay
    const e = w.P.telegraph; e.kind = power === 'zeus_lightning' ? 'zeus' : power; e.x = x; e.z = z; e.r = p.r; e.t = p.dur && !p.delay ? p.dur : p.delay; e.h = 0; e.a = 0; e.team = team; w.emit('telegraph', e);
    this.pending.push({ t: p.delay, power, x, z, team });
    return true;
  }

  tick(dt) {
    const w = this.w;
    for (let i = 0; i < this.cd.length; i++) if (this.cd[i] > 0) this.cd[i] -= dt;
    const pend = this.pending;
    for (let i = pend.length - 1; i >= 0; i--) {
      const q = pend[i]; q.t -= dt;
      if (q.t <= 0) { pend.splice(i, 1); this._strike(q); }
    }
    const act = this.active;
    for (let i = act.length - 1; i >= 0; i--) {
      const a = act[i]; a.t -= dt; a.tick -= dt;
      if (a.tick <= 0) { a.tick = a.every; this._pulse(a); }
      if (a.t <= 0) act.splice(i, 1);
    }
  }

  _announce(power, x, z, team) { const e = this.w.P.god_power; e.kind = power; e.x = x; e.z = z; e.team = team; this.w.emit('god_power', e); this.casts[IDX[power]]++; }

  _strike(q) {
    const w = this.w, { power, x, z, team } = q;
    this._announce(power, x, z, team);
    switch (power) {
      case 'zeus_lightning': {
        const y = w.arena.heightAt(x, z);
        const e = w.P.lightning_arc; e.x0 = x + 1.5; e.y0 = y + 40; e.z0 = z + 1.5; e.x1 = x; e.y1 = y; e.z1 = z; w.emit('lightning_arc', e);
        w.lightning(x, z, 90, 3, null);
        // chain: the nearest enemy of the caster to the strike point, then up to 3 more jumps
        const n = collect(w, x, z, 9, L, team, 'enemy');
        let best = null, bd = 1e9;
        for (let i = 0; i < n; i++) { const o = L[i]; const d = (o.x - x) ** 2 + (o.z - z) ** 2; if (d < bd) { bd = d; best = o; } }
        if (best) chainLightning(w, null, best, 63, 4, team);
        break;
      }
      case 'meteor': {
        const y = w.arena.heightAt(x, z);
        const e = w.P.explosion; e.kind = 'meteor'; e.x = x; e.y = y; e.z = z; e.r = 5; w.emit('explosion', e);
        const h = H.reset(); h.type = 'fire'; h.ap = 1; h.kb = 8; h.cause = 'aoe'; h.fire = true; h.noBlock = true;
        w.areaDamage(null, x, z, 5, 140, h, -1);
        w.makeCrater(x, z, 4, 4);
        w.igniteAt(x, z, 5);
        w.damageProps(x, z, 5, 200);
        break;
      }
      case 'earthquake': this.active.push({ power, x, z, team, t: 5, tick: 0, every: 1, n: 0 }); break;
      case 'heal_wave': {
        const n = collect(w, x, z, 12, L, team, 'ally');
        for (let i = 0; i < n; i++) healUnit(w, L[i], 60);
        break;
      }
      case 'wine_rain': this.active.push({ power, x, z, team, t: 8, tick: 0, every: 0.5, n: 0 }); break;
      case 'raise_chickens': {
        const sq = w.addSquad('sacred_chicken', team, 8, x, z, { formation: 'circle', spacing: 0.9, heading: team === 0 ? Math.PI / 2 : -Math.PI / 2 });
        for (let i = 0; i < sq.units.length; i++) { const u = sq.units[i]; u.state = ST.GETUP; u.stateT = 0; u.stateDur = 0.5; u.ky = 6; u.y += 0.1; }
        break;
      }
      default: break;
    }
  }

  _pulse(a) {
    const w = this.w;
    if (a.power === 'earthquake') {
      a.n++;
      const n = collect(w, a.x, a.z, 14, L, -1, 'all');
      for (let i = 0; i < n; i++) {
        const u = L[i]; if (u.mass >= 8) continue;
        staggerUnit(w, u, 0.6);
        if (w.rng.next() < 0.3) applyStatus(w, u, SE.STUN, 0.8);       // knocked down
      }
      w.damageProps(a.x, a.z, 14, 130);
    } else if (a.power === 'wine_rain') {
      const n = collect(w, a.x, a.z, 12, L, -1, 'all');
      for (let i = 0; i < n; i++) applyStatus(w, L[i], SE.TIPSY, 1.2);
    }
  }
}
