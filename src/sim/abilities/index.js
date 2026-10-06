// Ability registry: id -> implementation. Implementations live in sibling files and self-register on import (spec §6.1).
// Hook points: init(u,ab,w) tick(u,ab,w,dt) mods(u,ab,w,dt) onAim(u,ab,w,aim) onFire(u,ab,w,proj) onHitDealt(u,ab,w,dst,dmg,hit) onBlocked(u,ab,w,dst,hit)
//   onBlock(u,ab,w,src,hit) onDamaged(u,ab,w,src,dmg,hit) onLethal(u,ab,w,src,cause,hit)->true cancels death onKilled(u,ab,w,src,cause) onKill(u,ab,w,victim,cause)
//   onLand(u,ab,w,impact) onBurn(u,ab,w) cast(u,ab,w,ctx)->bool (player-triggered, used by possession).
export { abilityRegistry, reg } from './registry.js';
import './aura.js';
import './stance.js';
import './kick.js';
import './cc_field.js';
import './net.js';
import './heal_pulse.js';
import './execute.js';
import './dot_cloud.js';
import './revive.js';
import './rage.js';
import './chain_lightning.js';
import './war_horn.js';
import './dash.js';
import './summon_on_death.js';
import './tantrum.js';
import './cluck.js';
import './pack_bonus.js';
import './bribe.js';
import './throne.js';
import './crowd_favorite.js';
import './hook.js';
import './breaks_shield.js';
import './fire_every.js';
import './poison.js';
import './misfire.js';
import './misaim.js';
import './fire_panic.js';
