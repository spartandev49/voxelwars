// Event catalogue (spec §8.2, decisions D6): ONE table {name: [payload fields]}. The sim derives its pre-allocated payload objects (World.P) from it;
// tests/events.test.mjs fails when a `P.<name>` used in src/sim is missing here. Consumers must read payloads, never retain them.
export const EVENTS = {
  battle_countdown: ['n'], battle_start: ['teams'], battle_end: ['winner', 'reason', 't', 'stats', 'perDef'],
  unit_spawn: ['id', 'team', 'def', 'x', 'z'],
  unit_hit: ['src', 'dst', 'srcDef', 'dstDef', 'dmg', 'type', 'crit', 'backstab', 'charge', 'proj', 'aoe', 'x', 'y', 'z'],
  unit_block: ['src', 'dst', 'x', 'y', 'z', 'kind'],
  unit_kill: ['src', 'dst', 'srcDef', 'dstDef', 'srcTeam', 'dstTeam', 'friendly', 'byPlayer', 'revived', 'cause', 'x', 'y', 'z'],
  unit_heal: ['id', 'amount'], unit_stagger: ['id'], unit_rout: ['id', 'team'], unit_rally: ['id'], unit_revive: ['id'], unit_convert: ['id', 'team'],
  ability_cast: ['id', 'ability', 'x', 'z', 'team'], ability_channel_start: ['id', 'ability', 'duration'], ability_channel_end: ['id', 'ability', 'duration'],
  telegraph: ['kind', 'x', 'z', 'r', 't', 'h', 'a', 'team'],
  status_apply: ['id', 'status'],
  projectile_launch: ['kind', 'team', 'x', 'y', 'z', 'tx', 'tz', 'id'], projectile_hit: ['kind', 'x', 'y', 'z', 'onUnit', 'blocked'],
  explosion: ['kind', 'x', 'y', 'z', 'r'], lightning_arc: ['x0', 'y0', 'z0', 'x1', 'y1', 'z1'], crater: ['x', 'z', 'r', 'x0', 'z0', 'x1', 'z1'],
  prop_damaged: ['id', 'type', 'hpFrac', 'x', 'y', 'z'], prop_destroyed: ['id', 'type', 'x', 'y', 'z', 's'], prop_spawned: ['id', 'type', 'x', 'z'],
  first_blood: ['src', 'dst', 'srcDef', 'dstDef'], kill_streak: ['id', 'count', 'def'], hero_down: ['id', 'def', 'team'], army_low: ['team', 'frac'],
  lead_change: ['team', 'ratio'], big_swing: ['team', 'ratio', 'flank', 'cluster'], stalemate_warning: ['t'], intervention: ['kind'],
  objective_update: ['id', 'state', 'progress'], wave_spawn: ['n', 'count'], wave_intermission: ['n', 'budget', 'name', 'boss'], god_power: ['kind', 'x', 'z', 'team'],
  chicken_tantrum: ['id', 'x', 'z'], philosopher_monologue: ['id', 'x', 'z'], trojan_reveal: ['id', 'x', 'z', 'count'], stone_gaze: ['src', 'count'], throne_sit: ['id', 'x', 'z', 'sitting'],
  friendly_fire: ['src', 'dst', 'dmg'], trample: ['id', 'count'], charge_hit: ['id', 'dst', 'mul'], unit_brace: ['id', 'dst'],
  cyclops_misaim: ['id'], catapult_misfire: ['id'], unit_corpse_done: ['id', 'def', 'team', 'x', 'y', 'z'], bark: ['id', 'text'],
  fire_started: ['x', 'z', 'r'], crowd_roar: ['x', 'z'], hazard_trigger: ['kind', 'x', 'z', 'r'], possess: ['id', 'on'],
};
/** Fresh pre-shaped payload objects, one per event (World.P). */
export function makePayloads() {
  const P = Object.create(null);
  for (const n of Object.keys(EVENTS)) {
    const o = {};
    for (const f of EVENTS[n]) o[f] = f === 'cluster' ? { x: 0, z: 0 } : (f === 'teams' ? [] : (f === 'stats' || f === 'perDef') ? null : (f === 'text' || f === 'kind' || f === 'status' || f === 'reason' || f === 'cause' || f === 'type' || f === 'srcDef' || f === 'dstDef' || f === 'def' || f === 'ability' || f === 'flank' || f === 'name') ? '' : 0);
    P[n] = o;
  }
  return P;
}

// Tiny synchronous event bus. Payload objects may be reused by the emitter: consumers must read, never retain.
export class EventBus {
  constructor() { this.h = Object.create(null); this.any = []; this.counts = Object.create(null); this.record = null; this.now = null; }
  on(type, fn) { (this.h[type] || (this.h[type] = [])).push(fn); return () => this.off(type, fn); }
  /** Listen to every event: fn(type, payload). */
  onAny(fn) { this.any.push(fn); return () => { const i = this.any.indexOf(fn); if (i >= 0) this.any.splice(i, 1); }; }
  off(type, fn) { const a = this.h[type]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
  emit(type, p) {
    this.counts[type] = (this.counts[type] || 0) + 1;
    const a = this.h[type];
    if (a) for (let i = 0; i < a.length; i++) a[i](p);
    const any = this.any;
    for (let i = 0; i < any.length; i++) any[i](type, p);
    if (this.record) this.record.push([type, JSON.parse(JSON.stringify(p)), this.now ? this.now() : 0]);   // [type, payload, simTime]
  }
  has(type) { return !!(this.h[type] && this.h[type].length) || this.any.length > 0; }
  clear() { this.h = Object.create(null); this.any.length = 0; }
}
