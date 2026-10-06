// JIT warm-up for the simulation (perf). Pure and deterministic: it runs a throw-away World, never touches the player's.
//
// Why: the first ~300 ticks of a battle run cold code (interpreter/baseline, then repeated TurboFan optimise/deopt cycles as new branches are met), which costs
// 2-3x the steady-state tick and produces 30-60 ms spikes at 600 units. Warming the same functions on a small battle while the player is still in the placement
// screen moves that cost out of the first seconds of the real fight. Measured (thread CPU, 594 units, contact phase): cold 3.3 ms avg / 40 ms worst tick,
// warmed 1.7 ms avg / 13 ms worst.
//
//   const wu = createWarmup({ defs, arena });      // arena optional (a small marathon arena is generated otherwise)
//   wu.step(6);                                    // run <= 6 ms of work, returns true when finished; call once per frame while placing
//   warmSim({ defs, arena });                      // synchronous version (tests, tools)
import { World } from './world.js';
import { layoutArmy } from './armygen.js';
import { generateArena } from '../world/gen.js';

const ROSTER = [
  [['hoplite', 10], ['peltast', 5], ['cretan_archer', 5], ['companion_cavalry', 4], ['philosopher', 1], ['spartan', 3], ['strategos', 1], ['catapult', 1], ['war_elephant', 1], ['warhound', 3], ['battle_goat', 2],
    ['immortal', 3], ['sparabara', 3], ['cataphract', 2], ['camel_rider', 2], ['anubis_guard', 2], ['mummy', 2], ['priest_of_ra', 1], ['pharaoh', 1], ['cyclops', 1], ['trojan_horse', 1]],
  [['legionary', 10], ['pilum_thrower', 5], ['nubian_archer', 5], ['equites', 4], ['senator', 1], ['gladiator', 3], ['centurion', 1], ['ballista', 1], ['minotaur', 1], ['medusa', 1], ['berserker', 3], ['sacred_chicken', 3],
    ['khopesh_warrior', 3], ['medjay', 3], ['axe_thrower', 3], ['druid', 1], ['chariot_archer', 2], ['numidian', 2], ['centaur_archer', 2], ['hannibal', 1], ['xerxes', 1], ['chieftain', 1]],
];
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function createWarmup(o) {
  const defs = o.defs, ticks = o.ticks || 420;
  const self = {
    done: false, world: null, tick: 0, phase: 0,
    /** Run for about `budgetMs` ms (at least one unit of work). Returns true once finished. */
    step(budgetMs = 6) {
      if (self.done) return true;
      const t0 = now();
      do {
        if (self.phase === 0) {
          const arena = o.arena || generateArena('marathon', 'small', 1);
          const w = new World({ arena, seed: 7, rules: { timeLimit: 0, godPowers: false }, defs });
          for (let t = 0; t < 2; t++) {
            const groups = ROSTER[t].filter(([id]) => defs[id]).map(([defId, n]) => ({ defId, n }));
            if (groups.length) w.addPlacements(t, layoutArmy(groups, arena.zones[t === 0 ? 'A' : 'B'], arena.zones[t === 0 ? 'B' : 'A'], defs, { seed: 3 + t }), { defs });
          }
          if (!w.units.length) { self.done = true; return true; }
          w.start(0); self.world = w; self.phase = 1;
        } else if (self.tick < ticks && self.world.state === 'running') {
          self.world.tick(); self.tick++;
        } else { self.world = null; self.done = true; return true; }
      } while (now() - t0 < budgetMs);
      return false;
    },
    get progress() { return self.done ? 1 : Math.min(0.99, self.tick / ticks); },
  };
  return self;
}

/** Synchronous warm-up (about 0.3-0.6 s of CPU on a cold process). */
export function warmSim(o) { const w = createWarmup(o); while (!w.step(1e9)); return w; }
