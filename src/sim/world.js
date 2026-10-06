// World: the deterministic fixed-step battle simulation. See spec.md §7.
// Pure sim: no DOM, no THREE, no Math.random. Rendering/audio/humor subscribe to world.events.

import { DT, ST, SE, N_SE, G, TEAM_A, TEAM_B } from './consts.js';
import { Unit } from './unit.js';
import { Spatial } from './spatial.js';
import { think } from './ai.js';
import { applyDamage, killUnit, setAnim, angleDiff } from './combat.js';
import { ProjectileSystem } from './projectiles.js';
import { NavGrid, FlowField } from '../world/nav.js';
import { RNG } from '../core/rng.js';
import { EventBus } from '../core/events.js';
import { propInfo } from '../content/era_ancient/props/catalog.js';
import { MATERIALS, HSTEP } from '../world/arena.js';
import { formationOffsets, placeOffsets } from './formations.js';
import { abilityRegistry } from './abilities/index.js';

const TAU = Math.PI * 2;

const EVENT_NAMES = ['battle_countdown', 'battle_start', 'battle_end', 'unit_spawn', 'unit_hit', 'unit_block', 'unit_kill', 'unit_rout', 'unit_rally', 'unit_revive', 'ability_cast', 'status_apply',
  'projectile_launch', 'projectile_hit', 'explosion', 'crater', 'prop_damaged', 'prop_destroyed', 'first_blood', 'kill_streak', 'hero_down', 'army_low', 'lead_change', 'big_swing',
  'stalemate_warning', 'intervention', 'objective_update', 'wave_spawn', 'god_power', 'chicken_tantrum', 'philosopher_monologue', 'trojan_reveal', 'stone_gaze', 'throne_sit',
  'friendly_fire', 'trample', 'charge_hit', 'unit_brace', 'lightning_arc', 'cyclops_misaim', 'catapult_misfire', 'unit_corpse_done', 'unit_convert', 'fire_started', 'telegraph', 'bark'];

export class Squad {
  constructor(id, team, defId) {
    this.id = id; this.team = team; this.defId = defId; this.units = []; this.order = 'advance';
    this.ax = 0; this.az = 0; this.facing = 0; this.speed = 2.5; this.mode = 'form'; this.alive = true; this.freeT = 0;
  }
}

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

export class World {
  /**
   * @param {{arena:import('../world/arena.js').Arena, seed?:number, rules?:object, defs:object, props?:boolean}} o
   */
  constructor({ arena, seed = 1, rules = {}, defs, props = true }) {
    this.arena = arena; this.defs = defs; this.seed = seed;
    this.rules = Object.assign({ friendlyFire: false, morale: true, speed: 1, timeLimit: 360, difficulty: 'normal', objective: null, godPowers: true, deathCorpses: true }, rules);
    this.rng = new RNG(seed);
    this.ev = new EventBus(); this.events = this.ev;
    this.P = Object.create(null); for (const n of EVENT_NAMES) this.P[n] = {};
    this.time = 0; this.tickN = 0; this.state = 'placing'; this.winner = -1; this.endReason = '';
    this.units = []; this.dying = []; this.squads = []; this.nextSquad = 1;
    this.hash = new Spatial(arena.worldSize(), G.hashCell, 2048);
    this.qbuf = new Int32Array(256);
    this.nav = new NavGrid(arena);
    this.fields = [new FlowField(this.nav), new FlowField(this.nav)];
    this.fieldSrc = [new Int32Array(this.nav.n * this.nav.n), new Int32Array(this.nav.n * this.nav.n)];
    this.fieldStamp = new Uint32Array(this.nav.n * this.nav.n); this.stamp = 1;
    this.centroid = [{ x: 0, z: 0, n: 0 }, { x: 0, z: 0, n: 0 }];
    this.proj = new ProjectileSystem(this, 600);
    this.props = []; this.propCells = new Map();
    this.hazards = arena.hazards.map((h) => Object.assign({ t: 0 }, h));
    this.effects = [];                               // ground effects (dot clouds, fire patches, telegraphs)
    this.weather = weatherMods(arena.env.weather);
    this.stats = [newStats(), newStats(), newStats()];
    this.lastDamageT = 0; this.firstBlood = false; this.stalemateWarned = false; this.stalemateStage = 0;
    this.countdown = 0; this.leadTeam = -1; this.lastLeadCheck = 0; this.lastRatio = 1;
    this.corpseQueue = [];
    this.officers = [];
    this.forceAdvance = false;
    this.objective = null;
    this.kills = new Map();                          // killer id -> consecutive kills (streaks)
    this.godCd = new Float32Array(8);
    this.hitStopGlobal = 0;
    this.onTick = null;
    if (props) this._buildProps(arena.props);
  }

  emit(type, p) { this.ev.emit(type, p); }

  // ------------------------------------------------------------------ props
  _buildProps(list) {
    this.props.length = 0; this.propCells.clear();
    let id = 1;
    for (const o of list) {
      const info = propInfo(o.t);
      const p = new Prop(id++, o, info);
      this.props.push(p);
    }
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
    for (const p of this.props) {
      if (p.dead || p.hp === Infinity) continue;
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz > (r + p.radius) ** 2) continue;
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
  nearestSoftProp(x, z, r) {
    let best = null, bd = r * r;
    for (const p of this.props) { if (p.dead || p.hp === Infinity || p.blocks === 'none') continue; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd + p.radius * p.radius) { bd = d; best = p; } }
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
    // burn flammable props and units near a fire; weather douses
    const mul = this.weather.burnMul;
    if (mul <= 0.01) return;
    for (const p of this.props) if (!p.dead && p.flam && (p.x - x) ** 2 + (p.z - z) ** 2 < (r + p.radius) ** 2) p.burning = 6 * mul;
    const n = this.hash.query(x, z, r, this.qbuf);
    for (let k = 0; k < n; k++) { const u = this.units[this.qbuf[k]]; if (u && u.alive && (u.x - x) ** 2 + (u.z - z) ** 2 < r * r) u.se[SE.BURN] = Math.max(u.se[SE.BURN], 3 * mul); }
    const mat = this.arena.materialAt(x, z);
    if (mat.flammable && this.rng.next() < 0.35) this.effects.push({ kind: 'fire', x, z, r: Math.max(1, r * 0.6), t: 5 * mul, dps: 4 });
  }
  invalidateFields() { this.fields[0].valid = false; this.fields[1].valid = false; this.fieldTimer = 0; }

  /** Radial damage with falloff. If opts.friendlyFire is true allies of `team` are also hurt. */
  areaDamage(src, x, y, z, r, dmg, opts, team) {
    const n = this.hash.query(x, z, r + 1.5, this.qbuf);
    for (let k = 0; k < n; k++) {
      const u = this.units[this.qbuf[k]];
      if (!u || !u.alive) continue;
      if (u.team === team && !(opts.friendlyFire && this.rules.friendlyFire !== false)) continue;
      const dx = u.x - x, dz = u.z - z, d = Math.sqrt(dx * dx + dz * dz) - u.radius;
      if (d > r) continue;
      const f = 1 - 0.6 * Math.max(0, d) / r;
      applyDamage(this, src && src.alive ? src : null, u, dmg * f, Object.assign({ x, z }, opts, { dir: [dx, dz] }));
    }
  }

  // ------------------------------------------------------------------ units / squads
  addUnit(defId, team, x, z, o = {}) {
    const def = (o.def) || this.defs[defId];
    if (!def) throw new Error('unknown unit def ' + defId);
    const u = new Unit(def, team, x, z, o.heading !== undefined ? o.heading : (team === TEAM_A ? Math.PI / 2 : -Math.PI / 2));
    u.y = u.py = this.arena.heightAt(x, z);
    u.cd = this.rng.next() * 0.9;
    u.cdR = this.rng.next() * 1.2;
    u.targetT = (this.rng.next() * G.retargetEvery) | 0;
    if (o.name) u.name = o.name;
    if (o.custom) u.custom = o.custom;
    if (def.tags.includes('fearless')) u.moraleMax = 999;
    u.abil = [];
    for (const a of def.abilities) { const impl = abilityRegistry[a.id]; if (impl) { const st = impl.init ? impl.init(u, a, this) : {}; u.abil.push({ p: a, impl, st, cd: (a.cd || 0) * (0.3 + this.rng.next() * 0.5) }); } }
    this.units.push(u);
    const s = this.stats[team]; s.alive++; s.aliveCost += def.cost; s.startCount++; s.startCost += def.cost;
    if (o.squad) { u.squad = o.squad; o.squad.units.push(u); }
    if (o.vip) u.vip = true;
    if (o.general || def.tags.includes('general')) u.general = true;
    const e = this.P.unit_spawn; e.id = u.id; e.team = team; e.def = def.id; e.x = x; e.z = z; this.emit('unit_spawn', e);
    return u;
  }

  /** Spawn a squad of `n` units of one def around (cx,cz). Returns the Squad. */
  addSquad(defId, team, n, cx, cz, o = {}) {
    const sq = new Squad(this.nextSquad++, team, defId);
    sq.order = o.order || 'advance';
    const facing = o.heading !== undefined ? o.heading : (team === TEAM_A ? Math.PI / 2 : -Math.PI / 2);
    const def = this.defs[defId];
    const spacing = o.spacing || Math.max(1.05, def.radius * 2.5);
    const offs = o.offsets || formationOffsets(o.formation || (def.role === 'ranged' ? 'line' : 'block'), n, spacing, this.rng);
    const pos = placeOffsets(offs, cx, cz, facing);
    this.squads.push(sq);
    for (let i = 0; i < n; i++) {
      const u = this.addUnit(defId, team, pos[i][0], pos[i][1], { heading: facing, squad: sq, def: o.def });
      u.sox = offs[i][0]; u.soz = offs[i][1];
    }
    sq.ax = cx; sq.az = cz; sq.facing = facing;
    sq.speed = def.speed * 0.9;
    return sq;
  }

  convertUnit(u, team, secs) {
    if (!u.alive || u.team === team) return;
    this.stats[u.team].alive--; this.stats[u.team].aliveCost -= u.def.cost;
    this.stats[team].alive++; this.stats[team].aliveCost += u.def.cost;
    u.origTeam = u.team; u.team = team; u.convertT = secs; u.target = null;
    const e = this.P.unit_convert; e.id = u.id; e.team = team; this.emit('unit_convert', e);
  }

  // ------------------------------------------------------------------ ability + morale hooks
  abilityHook(name, u, a, b, c) {
    if (!u.abil || u.abil.length === 0) return undefined;
    let res;
    for (let i = 0; i < u.abil.length; i++) {
      const ab = u.abil[i], f = ab.impl[name];
      if (f) { const r = f(u, ab, this, a, b, c); if (r === true) res = true; }
    }
    return res;
  }
  moraleShock(dead) {
    if (!this.rules.morale) return;
    const k = (dead.def.tags.includes('officer') || dead.def.role === 'hero') ? 1.5 : 1;
    const n = this.hash.query(dead.x, dead.z, 6, this.qbuf);
    for (let i = 0; i < n; i++) { const u = this.units[this.qbuf[i]]; if (u && u.alive && u.team === dead.team) u.morale -= G.moraleAllyDeath * k; }
    if (dead.def.role === 'hero' || dead.general) { const e = this.P.hero_down; e.id = dead.id; e.def = dead.def.id; e.team = dead.team; this.emit('hero_down', e); }
  }
  checkFirstBlood(src, dead) {
    if (!this.firstBlood) { this.firstBlood = true; const e = this.P.first_blood; e.src = src ? src.id : 0; e.dst = dead.id; e.srcDef = src ? src.def.id : ''; e.dstDef = dead.def.id; this.emit('first_blood', e); }
    if (src && src.alive) {
      const c = (this.kills.get(src.id) || 0) + 1; this.kills.set(src.id, c);
      if (c === 5 || c === 10 || c === 20) { const e = this.P.kill_streak; e.id = src.id; e.count = c; e.def = src.def.id; this.emit('kill_streak', e); }
    }
  }
  fireRanged(u) {
    const t = u.target; if (!t) return;
    this.proj.fire(u, t, t.x, t.z, t.y + t.height * 0.55);
    if (u.def.ranged.volley) for (let i = 1; i < u.def.ranged.volley; i++) this.proj.fire(u, t, t.x, t.z, t.y + t.height * 0.55);
  }
  hasShot() { return true; }

  // ------------------------------------------------------------------ lifecycle
  start(countdown = 0) {
    if (this.state === 'running') return;
    this.recomputeCentroids();
    this.refreshFields();
    if (countdown > 0) { this.state = 'countdown'; this.countdown = countdown; this._lastCount = Math.ceil(countdown) + 1; return; }
    this._begin();
  }
  _begin() {
    this.state = 'running'; this.lastDamageT = this.time;
    const e = this.P.battle_start; e.teams = [{ team: 0, count: this.stats[0].alive, cost: this.stats[0].aliveCost }, { team: 1, count: this.stats[1].alive, cost: this.stats[1].aliveCost }]; this.emit('battle_start', e);
  }

  // ------------------------------------------------------------------ the tick
  tick() {
    const dt = DT;
    if (this.state === 'placing') return;
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
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (u.alive) this.hash.insert(i, u.x, u.z); u.atkCount = 0; }
    // flow fields (staggered)
    this.fieldTimer = (this.fieldTimer || 0) - 1;
    if (this.fieldTimer <= 0) { this.recomputeCentroids(); this.refreshFields(); this.fieldTimer = G.navRefresh; }
    // statuses, modifiers, abilities, morale
    this._updateStatusesAndMods(dt);
    // squads
    this._updateSquads(dt);
    // AI think
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      if (u.hitStop > 0) { u.hitStop -= dt; continue; }
      this._tickCooldowns(u, dt);
      think(this, u, dt);
      if (u.abil.length) this._tickAbilities(u, dt);
    }
    // movement + collisions
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (u.alive) this._integrate(u, dt); }
    this._separate(dt);
    // projectiles, effects, props burning, hazards
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
    for (let i = 0; i < u.abil.length; i++) { const ab = u.abil[i]; if (ab.cd > 0) ab.cd -= dt; if (ab.impl.tick) ab.impl.tick(u, ab, this, dt); }
  }

  _updateStatusesAndMods(dt) {
    const units = this.units, wx = this.weather;
    this.officers.length = 0;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      const se = u.se;
      let mD = 1, mS = 1, mA = 0, mB = 0, mP = 0, mC = 1, mT = 1;
      for (let k = 0; k < N_SE; k++) {
        if (se[k] > 0) {
          se[k] -= dt;
          if (se[k] <= 0) { se[k] = 0; if (k === SE.STONE) { u.stone = 0; } }
        }
      }
      if (se[SE.BURN] > 0) { this._dot(u, 4 * dt, 'fire'); }
      if (se[SE.POISON] > 0) { this._dot(u, 3 * dt, 'magic'); }
      if (se[SE.RAGE] > 0) { mD *= u.rageDmg || 1.5; mS *= u.rageSpeed || 1.3; }
      if (se[SE.HASTE] > 0) { mS *= u.hasteMul || 1.2; mD *= u.hasteDmg || 1; }
      if (se[SE.DMGUP] > 0) mD *= u.dmgupMul || 1.2;
      if (se[SE.SLOW] > 0) mS *= 0.6;
      if (se[SE.CURSE] > 0) mS *= 0.8;
      if (se[SE.TIPSY] > 0) { mD *= 0.6; }
      if (se[SE.ROOT] > 0) mS = 0;
      if (se[SE.STONE] > 0) { u.stone = Math.min(1, u.stone + dt * 4); }
      mS *= wx.speedMul;
      if (wx.sprdMul !== 1 && u.def.ranged) { /* handled in projectile spread at fire time */ }
      u.mDmg = mD; u.mSpeed = mS; u.mArmor = mA; u.mBlock = mB; u.mProj = mP; u.mCd = mC; u.mDmgTaken = mT;
      if (u.convertT > 0) { u.convertT -= dt; if (u.convertT <= 0) { const old = u.team; this.stats[old].alive--; this.stats[old].aliveCost -= u.def.cost; u.team = u.origTeam; this.stats[u.team].alive++; this.stats[u.team].aliveCost += u.def.cost; u.target = null; } }
      if (u.def.tags.includes('officer')) this.officers.push(u);
      // abilities may modify stat multipliers (stance, auras)
      if (u.abil.length) for (let a = 0; a < u.abil.length; a++) { const ab = u.abil[a]; if (ab.impl.mods) ab.impl.mods(u, ab, this); }
    }
  }
  _dot(u, amt, type) {
    // damage over time: no events, no knockback
    u.hp -= amt; u.flash = Math.max(u.flash, 0.4);
    if (u.hp <= 0) killUnit(this, u, u.lastAttacker, type === 'fire' ? 'fire' : 'magic', {});
  }

  // ------------------------------------------------------------------ squads
  _updateSquads(dt) {
    const sqs = this.squads;
    for (let i = sqs.length - 1; i >= 0; i--) {
      const sq = sqs[i];
      // compact
      let n = 0, cx = 0, cz = 0, withTarget = 0, lag = 0, minSpeed = 99;
      for (let k = 0; k < sq.units.length; k++) {
        const u = sq.units[k]; if (!u.alive || u.team !== sq.team) continue;
        n++; cx += u.x; cz += u.z; if (u.target) withTarget++;
        if (u.def.speed < minSpeed) minSpeed = u.def.speed;
      }
      if (n === 0) { sq.alive = false; sqs.splice(i, 1); continue; }
      cx /= n; cz /= n;
      if (this.forceAdvance && sq.order === 'hold') { sq.order = 'advance'; }
      const engaged = withTarget > 0;
      if (engaged) { sq.mode = 'free'; sq.freeT = 3; sq.ax += (cx - sq.ax) * Math.min(1, dt * 3); sq.az += (cz - sq.az) * Math.min(1, dt * 3); }
      else if (sq.mode === 'free') { sq.freeT -= dt; if (sq.freeT <= 0) { sq.mode = 'form'; sq.ax = cx; sq.az = cz; } }
      if (sq.mode === 'form') {
        // lag of the farthest member from its slot
        const c = Math.cos(sq.facing), s = Math.sin(sq.facing);
        for (let k = 0; k < sq.units.length; k++) { const u = sq.units[k]; if (!u.alive) continue; const gx = sq.ax + c * u.sox + s * u.soz, gz = sq.az - s * u.sox + c * u.soz; const d = Math.hypot(gx - u.x, gz - u.z); if (d > lag) lag = d; }
        let dx = 0, dz = 0, move = false;
        if (sq.order === 'advance' || sq.order === 'flank' || sq.order === 'skirmish' || sq.order === 'focus') {
          const f = this.fields[sq.team];
          const o = this._tmp2 || (this._tmp2 = [0, 0]);
          if (f.valid && f.dir(sq.ax, sq.az, o)) { dx = o[0]; dz = o[1]; move = true; }
        } else if (sq.order === 'retreat') {
          const ec = this.centroid[1 - sq.team];
          if (ec && ec.n) { const l = Math.hypot(sq.ax - ec.x, sq.az - ec.z) || 1; dx = (sq.ax - ec.x) / l; dz = (sq.az - ec.z) / l; move = true; }
        }
        if (move) {
          const lagF = Math.max(0.1, Math.min(1, 1 - (lag - 1.8) / 5));
          const sp = Math.min(minSpeed * 0.85, sq.speed || 2.5) * lagF;
          const nx = sq.ax + dx * sp * dt, nz = sq.az + dz * sp * dt;
          if (this.nav.walkable(nx, nz)) { sq.ax = nx; sq.az = nz; }
          const want = Math.atan2(dx, dz); sq.facing += Math.max(-1.6 * dt, Math.min(1.6 * dt, angleDiff(sq.facing, want)));
          sq.speed = sp;
        } else sq.speed = 0;
      }
    }
  }

  recomputeCentroids() {
    for (let t = 0; t < 2; t++) { const c = this.centroid[t]; c.x = 0; c.z = 0; c.n = 0; }
    for (let i = 0; i < this.units.length; i++) { const u = this.units[i]; if (u.alive && u.team < 2) { const c = this.centroid[u.team]; c.x += u.x; c.z += u.z; c.n++; } }
    for (let t = 0; t < 2; t++) { const c = this.centroid[t]; if (c.n) { c.x /= c.n; c.z /= c.n; } }
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
    const def = u.def;
    if (u.state === ST.STUN || u.state === ST.SIT || (u.state === ST.WINDUP && !(u.atkKind === 1 && def.ranged && def.ranged.whileMoving)) || u.state === ST.STAGGER || u.state === ST.CAST) { u.dvx = 0; u.dvz = 0; }
    // accelerate toward desired velocity
    const ax = u.dvx - u.vx, az = u.dvz - u.vz, am = def.accel * dt, al = Math.hypot(ax, az);
    if (al > am) { u.vx += ax / al * am; u.vz += az / al * am; } else { u.vx = u.dvx; u.vz = u.dvz; }
    if (u.se[SE.ROOT] > 0 || u.se[SE.STUN] > 0 || u.se[SE.SLEEP] > 0 || u.se[SE.STONE] > 0) { u.vx = 0; u.vz = 0; }
    // terrain speed
    const mat = this.arena.materialAt(u.x, u.z);
    let k = mat.speed;
    if (this.arena.water > 0 && this.arena.cellHeight(u.x, u.z) < this.arena.waterY()) k *= 0.6;
    const fr = Math.exp(-G.knockFriction * dt);
    const mvx = u.vx * k + u.kx, mvz = u.vz * k + u.kz;
    u.kx *= fr; u.kz *= fr; if (Math.abs(u.kx) < 0.05) u.kx = 0; if (Math.abs(u.kz) < 0.05) u.kz = 0;
    let nx = u.x + mvx * dt, nz = u.z + mvz * dt;
    const nav = this.nav;
    const ocx = nav.cx(u.x), ocz = nav.cz(u.z);
    const ok = (px, pz) => {
      if (!nav.inside(px, pz)) return false;
      const cx = nav.cx(px), cz = nav.cz(pz);
      if (cx === ocx && cz === ocz) return true;
      return nav.canStep(ocx, ocz, cx, cz) || (nav.walk[cx + cz * nav.n] && !nav.block[cx + cz * nav.n] && !nav.soft[cx + cz * nav.n] && Math.abs(nav.hs[cx + cz * nav.n] - nav.hs[ocx + ocz * nav.n]) <= 1.0);
    };
    if (!ok(nx, nz)) {
      if (ok(nx, u.z)) nz = u.z; else if (ok(u.x, nz)) nx = u.x; else { nx = u.x; nz = u.z; u.vx *= 0.3; u.vz *= 0.3; u.kx = 0; u.kz = 0; }
    }
    u.speedNow = Math.hypot(u.vx, u.vz);
    u.x = nx; u.z = nz;
    // facing
    const turn = def.turnRate * dt;
    const dd = angleDiff(u.heading, u.face);
    u.heading += Math.abs(dd) < turn ? dd : Math.sign(dd) * turn;
    if (u.heading > Math.PI) u.heading -= TAU; else if (u.heading < -Math.PI) u.heading += TAU;
    // vertical follow
    const gy = this.arena.heightAt(u.x, u.z);
    const dy = gy - u.y;
    u.y += Math.abs(dy) < G.groundFollow * dt ? dy : Math.sign(dy) * G.groundFollow * dt;
    u.gait += u.speedNow * dt;
    // anim clock
    u.anim.t += dt * u.anim.rate;
    if (u.anim.blend < 1) u.anim.blend = Math.min(1, u.anim.blend + dt / 0.14);
  }

  _separate(dt) {
    const units = this.units, nav = this.nav;
    for (let i = 0; i < units.length; i++) {
      const a = units[i]; if (!a.alive) continue;
      const n = this.hash.query(a.x, a.z, a.radius + 1.8, this.qbuf);
      for (let k = 0; k < n; k++) {
        const j = this.qbuf[k]; if (j <= i) continue;
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
        // heavier units shove lighter ones; units that are attacking hold their ground
        let wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
        if (a.state === ST.WINDUP && b.state !== ST.WINDUP) { wa *= 0.3; wb = 1 - wa; }
        else if (b.state === ST.WINDUP && a.state !== ST.WINDUP) { wb *= 0.3; wa = 1 - wb; }
        const f = Math.min(1, 0.55 + dt * 4);
        const ax = a.x - nx * ov * wa * f, az = a.z - nz * ov * wa * f;
        const bx = b.x + nx * ov * wb * f, bz = b.z + nz * ov * wb * f;
        if (nav.walkable(ax, az)) { a.x = ax; a.z = az; }
        if (nav.walkable(bx, bz)) { b.x = bx; b.z = bz; }
        // trample: large moving units flatten small ones
        if (a.mass >= 8 && a.speedNow > 1.5 && b.mass < 3 && !same) this._trample(a, b, dt);
        else if (b.mass >= 8 && b.speedNow > 1.5 && a.mass < 3 && !same) this._trample(b, a, dt);
      }
    }
  }
  _trample(big, small, dt) {
    applyDamage(this, big, small, 18 * dt * 30 / 30 * 1.0 * (dt * 30), { type: 'blunt', kb: 1, noBlock: true, noCrit: true, aoe: true, cause: 'trample', x: big.x, z: big.z });
    if (((this.tickN + big.id) & 7) === 0) { const e = this.P.trample; e.id = big.id; e.count = 1; this.emit('trample', e); }
  }

  // ------------------------------------------------------------------ effects / props / morale / end
  _tickEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const f = this.effects[i]; f.t -= dt;
      if (f.kind === 'fire' || f.kind === 'cloud') {
        if (((this.tickN + i) & 3) === 0) {
          const n = this.hash.query(f.x, f.z, f.r + 1, this.qbuf);
          for (let k = 0; k < n; k++) { const u = this.units[this.qbuf[k]]; if (u && u.alive && (u.x - f.x) ** 2 + (u.z - f.z) ** 2 < f.r * f.r) { if (f.kind === 'fire') u.se[SE.BURN] = Math.max(u.se[SE.BURN], 2); else this._dot(u, (f.dps || 8) * dt * 4, 'magic'); } }
        }
      }
      if (f.t <= 0) this.effects.splice(i, 1);
    }
  }
  _tickProps(dt) {
    for (const p of this.props) {
      if (p.dead || p.burning <= 0) continue;
      p.burning -= dt;
      if (p.hp !== Infinity) { this.hurtProp(p, 18 * dt); }
      if (p.burning > 0 && ((this.tickN + p.id) % 30) === 0) this.igniteAt(p.x, p.z, p.radius + 1.2);
    }
  }
  _tickMorale(dt) {
    if (!this.rules.morale) return;
    const units = this.units, offs = this.officers;
    const frac = [this.stats[0].startCount ? this.stats[0].alive / this.stats[0].startCount : 1, this.stats[1].startCount ? this.stats[1].alive / this.stats[1].startCount : 1];
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      if (u.moraleMax > 500) continue;
      let dm = 0.4;
      if (u.hp < u.hpMax * G.moraleLowHp) dm -= 0.9;
      for (let k = 0; k < offs.length; k++) { const o = offs[k]; if (o.team === u.team && (o.x - u.x) ** 2 + (o.z - u.z) ** 2 < 100) { dm += 1.2; break; } }
      if (u.state === ST.ROUT) dm += 0.6;
      if (u.team < 2 && frac[u.team] < G.armyCollapseFrac && this.stats[u.team].startCount >= 6) dm -= 10;
      u.morale = Math.max(-20, Math.min(u.moraleMax, u.morale + dm * dt));
      if (u.state !== ST.ROUT && u.morale <= G.routThreshold && u.def.tags.indexOf('fearless') < 0) {
        u.state = ST.ROUT; u.routT = 0; u.target = null; u.stateT = 0; const e = this.P.unit_rout; e.id = u.id; e.team = u.team; this.emit('unit_rout', e);
      } else if (u.state === ST.ROUT) {
        u.routT += dt;
        if (u.morale > G.rallyThreshold && u.routT > 3) { u.state = ST.IDLE; const e = this.P.unit_rally; e.id = u.id; this.emit('unit_rally', e); }
      }
    }
  }

  _reapDead() {
    const units = this.units;
    let w = 0;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (u.alive) units[w++] = u;
      else { this.dying.push(u); }
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
        d.splice(i, 1);
      }
    }
  }

  _checkEnd(dt) {
    if (this.state !== 'running') return;
    const a = this.stats[0].alive, b = this.stats[1].alive;
    // lead-change & army-low events (cheap, once a second)
    if ((this.tickN % 30) === 0) this._pulseEvents(a, b);
    // stalemate watchdog
    const idle = this.time - this.lastDamageT;
    if (idle > G.stalemateWarn && !this.stalemateWarned) { this.stalemateWarned = true; const e = this.P.stalemate_warning; e.t = idle; this.emit('stalemate_warning', e); }
    if (idle > G.stalemateAdvance && !this.forceAdvance) this.forceAdvance = true;
    if (idle > G.stalemateZeus && this.stalemateStage < 1) { this.stalemateStage = 1; this.zeusIntervene(); }
    if (idle > G.stalemateZeus + 14 && this.stalemateStage < 2) { this.stalemateStage = 2; const e = this.P.intervention; e.kind = 'ragequit'; this.emit('intervention', e); this.end(-1, 'intervention'); return; }
    if (a <= 0 || b <= 0) {
      if (!(this.objective && this.objective.blocksElimination)) { this.end(a > 0 ? 0 : b > 0 ? 1 : -1, 'elimination'); return; }
    }
    if (this.time >= this.rules.timeLimit) {
      const ca = this.stats[0].aliveCost, cb = this.stats[1].aliveCost;
      this.end(ca > cb * 1.02 ? 0 : cb > ca * 1.02 ? 1 : -1, 'time');
    }
  }
  _pulseEvents(a, b) {
    const s0 = this.stats[0], s1 = this.stats[1];
    const r = (s0.aliveCost + 1) / (s1.aliveCost + 1);
    const lead = r > 1.15 ? 0 : r < 0.87 ? 1 : -1;
    if (lead !== -1 && lead !== this.leadTeam && this.time > 8) { const e = this.P.lead_change; e.team = lead; e.ratio = r; this.emit('lead_change', e); this.leadTeam = lead; }
    if (Math.abs(Math.log(r) - Math.log(this.lastRatio)) > 0.35 && this.time > 6) { const e = this.P.big_swing; e.team = r > this.lastRatio ? 0 : 1; e.delta = r - this.lastRatio; this.emit('big_swing', e); this.lastRatio = r; }
    if (this.time < 3) this.lastRatio = r;
    for (let t = 0; t < 2; t++) { const s = this.stats[t]; if (s.startCount && s.alive / s.startCount < 0.25 && !s.lowWarn) { s.lowWarn = true; const e = this.P.army_low; e.team = t; e.frac = s.alive / s.startCount; this.emit('army_low', e); } }
  }
  zeusIntervene() {
    // lightning on the densest idle cluster, then reinforcements for the weaker side
    let best = null, bn = -1;
    for (let i = 0; i < this.units.length; i += 3) { const u = this.units[i]; if (!u.alive) continue; const n = this.hash.query(u.x, u.z, 5, this.qbuf); if (n > bn) { bn = n; best = u; } }
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
    this.areaDamage(src, x, e.y, z, r, dmg, { type: 'magic', ap: 1, kb: 6, cause: 'magic', aoe: true, friendlyFire: true, noBlock: true }, -1);
    this.damageProps(x, z, r, dmg * 0.8);
  }
  end(winner, reason) {
    if (this.state === 'ended') return;
    this.state = 'ended'; this.winner = winner; this.endReason = reason;
    const e = this.P.battle_end; e.winner = winner; e.reason = reason; e.t = this.time; e.stats = this.stats; this.emit('battle_end', e);
    for (const u of this.units) if (u.alive) { u.dvx = 0; u.dvz = 0; if (winner >= 0 && u.team === winner) { u.state = ST.CHEER; setAnim(u, 'cheer', 1); } }
  }
  /** Run n ticks (tests / fast-forward). */
  step(n = 1) { for (let i = 0; i < n; i++) this.tick(); }
  /** Rolling hash of the simulation state for determinism tests. */
  stateHash() {
    let h = 2166136261 >>> 0;
    const mix = (v) => { h ^= (Math.fround(v) * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
    for (const u of this.units) { mix(u.id); mix(u.x); mix(u.z); mix(u.hp); }
    mix(this.rng.s);
    return h >>> 0;
  }
}

function navProp(p) { return { x: p.x, z: p.z, radius: p.radius, blocks: p.blocks, hp: p.hp, dead: p.dead }; }
function newStats() { return { alive: 0, dead: 0, kills: 0, damageDealt: 0, damageTaken: 0, startCount: 0, startCost: 0, aliveCost: 0, deadCost: 0, lowWarn: false }; }
export function weatherMods(w) {
  const m = { speedMul: 1, burnMul: 1, fireMul: 1, sprdMul: 1 };
  if (w === 'rain' || w === 'storm') { m.burnMul = 0.5; m.fireMul = 0.5; }
  if (w === 'snow') m.speedMul = 0.9;
  if (w === 'sandstorm') m.sprdMul = 1.5;
  return m;
}
