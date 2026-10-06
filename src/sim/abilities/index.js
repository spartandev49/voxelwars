// Ability registry: id -> implementation. Implementations live in sibling files and self-register on import (spec §6.1).
// Hook points: init(u,ab,w) tick(u,ab,w,dt) mods(u,ab,w) onAim onFire onHitDealt onBlocked onBlock onDamaged onLethal onKilled onKill onLand onBurn cast(u,ab,w,ctx).
export { abilityRegistry, reg } from './registry.js';
