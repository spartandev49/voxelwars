// Headless harness for the meta layer: a real World (real sim, real event bus) plus a Game stand-in with the same surface meta.js uses.
import { generateArena } from '../../src/world/gen.js';
import { World } from '../../src/sim/world.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { Store } from '../../src/save/store.js';
import { createDocs } from '../../src/save/docs.js';
import { LifetimeStats, storeAdapter } from '../../src/save/stats.js';
import { createMeta } from '../../src/app/meta.js';
import { RNG } from '../../src/core/rng.js';

export const defs = buildSimDefs();
export const mem = () => { const m = new Map(); return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, _m: m }; };

/** The slice of app/game.js that meta.js touches. */
export class FakeGame {
  constructor() {
    this.world = null; this.state = 'idle'; this.killfeed = []; this.announce = null; this.speed = 1; this.paused = false; this.possessId = 0; this.events = []; this.casts = [];
    this.rig = { mode: 'orbit', tx: 1, ty: 2, tz: 3, yaw: 0.4, pitch: 0.6, dist: 40, syaw: 0.4, reduceMotion: false, _unit(id) { return null; } };
  }
  emit(name, p) { this.events.push([name, p]); }
  getSpeed() { return this.speed; } setSpeed(s) { this.speed = s; this.emit('speed', { speed: s }); } isPaused() { return this.paused; } pause(b) { this.paused = !!b; }
  cast(power, x, z, team = 0) { this.casts.push([power, x, z, team]); if (this.world) this.world.input(this.world.tickN + 1, { type: 'cast', power, x, z, team }); }
  possess(id) { this.possessId = id || 0; if (this.world) this.world.input(this.world.tickN + 1, { type: 'possess', unit: id || 0, release: !id }); }
  eventsOf(n) { return this.events.filter((e) => e[0] === n).map((e) => e[1]); }
}

export function makeWorld({ arena = 'arenalab', seed = 7, a = [['hoplite', 12]], b = [['hoplite', 4]], rules = {}, gap = 14 } = {}) {
  const ar = generateArena(arena, 'small', 3);
  const w = new World({ arena: ar, seed, defs, rules });
  const half = Math.min(28, gap / 2);                           // the armies face each other `gap` units apart, centred on the arena (half-size is 32)
  let i = 0; for (const [id, n] of a) w.addSquad(id, 0, n, -half, (i++ - a.length / 2) * 6, { heading: Math.PI / 2 });
  i = 0; for (const [id, n] of b) w.addSquad(id, 1, n, half, (i++ - b.length / 2) * 6, { heading: -Math.PI / 2 });
  return w;
}

export function makeMeta({ world, setup, store, settings, audio, rng, game } = {}) {
  const g = game || new FakeGame();
  const st = store || new Store(mem());
  const set = settings || (() => { const d = { subtitles: true, tts: false, 'vol.announcer': 0.9, seenHints: {} }; return { get: (k) => d[k], set: (k, v) => { d[k] = v; }, data: d }; })();
  const docs = createDocs(st);
  const stats = new LifetimeStats({ adapter: storeAdapter(st), debounceMs: 0 });
  const meta = createMeta({ game: g, content: { factions: { hellenes: { name: 'Hellenes' }, persians: { name: 'Persians' } } }, settings: set, store: st, audio: audio || null, docs, stats, rng: rng || new RNG(5), now: () => 1750000000000 });
  if (world) { g.world = world; g.state = world.state === 'ended' ? 'ended' : 'placement'; meta.attach(world, setup || { kind: 'quick', arena: { presetId: 'colosseum', size: 'small', seed: 3 }, rules: { budget: 8000 }, armies: { A: { faction: 'hellenes', budget: 8000 }, B: { faction: 'persians', budget: 8000 } } }); }
  return { meta, game: g, store: st, settings: set, docs, stats };
}
