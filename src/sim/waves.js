// Survival waves (world.md §7). world.waves = new WaveSystem(world, opts); the World calls update() every running tick.
//   wave n: enemy budget 2400 + 900 n, style rotates (balanced, rush, ranged, elite, chaos, counter), every 5th wave adds a boss (minotaur, cyclops, war_elephant, medusa, pharaoh).
//   waves come every 40 s or as soon as the field is clear; between waves the player gets 1600 + 240 n to place reinforcements (intermission: the sim keeps ticking, the Game pauses
//   on `wave_intermission` and calls waves.next() when the player is done; headless runs auto-advance after 40 s).
// Events: wave_spawn{n,count}, wave_intermission{n,budget,name,boss}. Score = cleared*1000 + kills*10 + remaining cost of the player's army.
import { generateArmy, layoutArmy, STYLES, groupsCost } from './armygen.js';
import { WAVE_NAMES, BOSS_NAMES, BOSS_CYCLE } from '../content/era_ancient/wave_names.js';

export const waveBudget = (n) => 2400 + 900 * n;
export const reinforceBudget = (n) => 1600 + 240 * n;
export const waveStyle = (n) => STYLES[(n - 1) % STYLES.length];
export const isBossWave = (n) => n % 5 === 0;
export const bossOf = (n) => BOSS_CYCLE[(Math.floor(n / 5) - 1) % BOSS_CYCLE.length];
export function waveName(n) {
  if (isBossWave(n)) return BOSS_NAMES[bossOf(n)].replace('{n}', String(n));
  return 'Wave ' + n + ': ' + WAVE_NAMES[(n - 1) % WAVE_NAMES.length];
}

export class WaveSystem {
  /** opts: {enemyTeam=1, playerTeam=0, faction='mixed', interval=40, autoAdvance=true, maxWaves=0 (0 = endless)} */
  constructor(w, opts = {}) {
    this.w = w; this.enemy = opts.enemyTeam === 0 ? 0 : 1; this.player = 1 - this.enemy; this.faction = opts.faction || 'mixed';
    this.interval = opts.interval || 40; this.autoAdvance = opts.autoAdvance !== false; this.maxWaves = opts.maxWaves || 0;
    this.n = 0; this.cleared = 0; this.state = 'idle'; this.timer = 0; this.inter = 0; this.kills0 = 0; this.lastArmy = null;
    w.waves = this;
  }
  /** Composition of wave n (also used by tests): {budget, style, boss, army}. */
  compose(n) {
    const w = this.w, budget = waveBudget(n);
    const against = {}; for (const u of w.units) if (u.alive && u.team === this.player) against[u.def.id] = (against[u.def.id] || 0) + 1;
    const boss = isBossWave(n) ? bossOf(n) : null;
    const bossCost = boss ? w.defs[boss].cost : 0;
    const army = generateArmy({ faction: this.faction, budget: budget - bossCost, style: waveStyle(n), difficulty: w.rules.difficulty && typeof w.rules.difficulty === 'string' ? w.rules.difficulty : 'normal', against, defs: w.defs, seed: w.seed * 131 + n, cap: 300 });
    const groups = army.groups.slice();
    if (boss) groups.push({ defId: boss, n: 1 });
    return { n, budget, style: waveStyle(n), boss, army, groups, cost: army.cost + bossCost, name: waveName(n) };
  }
  spawn() {
    const w = this.w, n = ++this.n, c = this.compose(n);
    const zone = w.arena.zones[this.enemy === 0 ? 'A' : 'B'], ez = w.arena.zones[this.enemy === 0 ? 'B' : 'A'];
    const pl = layoutArmy(c.groups, zone, ez, w.defs, { seed: w.seed + n, firstSquad: 1 });
    w.addPlacements(this.enemy, pl);
    let count = 0; for (const g of c.groups) count += g.n;
    const e = w.P.wave_spawn; e.n = n; e.count = count; w.emit('wave_spawn', e);
    this.state = 'fighting'; this.timer = 0; this.lastArmy = c;
    return c;
  }
  /** Called by the Game when the player finished placing reinforcements (or by update() after the auto-advance delay). */
  next() { if (this.state === 'intermission') { this.state = 'idle'; this.inter = 0; } }
  update(w, dt) {
    if (w.state !== 'running') return;
    if (this.state === 'idle') {
      if (this.maxWaves && this.n >= this.maxWaves) return;
      this.spawn(); return;
    }
    if (this.state === 'fighting') {
      this.timer += dt;
      const enemyAlive = w.stats[this.enemy].alive;
      if (enemyAlive <= 0) {
        this.cleared = this.n; this.state = 'intermission'; this.inter = 0;
        const nn = this.n + 1, e = w.P.wave_intermission; e.n = nn; e.budget = reinforceBudget(this.n); e.name = waveName(nn); e.boss = isBossWave(nn) ? bossOf(nn) : ''; w.emit('wave_intermission', e);
      } else if (this.timer >= this.interval && !(this.maxWaves && this.n >= this.maxWaves)) {
        this.spawn();                                       // the next wave arrives on schedule even if the field is not clear
      }
      return;
    }
    if (this.state === 'intermission') {
      this.inter += dt;
      if (this.autoAdvance && this.inter >= this.interval) this.next();
    }
  }
  score() {
    const w = this.w;
    return this.cleared * 1000 + w.stats[this.player].kills * 10 + Math.round(w.stats[this.player].aliveCost);
  }
  info() { return { n: this.n, cleared: this.cleared, state: this.state, nextBudget: reinforceBudget(this.n), nextName: waveName(this.n + 1), score: this.score() }; }
}
export { groupsCost };
