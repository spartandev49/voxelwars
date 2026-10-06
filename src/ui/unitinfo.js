// UI-side presentation helpers for units: role icons/chips, faction colours, counter heuristics, derived stat summaries.
// Pure presentation (no DOM). Numeric truth stays in content/era_ancient/stats.js; counters here are *hints* derived from tags/roles
// (spec S13/S14/U6 rules of thumb) unless ctx.content.counters supplies an authoritative table.
import { FACTIONS as DEFAULT_FACTIONS } from '../content/era_ancient/stats.js';

export const ROLE_ICON = { melee: 'sword', ranged: 'bow', cavalry: 'horseshoe', siege: 'tower', support: 'heart', hero: 'crown', monster: 'skull', swarm: 'scatter', beast: 'paw' };
export const ROLE_LABEL = { melee: 'Melee', ranged: 'Ranged', cavalry: 'Cavalry', siege: 'Siege', support: 'Support', hero: 'Hero', monster: 'Monster', swarm: 'Swarm', beast: 'Beast' };
export const ROLE_CHIP = { melee: 'crimson', ranged: 'olive', cavalry: 'lapis', siege: 'lava', support: 'pink', hero: 'gold', monster: 'ink', swarm: 'sky', beast: 'sky' };
export const ROLES = ['melee', 'ranged', 'cavalry', 'siege', 'support', 'hero', 'monster', 'swarm', 'beast'];
export const FACTION_ORDER = ['hellenes', 'romans', 'egyptians', 'persians', 'carthage', 'barbarians', 'mythic'];

export const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
export function factionColor(factions, id) {
  const f = (factions || DEFAULT_FACTIONS)[id];
  return f && f.colors ? hex(f.colors[0]) : '#ffc93c';
}
export function factionName(factions, id) {
  const f = (factions || DEFAULT_FACTIONS)[id];
  return f ? f.name : id;
}

const has = (d, t) => !!(d.tags && d.tags.indexOf(t) >= 0);

/** Rule-of-thumb counters for a def: { beats: string[], weak: string[] } (human labels, <= 2 each). */
let CONTENT = null;
/** K.init(ctx) binds ctx.content so counterHints() can use the real counter table (content.counters[id] = {counters:[ids], prey:[ids], strong}). */
export function bindContent(content) { CONTENT = content || null; }
const nameOf = (id) => { const u = CONTENT && CONTENT.units && CONTENT.units[id]; return (u && u.name) || id; };

/** {beats:[names], weak:[names]}: the real matchup table when the content provides one, else a tag/role heuristic. */
export function counterHints(def) {
  let t = null;
  try { t = CONTENT && CONTENT.counters ? CONTENT.counters[def.id] : null; } catch (e) { t = null; }
  if (t && Array.isArray(t.prey) && Array.isArray(t.counters)) return { beats: t.prey.slice(0, 3).map(nameOf), weak: t.counters.slice(0, 3).map(nameOf), beatIds: t.prey.slice(0, 3), weakIds: t.counters.slice(0, 3), strong: !!t.strong, table: true };
  return counterHeuristic(def);
}
function counterHeuristic(def) {
  const beats = [], weak = [];
  const role = def.role;
  if (has(def, 'spear') || has(def, 'pike')) { beats.push('Cavalry'); weak.push('Archers'); }
  if (role === 'cavalry') { beats.push('Archers'); beats.push('Siege'); weak.push('Spears'); }
  if (has(def, 'archer') || (role === 'ranged' && !has(def, 'skirmisher'))) { beats.push('Slow melee'); weak.push('Cavalry'); }
  if (has(def, 'skirmisher')) { beats.push('Heavy melee'); weak.push('Cavalry'); }
  if (role === 'siege') { beats.push('Clusters'); beats.push('Walls'); weak.push('Cavalry'); }
  if (has(def, 'large') || role === 'monster') { beats.push('Infantry blobs'); weak.push('Massed spears'); if (has(def, 'fire_weak')) weak.push('Fire'); }
  if (role === 'support') { weak.push('Fast flankers'); }
  if (role === 'hero') { beats.push('Morale'); weak.push('Focus fire'); }
  if (role === 'swarm' || role === 'beast') { beats.push('Archers'); weak.push('Spears'); }
  if (def.shield && def.shield.proj >= 0.7) { beats.push('Arrows'); }
  if (def.armor >= 0.4 && role !== 'cavalry') { weak.push('Blunt + magic'); }
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i).slice(0, 2);
  return { beats: uniq(beats), weak: uniq(weak) };
}

/** Rough damage per second (single target) from melee/ranged blocks. */
export function dpsOf(def) {
  const a = def.melee ? def.melee.dmg / def.melee.cd : 0;
  const b = def.ranged ? def.ranged.dmg / def.ranged.cd : 0;
  return Math.max(a, b);
}
export function rangeOf(def) {
  if (def.ranged) return def.ranged.range;
  if (def.melee) return def.melee.range;
  return 0;
}

/** Normalised display stats for stat bars: [{key,label,value,max,text}] with `max` taken from the whole roster. */
export function statRows(def, roster) {
  const list = roster || [def];
  const mx = (f) => Math.max(1, ...list.map(f));
  const rows = [
    { key: 'hp', label: 'Health', v: def.hp, max: mx((d) => d.hp), text: String(def.hp), tone: 'olive' },
    { key: 'armor', label: 'Armor', v: def.armor || 0, max: 0.75, text: Math.round((def.armor || 0) * 100) + '%', tone: 'sky' },
    { key: 'dps', label: 'Damage', v: dpsOf(def), max: mx(dpsOf), text: dpsOf(def).toFixed(1) + '/s', tone: 'crimson' },
    { key: 'speed', label: 'Speed', v: def.speed || 0, max: mx((d) => d.speed || 0), text: (def.speed || 0).toFixed(1), tone: 'lapis' },
    { key: 'range', label: 'Range', v: rangeOf(def), max: mx(rangeOf), text: rangeOf(def).toFixed(1) + ' u', tone: 'lava' },
    { key: 'cost', label: 'Cost', v: def.cost, max: mx((d) => d.cost), text: String(def.cost), tone: 'gold' },
  ];
  return rows;
}

/** Human description of an ability ref (fallback copy; ctx.content.glossary overrides when it has the id). */
export const ABILITY_INFO = {
  stance: { name: 'Stance', icon: 'shield', text: 'Stand still beside allies to harden the line: bonus block while stationary.' },
  kick: { name: 'Kick', icon: 'bolt', text: 'Launches an enemy several units through the air and stuns them. Dramatic. Educational.' },
  cc_field: { name: 'Field effect', icon: 'sparkle', text: 'Channels an area effect that confuses, sleeps, scares or turns enemies to stone.' },
  net: { name: 'Net', icon: 'link', text: 'Roots a nearby enemy in place for a few seconds.' },
  heal_pulse: { name: 'Heal pulse', icon: 'heart', text: 'Periodically heals nearby allies.' },
  execute: { name: 'Execute', icon: 'skull', text: 'Finishes off a wounded enemy in melee on a timer.' },
  dot_cloud: { name: 'Locust cloud', icon: 'cloud', text: 'Leaves a damaging cloud over an area for several seconds.' },
  revive: { name: 'Revive', icon: 'refresh', text: 'Rises once after dying. They are called Immortals, not Invincibles.' },
  rage: { name: 'Rage', icon: 'fire', text: 'Below half health: more damage, more speed, no fear.' },
  chain_lightning: { name: 'Chain lightning', icon: 'bolt', text: 'Zaps one target, then jumps to a few more.' },
  war_horn: { name: 'War horn', icon: 'music', text: 'One mighty blast: nearby allies move and hit harder for a while.' },
  dash: { name: 'Charge', icon: 'forward', text: 'A short, ill-advised sprint that hurts whatever is in the way.' },
  summon_on_death: { name: 'Surprise', icon: 'door', text: 'When it falls or reaches the enemy line, something comes out of it.' },
  tantrum: { name: 'Tantrum', icon: 'fire', text: 'When hurt, flies into a rage: triple damage and a lot more speed.' },
  cluck: { name: 'Cluck', icon: 'chicken', text: 'Taunts nearby enemies into chasing it. It has no regrets.' },
  pack_bonus: { name: 'Pack bonus', icon: 'users', text: 'Hits harder for each friend nearby.' },
  bribe: { name: 'Bribe', icon: 'coin', text: 'Coins that occasionally convince an enemy to switch sides for a few seconds.' },
  throne: { name: 'Throne', icon: 'crown', text: 'Sits down to watch the battle, which inspires everyone. Shouts if interrupted.' },
  crowd_favorite: { name: 'Crowd favorite', icon: 'star', text: 'Fights harder when surrounded by enemies. The audience loves it.' },
  aura: { name: 'Aura', icon: 'sparkle', text: 'Boosts nearby allies in some way (morale, damage, discipline).' },
};
export function abilityInfo(ref, glossary) {
  const g = glossary && glossary.abilities && glossary.abilities[ref.id];
  if (g) return { name: g.name || ref.id, icon: g.icon || 'sparkle', text: g.text || g.desc || '' };
  const b = ABILITY_INFO[ref.id];
  if (b) return b;
  return { name: ref.id.replace(/_/g, ' '), icon: 'sparkle', text: 'A special ability.' };
}

/** Clip ids the codex turntable can ask for (ids per spec section 7 state->clip mapping). */
export function attackClip(def) {
  if (def.ranged) {
    const pr = def.ranged.proj;
    if (pr === 'arrow') return 'shoot_bow';
    if (pr === 'boulder' || pr === 'bolt') return 'launch';
    if (pr === 'sunbeam' || pr === 'scepter' || pr === 'thunderbolt') return 'cast';
    return 'throw';
  }
  const st = def.melee && def.melee.style;
  return st ? 'strike_' + st : 'strike_slash_1';
}
export function clipOptions(def) {
  const out = [{ id: 'idle', clip: 'idle' }, { id: 'walk', clip: 'walk' }, { id: 'attack', clip: attackClip(def) }];
  if (def.shield) out.push({ id: 'block', clip: 'block_hit' });
  if ((def.abilities || []).some((a) => ['cc_field', 'heal_pulse', 'chain_lightning', 'dot_cloud'].indexOf(a.id) >= 0)) out.push({ id: 'cast', clip: 'cast' });
  out.push({ id: 'death', clip: 'death_back' });
  return out;
}
