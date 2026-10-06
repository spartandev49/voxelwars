// campaign_run.js: the pure runtime of the campaign modes (CAMPAIGN agent). No DOM, no THREE, no Math.random: it builds a mission's arena, forces and
// scripted events on top of the sim features that already exist (objectives.js, waves.js, World.onTick, World.addPlacements, god-power style lightning),
// tracks the per-battle facts the star tests need, and builds the BattleSummary of docs/lifetime_stats.md section 3 from a finished World.
//
//   missionArena(m, o?)                    -> Arena     (recipe + env overrides + markers + decor props)
//   missionRules(m, o?)                    -> Rules     (spec section 8.4 keys: timeLimit, difficulty, friendlyFire, objective, godPowers, mutators, budget...)
//   enemyForces(m, arena, defs, seed)      -> {groups, placements, cost, count}   (team B: explicit groups, deployment, orders)
//   playerFixed(m, arena)                  -> [{defId, x, z, heading, vip?, def?}]  (free units the mission hands the player: the VIP goat)
//   setupMission(world, m, o?)             -> MissionRuntime   (fills team B, adds fixed units, flags generals, installs the script + the tracker on world.onTick)
//   MissionRuntime / MissionTracker        -> script runner (timed enemy waves, VIP march, Zeus strikes) and star facts (start/lost units, gate times, friendly hits)
//   battleSummary(world, m, tracker)       -> BattleSummary (docs/lifetime_stats.md section 3) + the mission extras read by evaluateStars
import { generateArena } from '../../world/gen.js';
import { generateArmy, layoutArmy, zoneFrame, groupsCost } from '../../sim/armygen.js';
import { formationOffsets, placeOffsets } from '../../sim/formations.js';
import { WaveSystem } from '../../sim/waves.js';
import { RNG } from '../../core/rng.js';

const TEAM_PLAYER = 0, TEAM_ENEMY = 1;
const PI = Math.PI;

// ------------------------------------------------------------------------------------------------------------------------------ arena
/** The mission's arena: generator recipe + size + seed, env overrides (weather, time, fog), the markers of the mission and a few decor props. */
export function missionArena(m, o = {}) {
  const a = m.arena;
  const arena = generateArena(a.recipe, a.size || 'medium', o.arenaSeed !== undefined ? o.arenaSeed : a.seed);
  if (a.env) Object.assign(arena.env, a.env);
  arena.markers = (a.markers || []).slice(0, 8).map((k) => ({ id: k.id, type: k.type, x: k.x, z: k.z, r: k.r }));
  for (const p of a.props || []) arena.props.push({ t: p.t, x: p.x, z: p.z, r: p.r || 0, s: p.s || 1, v: p.v || 0 });
  return arena;
}

/** Marker lookup by id (mission markers live in the mission def; the arena copy carries the same ids). */
export function markerOf(m, id) { return ((m.arena && m.arena.markers) || []).find((k) => k.id === id) || null; }

// ------------------------------------------------------------------------------------------------------------------------------ rules
/** The objective spec the sim's createObjective takes (objectives.js header). */
export function objectiveSpec(m) {
  const o = m.objective || { type: 'eliminate' };
  const spec = { id: o.type, type: o.type, params: Object.assign({}, o.params || {}), markerIds: (o.markerIds || []).slice(), playerTeam: TEAM_PLAYER };
  // plain elimination missions are decided by remaining cost at the limit (rules.timeLimit); every other objective loses at its own timeout
  if (m.timeLimit > 0 && o.type !== 'eliminate') { spec.timeLimit = m.timeLimit; spec.onTimeout = o.onTimeout || 'lose'; }
  return spec;
}

/**
 * Rules of a mission (the only schema: spec section 8.4). `timeLimit` is the mission limit in seconds (0 = none; a decided-by-cost draw never ends a
 * mission with an objective: the objective's own timeout loses it). No mutators in missions (world.md section 8).
 */
export function missionRules(m, o = {}) {
  const diff = (m.enemy && m.enemy.difficulty) || 'normal';
  const rules = {
    friendlyFire: !!m.friendlyFire, morale: m.morale !== false, speed: 1, timeLimit: m.timeLimit > 0 ? m.timeLimit : 360,
    difficulty: { A: 'normal', B: diff }, objective: objectiveSpec(m), godPowers: m.godPowers !== false, mutators: [], budget: m.budget, weather: null, time: null,
    startFormation: 'block', mission: m.id,
  };
  if (o.difficulty) rules.difficulty = o.difficulty;
  return rules;
}

// ------------------------------------------------------------------------------------------------------------------------------ deployment
/** Position of a zone-relative spot: u 0..1 from the front edge back, v -1..1 across (zoneFrame of armygen.js). */
export function zoneSpot(zone, enemyZone, u, v) {
  const fr = zoneFrame(zone, enemyZone), margin = 0.9;
  const fd = fr.depth / 2 - margin - u * (fr.depth - 2 * margin), l = v * (fr.width / 2 - margin);
  return fr.fx !== 0 ? { x: fr.cx + fr.fx * fd, z: fr.cz + l, heading: fr.heading } : { x: fr.cx + l, z: fr.cz + fr.fz * fd, heading: fr.heading };
}

/** Placements for one explicit group at a spot: one squad per `squad` units (default 10), formation offsets around the spot. */
function placeGroup(g, spot, defs, rng, firstSquad) {
  const def = defs[g.defId], out = [];
  const sp = Math.max(1.15, def.radius * 2.2), per = g.squad || (def.role === 'monster' || def.role === 'hero' || def.role === 'siege' ? 1 : 10);
  let left = g.n, sid = firstSquad, k = 0;
  while (left > 0) {
    const n = Math.min(per, left);
    const offs = formationOffsets(g.formation || 'block', n, sp, rng);
    const pos = placeOffsets(offs, spot.x + (g.dx || 0) + (k % 2 ? 1 : -1) * (g.spread || 0) * Math.ceil(k / 2), spot.z + (g.dz || 0), spot.heading);
    for (const p of pos) out.push({ defId: g.defId, x: p[0], z: p[1], heading: spot.heading, squadId: sid, formation: g.formation || 'block', order: g.order || 'advance' });
    left -= n; sid++; k++;
  }
  return out;
}

/** Expand an explicit group list into placements inside `zone` (auto battle-order layout for groups without a spot, `at` for the rest). */
export function layoutGroups(groups, zone, enemyZone, defs, o = {}) {
  const auto = groups.filter((g) => !g.at), fixed = groups.filter((g) => g.at);
  const rng = new RNG((o.seed || 1) * 7919 + 17);
  let first = o.firstSquad || 1;
  const out = [];
  if (auto.length) {
    const pl = layoutArmy(auto.map((g) => ({ defId: g.defId, n: g.n })), zone, enemyZone, defs, { seed: o.seed || 1, firstSquad: first });
    const order = {}; for (const g of auto) if (g.order) order[g.defId] = g.order;
    const form = {}; for (const g of auto) if (g.formation) form[g.defId] = g.formation;
    for (const p of pl) { if (order[p.defId]) p.order = order[p.defId]; if (form[p.defId]) p.formation = form[p.defId]; first = Math.max(first, p.squadId + 1); out.push(p); }
  }
  for (const g of fixed) {
    const spot = g.at.x !== undefined ? { x: g.at.x, z: g.at.z, heading: zoneFrame(zone, enemyZone).heading } : zoneSpot(zone, enemyZone, g.at.u, g.at.v);
    const pl = placeGroup(g, spot, defs, rng, first); first = pl.reduce((m, p) => Math.max(m, p.squadId), first) + 1; for (const p of pl) out.push(p);
  }
  return out;
}

/** The enemy army of a mission: explicit groups (the first `t:0` wave) with deployment and orders. Returns {groups, placements, cost, count}. */
export function enemyForces(m, arena, defs, seed = 1) {
  const e = m.enemy, groups = (e.groups || []).map((g) => Object.assign({}, g));
  const placements = layoutGroups(groups, arena.zones.B, arena.zones.A, defs, { seed });
  let count = 0; for (const g of groups) count += g.n;
  return { groups, placements, cost: groupsCost(groups, defs), count };
}

/** Free units the mission hands the player (the VIP goat of mission 4): [{defId, x, z, heading, vip, def?}]. */
export function playerFixed(m, arena, defs) {
  const out = [];
  for (const f of m.fixed || []) {
    const mk = f.marker ? markerOf(m, f.marker) : null;
    const base = defs[f.defId];
    out.push({ defId: f.defId, x: mk ? mk.x : f.x, z: mk ? mk.z : f.z, heading: f.heading !== undefined ? f.heading : PI / 2, vip: !!f.vip, def: f.def ? Object.assign({}, base, f.def) : undefined, name: f.name });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------------------------ script
/**
 * Scripted waves on top of sim/waves.js (WaveSystem state machine, event wave_spawn). `cfg.list` holds the waves that ARRIVE (explicit groups, optional `after`
 * = seconds until the next one when the field is not clear); with `cfg.placed` the first wave is the army deployed by hand in the placement phase (the
 * mission's `enemy.groups`) and `list` holds waves 2..N. `interval` is the default gap, `breather` the pause after a cleared field, `first` the delay of
 * wave 1 when it is not placed. No wave_intermission event: campaign waves never pause the game (Survival owns the intermission).
 */
export class ScriptedWaves extends WaveSystem {
  constructor(w, cfg) {
    super(w, { enemyTeam: TEAM_ENEMY, faction: 'mixed', interval: cfg.interval || 40, maxWaves: 0, autoAdvance: false });
    this.cfg = cfg; this.placed = !!cfg.placed; this.off = this.placed ? 2 : 1; this.total = cfg.list.length + (this.placed ? 1 : 0);
    this.t = 0; this.breather = cfg.breather !== undefined ? cfg.breather : 4; this.firstAt = cfg.first !== undefined ? cfg.first : 0; this.cool = 0;
    this.lastWave = null;
    if (this.placed) { this.n = 1; this.state = 'fighting'; this.lastWave = { after: cfg.firstAfter || this.interval }; }
  }
  compose(n) {
    const w = this.w, wv = this.cfg.list[n - this.off], groups = wv.groups.map((g) => Object.assign({}, g));
    let count = 0; for (const g of groups) count += g.n;
    return { n, budget: groupsCost(groups, w.defs), style: 'scripted', boss: null, army: null, groups, cost: groupsCost(groups, w.defs), name: wv.name || ('Wave ' + n), count };
  }
  spawn() {
    const w = this.w, n = ++this.n, c = this.compose(n), wv = this.cfg.list[n - this.off];
    const pl = layoutGroups(c.groups, w.arena.zones.B, w.arena.zones.A, w.defs, { seed: w.seed + n * 31, firstSquad: w.nextSquad + 50 });
    w.addPlacements(TEAM_ENEMY, pl, { defs: w.defs });
    const e = w.P.wave_spawn; e.n = n; e.count = c.count; w.emit('wave_spawn', e);
    this.state = 'fighting'; this.timer = 0; this.lastArmy = c; this.lastWave = wv;
    return c;
  }
  /** True while waves are still to come (the objective must not let an empty field end the battle). */
  get pending() { return this.n < this.total; }
  update(w, dt) {
    if (w.state !== 'running') return;
    this.t += dt;
    if (this.state === 'idle') {
      if (this.n === 0 && this.t < this.firstAt) return;
      if (this.cool > 0) { this.cool -= dt; return; }
      if (this.n < this.total) this.spawn();
      return;
    }
    if (this.state === 'fighting') {
      this.timer += dt;
      if (w.stats[TEAM_ENEMY].alive <= 0) { this.cleared = this.n; this.state = 'idle'; this.cool = this.breather; return; }
      const gap = (this.lastWave && this.lastWave.after) || this.interval;
      if (this.n < this.total && this.timer >= gap) this.spawn();
    }
  }
}

/** Telegraph (zeus kind) then a lightning strike that hurts everyone: Zeus is having a bad day, not a favourite. */
class ZeusStrikes {
  constructor(cfg) { this.cfg = cfg; this.t = cfg.first || 10; this.n = 0; this.pending = []; }
  tick(w, dt, rng) {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const q = this.pending[i]; q.t -= dt;
      if (q.t <= 0) {
        this.pending.splice(i, 1);
        const y = w.arena.heightAt(q.x, q.z), a = w.P.lightning_arc; a.x0 = q.x + 1.5; a.y0 = y + 40; a.z0 = q.z + 1.5; a.x1 = q.x; a.y1 = y; a.z1 = q.z; w.emit('lightning_arc', a);
        const g = w.P.god_power; g.kind = 'zeus_lightning'; g.x = q.x; g.z = q.z; g.team = -1; w.emit('god_power', g);
        w.lightning(q.x, q.z, this.cfg.dmg || 70, this.cfg.r || 3.2, null);
      }
    }
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.cfg.every || 12; this.n++;
    // alternate the sides, aim at the densest cluster of the chosen side (a real bad day is not fair, but it is even)
    const side = this.n % 2 ? TEAM_ENEMY : TEAM_PLAYER;
    let best = null, bn = -1;
    for (let i = 0; i < w.units.length; i += 2) {
      const u = w.units[i]; if (!u.alive || u.team !== side) continue;
      let c = 0; for (let k = 0; k < w.units.length; k += 3) { const o = w.units[k]; if (o.alive && o.team === side && (o.x - u.x) ** 2 + (o.z - u.z) ** 2 < 36) c++; }
      if (c > bn) { bn = c; best = u; }
    }
    if (!best) return;
    const x = best.x + (rng.next() - 0.5) * 3, z = best.z + (rng.next() - 0.5) * 3, tele = this.cfg.delay || 1.2;
    const e = w.P.telegraph; e.kind = 'zeus'; e.x = x; e.z = z; e.r = this.cfg.r || 3.2; e.t = tele; e.h = 0; e.a = 0; e.team = -1; w.emit('telegraph', e);
    this.pending.push({ t: tele, x, z });
  }
}

// ------------------------------------------------------------------------------------------------------------------------------ tracker
/** Counts the facts the star tests need straight from the sim event stream (attach before the battle starts). */
export class MissionTracker {
  constructor(world, m) {
    this.w = world; this.m = m; this.team = TEAM_PLAYER;
    this.startDefs = Object.create(null); this.lostDefs = Object.create(null); this.heroesLost = 0; this.friendlyHits = 0; this.friendlyDmg = 0;
    this.propT = Object.create(null); this.started = false; this.vip = null; this.friendlyKills = 0; this.kills = 0; this.killsByDef = Object.create(null); this.killsByCause = Object.create(null);
    this.kicks = 0; this.trampleKills = 0;
    const ev = world.events;
    this.off = [
      ev.on('battle_start', () => this._census()),
      ev.on('unit_kill', (p) => {
        if (p.dstTeam === this.team) this.lostDefs[p.dstDef] = (this.lostDefs[p.dstDef] || 0) + 1;
        if (p.srcTeam === this.team) {
          if (p.friendly) this.friendlyKills++;
          else { this.kills++; this.killsByDef[p.srcDef] = (this.killsByDef[p.srcDef] || 0) + 1; this.killsByCause[p.cause] = (this.killsByCause[p.cause] || 0) + 1; if (p.cause === 'trample' && p.srcDef === 'war_elephant') this.trampleKills++; }
        }
      }),
      ev.on('ability_cast', (p) => { if (p.team === this.team && p.ability === 'kick') this.kicks++; }),
      ev.on('hero_down', (p) => { if (p.team === this.team) this.heroesLost++; }),
      ev.on('friendly_fire', (p) => { const u = world.unitById(p.src); if (u && u.team === this.team) { this.friendlyHits++; this.friendlyDmg += p.dmg; } }),
      ev.on('prop_destroyed', (p) => { (this.propT[p.type] || (this.propT[p.type] = [])).push(world.time); }),
    ];
  }
  _census() {
    this.started = true;
    for (const k of Object.keys(this.startDefs)) delete this.startDefs[k];
    for (const u of this.w.units) if (u.alive && u.team === this.team) { this.startDefs[u.def.id] = (this.startDefs[u.def.id] || 0) + 1; if (u.vip) this.vip = u; }
  }
  /** The extra fields of the BattleSummary used by evaluateStars. */
  extras() {
    const w = this.w, vip = this.vip || w.units.find((u) => u.vip && u.team === this.team) || null;
    return {
      startDefs: Object.assign({}, this.startDefs), lostDefs: Object.assign({}, this.lostDefs), heroesLost: this.heroesLost, friendlyHits: this.friendlyHits,
      friendlyDmg: Math.round(this.friendlyDmg), friendlyKills: this.friendlyKills, killsByDef: Object.assign({}, this.killsByDef), killsByCause: Object.assign({}, this.killsByCause),
      elephantTrampleKills: this.trampleKills, kicks: this.kicks, propDownT: Object.keys(this.propT).reduce((o, k) => { o[k] = this.propT[k].slice(); return o; }, {}),
      vipDamage: vip ? Math.max(0, Math.round((vip.hpMax - (vip.alive ? vip.hp : 0)) * 10) / 10) : 0,
    };
  }
  destroy() { for (const f of this.off) f(); this.off.length = 0; }
}

// ------------------------------------------------------------------------------------------------------------------------------ runtime
export class MissionRuntime {
  /** o: {seed, onWave?}. Constructed by setupMission(); the world calls tick() through world.onTick. */
  constructor(world, m, o = {}) {
    this.w = world; this.m = m; this.seed = o.seed || world.seed; this.rng = new RNG(this.seed * 977 + 5);
    this.tracker = new MissionTracker(world, m);
    this.script = m.script || {};
    this.waves = null; this.zeus = this.script.zeus ? new ZeusStrikes(this.script.zeus) : null; this.vipMarch = this.script.vipMarch || null; this.vipSquad = null; this.t = 0;
    this.beats = []; this.beatSeen = new Set(); this.contact = false;
    this.off = [world.events.on('battle_start', () => this._start())];
    if (m.teaching) this.off.push(world.events.onAny((type, p) => this._beat(type, p)));
    if (this.script.waves) this._installWaves();
    // a binding objective (the goat must cross) is not satisfied by wiping out the enemy: the battle goes on until the objective itself ends it
    if (m.objective && m.objective.binding && world.objective && !this.waves) { const obj = world.objective; Object.defineProperty(obj, 'blocksElimination', { configurable: true, enumerable: true, get: () => !obj.done, set: () => {} }); }
    const prev = world.onTick;
    world.onTick = (w, dt) => { if (prev) prev(w, dt); this.tick(w, dt); };
  }
  _installWaves() {
    const w = this.w, cfg = this.script.waves;
    this.waves = new ScriptedWaves(w, cfg);
    const obj = w.objective, ws = this.waves;
    // an empty field must not end the battle while waves are still to come (hold_hill, kill_general) or before the last one is cleared (survive_waves)
    if (obj) Object.defineProperty(obj, 'blocksElimination', { configurable: true, enumerable: true, get: () => ws.pending || (obj.type === 'survive_waves' && ws.cleared < ws.total), set: () => {} });
  }
  _start() {
    const w = this.w;
    for (const u of w.units) if (u.alive && u.team === TEAM_PLAYER && u.vip) {
      const mk = this.vipMarch && this.vipMarch.to ? markerOf(this.m, this.vipMarch.to) : null;
      if (mk && u.squad) { this.vipUnit = u; this.vipSquad = u.squad; u.squad.order = 'hold'; u.squad.moveTo = { x: mk.x, z: mk.z }; this.vipExit = mk; this.vipAt = this.vipMarch.delay || 0; this.vipCheck = 0; }
    }
  }
  /** Distance from point (px,pz) to the segment (ax,az)-(bx,bz). */
  static segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    let t = ((px - ax) * dx + (pz - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }
  /** The VIP leaves when the delay is over and no enemy stands within `clear` u of the way to the exit marker (the player can still order the squad by hand). */
  _vip(w, dt) {
    const sq = this.vipSquad, u = this.vipUnit;
    if (!sq || sq.order !== 'hold' || !u.alive || this.t < this.vipAt) return;
    this.vipCheck -= dt; if (this.vipCheck > 0) return;
    this.vipCheck = 0.5;
    const clear = this.vipMarch.clear || 0, e = this.vipExit;
    if (clear > 0) for (const o of w.units) if (o.alive && o.team !== TEAM_PLAYER && MissionRuntime.segDist(o.x, o.z, u.x, u.z, e.x, e.z) < clear) return;
    sq.order = 'move';
  }
  tick(w, dt) {
    if (w.state !== 'running') return;
    this.t += dt;
    if (this.vipSquad) this._vip(w, dt);
    if (this.zeus) this.zeus.tick(w, dt, this.rng);
  }
  _beat(type, p) {
    // mission-1 teaching beats: the triggers of campaign_text.js TEACHING_BEATS mapped from sim events (the app shows them)
    const t = type === 'battle_start' ? 'battle_start' : type === 'unit_hit' ? 'first_contact' : type === 'unit_brace' ? 'cavalry_brace' : type === 'battle_end' ? 'battle_end' : null;
    if (!t || this.beatSeen.has(t)) return;
    if (t === 'first_contact' && !this.contact) { this.contact = true; }
    this.beatSeen.add(t); this.beats.push({ trigger: t, time: this.w.time });
  }
  destroy() { for (const f of this.off) f(); this.tracker.destroy(); }
}

/**
 * Fill a freshly built World (placement phase) with a mission: the enemy army (team B), the free player units (VIP), generals flagged, the script and the
 * tracker installed. Returns the MissionRuntime (keep it: runtime.tracker.extras() feeds evaluateStars through battleSummary()).
 */
export function setupMission(world, m, o = {}) {
  const defs = world.defs, seed = o.seed || world.seed;
  const f = enemyForces(m, world.arena, defs, seed);
  if (!o.noEnemy) world.addPlacements(TEAM_ENEMY, f.placements, { defs });
  for (const u of playerFixed(m, world.arena, defs)) {
    const sq = world.addSquad(u.defId, TEAM_PLAYER, 1, u.x, u.z, { heading: u.heading, def: u.def, order: 'hold', names: u.name ? [u.name] : undefined });
    if (u.vip) for (const unit of sq.units) unit.vip = true;
  }
  for (const u of world.units) if (u.team === TEAM_ENEMY && (m.enemy.generals || []).includes(u.def.id)) u.general = true;
  return new MissionRuntime(world, m, { seed });
}

// ------------------------------------------------------------------------------------------------------------------------------ summary
/** The BattleSummary (docs/lifetime_stats.md section 3) of a finished mission World + the tracker extras. COORD's builder may replace this; the fields are the contract. */
export function battleSummary(world, m, tracker, team = TEAM_PLAYER) {
  const enemy = 1 - team, S = world.stats[team], E = world.stats[enemy];
  const aliveDefs = {}; let alive = 0;
  for (const u of world.units) if (u.alive && u.team === team) { aliveDefs[u.def.id] = (aliveDefs[u.def.id] || 0) + 1; alive++; }
  const ex = tracker ? tracker.extras() : {};
  return Object.assign({
    kind: 'battle_end', win: world.winner === team, draw: world.winner === -1, reason: world.endReason, t: world.time, playerTeam: team, arenaId: m.arena.recipe, mission: m.id,
    objective: m.objective ? m.objective.type : 'eliminate', vipDef: ex.vipDamage !== undefined && (m.fixed || []).some((f) => f.vip) ? (m.fixed.find((f) => f.vip).defId) : null,
    unitsStart: S.startCount, unitsLost: S.dead, unitsAlive: alive, aliveDefs, playerCostStart: S.startCost, enemyCostStart: E.startCost, kills: S.kills, stonedUnits: 0, cyclopsMisses: 0, maxMeteorKills: 0, trojanRevealed: false, wineRain: false, takeCommandKills: 0,
  }, ex);
}
