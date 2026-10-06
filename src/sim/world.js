// World: the deterministic fixed-step battle simulation. See spec.md §8.
// Pure sim: no DOM, no THREE, no Math.random. Rendering/audio/humor subscribe to world.events.

import { DT, ST, SE, N_SE, G, TEAM_A, TEAM_B } from './consts.js';
import { Unit } from './unit.js';
import { Spatial } from './spatial.js';
import { think } from './ai.js';
import { Squad, updateSquads } from './squads.js';
import { applyDamage, killUnit, setAnim, angleDiff, dotDamage, newHit, Hit } from './combat.js';
import { ProjectileSystem } from './projectiles.js';
import { NavGrid, FlowField } from '../world/nav.js';
import { RNG } from '../core/rng.js';
import { EventBus } from '../core/events.js';
import { propInfo } from '../content/era_ancient/props/catalog.js';
import { formationOffsets, placeOffsets } from './formations.js';
import { abilityRegistry } from './abilities/index.js';
import { HazardSystem } from './hazards.js';
import { GodPowers } from './godpowers.js';
import { Possession } from './possession.js';
import { createObjective } from './objectives.js';
import { PowerTracker } from './power.js';
import { mutatorMods } from './mutators.js';

export { Squad };
const TAU = Math.PI * 2;

export const EVENT_NAMES = ['battle_countdown', 'battle_start', 'battle_end', 'unit_spawn', 'unit_hit', 'unit_block', 'unit_kill', 'unit_heal', 'unit_stagger', 'unit_rout', 'unit_rally', 'unit_revive', 'unit_convert',
  'ability_cast', 'ability_channel_start', 'ability_channel_end', 'telegraph', 'status_apply',
  'projectile_launch', 'projectile_hit', 'explosion', 'lightning_arc', 'crater', 'prop_damaged', 'prop_destroyed', 'prop_spawned',
  'first_blood', 'kill_streak', 'hero_down', 'army_low', 'lead_change', 'big_swing', 'stalemate_warning', 'intervention', 'objective_update', 'wave_spawn', 'god_power',
  'chicken_tantrum', 'philosopher_monologue', 'trojan_reveal', 'stone_gaze', 'throne_sit', 'friendly_fire', 'trample', 'charge_hit', 'unit_brace', 'cyclops_misaim', 'catapult_misfire',
  'unit_corpse_done', 'bark', 'fire_started', 'crowd_roar', 'hazard_trigger', 'possess'];

export class Prop {
  constructor(id, o, info) {
    this.id = id; this.type = o.t; this.x = o.x; this.z = o.z; this.rot = o.r || 0; this.s = o.s || 1; this.v = o.v || 0;
    this.info = info;
    this.radius = info ? info.r * this.s : 0;
    this.height = info ? info.h * this.s : 0;
    this.hpMax = info ? (info.hp === Infinity ? Infinity : info.hp * this.s) : Infinity;
    this.hp = this.hpMax;
    this.blocks = info ? info.blocks : 'none';
    this.cover = info ? info.cover : false;
    this.flam = info ? info.flam : false;
    this.dead = false; this.stage = 0; this.burning = 0;
  }
}

const DEFAULT_RULES = { friendlyFire: false, morale: true, speed: 1, timeLimit: 360, difficulty: 'normal', objective: null, godPowers: true, deathCorpses: true, mutators: [], weather: null, noKite: false };

export class World {
  /**
   * @param {{arena:import('../world/arena.js').Arena, seed?:number, rules?:object, defs:object, props?:boolean}} o
   */
  constructor({ arena, seed = 1, rules = {}, defs, props = true }) {
    this.arena = arena.clone(); arena = this.arena; this.defs = defs; this.seed = seed;   // the world mutates its own copy (craters, collapses)
    this.rules = Object.assign({}, DEFAULT_RULES, rules);
    this.rng = new RNG(seed);
    this.ev = new EventBus(); this.events = this.ev;
    this.P = Object.create(null); for (const n of EVENT_NAMES) this.P[n] = {};
    this.time = 0; this.tickN = 0; this.state = 'placing'; this.winner = -1; this.endReason = '';
    this.units = []; this.dying = []; this.squads = []; this.nextSquad = 1; this.nextUnitId = 1; this.byId = new Map();
    this.hash = new Spatial(arena.worldSize(), G.hashCell, 2048);
    this.qbuf = new Int32Array(1024); this.qbuf2 = new Int32Array(512); this.qbuf3 = new Int32Array(512);
    this.nav = new NavGrid(arena);
    this.fields = [new FlowField(this.nav), new FlowField(this.nav)];
    this.fieldSrc = [new Int32Array(this.nav.n * this.nav.n), new Int32Array(this.nav.n * this.nav.n)];
    this.fieldStamp = new Uint32Array(this.nav.n * this.nav.n); this.stamp = 1;
    this.centroid = [{ x: 0, z: 0, n: 0 }, { x: 0, z: 0, n: 0 }];
    this.axis = new Float32Array(4); this.enemyExt = [12, 12]; this.enemyBack = [{ x: 0, z: 0, n: 0 }, { x: 0, z: 0, n: 0 }];
    this._sumD = new Float64Array(2); this._cntD = new Float64Array(2);
    this.mut = mutatorMods(this.rules.mutators);
    if (this.mut.friendlyFire) this.rules.friendlyFire = true;
    this.diff = [1, 1]; this.retarget = [G.retargetNormal, G.retargetNormal];
    this.setDifficulty(this.rules.difficulty);
    this.proj = new ProjectileSystem(this, 600);
    this.props = []; this.propCells = new Map();
    this.hazards = arena.hazards.map((h) => Object.assign({ t: 0 }, h, { kind: h.t, tm: 0, ph: 0, active: false }));
    this.effects = [];                               // ground effects (dot clouds, fire patches)
    this.weather = weatherMods(this.rules.weather || arena.env.weather);
    this.stats = [newStats(), newStats(), newStats()];
    this.lastDamageT = 0; this.firstBlood = false; this.stalemateWarned = false; this.stalemateStage = 0;
    this.countdown = 0; this.leadTeam = -1; this.lastRatio = 1;
    this.officers = [];
    this.forceAdvance = false;
    this.kills = new Map();                          // killer id -> consecutive kills (streaks)
    this.onTick = null;
    this.inputQ = [];                                // tick-stamped inputs (sorted by tick)
    this.record = null;                              // set to [] to record applied inputs
    this.collapseTeam = -1;
    this.hitPool = []; for (let i = 0; i < 8; i++) this.hitPool.push(new Hit()); this.hitDepth = 0;
    this.power = new PowerTracker(this);
    if (props) this._buildProps(arena.props);
    this.hazardSys = new HazardSystem(this);
    this.godpowers = this.rules.godPowers === false ? null : new GodPowers(this);
    this.possession = new Possession(this);
    this.objective = this.rules.objective ? createObjective(this, this.rules.objective) : null;
    this.waves = null;                                // set by waves.js (Survival)
  }

  emit(type, p) { this.ev.emit(type, p); }
  setDifficulty(d) {
    const m = (x) => (x === 'easy' ? 0 : x === 'hard' ? 2 : 1);
    if (d && typeof d === 'object') { this.diff[0] = m(d[0] !== undefined ? d[0] : d.A); this.diff[1] = m(d[1] !== undefined ? d[1] : d.B); }
    else { this.diff[0] = this.diff[1] = m(d); }
    for (let t = 0; t < 2; t++) this.retarget[t] = this.diff[t] === 0 ? G.retargetEasy : this.diff[t] === 2 ? G.retargetHard : G.retargetNormal;
  }
  unitById(id) { return this.byId.get(id) || null; }
  acquireHit() { const h = this.hitPool[this.hitDepth++] || new Hit(); return h.reset(); }
  releaseHit() { if (this.hitDepth > 0) this.hitDepth--; }

  // ------------------------------------------------------------------ props
  _buildProps(list) {
    this.props.length = 0; this.propCells.clear();
    let id = 1;
    for (const o of list) { const info = propInfo(o.t); this.props.push(new Prop(id++, o, info)); }
    this._nextProp = id;
    this._indexProps();
    this.nav.applyProps(this.props.map(navProp), this.hazards);
  }
  _indexProps() {
    this.propCells.clear();
    for (const p of this.props) {
      if (p.dead || (!p.cover && p.blocks === 'none')) continue;
      const r = Math.max(p.radius, 0.3), c0 = Math.floor((p.x - r) / 4), c1 = Math.floor((p.x + r) / 4), r0 = Math.floor((p.z - r) / 4), r1 = Math.floor((p.z + r) / 4);
      for (let cz = r0; cz <= r1; cz++) for (let cx = c0; cx <= c1; cx++) { const k = cx * 4096 + cz; let a = this.propCells.get(k); if (!a) this.propCells.set(k, (a = [])); a.push(p); }
    }
  }
  propBlocks(p) {
    const cx = Math.floor(p.x / 4), cz = Math.floor(p.z / 4);
    const a = this.propCells.get(cx * 4096 + cz);
    if (!a) return false;
    for (let i = 0; i < a.length; i++) {
      const o = a[i]; if (o.dead || !o.cover) continue;
      const dx = p.x - o.x, dz = p.z - o.z;
      if (dx * dx + dz * dz < o.radius * o.radius && p.y < this.arena.heightAt(o.x, o.z) + o.height) return true;
    }
    return false;
  }
  damageProps(x, z, r, dmg) {
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.dead || p.hp === Infinity) continue;
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz > (r + p.radius) * (r + p.radius)) continue;
      this.hurtProp(p, dmg);
    }
  }
  hurtProp(p, dmg) {
    if (p.dead || p.hp === Infinity) return;
    p.hp -= dmg;
    const e = this.P.prop_damaged; e.id = p.id; e.type = p.type; e.hpFrac = Math.max(0, p.hp / p.hpMax); e.x = p.x; e.y = this.arena.heightAt(p.x, p.z); e.z = p.z; this.emit('prop_damaged', e);
    if (p.hp <= 0) {
      p.dead = true;
      const d = this.P.prop_destroyed; d.id = p.id; d.type = p.type; d.x = p.x; d.y = this.arena.heightAt(p.x, p.z); d.z = p.z; d.s = p.s; this.emit('prop_destroyed', d);
      this._indexProps();
      this.nav.applyProps(this.props.map(navProp), this.hazards);
      this.invalidateFields();
    } else p.stage = p.hp < p.hpMax * 0.6 ? 1 : 0;
  }
  /** Add a prop at runtime (throne, rubble). Emits prop_spawned. */
  spawnProp(type, x, z, o = {}) {
    const info = propInfo(type);
    const p = new Prop(this._nextProp++, { t: type, x, z, r: o.r || 0, s: o.s || 1, v: o.v || 0 }, info);
    this.props.push(p);
    this._indexProps();
    this.nav.applyProps(this.props.map(navProp), this.hazards);
    this.invalidateFields();
    const e = this.P.prop_spawned; e.id = p.id; e.type = type; e.x = x; e.z = z; this.emit('prop_spawned', e);
    return p;
  }
  removeProp(p) { if (!p || p.dead) return; p.dead = true; this._indexProps(); this.nav.applyProps(this.props.map(navProp), this.hazards); this.invalidateFields(); }
  /** Nearest destructible (soft) blocking prop within r of (x,z): the breach target. */
  nearestSoftProp(x, z, r) {
    let best = null, bd = 1e9;
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.dead || p.hp === Infinity || p.blocks === 'none' || !(p.radius > 0)) continue;
      const d = Math.sqrt((p.x - x) ** 2 + (p.z - z) ** 2) - p.radius;
      if (d < r && d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // ------------------------------------------------------------------ world edits
  makeCrater(x, z, r, depthSteps) {
    const rect = this.arena.crater(x, z, r, depthSteps);
    const e = this.P.crater; e.x = x; e.z = z; e.r = r; e.x0 = rect.x0; e.z0 = rect.z0; e.x1 = rect.x1; e.z1 = rect.z1; this.emit('crater', e);
    this.nav.rebuild({ x0: Math.floor(rect.x0 / 2) - 1, z0: Math.floor(rect.z0 / 2) - 1, x1: Math.floor(rect.x1 / 2) + 1, z1: Math.floor(rect.z1 / 2) + 1 });
    this.nav.applyProps(this.props.map(navProp), this.hazards);
    this.invalidateFields();
  }
  igniteAt(x, z, r) {
    // burn flammable props and units near a fire; rain douses
    const mul = this.weather.burnMul;
    if (mul <= 0.01) return;
    for (let i = 0; i < this.props.length; i++) { const p = this.props[i]; if (!p.dead && p.flam && (p.x - x) ** 2 + (p.z - z) ** 2 < (r + p.radius) ** 2) p.burning = 6 * mul; }
    const n = this.hash.query(x, z, r, this.qbuf2);
    for (let k = 0; k < n; k++) { const u = this.units[this.qbuf2[k]]; if (u && u.alive && (u.x - x) ** 2 + (u.z - z) ** 2 < r * r) this.burn(u, 3 * mul); }
    const mat = this.arena.materialAt(x, z);
    if (mat.flammable && this.rng.next() < 0.35) this.addEffect('fire', x, z, Math.max(1, r * 0.6), 5 * mul, 4, -1, null);
    const e = this.P.fire_started; e.x = x; e.z = z; e.r = r; this.emit('fire_started', e);
  }
  burn(u, secs) {
    const was = u.se[SE.BURN] > 0;
    if (secs > u.se[SE.BURN]) u.se[SE.BURN] = secs;
    if (!was && u.se[SE.BURN] > 0) { const e = this.P.status_apply; e.id = u.id; e.status = 'burn'; this.emit('status_apply', e); }
    this.abilityHook('onBurn', u);
  }
  addEffect(kind, x, z, r, t, dps, team, src) {
    const f = { kind, x, z, r, t, dps, team, src, tm: 0 };
    this.effects.push(f); return f;
  }
  invalidateFields() { this.fields[0].valid = false; this.fields[1].valid = false; this.fieldTimer = 0; }

  /**
   * Radial damage with falloff 1 -> 0.4. `h` is a prepared Hit (type/kb/cause/ap...). Allies of `protect` are skipped unless protect < 0.
   * AoE hurts everyone by default (spec §8.1 friendly fire).
   */
  areaDamage(src, x, z, r, dmg, h, protect) {
    const n = this.hash.query(x, z, r + 1.8, this.qbuf3);
    const q = this.qbuf3;
    h.aoe = true; h.at(x, z);
    for (let k = 0; k < n; k++) {
      const u = this.units[q[k]];
      if (!u || !u.alive) continue;
      if (protect >= 0 && u.team === protect) continue;
      const dx = u.x - x, dz = u.z - z, dd = Math.sqrt(dx * dx + dz * dz) - u.radius;
      if (dd > r) continue;
      const f = 1 - 0.6 * (dd > 0 ? dd : 0) / r;
      h.dir(dx, dz);
      applyDamage(this, src && src.alive ? src : null, u, dmg * f, h);
    }
  }

  // ------------------------------------------------------------------ units / squads
  addUnit(defId, team, x, z, o = {}) {
    const def = (o.def) || this.defs[defId];
    if (!def) throw new Error('unknown unit def ' + defId);
    const u = new Unit(def, team, x, z, o.heading !== undefined ? o.heading : (team === TEAM_A ? Math.PI / 2 : -Math.PI / 2), this.nextUnitId++);
    u.y = u.py = this.arena.cellHeight(x, z);
    u.cd = this.rng.next() * 0.9;
    u.cdR = this.rng.next() * 1.2;
    u.targetT = (this.rng.next() * G.retargetNormal) | 0;
    u.sideSign = (u.id & 1) ? 1 : -1;
    if (o.name) u.name = o.name;
    if (o.custom) u.custom = o.custom;
    if (def.tags.includes('fearless')) u.moraleMax = 999;
    const mut = this.mut;
    if (mut.hp !== 1) { u.hpMax = u.hp = def.hp * mut.hp; }
    if (mut.scale !== 1) { u.scale *= mut.scale; u.height *= mut.scale; u.radius *= Math.max(0.6, mut.scale); u.mutScale = mut.scale; }
    if (mut.speed !== 1) u.speedBase = def.speed * mut.speed;
    u.abil = [];
    for (const a of def.abilities) {
      const impl = abilityRegistry[a.id];
      if (impl) { const st = impl.init ? impl.init(u, a, this) : {}; u.abil.push({ p: a, impl, st: st || {}, cd: (a.cd || 0) * (0.3 + this.rng.next() * 0.5) }); }
    }
    this.units.push(u); this.byId.set(u.id, u);
    const s = this.stats[team]; s.alive++; s.aliveCost += def.cost; s.startCount++; s.startCost += def.cost;
    if (o.squad) { u.squad = o.squad; o.squad.units.push(u); }
    if (o.vip) u.vip = true;
    if (o.general || def.tags.includes('general')) u.general = true;
    if (o.general === false) u.general = false;
    const e = this.P.unit_spawn; e.id = u.id; e.team = team; e.def = def.id; e.x = x; e.z = z; this.emit('unit_spawn', e);
    return u;
  }

  /** Spawn a squad of `n` units of one def around (cx,cz). Returns the Squad. */
  addSquad(defId, team, n, cx, cz, o = {}) {
    const def = (o.def) || this.defs[defId];
    const sq = new Squad(this.nextSquad++, team, defId, def);
    sq.order = o.order || 'advance';
    const facing = o.heading !== undefined ? o.heading : (team === TEAM_A ? Math.PI / 2 : -Math.PI / 2);
    const spacing = o.spacing || Math.max(1.05, def.radius * 2.5);
    const offs = o.offsets || formationOffsets(o.formation || (def.role === 'ranged' ? 'line' : 'block'), n, spacing, this.rng);
    const pos = placeOffsets(offs, cx, cz, facing);
    this.squads.push(sq);
    for (let i = 0; i < n; i++) {
      const u = this.addUnit(defId, team, pos[i][0], pos[i][1], { heading: facing, squad: sq, def: o.def, name: o.names ? o.names[i] : undefined });
      u.sox = offs[i][0]; u.soz = offs[i][1];
    }
    sq.ax = cx; sq.az = cz; sq.facing = facing; sq.formation = o.formation || 'block';
    sq.speed = 0;
    return sq;
  }

  /**
   * Spawn a list of placements {defId|customId, x, z, heading, squadId?, order?, formation?} for one team.
   * Placements sharing a squadId (and defId) become one Squad whose slot offsets are the placement geometry (so user-placed
   * blocks keep their shape). Placements without a squadId become loose single-unit squads. Returns the created squads.
   */
  addPlacements(team, placements, o = {}) {
    const bySq = new Map(), made = [];
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i], key = p.squadId !== undefined ? p.squadId + ':' + (p.defId || p.customId) : 'solo' + i;
      let g = bySq.get(key); if (!g) { g = []; bySq.set(key, g); } g.push(p);
    }
    for (const g of bySq.values()) {
      const p0 = g[0], defId = p0.defId || p0.customId, def = (o.defs && o.defs[defId]) || this.defs[defId];
      const sq = new Squad(this.nextSquad++, team, defId, def);
      sq.order = p0.order || 'advance';
      let cx = 0, cz = 0; for (const p of g) { cx += p.x; cz += p.z; } cx /= g.length; cz /= g.length;
      const h = p0.heading !== undefined ? p0.heading : (team === TEAM_A ? Math.PI / 2 : -Math.PI / 2);
      const c = Math.cos(h), s = Math.sin(h);
      this.squads.push(sq);
      for (const p of g) {
        const u = this.addUnit(defId, team, p.x, p.z, { heading: p.heading !== undefined ? p.heading : h, squad: sq, def, name: p.name, custom: p.custom });
        const dx = p.x - cx, dz = p.z - cz;
        u.sox = c * dx - s * dz; u.soz = s * dx + c * dz;          // inverse of placeOffsets()
      }
      sq.ax = cx; sq.az = cz; sq.facing = h; sq.formation = p0.formation || 'block';
      made.push(sq);
    }
    return made;
  }

  /** Placement-phase: remove a unit (adjusts stats and squads). */
  removeUnit(u) {
    if (this.state !== 'placing') return false;
    const i = this.units.indexOf(u); if (i < 0) return false;
    this.units.splice(i, 1); this.byId.delete(u.id);
    const st = this.stats[u.team]; st.alive--; st.aliveCost -= u.def.cost; st.startCount--; st.startCost -= u.def.cost;
    if (u.squad) { const k = u.squad.units.indexOf(u); if (k >= 0) u.squad.units.splice(k, 1); if (!u.squad.units.length) { const si = this.squads.indexOf(u.squad); if (si >= 0) this.squads.splice(si, 1); } }
    return true;
  }
  /** Placement-phase: remove every unit of a team (or all when team < 0). */
  clearUnits(team = -1) { for (const u of this.units.slice()) if (team < 0 || u.team === team) this.removeUnit(u); }

  convertUnit(u, team, secs) {
    if (!u.alive || u.team === team) return;
    this.stats[u.team].alive--; this.stats[u.team].aliveCost -= u.def.cost;
    this.stats[team].alive++; this.stats[team].aliveCost += u.def.cost;
    if (u.claim) { if (u.claim.claims > 0) u.claim.claims--; u.claim = null; }
    u.origTeam = u.team; u.team = team; u.convertT = secs; u.target = null;
    const e = this.P.unit_convert; e.id = u.id; e.team = team; this.emit('unit_convert', e);
  }

  // ------------------------------------------------------------------ ability + morale hooks
  abilityHook(name, u, a, b, c, d) {
    const ab = u.abil;
    if (!ab || ab.length === 0) return undefined;
    let res;
    for (let i = 0; i < ab.length; i++) {
      const f = ab[i].impl[name];
      if (f) { const r = f(u, ab[i], this, a, b, c, d); if (r === true) res = true; }
    }
    return res;
  }
  moraleShock(dead) {
    if (!this.rules.morale) return;
    const k = (dead.def.tags.includes('officer') || dead.def.role === 'hero') ? 1.5 : 1;
    const n = this.hash.query(dead.x, dead.z, 6, this.qbuf2);
    for (let i = 0; i < n; i++) { const u = this.units[this.qbuf2[i]]; if (u && u.alive && u.team === dead.team) u.morale -= G.moraleAllyDeath * k * (u.def.tags.includes('discipline') ? 0.6 : 1) * this.moraleLoss(u); }
    if (dead.def.role === 'hero' || dead.general) { const e = this.P.hero_down; e.id = dead.id; e.def = dead.def.id; e.team = dead.team; this.emit('hero_down', e); }
  }
  moraleLoss(u) { return u.mMoraleLoss === undefined ? 1 : u.mMoraleLoss; }
  checkFirstBlood(src, dead) {
    if (!this.firstBlood) { this.firstBlood = true; const e = this.P.first_blood; e.src = src ? src.id : 0; e.dst = dead.id; e.srcDef = src ? src.def.id : ''; e.dstDef = dead.def.id; this.emit('first_blood', e); }
    if (src && src.alive) {
      const c = (this.kills.get(src.id) || 0) + 1; this.kills.set(src.id, c);
      if (c === 5 || c === 10 || c === 20) { const e = this.P.kill_streak; e.id = src.id; e.count = c; e.def = src.def.id; this.emit('kill_streak', e); }
    }
  }
  fireRanged(u) {
    const t = u.target; if (!t) return;
    const r = u.def.ranged;
    this.proj.fire(u, t, t.x, t.z, t.y + t.height * 0.55);
    if (r.volley) for (let i = 1; i < r.volley; i++) this.proj.fire(u, t, t.x, t.z, t.y + t.height * 0.55);
  }

  // ------------------------------------------------------------------ inputs (tick-stamped => deterministic)
  /** Queue a player input to be applied at the START of tick `tick` (use world.tickN + 1 for 'next tick'). */
  input(tick, cmd) {
    if (typeof tick !== 'number' || !isFinite(tick)) throw new Error('world.input requires a tick stamp');
    const q = this.inputQ; let i = q.length;
    while (i > 0 && q[i - 1].tick > tick) i--;
    q.splice(i, 0, { tick, cmd });
  }
  _drainInputs() {
    const q = this.inputQ;
    while (q.length && q[0].tick <= this.tickN + 1) { const it = q.shift(); if (this.record) this.record.push({ tick: this.tickN + 1, cmd: it.cmd }); this.applyInput(it.cmd); }
  }
  applyInput(cmd) {
    switch (cmd.type) {
      case 'command': {
        const sq = this.squads.find((s) => s.id === cmd.squad); if (!sq) return;
        if (cmd.order === 'move') { sq.order = 'move'; sq.moveTo = { x: cmd.x, z: cmd.z }; }
        else if (cmd.order === 'focus') { sq.order = 'advance'; sq.focus = cmd.target || 0; sq.focusT = 8; }
        else { sq.order = cmd.order; if (cmd.order === 'advance') sq.focus = 0; }
        break;
      }
      case 'cast': if (this.godpowers) this.godpowers.cast(cmd.power, cmd.x, cmd.z, cmd.team); break;
      case 'possess': this.possession.apply(cmd); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ lifecycle
  start(countdown = 0) {
    if (this.state === 'running') return;
    this.recomputeCentroids();
    this.refreshFields();
    for (const sq of this.squads) { sq.d = 0; }
    if (countdown > 0) { this.state = 'countdown'; this.countdown = countdown; this._lastCount = Math.ceil(countdown) + 1; return; }
    this._begin();
  }
  _begin() {
    this.state = 'running'; this.lastDamageT = this.time;
    this.power.reset();
    const e = this.P.battle_start; e.teams = [{ team: 0, count: this.stats[0].alive, cost: this.stats[0].aliveCost }, { team: 1, count: this.stats[1].alive, cost: this.stats[1].aliveCost }]; this.emit('battle_start', e);
    if (this.objective && this.objective.start) this.objective.start(this);
  }

  // ------------------------------------------------------------------ the tick
  tick() {
    const dt = DT;
    if (this.state === 'placing') return;
    this._drainInputs();
    if (this.state === 'countdown') {
      this.countdown -= dt;
      const c = Math.ceil(this.countdown);
      if (c !== this._lastCount && c >= 1) { this._lastCount = c; const e = this.P.battle_countdown; e.n = c; this.emit('battle_countdown', e); }
      if (this.countdown <= 0) this._begin();
      return;
    }
    if (this.state === 'ended') { this._tickDying(dt); this._tickEffects(dt); this.proj.update(dt); return; }
    this.time += dt; this.tickN++;
    const units = this.units;
    // snapshot previous transform for interpolation
    for (let i = 0; i < units.length; i++) { const u = units[i]; u.px = u.x; u.py = u.y; u.pz = u.z; u.pheading = u.heading; }
    for (let i = 0; i < this.dying.length; i++) { const u = this.dying[i]; u.px = u.x; u.py = u.y; u.pz = u.z; u.pheading = u.heading; }
    // spatial hash
    this.hash.clear();
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (u.alive) this.hash.insert(i, u.x, u.z); }
    // flow fields (staggered)
    this.fieldTimer = (this.fieldTimer || 0) - 1;
    if (this.fieldTimer <= 0) { this.recomputeCentroids(); this.refreshFields(); this.fieldTimer = G.navRefresh; }
    // statuses, modifiers, auras
    this._updateStatusesAndMods(dt);
    // squads
    updateSquads(this, dt);
    // scripted systems
    if (this.waves) this.waves.update(this, dt);
    this.hazardSys.tick(dt);
    if (this.godpowers) this.godpowers.tick(dt);
    this.possession.tick(dt);
    // AI think + ability AI
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      this._tickCooldowns(u, dt);
      think(this, u, dt);
      if (u.abil.length && u.alive) this._tickAbilities(u, dt);
    }
    // movement + collisions
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (u.alive) this._integrate(u, dt); }
    this._separate(dt);
    // projectiles, effects, props burning
    this.proj.update(dt);
    this._tickEffects(dt);
    this._tickProps(dt);
    // morale, win conditions, watchdog
    this._tickMorale(dt);
    // cleanup dead
    this._reapDead();
    this._tickDying(dt);
    this._checkEnd(dt);
    if (this.objective && this.state === 'running') this.objective.update(this, dt);
    if (this.onTick) this.onTick(this, dt);
  }

  _tickCooldowns(u, dt) {
    if (u.cd > 0) u.cd -= dt; if (u.cdR > 0) u.cdR -= dt;
    u.flash = Math.max(0, u.flash - dt * 6);
    u.anim.flinch = Math.max(0, u.anim.flinch - dt * 3);
    u.timeAlive += dt;
    if (u.bark > 0) u.bark -= dt;
  }
  _tickAbilities(u, dt) {
    const ab = u.abil;
    for (let i = 0; i < ab.length; i++) { const a = ab[i]; if (a.cd > 0) a.cd -= dt; if (a.impl.tick) a.impl.tick(u, a, this, dt); if (!u.alive) break; }
  }

  _updateStatusesAndMods(dt) {
    const units = this.units, wx = this.weather, mut = this.mut;
    this.officers.length = 0;
    let anyAbil = false;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      const se = u.se;
      let mD = 1, mS = 1, mCd = 1;
      for (let k = 0; k < N_SE; k++) {
        if (se[k] > 0) {
          se[k] -= dt;
          if (se[k] <= 0) { se[k] = 0; if (k === SE.STONE) u.stone = 0; }
        }
      }
      if (se[SE.BURN] > 0) dotDamage(this, u, 4 * dt * wx.fireMul, 'fire', null);
      if (!u.alive) continue;
      if (se[SE.POISON] > 0) dotDamage(this, u, 3 * dt, 'poison', u.poisonSrc || null);
      if (!u.alive) continue;
      if (se[SE.RAGE] > 0) { mD *= u.rageDmg || 1.5; mS *= u.rageSpeed || 1.3; }
      if (se[SE.HASTE] > 0) mS *= 1.2;
      if (se[SE.DMGUP] > 0) mD *= 1.2;
      if (se[SE.SLOW] > 0) mS *= 0.6;
      if (se[SE.CURSE] > 0) mS *= 0.8;
      if (se[SE.PANIC] > 0) mS *= 0.65;
      if (se[SE.TIPSY] > 0) mD *= 0.6;
      if (se[SE.CONFUSE] > 0) mCd *= 0.4;
      if (se[SE.ROOT] > 0) mS = 0;
      if (se[SE.STONE] > 0) { u.stone = Math.min(1, u.stone + dt * 4); }
      mS *= wx.speedMul * u.mEnv;
      u.mDmg = mD; u.mSpeed = mS; u.mArmor = 0; u.mBlock = 0; u.mProj = 0; u.mCd = mCd; u.mDmgTaken = 1; u.mReach = 0; u.mMoraleLoss = 1;
      if (u.convertT > 0) { u.convertT -= dt; if (u.convertT <= 0) { const old = u.team; this.stats[old].alive--; this.stats[old].aliveCost -= u.def.cost; u.team = u.origTeam; this.stats[u.team].alive++; this.stats[u.team].aliveCost += u.def.cost; u.target = null; u.claim = null; } }
      if (u.def.tags.includes('officer')) this.officers.push(u);
      if (u.abil.length) anyAbil = true;
    }
    // pass 2: abilities modify stat multipliers (stance on self, auras on neighbours)
    if (anyAbil) {
      for (let i = 0; i < units.length; i++) {
        const u = units[i]; if (!u.alive || u.abil.length === 0) continue;
        for (let a = 0; a < u.abil.length; a++) { const ab = u.abil[a]; if (ab.impl.mods) ab.impl.mods(u, ab, this, dt); }
      }
    }
  }

  // ------------------------------------------------------------------ squads helpers
  recomputeCentroids() {
    const units = this.units, cen = this.centroid, back = this.enemyBack;
    for (let t = 0; t < 2; t++) { const c = cen[t]; c.x = 0; c.z = 0; c.n = 0; const b = back[t]; b.x = 0; b.z = 0; b.n = 0; }
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive || u.team > 1) continue;
      const c = cen[u.team]; c.x += u.x; c.z += u.z; c.n++;
      const role = u.def.role;
      if (role === 'ranged' || role === 'siege' || role === 'support') { const b = back[1 - u.team]; b.x += u.x; b.z += u.z; b.n++; }   // enemyBack[t] = rear units of the ENEMY of t
    }
    for (let t = 0; t < 2; t++) { const c = cen[t]; if (c.n) { c.x /= c.n; c.z /= c.n; } const b = back[t]; if (b.n) { b.x /= b.n; b.z /= b.n; } }
    // lateral extent of each army (for the cavalry wing point): enemyExt[t] = extent of the enemy of t
    for (let t = 0; t < 2; t++) {
      const mc = cen[t], ec = cen[1 - t];
      if (!mc.n || !ec.n) continue;
      let ax = ec.x - mc.x, az = ec.z - mc.z; const al = Math.sqrt(ax * ax + az * az) || 1; ax /= al; az /= al;
      this.axis[t * 2] = ax; this.axis[t * 2 + 1] = az;
      let ext = 0;
      for (let i = 0; i < units.length; i++) { const u = units[i]; if (!u.alive || u.team !== 1 - t) continue; const l = Math.abs((u.x - ec.x) * -az + (u.z - ec.z) * ax); if (l > ext) ext = l; }
      this.enemyExt[t] = ext;
    }
  }
  refreshFields() {
    for (let team = 0; team < 2; team++) {
      const src = this.fieldSrc[team]; let n = 0;
      this.stamp++;
      for (let i = 0; i < this.units.length; i++) {
        const u = this.units[i]; if (!u.alive || u.team === team || u.team > 1) continue;
        const cell = this.nav.cx(u.x) + this.nav.cz(u.z) * this.nav.n;
        if (this.fieldStamp[cell] !== this.stamp) { this.fieldStamp[cell] = this.stamp; src[n++] = cell; }
      }
      if (n > 0) this.fields[team].compute(src, n); else this.fields[team].valid = false;
    }
  }

  // ------------------------------------------------------------------ movement
  _integrate(u, dt) {
    const def = u.def, st = u.state;
    if (st === ST.STUN || st === ST.SIT || st === ST.STAGGER || st === ST.CAST || st === ST.DOWN || st === ST.COWER || st === ST.GETUP || (st === ST.WINDUP && !(u.atkKind === 1 && def.ranged && def.ranged.whileMoving))) { u.dvx = 0; u.dvz = 0; }
    // accelerate toward desired velocity
    const ax = u.dvx - u.vx, az = u.dvz - u.vz, am = def.accel * dt, al = Math.sqrt(ax * ax + az * az);
    if (al > am) { u.vx += ax / al * am; u.vz += az / al * am; } else { u.vx = u.dvx; u.vz = u.dvz; }
    const se = u.se;
    if (se[SE.ROOT] > 0 || se[SE.STUN] > 0 || se[SE.SLEEP] > 0 || se[SE.STONE] > 0) { u.vx = 0; u.vz = 0; }
    // terrain speed
    const arena = this.arena, mat = arena.materialAt(u.x, u.z);
    let k = mat.speed;
    if (arena.water > 0 && arena.cellHeight(u.x, u.z) < arena.waterY()) k *= 0.6;
    const fr = Math.exp(-G.knockFriction * dt);
    const mvx = u.vx * k + u.kx, mvz = u.vz * k + u.kz;
    u.kx *= fr; u.kz *= fr; if (u.kx < 0.05 && u.kx > -0.05) u.kx = 0; if (u.kz < 0.05 && u.kz > -0.05) u.kz = 0;
    let nx = u.x + mvx * dt, nz = u.z + mvz * dt;
    const nav = this.nav, ocx = nav.cx(u.x), ocz = nav.cz(u.z);
    if (!this._canMove(nav, ocx, ocz, nx, nz)) {
      if (this._canMove(nav, ocx, ocz, nx, u.z)) nz = u.z; else if (this._canMove(nav, ocx, ocz, u.x, nz)) nx = u.x; else { nx = u.x; nz = u.z; u.vx *= 0.3; u.vz *= 0.3; u.kx = 0; u.kz = 0; }
    }
    u.speedNow = Math.sqrt(u.vx * u.vx + u.vz * u.vz);
    u.x = nx; u.z = nz;
    // facing
    if (u.state !== ST.DOWN) {
      const turn = def.turnRate * dt;
      const dd = angleDiff(u.heading, u.face);
      u.heading += (dd < turn && dd > -turn) ? dd : (dd > 0 ? turn : -turn);
      if (u.heading > Math.PI) u.heading -= TAU; else if (u.heading < -Math.PI) u.heading += TAU;
    }
    // vertical follow: rise at <= groundFollow, fall under gravity; launches (ky > 0) fly ballistically
    const gy = arena.cellHeight(u.x, u.z);
    if (u.ky > 0 || u.y > gy + 0.02) {
      u.ky -= G.gravity * dt; u.y += u.ky * dt;
      if (u.y <= gy) { const impact = -u.ky; u.y = gy; u.ky = 0; if (impact > 3) this.abilityHook('onLand', u, impact); if (u.state === ST.FLY) u.state = ST.IDLE; }
    } else { const dy = gy - u.y; u.y += dy < G.groundFollow * dt ? dy : G.groundFollow * dt; u.ky = 0; }
    u.gait += u.speedNow * dt;
    u.anim.t += dt * u.anim.rate;
    if (u.anim.blend < 1) u.anim.blend = Math.min(1, u.anim.blend + dt / 0.14);
  }
  _canMove(nav, ocx, ocz, px, pz) {
    if (!nav.inside(px, pz)) return false;
    const cx = nav.cx(px), cz = nav.cz(pz);
    if (cx === ocx && cz === ocz) return true;
    if (nav.canStep(ocx, ocz, cx, cz)) return true;
    const j = cx + cz * nav.n;
    return nav.walk[j] === 1 && !nav.block[j] && !nav.soft[j] && Math.abs(nav.hs[j] - nav.hs[ocx + ocz * nav.n]) <= 1.0;
  }

  _separate(dt) {
    const units = this.units, nav = this.nav, hash = this.hash, q = this.qbuf2;
    const f = Math.min(1, 0.55 + dt * 4);
    for (let i = 0; i < units.length; i++) {
      const a = units[i]; if (!a.alive) continue;
      const n = hash.query(a.x, a.z, a.radius + 1.8, q);
      for (let k = 0; k < n; k++) {
        const j = q[k]; if (j <= i) continue;
        const b = units[j]; if (!b || !b.alive) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        const same = a.team === b.team;
        const minD = (a.radius + b.radius) * (same ? 0.88 : 1.0);
        const d2 = dx * dx + dz * dz;
        if (d2 >= minD * minD) continue;
        const d = Math.sqrt(d2) || 0.001;
        let nx = dx / d, nz = dz / d;
        if (d < 0.001) { nx = 1; nz = 0; }
        const ov = (minD - d);
        // heavier units shove lighter ones; units that are attacking or standing in a stance hold their ground
        let wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
        const aHold = a.state === ST.WINDUP || a.hold, bHold = b.state === ST.WINDUP || b.hold;
        if (aHold && !bHold) { wa *= 0.3; wb = 1 - wa; }
        else if (bHold && !aHold) { wb *= 0.3; wa = 1 - wb; }
        const ax = a.x - nx * ov * wa * f, az = a.z - nz * ov * wa * f;
        const bx = b.x + nx * ov * wb * f, bz = b.z + nz * ov * wb * f;
        if (nav.walkable(ax, az)) { a.x = ax; a.z = az; }
        if (nav.walkable(bx, bz)) { b.x = bx; b.z = bz; }
        // trample: large moving units flatten small ones (also their own when panicking)
        if (a.mass >= G.trampleMassMin && a.speedNow > G.trampleSpeed && b.mass < G.trampleMassMax && (!same || a.se[SE.SCARE] > 0)) this._trample(a, b, dt);
        else if (b.mass >= G.trampleMassMin && b.speedNow > G.trampleSpeed && a.mass < G.trampleMassMax && (!same || b.se[SE.SCARE] > 0)) this._trample(b, a, dt);
      }
    }
  }
  _trample(big, small, dt) {
    const h = this.acquireHit(); h.type = 'blunt'; h.kb = 1; h.noBlock = true; h.noCrit = true; h.aoe = true; h.cause = 'trample'; h.fixed = true; h.at(big.x, big.z);
    applyDamage(this, big, small, G.trampleDps * dt, h);
    this.releaseHit();
    if (((this.tickN + big.id) & 7) === 0) { const e = this.P.trample; e.id = big.id; e.count = 1; this.emit('trample', e); }
  }

  // ------------------------------------------------------------------ effects / props / morale / end
  _tickEffects(dt) {
    const fx = this.effects;
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t -= dt; f.tm += dt;
      if (f.kind === 'fire' || f.kind === 'cloud') {
        if (((this.tickN + i) & 3) === 0) {
          const n = this.hash.query(f.x, f.z, f.r + 1, this.qbuf2);
          for (let k = 0; k < n; k++) {
            const u = this.units[this.qbuf2[k]];
            if (!u || !u.alive || (u.x - f.x) ** 2 + (u.z - f.z) ** 2 >= f.r * f.r) continue;
            if (f.kind === 'fire') this.burn(u, 2);
            else if (f.team < 0 || u.team !== f.team) dotDamage(this, u, f.dps * dt * 4, 'poison', f.src && f.src.alive ? f.src : null);
          }
        }
      }
      if (f.t <= 0) fx.splice(i, 1);
    }
  }
  _tickProps(dt) {
    const ps = this.props;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.dead || p.burning <= 0) continue;
      p.burning -= dt;
      if (p.hp !== Infinity) this.hurtProp(p, 18 * dt);
      if (p.burning > 0 && ((this.tickN + p.id) % 30) === 0) this.igniteAt(p.x, p.z, p.radius + 1.2);
    }
  }
  _tickMorale(dt) {
    if (!this.rules.morale) return;
    const units = this.units, offs = this.officers;
    const s0 = this.stats[0], s1 = this.stats[1];
    const frac0 = s0.startCount ? s0.alive / s0.startCount : 1, frac1 = s1.startCount ? s1.alive / s1.startCount : 1;
    const R2 = G.moraleOfficerR * G.moraleOfficerR;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      if (u.moraleMax > 500) continue;
      let dm = 0.4;
      if (u.hp < u.hpMax * G.moraleLowHp) dm -= G.moraleLowRate;
      for (let k = 0; k < offs.length; k++) { const o = offs[k]; if (o.team === u.team && (o.x - u.x) ** 2 + (o.z - u.z) ** 2 < R2) { dm += G.moraleOfficerRate; break; } }
      if (u.state === ST.ROUT) dm += 0.6;
      const t = u.team;
      if (t < 2) {
        const fr = t === 0 ? frac0 : frac1, st = t === 0 ? s0 : s1;
        if (fr < G.armyCollapseFrac && st.startCount >= G.armyCollapseMin) dm -= G.armyCollapseRate;
        if (this.collapseTeam === t) dm -= 2.5;
      }
      u.morale = Math.max(-20, Math.min(u.moraleMax, u.morale + dm * dt));
      if (u.state !== ST.ROUT && u.morale <= G.routThreshold && !u.def.tags.includes('fearless') && u.state !== ST.DOWN && u.state !== ST.SIT && u.state !== ST.CAST) {
        u.state = ST.ROUT; u.routT = 0; u.target = null; u.stateT = 0; if (u.claim) { if (u.claim.claims > 0) u.claim.claims--; u.claim = null; }
        const e = this.P.unit_rout; e.id = u.id; e.team = u.team; this.emit('unit_rout', e);
      } else if (u.state === ST.ROUT) {
        u.routT += dt;
        if (u.morale > G.rallyThreshold && u.routT > G.rallyHold) { u.state = ST.IDLE; const e = this.P.unit_rally; e.id = u.id; this.emit('unit_rally', e); }
      }
    }
  }

  _reapDead() {
    const units = this.units;
    let w = 0;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (u.alive) units[w++] = u;
      else this.dying.push(u);
    }
    units.length = w;
  }
  _tickDying(dt) {
    const d = this.dying;
    for (let i = d.length - 1; i >= 0; i--) {
      const u = d[i]; u.deadT += dt; u.anim.t += dt * u.anim.rate; if (u.anim.blend < 1) u.anim.blend = Math.min(1, u.anim.blend + dt / 0.1);
      // flung corpses keep sliding
      if (u.deathKind === 2 && u.deadT < 0.9) { u.x += u.kx * dt; u.z += u.kz * dt; u.kx *= 0.94; u.kz *= 0.94; const gy = this.arena.heightAt(u.x, u.z); u.y = gy + Math.max(0, Math.sin(Math.min(1, u.deadT / 0.9) * Math.PI) * Math.min(2.5, Math.hypot(u.kx, u.kz) * 0.25)); u.pitch = -u.deadT * 5; }
      if (u.deadT > G.deathLinger) {
        const e = this.P.unit_corpse_done; e.id = u.id; e.def = u.def.id; e.team = u.team; e.x = u.x; e.y = u.y; e.z = u.z; this.emit('unit_corpse_done', e);
        this.byId.delete(u.id);
        d.splice(i, 1);
      }
    }
  }

  _checkEnd(dt) {
    if (this.state !== 'running') return;
    const a = this.stats[0].alive, b = this.stats[1].alive;
    if ((this.tickN % 30) === 0) this._pulseEvents(a, b);
    // stalemate watchdog
    const idle = this.time - this.lastDamageT;
    if (idle > G.stalemateWarn && !this.stalemateWarned) { this.stalemateWarned = true; const e = this.P.stalemate_warning; e.t = idle; this.emit('stalemate_warning', e); }
    if (idle <= 2) this.stalemateWarned = false;
    if (idle > G.stalemateAdvance && !this.forceAdvance) this.forceAdvance = true;
    if (idle > G.stalemateZeus && this.stalemateStage < 1) { this.stalemateStage = 1; this.zeusIntervene(); }
    if (idle > G.stalemateQuit && this.stalemateStage < 2) { this.stalemateStage = 2; const e = this.P.intervention; e.kind = 'ragequit'; this.emit('intervention', e); this.end(-1, 'intervention'); return; }
    if (idle < 3 && this.stalemateStage === 1) this.stalemateStage = 0;
    // pacing governor: lopsided long battles collapse faster; even idle ones advance
    const ca = this.stats[0].aliveCost, cb = this.stats[1].aliveCost;
    if (this.time > 90) { const r = (ca + 1) / (cb + 1); this.collapseTeam = r > 4 ? 1 : r < 0.25 ? 0 : -1; }
    if (this.time > 45 && !this.forceAdvance && idle > 6) { const r = (ca + 1) / (cb + 1); if (r > 0.9 && r < 1.1) this.forceAdvance = true; }
    if (a <= 0 || b <= 0) {
      if (!(this.objective && this.objective.blocksElimination)) { this.end(a > 0 ? 0 : b > 0 ? 1 : -1, 'elimination'); return; }
    }
    if (this.time >= this.rules.timeLimit) this.end(ca > cb * 1.02 ? 0 : cb > ca * 1.02 ? 1 : -1, 'time');
  }
  _pulseEvents(a, b) {
    const s0 = this.stats[0], s1 = this.stats[1];
    const r = (s0.aliveCost + 1) / (s1.aliveCost + 1);
    const lead = r > 1.15 ? 0 : r < 0.87 ? 1 : -1;
    if (lead !== -1 && lead !== this.leadTeam && this.time > 8) { const e = this.P.lead_change; e.team = lead; e.ratio = r; this.emit('lead_change', e); this.leadTeam = lead; }
    this.power.pulse();
    for (let t = 0; t < 2; t++) { const s = this.stats[t]; if (s.startCount && s.alive / s.startCount < 0.25 && !s.lowWarn) { s.lowWarn = true; const e = this.P.army_low; e.team = t; e.frac = s.alive / s.startCount; this.emit('army_low', e); } }
  }
  zeusIntervene() {
    // lightning on the densest idle cluster, then a goat for the weaker side
    let best = null, bn = -1;
    for (let i = 0; i < this.units.length; i += 3) { const u = this.units[i]; if (!u.alive) continue; const n = this.hash.query(u.x, u.z, 5, this.qbuf2); if (n > bn) { bn = n; best = u; } }
    const e = this.P.intervention; e.kind = 'zeus'; this.emit('intervention', e);
    if (best) this.lightning(best.x, best.z, 90, 3.5, null);
    const weaker = this.stats[0].aliveCost <= this.stats[1].aliveCost ? 0 : 1;
    const zone = this.arena.zones[weaker === 0 ? 'A' : 'B'];
    const g = this.addUnit('battle_goat', weaker, zone.x, zone.z, {});
    const e2 = this.P.intervention; e2.kind = 'goat'; this.emit('intervention', e2);
    this.forceAdvance = true;
    return g;
  }
  lightning(x, z, dmg, r, src) {
    const e = this.P.explosion; e.kind = 'lightning'; e.x = x; e.y = this.arena.heightAt(x, z); e.z = z; e.r = r; this.emit('explosion', e);
    const h = this.acquireHit(); h.type = 'magic'; h.ap = 1; h.kb = 6; h.cause = 'lightning'; h.noBlock = true;
    this.areaDamage(src, x, z, r, dmg, h, -1);
    this.releaseHit();
    this.damageProps(x, z, r, dmg * 0.8);
  }
  end(winner, reason) {
    if (this.state === 'ended') return;
    this.state = 'ended'; this.winner = winner; this.endReason = reason;
    const e = this.P.battle_end; e.winner = winner; e.reason = reason; e.t = this.time; e.stats = this.stats;
    const pd = this._perDef || (this._perDef = [Object.create(null), Object.create(null)]);
    pd[0] = Object.create(null); pd[1] = Object.create(null);
    for (const u of this.units) if (u.alive && u.team < 2) pd[u.team][u.def.id] = (pd[u.team][u.def.id] || 0) + 1;
    e.perDef = pd;
    this.emit('battle_end', e);
    for (const u of this.units) if (u.alive) { u.dvx = 0; u.dvz = 0; if (winner >= 0 && u.team === winner && u.state !== ST.DOWN) { u.state = ST.CHEER; setAnim(u, 'cheer', 1); } }
  }
  /** Run n ticks (tests / fast-forward). */
  step(n = 1) { for (let i = 0; i < n; i++) this.tick(); }
  /** Rolling hash of the simulation state for determinism tests. */
  stateHash() {
    let h = 2166136261 >>> 0;
    const mix = (v) => { h ^= (Math.fround(v) * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
    for (const u of this.units) { mix(u.id); mix(u.x); mix(u.z); mix(u.hp); mix(u.team); }
    mix(this.rng.s); mix(this.tickN);
    return h >>> 0;
  }
}

function navProp(p) { return { x: p.x, z: p.z, radius: p.radius, blocks: p.blocks, hp: p.hp, dead: p.dead }; }
function newStats() { return { alive: 0, dead: 0, kills: 0, damageDealt: 0, damageTaken: 0, startCount: 0, startCost: 0, aliveCost: 0, deadCost: 0, lowWarn: false }; }
export function weatherMods(w) {
  const m = { speedMul: 1, burnMul: 1, fireMul: 1, sprdMul: 1, kind: w || 'clear' };
  if (w === 'rain' || w === 'storm') { m.burnMul = 0.5; m.fireMul = 0.5; }
  if (w === 'snow') m.speedMul = 0.9;
  if (w === 'sandstorm') m.sprdMul = 1.5;
  if (w === 'fog') m.sprdMul = 1.2;
  return m;
}
