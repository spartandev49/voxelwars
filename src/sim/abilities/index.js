// Ability registry: id -> implementation {init(u,ab,w), tick(u,ab,w,dt), mods(u,ab,w), onHitDealt, onDamaged, onLethal, onKilled, onKill}.
// Implementations live in sibling files; the registry is filled by importing them. (See spec/units.md ability classes.)
export const abilityRegistry = Object.create(null);
