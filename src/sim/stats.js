// Stat derivation and cost for custom soldiers (spec §5.1, editors.md §2) and the shared cost formula.
//   costFormula(def) -> integer drachmae from the DERIVED def (never trusted from files); hoplite = 100 by calibration.
//   statsToUnitDef(cs, opts) -> UnitDef: seven point-buy stats (100 points) + weapon class + body type + abilities, cost clamped to 1.35x the best shipped efficiency of its role.
//   validateStats(stats) -> {ok, errors, total}.   legalAbilities(weaponStyle) -> ability ids a soldier with that weapon may pick.
import { STAT_TABLE, DEFAULTS } from '../content/era_ancient/stats.js';
import { normalizeDef } from './defs.js';
import { power } from './power.js';

export const STAT_CAPS = { hp: 30, damage: 30, attackSpeed: 20, speed: 20, armor: 20, range: 10, morale: 10 };
export const STAT_POINTS = 100;
export const MAX_ABILITIES = 2;
export const EFFICIENCY_CAP = 1.35;

/** Weapon class table by blueprint weapon style (parts meta.style): base numbers for an average body. */
export const WEAPON_CLASSES = {
  thrust: { role: 'melee', dmg: 13, cd: 1.2, range: 2.0, type: 'pierce', style: 'thrust', kb: 4, tags: ['spear'] },
  pike: { role: 'melee', dmg: 16, cd: 1.7, range: 3.2, type: 'pierce', style: 'thrust', kb: 4, tags: ['spear', 'pike'] },
  slash: { role: 'melee', dmg: 15, cd: 1.0, range: 1.5, type: 'slash', style: 'slash', kb: 4, tags: [] },
  overhead: { role: 'melee', dmg: 20, cd: 1.3, range: 1.8, type: 'slash', style: 'overhead', kb: 5, tags: [] },
  bash: { role: 'melee', dmg: 12, cd: 1.1, range: 1.5, type: 'blunt', style: 'bash', kb: 5, tags: [] },
  throw: { role: 'ranged', dmg: 15, cd: 2.0, range: 16, type: 'pierce', style: 'slash', kb: 4, tags: ['skirmisher'], proj: 'javelin', speed: 30, gravity: 18, spread: 0.05, meleeDmg: 6, meleeRange: 1.2 },
  shoot: { role: 'ranged', dmg: 11, cd: 1.6, range: 32, type: 'pierce', style: 'bash', kb: 4, tags: ['archer'], proj: 'arrow', speed: 40, gravity: 22, spread: 0.045, meleeDmg: 5, meleeRange: 1.0 },
  cast: { role: 'ranged', dmg: 13, cd: 2.0, range: 16, type: 'magic', style: 'bash', kb: 3, tags: ['support'], proj: 'sunbeam', speed: 60, gravity: 0, spread: 0.01, meleeDmg: 4, meleeRange: 1.0 },
  none: { role: 'melee', dmg: 4, cd: 1.2, range: 1.0, type: 'blunt', style: 'bash', kb: 3, tags: [] },
};
/** Fallback weapon id -> class for callers without a compiled blueprint (compileSoldier returns weaponStyle; pass it via opts.weaponStyle). */
export const WEAPON_ID_STYLE = {
  dory: 'thrust', short_spear: 'thrust', spear_pomegranate: 'thrust', xyston: 'thrust', khopesh_spear: 'thrust', trident: 'thrust', sarissa: 'pike', kontos: 'pike',
  javelin: 'throw', pilum: 'throw', xiphos: 'slash', gladius: 'slash', spatha: 'slash', scimitar: 'slash', khopesh: 'slash', axe: 'overhead', double_axe: 'overhead', greataxe: 'overhead',
  greataxe_double: 'overhead', mace: 'bash', hammer: 'bash', club: 'bash', club_spiked: 'bash', club_big: 'bash', staff: 'bash', crook_flail: 'bash', vine_staff: 'bash', torch: 'bash',
  sickle: 'slash', scepter: 'cast', scepter_sun: 'cast', mistletoe_staff: 'cast', bow: 'shoot', composite_bow: 'shoot', sling: 'throw', none: 'none',
};
export const SHIELDS = {
  hoplon: { arc: 70, block: 0.45, proj: 0.6 }, scutum: { arc: 90, block: 0.5, proj: 0.75 }, round_shield: { arc: 60, block: 0.4, proj: 0.5 }, buckler: { arc: 40, block: 0.3, proj: 0.3 },
  parma: { arc: 55, block: 0.35, proj: 0.45 }, wicker: { arc: 55, block: 0.35, proj: 0.45 }, pavise: { arc: 90, block: 0.65, proj: 0.8 }, hide_shield: { arc: 50, block: 0.3, proj: 0.35 }, pelte: { arc: 45, block: 0.3, proj: 0.3 },
};
export const BODY = { slim: { radius: 0.5, mass: 0.9, hp: 0.92, speed: 0.1 }, average: { radius: 0.55, mass: 1.0, hp: 1.0, speed: 0 }, stocky: { radius: 0.62, mass: 1.15, hp: 1.1, speed: -0.1 } };
/** Abilities a soldier may carry by weapon class, with default parameters (max 2 per soldier). */
export const ABILITY_PRESETS = {
  kick: { classes: ['thrust', 'pike', 'slash', 'overhead', 'bash'], p: { id: 'kick', cd: 8 } },
  rage: { classes: ['slash', 'overhead', 'bash', 'thrust'], p: { id: 'rage', hpFrac: 0.5, dmg: 1.5, speed: 1.3 } },
  net: { classes: ['thrust', 'slash', 'bash', 'throw'], p: { id: 'net', radius: 10, root: 2.5, cd: 12 } },
  execute: { classes: ['thrust', 'slash', 'overhead'], p: { id: 'execute', cd: 10, threshold: 0.2 } },
  heal_pulse: { classes: ['cast', 'bash'], p: { id: 'heal_pulse', radius: 8, amount: 25, targets: 3, cd: 7 } },
  war_horn: { classes: ['thrust', 'slash', 'overhead', 'bash'], p: { id: 'war_horn', duration: 8, radius: 14, speed: 1.2, dmg: 1.2 } },
  cluck: { classes: ['thrust', 'slash', 'bash', 'throw', 'shoot'], p: { id: 'cluck', radius: 5, taunt: 2, cd: 12 } },
  revive: { classes: ['thrust', 'slash', 'overhead', 'bash', 'pike'], p: { id: 'revive', hpFrac: 0.4, delay: 3 } },
  aura_rally: { classes: ['thrust', 'slash', 'overhead', 'bash'], p: { id: 'aura', effect: 'rally', radius: 8 } },
  chain_lightning: { classes: ['cast'], p: { id: 'chain_lightning' } },
};
const ABILITY_COST_FACTOR = { kick: 1, rage: 1, net: 1, execute: 1, heal_pulse: 1, war_horn: 1, cluck: 0.5, revive: 1, aura_rally: 1, chain_lightning: 1 };
export const legalAbilities = (weaponStyle) => Object.keys(ABILITY_PRESETS).filter((k) => ABILITY_PRESETS[k].classes.includes(weaponStyle));

// ---------------------------------------------------------------------------------------------------------------- cost formula
// cost = K * P^0.519 * (speed/2.6)^0.3 * exp(role + 0.143 * activeAbilities + 0.281 * mounted + 0.278 * fearless); coefficients are a least-squares fit of log(cost) on the
// 43 shipped units (docs/balance_report.md lists the residuals); K is calibrated so a shipped hoplite costs exactly 100. Monotonic in every stat that feeds power or speed.
const COST_ROLE = { melee: 0, ranged: 0.21, cavalry: 0.195, support: 0.798, hero: 0.554, monster: 0.924, siege: 1.176, beast: -0.67, swarm: -1.311 };
const PASSIVE_MODS = new Set(['stance', 'hook', 'breaks_shield', 'fire_every', 'poison', 'misfire', 'misaim', 'fire_panic', 'bribe']);
function rawCost(def) {
  const sp = def.speed * ((def.runMul || 1.5) > 1.5 ? Math.sqrt((def.runMul || 1.5) / 1.5) : 1);
  const nab = (def.abilities || []).filter((a) => !PASSIVE_MODS.has(a.id)).length;
  const tags = def.tags || [];
  return Math.pow(power(def), 0.519) * Math.pow(sp / 2.6, 0.3) * Math.exp((COST_ROLE[def.role] || 0) + 0.143 * nab + (tags.includes('cavalry') ? 0.281 : 0) + (tags.includes('fearless') ? 0.278 : 0));
}
let _K = 0;
function K() { if (!_K) _K = 100 / rawCost(normalizeDef('hoplite', STAT_TABLE.hoplite)); return _K; }
/** Cost in drachmae of a derived/normalised def (never trusts def.cost). */
export function costFormula(def) { return Math.max(10, Math.round(K() * rawCost(def))); }

let _eff = null;
/** Best shipped power-per-cost for a role (non-boss, non-monster). */
export function roleEfficiency(role) {
  if (!_eff) {
    _eff = {};
    for (const id of Object.keys(STAT_TABLE)) {
      const d = normalizeDef(id, STAT_TABLE[id]);
      if (d.tags.includes('boss') || d.role === 'monster' || d.role === 'swarm' || d.role === 'beast') continue;
      const e = power(d) / d.cost;
      if (!(_eff[d.role] > e)) _eff[d.role] = e;
    }
    _eff.cavalry = _eff.cavalry || _eff.melee;
  }
  return _eff[role] || _eff.melee;
}
/** Cost with the role efficiency clamp: power/cost may not exceed 1.35x the best shipped unit of the role. */
export function clampedCost(def) {
  const c = costFormula(def);
  const floor = Math.ceil(power(def) / (EFFICIENCY_CAP * roleEfficiency(def.role)));
  return Math.max(c, floor);
}

// ---------------------------------------------------------------------------------------------------------------- custom soldiers
export function validateStats(stats) {
  const errors = []; let total = 0;
  for (const k of Object.keys(STAT_CAPS)) {
    const v = stats ? stats[k] : undefined;
    if (v === undefined) { errors.push('missing stat ' + k); continue; }
    if (!Number.isFinite(v) || v < 0) errors.push(k + ' must be a number >= 0');
    else if (v > STAT_CAPS[k]) errors.push(k + ' is capped at ' + STAT_CAPS[k]);
    else total += v;
  }
  if (total > STAT_POINTS) errors.push('total points ' + total + ' exceed ' + STAT_POINTS);
  return { ok: errors.length === 0, errors, total };
}
const clampn = (v, a, b) => (Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : a);

/**
 * Derive a UnitDef from a CustomSoldier. cs = {id, name, blueprint:{main, off, body:{type}}, stats, abilities:[ids], ai, text}.
 * opts: {weaponStyle (from compileSoldier), reach, radius (compiled, 0.3-0.7), armorBase, shield}. Stats are clamped (caps and 100 total, extra points dropped from the end).
 */
export function statsToUnitDef(cs, opts = {}) {
  const bp = cs.blueprint || {};
  const wid = typeof bp.main === 'string' ? bp.main : 'none';
  const ws = opts.weaponStyle || WEAPON_ID_STYLE[wid] || 'slash';
  const wc = WEAPON_CLASSES[ws] || WEAPON_CLASSES.slash;
  const bodyType = bp.body && BODY[bp.body.type] ? bp.body.type : 'average', body = BODY[bodyType];
  // clamp the point-buy
  const st = {}; let left = STAT_POINTS;
  for (const k of Object.keys(STAT_CAPS)) { const v = clampn(cs.stats ? cs.stats[k] : 0, 0, STAT_CAPS[k]); const t = Math.min(v, left); st[k] = t; left -= t; }
  const shield = opts.shield !== undefined ? opts.shield : (SHIELDS[bp.off] || null);
  let radius = clampn(opts.radius !== undefined ? opts.radius : body.radius, 0.3, 0.7);
  if (shield && shield.arc >= 60) radius = Math.max(radius, 0.65);                          // big-shield rule (units.md)
  const dmg = wc.dmg * (1 + st.damage * 0.012), cd = wc.cd / (1 + st.attackSpeed * 0.012);
  const range = wc.range + Math.min(1.0, st.range * 0.1);
  const def = {
    id: cs.id || 'custom', name: cs.name || 'Custom', faction: 'custom', role: wc.role, custom: true,
    tags: ['custom'].concat(wc.tags),
    hp: Math.round((90 + st.hp * 2.5) * body.hp), armor: clampn(0.1 + st.armor * 0.012 + (opts.armorBase || 0), 0, 0.5), speed: +(2.5 + body.speed + st.speed * 0.04).toFixed(2),
    mass: body.mass, radius, scale: 1, runMul: 1.5, moraleBonus: st.morale * 5,
    abilities: [], ai: { style: ['charge', 'hold', 'skirmish', 'flank', 'guard', 'support'].includes(cs.ai) ? cs.ai : (wc.role === 'ranged' ? 'skirmish' : 'charge') },
    text: cs.text || {},
  };
  if (wc.role === 'ranged') {
    def.ranged = { proj: wc.proj, dmg: +dmg.toFixed(1), cd: +cd.toFixed(2), range: +range.toFixed(1), type: wc.type, speed: wc.speed, gravity: wc.gravity, spread: wc.spread };
    def.melee = { dmg: wc.meleeDmg, cd: 1.0, range: wc.meleeRange, type: 'blunt', style: wc.style };
    if (ws === 'cast') def.role = 'support';
  } else def.melee = { dmg: +dmg.toFixed(1), cd: +cd.toFixed(2), range: +range.toFixed(2), type: wc.type, style: wc.style, kb: wc.kb };
  if (shield) def.shield = { arc: shield.arc, block: shield.block, proj: shield.proj };
  // abilities: legal for the weapon class, at most two
  const picks = []; for (const a of cs.abilities || []) { const pr = ABILITY_PRESETS[a]; if (pr && pr.classes.includes(ws) && !picks.includes(a) && picks.length < MAX_ABILITIES) picks.push(a); }
  for (const a of picks) def.abilities.push(Object.assign({}, ABILITY_PRESETS[a].p));
  const norm = normalizeDef(def.id, def);
  norm.custom = true;
  norm.weaponStyle = ws;
  norm.cost = clampedCost(norm);
  return norm;
}
export { DEFAULTS };
