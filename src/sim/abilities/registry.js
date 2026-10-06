// Ability registry storage (separate from index.js so ability modules can self-register without an import cycle).
export const abilityRegistry = Object.create(null);
/** Register an ability implementation: {init,tick,mods,onAim,onFire,onHitDealt,onBlocked,onBlock,onDamaged,onLethal,onKilled,onKill,onLand,onBurn,cast, info}. */
export function reg(id, impl) { abilityRegistry[id] = impl; return impl; }
