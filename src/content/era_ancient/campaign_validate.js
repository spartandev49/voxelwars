// Contract validators of the campaign data (the "Mission" schema step of the gate, Q1): pure functions returning a list of plain-English problems
// (empty = valid). Used by tests/campaign and available to tools/gate.mjs. Never throws on bad data, that is the point.
import { STAT_TABLE } from './stats.js';
import { UNLOCKS } from './parts/_registry.js';
import { RECIPES } from '../../world/gen.js';
import { SIZES } from '../../world/arena.js';

export const OBJECTIVE_TYPES = ['eliminate', 'kill_general', 'hold_hill', 'protect_vip', 'survive_waves', 'destroy'];
export const MARKER_TYPES = ['hill', 'exit', 'vip_start', 'general_spawn', 'waypoint'];
const MARKER_FOR = { hold_hill: 'hill', protect_vip: 'exit', kill_general: 'general_spawn' };
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const groupsOf = (m) => (m.enemy && m.enemy.groups ? m.enemy.groups : []).concat(...((m.script && m.script.waves && m.script.waves.list) ? m.script.waves.list.map((w) => w.groups || []) : []));

/** Problems of one mission (or of a puzzle viewed as a mission through puzzleAsMission). `o.mutatorStars` = the unlock table, `o.puzzle` relaxes the campaign-only checks. */
export function validateMission(m, o = {}) {
  const P = []; const bad = (s) => P.push((m && m.id ? m.id + ': ' : '') + s);
  if (!m || typeof m !== 'object') return ['mission is not an object'];
  if (typeof m.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(m.id)) bad('id must be lower_snake_case');
  if (!o.puzzle && !(m.act >= 1 && m.act <= 3)) bad('act must be 1..3');
  const a = m.arena || {};
  if (!RECIPES.includes(a.recipe)) bad('unknown arena recipe ' + a.recipe);
  if (!SIZES[a.size]) bad('unknown arena size ' + a.size);
  if (!(a.seed >= 0)) bad('arena seed missing');
  const markers = a.markers || [], ids = new Set(), half = (SIZES[a.size] || 128) * 0.25;
  if (markers.length > 8) bad('more than 8 markers');
  for (const k of markers) {
    if (!MARKER_TYPES.includes(k.type)) bad('marker ' + k.id + ' has unknown type ' + k.type);
    if (ids.has(k.id)) bad('duplicate marker id ' + k.id); ids.add(k.id);
    if (!isNum(k.x) || !isNum(k.z) || Math.abs(k.x) > half || Math.abs(k.z) > half) bad('marker ' + k.id + ' lies outside the arena');
    if (!(k.r >= 1 && k.r <= 30)) bad('marker ' + k.id + ' radius must be 1..30');
  }
  const ob = m.objective || {};
  if (!OBJECTIVE_TYPES.includes(ob.type)) bad('unknown objective type ' + ob.type);
  for (const id of ob.markerIds || []) if (!ids.has(id)) bad('objective names marker ' + id + ' which does not exist');
  if (MARKER_FOR[ob.type] && !markers.some((k) => k.type === MARKER_FOR[ob.type])) bad(ob.type + ' needs a ' + MARKER_FOR[ob.type] + ' marker');
  if (ob.type === 'protect_vip' && !markers.some((k) => k.type === 'vip_start')) bad('protect_vip needs a vip_start marker');
  if (ob.type === 'protect_vip' && !(m.fixed || []).some((f) => f.vip)) bad('protect_vip needs a free VIP unit in `fixed`');
  if (ob.type === 'kill_general' && !(m.enemy && (m.enemy.generals || []).length)) bad('kill_general needs enemy.generals');
  if (ob.type === 'hold_hill' && !(ob.params && ob.params.time > 0)) bad('hold_hill needs params.time');
  if (ob.type === 'survive_waves' && !(m.script && m.script.waves && m.script.waves.list.length >= (ob.params && ob.params.waves || 1))) bad('survive_waves needs at least params.waves scripted waves');
  if (ob.type === 'destroy' && !(ob.params && ob.params.props && ob.params.props.length)) bad('destroy needs params.props');
  if (!(m.timeLimit > 0)) bad('timeLimit must be > 0 seconds');
  if (!(m.budget >= 500 && m.budget <= 40000)) bad('budget out of range');
  const ros = m.roster; if (ros !== null && ros !== undefined) { if (!Array.isArray(ros) || !ros.length) bad('roster must be null (everything) or a non-empty list'); else for (const id of ros) if (!STAT_TABLE[id]) bad('roster unit ' + id + ' does not exist'); }
  for (const c of m.core || []) { if (!STAT_TABLE[c.defId]) bad('core unit ' + c.defId + ' does not exist'); else if (Array.isArray(ros) && !ros.includes(c.defId)) bad('core unit ' + c.defId + ' is not in the roster'); if (!(c.n >= 1)) bad('core count must be >= 1'); }
  if (m.reference !== null && m.reference !== undefined) {         // the authored reference deployment (what the 'counter' reference player of the feasibility run fields): a complete, legal army
    const ref = m.reference; if (!Array.isArray(ref) || !ref.length) bad('reference must be null or a non-empty list of {defId, n, order?}');
    else {
      let rc = 0; const have = {};
      for (const g of ref) { if (!STAT_TABLE[g.defId]) { bad('reference unit ' + g.defId + ' does not exist'); continue; } if (!(g.n >= 1)) bad('reference group ' + g.defId + ' has n < 1'); if (Array.isArray(ros) && !ros.includes(g.defId)) bad('reference unit ' + g.defId + ' is not in the roster'); if (g.order !== undefined && !['advance', 'hold'].includes(g.order)) bad('reference order of ' + g.defId + ' must be advance or hold'); rc += (g.n | 0) * STAT_TABLE[g.defId].cost; have[g.defId] = (have[g.defId] || 0) + (g.n | 0); }
      for (const c of m.core || []) if ((have[c.defId] || 0) < c.n) bad('reference must include the core unit ' + c.defId + ' x' + c.n);
      if (rc > m.budget) bad('reference costs ' + rc + ' dr, more than the budget ' + m.budget); else if (rc < 0.85 * m.budget) bad('reference spends only ' + rc + ' of ' + m.budget + ' dr (a reference army uses the budget)');
      if (new Set(ref.map((g) => g.defId)).size > 16) bad('reference has more than 16 unit types');
    }
  }
  for (const f of m.fixed || []) { if (!STAT_TABLE[f.defId]) bad('fixed unit ' + f.defId + ' does not exist'); if (f.marker && !ids.has(f.marker)) bad('fixed unit marker ' + f.marker + ' does not exist'); }
  const e = m.enemy || {};
  const gs = groupsOf(m); if (!gs.length && !(e.placements && e.placements.length) && ob.type !== 'survive_waves') bad('the enemy has no units');
  for (const g of gs) { if (!STAT_TABLE[g.defId]) bad('enemy unit ' + g.defId + ' does not exist'); if (!(g.n >= 1)) bad('enemy group ' + g.defId + ' has n < 1'); }
  for (const p of e.placements || []) if (!STAT_TABLE[p.defId]) bad('enemy placement ' + p.defId + ' does not exist');
  if (new Set(gs.map((g) => g.defId)).size > 16) bad('more than 16 enemy unit types');
  for (const g of e.generals || []) if (!gs.some((x) => x.defId === g) && !(e.placements || []).some((x) => x.defId === g)) bad('general ' + g + ' is not in the enemy army');
  if (!Array.isArray(m.stars) || m.stars.length !== 3) bad('needs exactly three stars'); else m.stars.forEach((s, i) => { if (!s.id || !s.text) bad('star ' + (i + 1) + ' needs id and text'); if (i === 2 && typeof s.test !== 'function') bad('star 3 needs a test function'); });
  if (!o.puzzle) {
    const r = m.rewards || {};
    if (!r.title) bad('rewards.title missing');
    for (const k of r.unlockParts || []) if (!UNLOCKS[k]) bad('rewards.unlockParts names unknown unlock key ' + k);
    for (const k of r.unlockMutators || []) if (!(o.mutatorStars && o.mutatorStars[k] > 0)) bad('rewards.unlockMutators names unknown mutator ' + k);
    if (!m.title || !m.blurb || !Array.isArray(m.briefing) || m.briefing.length < 3) bad('copy missing (title, blurb, >= 3 briefing lines)');
    const b = m.bots || {}; for (const k of ['greedy', 'counter', 'turtle']) if (!Array.isArray(b[k]) || !(b[k][0] >= 0 && b[k][1] <= 1 && b[k][0] < b[k][1])) bad('bots.' + k + ' must be a [lo, hi] win-rate band');
  }
  return P;
}

/** Problems of one puzzle definition (shape of spec/world.md 6a). */
export function validatePuzzle(p, asMission) {
  const P = []; const bad = (s) => P.push(p.id + ': ' + s);
  if (p.kind !== 'puzzle') bad('kind must be puzzle');
  if (!p.player || !Array.isArray(p.player.roster) || !p.player.roster.length) bad('player.roster missing');
  if (!(p.par > 0 && p.par < p.player.budget)) bad('par must be below the budget');
  if (!p.enemy || !Array.isArray(p.enemy.placements) || !p.enemy.placements.length) bad('the enemy is hand-placed: enemy.placements missing');
  if (p.godPowers !== false && p.godPowers !== true) bad('godPowers must be a boolean');
  for (const x of validateMission(asMission(p), { puzzle: true })) P.push(x);
  return P;
}
