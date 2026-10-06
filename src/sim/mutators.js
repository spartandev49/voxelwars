// Mutators (spec §14): data-only rule multipliers applied through world.rules.mutators (ids). Unlocked by campaign stars (UI side).
//   mods fields: dmg, kb (knockback), speed, hp, scale, crit, headScale (render), friendlyFire, chickenRain {every,count}, wineRain {every,frac,secs}, ragdoll (stagger on every hit)
// mutatorMods(ids) multiplies numeric mods and merges flags into one object read by the sim (World.mut). MutatorRuntime drives the timed ones.
import { ST, SE } from './consts.js';
import { applyStatus } from './combat.js';

export const MUTATORS = [
  { id: 'big_heads', name: 'Big Heads', desc: 'Heads are double size. Easier to hit: crits are 2.5x as common.', mods: { headScale: 2, crit: 2.5 } },
  { id: 'tiny_titans', name: 'Tiny Titans', desc: 'Everyone is 60% of their size, 25% faster and 20% sturdier.', mods: { scale: 0.6, speed: 1.25, hp: 1.2 } },
  { id: 'moon_gravity', name: 'Moon Gravity', desc: 'Knockback is tripled. Please do not look up.', mods: { kb: 3 } },
  { id: 'chicken_rain', name: 'Chicken Rain', desc: 'Sacred chickens fall from the sky for whoever is losing.', mods: { chickenRain: { every: 9, count: 3 } } },
  { id: 'wine_rain_always', name: 'Wine Rain Always', desc: 'It is permanently raining wine. Everyone is a little tipsy.', mods: { wineRain: { every: 2, frac: 0.25, secs: 4 } } },
  { id: 'friendly_fire_fiesta', name: 'Friendly Fire Fiesta', desc: 'Arrows hurt friends. So does everything else. Sorry, Gary.', mods: { friendlyFire: true } },
  { id: 'speedy_soldiers', name: 'Speedy Soldiers', desc: 'Everybody moves 50% faster. Nobody knows why.', mods: { speed: 1.5 } },
  { id: 'ragdoll_frenzy', name: 'Ragdoll Frenzy', desc: 'Every hit sends soldiers flying: knockback x2.5 and everything staggers.', mods: { kb: 2.5, ragdoll: true } },
  { id: 'glass_cannons', name: 'Glass Cannons', desc: 'Everyone hits 60% harder and has half the hit points.', mods: { dmg: 1.6, hp: 0.5 } },
];
const BY_ID = Object.create(null); for (const m of MUTATORS) BY_ID[m.id] = m;
export const mutatorIds = () => MUTATORS.map((m) => m.id);

export function mutatorMods(ids) {
  const out = { dmg: 1, kb: 1, speed: 1, hp: 1, scale: 1, crit: 1, headScale: 1, friendlyFire: false, chickenRain: null, wineRain: null, ragdoll: false, ids: [] };
  for (const id of ids || []) {
    const m = BY_ID[id]; if (!m) continue;
    out.ids.push(id);
    for (const k of Object.keys(m.mods)) {
      const v = m.mods[k];
      if (typeof v === 'number') out[k] = out[k] * v; else out[k] = v;
    }
  }
  return out;
}

export class MutatorRuntime {
  constructor(w) { this.w = w; this.tc = 0; this.tw = 0; }
  tick(dt) {
    const w = this.w, m = w.mut;
    if (m.chickenRain) {
      this.tc -= dt;
      if (this.tc <= 0) {
        this.tc = m.chickenRain.every;
        const weaker = w.stats[0].aliveCost <= w.stats[1].aliveCost ? 0 : 1;
        const half = w.arena.worldSize() * 0.25;
        for (let k = 0; k < m.chickenRain.count; k++) {
          const x = (w.rng.next() * 2 - 1) * half, z = (w.rng.next() * 2 - 1) * half;
          if (!w.nav.walkable(x, z)) continue;
          const u = w.addUnit('sacred_chicken', weaker, x, z, {});
          u.y = w.arena.cellHeight(x, z) + 14; u.ky = 0;                   // falls under gravity (integrate)
        }
      }
    }
    if (m.wineRain) {
      this.tw -= dt;
      if (this.tw <= 0) {
        this.tw = m.wineRain.every;
        for (const u of w.units) if (u.alive && w.rng.next() < m.wineRain.frac) applyStatus(w, u, SE.TIPSY, m.wineRain.secs);
      }
    }
  }
}
