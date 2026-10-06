// LifetimeStats (docs/lifetime_stats.md): lifetime totals accumulated from the sim event stream (spec §8.2) plus UI events, and the per-battle BattleSummary.
//   const stats = new LifetimeStats({ adapter: storeAdapter(store), schedule, debounceMs });
//   stats.beginBattle({ playerTeam, arenaId, mission, objective, mutators, getVip })   // a new World was attached (placement); resets the per-battle tracker
//   const ev = stats.onEvent(type, payload, { t, roster })                             // feed EVERY world event, in order; returns the event for checkAchievements or null
//        battle_start -> { kind:'arena_played', arenaId }   battle_end -> the BattleSummary (lifetime totals already include the battle)
//   stats.ui('arena_saved' | 'soldier_saved' | 'arena_played' | 'campaign', payload)   // UI-side events -> the event for checkAchievements
//   stats.get()  the LIVE totals object (same reference forever: the announcer keeps it; a missing key means 0)   stats.totals()  a plain deep copy
// One mapping table (HANDLERS) decides what every event adds to what. "Player team" = the team the human controls (`beginBattle.playerTeam`, default 0).
// Pure JS: persistence goes through an injected adapter {load() -> object|null, save(object)}; the debounce timer is injectable.
import { ARENA_IDS, MISSION_IDS } from '../content/era_ancient/humor/achievements.js';

export const STATS_VERSION = 1;
const NUM_KEYS = ['battles', 'wins', 'losses', 'draws', 'playSeconds', 'kills', 'unitsLost', 'friendlyKills', 'kicks', 'chickenKills', 'chickenDefeats', 'chickenTantrums', 'goatKills',
  'monologues', 'sleeps', 'bribes', 'trojanReveals', 'cyclopsMisses', 'catapultMisfires', 'immortalsRevived', 'immortalsKilledAfterRevive', 'thronesSat', 'zeusInterventions',
  'zeusRagequits', 'stoned', 'trampleKills', 'heroKills', 'heroLosses', 'maxStreak', 'takeCommandKills', 'arenasSaved', 'soldiersSaved',
  // aliases / extras the UI reads (src/ui/strings.js stats.labels); see ALIASES
  'zeusRageQuits', 'commandKills', 'bestWave', 'deaths', 'damage', 'shieldBlocks', 'arrows', 'boulders', 'unitsPlaced', 'drachmaeSpent', 'elephantTramples', 'goatsSaved', 'campaignStars', 'dailyStreak'];
const MAP_KEYS = ['byCause', 'godPowers', 'arenasPlayed', 'byDef'];
export const STAT_KEYS = NUM_KEYS.concat(MAP_KEYS, ['campaign']);
/** Both spellings the UI uses are stored and kept equal (decisions R2.2). */
export const ALIASES = { zeusRagequits: 'zeusRageQuits', takeCommandKills: 'commandKills', unitsLost: 'deaths' };
const ALIAS_BACK = Object.fromEntries(Object.entries(ALIASES).map(([a, b]) => [b, a]));
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const fin = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const ID_RE = /^[a-z0-9_:\-]{1,48}$/;
const ARENA_SET = new Set(ARENA_IDS);

/** A clean stats object from stored data: known keys only, non-negative finite numbers, plain maps, aliases in sync. `v` is not part of the live object. */
export function normalizeStats(raw) {
  const out = {};
  const src = isObj(raw) ? raw : {};
  for (const k of NUM_KEYS) { const v = fin(src[k]); if (v) out[k] = v; }
  for (const [a, b] of Object.entries(ALIASES)) { const m = Math.max(out[a] || 0, out[b] || 0); if (m) { out[a] = m; out[b] = m; } }
  for (const k of ['byCause', 'godPowers', 'arenasPlayed']) {
    if (!isObj(src[k])) continue; const m = {};
    for (const id of Object.keys(src[k])) { if (FORBIDDEN.has(id) || !ID_RE.test(id)) continue; const v = fin(src[k][id]); if (v) m[id] = v; }
    if (Object.keys(m).length) out[k] = m;
  }
  if (isObj(src.byDef)) {
    const m = {};
    for (const id of Object.keys(src.byDef)) { if (FORBIDDEN.has(id) || !ID_RE.test(id) || !isObj(src.byDef[id])) continue; const e = src.byDef[id]; m[id] = { spawned: fin(e.spawned), kills: fin(e.kills), deaths: fin(e.deaths) }; }
    if (Object.keys(m).length) out.byDef = m;
  }
  if (isObj(src.campaign)) {
    const stars = {};
    if (isObj(src.campaign.stars)) for (const id of Object.keys(src.campaign.stars)) { if (FORBIDDEN.has(id) || !ID_RE.test(id)) continue; const v = Math.min(3, Math.round(fin(src.campaign.stars[id]))); if (v) stars[id] = v; }
    out.campaign = { stars, completed: !!src.campaign.completed };
    const tot = totalCampaignStars(out.campaign); if (tot) out.campaignStars = tot;
  }
  return out;
}
const totalCampaignStars = (c) => MISSION_IDS.reduce((s, id) => s + Math.min(3, (c.stars && c.stars[id]) | 0), 0);

/** Persistence over a save/store.js Store: {load, save}. Stored as `vw.stats` = {v:1, ...keys}. */
export function storeAdapter(store, key = 'stats') {
  return {
    load() { const d = store.get(key, null); return isObj(d) ? d : null; },
    save(obj) { return store.set(key, obj, STATS_VERSION); },
  };
}

const newBattle = (o = {}) => ({
  pt: o.playerTeam === 1 ? 1 : 0, arenaId: o.arenaId || '', mission: o.mission || null, objective: o.objective || null, mutators: Array.isArray(o.mutators) ? o.mutators : [],
  getVip: typeof o.getVip === 'function' ? o.getVip : null, vipId: 0, vipDef: null, vipDamage: 0,
  live: false, ended: false, summary: null,
  kills: 0, friendlyKills: 0, unitsLost: 0, killsByDef: {}, killsByCause: {}, elephantTrampleKills: 0, stonedUnits: 0, cyclopsMisses: 0, kicks: 0,
  maxMeteorKills: 0, trojanRevealed: false, wineRain: !!(o.mutators && (o.mutators.indexOf('wine_rain_always') >= 0 || o.mutators.indexOf('wine_rain') >= 0)), takeCommandKills: 0,
  playerCostStart: 0, enemyCostStart: 0, unitsStart: 0,
  x: { chickenKills: 0, goatKills: 0, trampleKills: 0, shieldBlocks: 0, arrowsFired: 0, boulders: 0, routs: 0, revives: 0, heroKills: 0, bribes: 0, misfires: 0, longestStreak: 0 },
  meteors: [], pending: new Map(),
});

export class LifetimeStats {
  /** @param {{adapter?:{load:Function, save:Function}, schedule?:(fn,ms)=>Function, debounceMs?:number}} o */
  constructor(o = {}) {
    this.adapter = o.adapter || null; this.debounceMs = o.debounceMs === undefined ? 800 : o.debounceMs;
    this.schedule = o.schedule || ((fn, ms) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); });
    this.t = {}; this.B = newBattle(); this.teamOf = new Map(); this.now = 0; this.listeners = []; this._cancel = null; this._dirty = false;
    this.lastSummary = null; this.error = null;
    this._load();
  }
  _load() {
    let raw = null; try { raw = this.adapter ? this.adapter.load() : null; } catch (e) { this.error = String(e && e.message); }
    this._replace(normalizeStats(raw));
  }
  _replace(obj) { for (const k of Object.keys(this.t)) delete this.t[k]; Object.assign(this.t, obj); }

  // ------------------------------------------------------------------ reads
  get() { return this.t; }
  totals() { return JSON.parse(JSON.stringify(this.t)); }
  serialize() { return Object.assign({ v: STATS_VERSION }, this.totals()); }
  onChange(fn) { this.listeners.push(fn); return () => { const i = this.listeners.indexOf(fn); if (i >= 0) this.listeners.splice(i, 1); }; }
  /** Replace the totals from a stored/imported object (in place: the announcer keeps its reference). */
  load(raw) { this._replace(normalizeStats(raw)); this._touch(true); }
  reset() { this._replace({}); this.lastSummary = null; this._touch(true); }

  // ------------------------------------------------------------------ writes
  _inc(key, n = 1) {
    const t = this.t; t[key] = (t[key] || 0) + n;
    const a = ALIASES[key] || ALIAS_BACK[key]; if (a) t[a] = t[key];
    this._dirty = true;
  }
  _max(key, v) { if (v > (this.t[key] || 0)) { this.t[key] = v; const a = ALIASES[key] || ALIAS_BACK[key]; if (a) this.t[a] = v; this._dirty = true; } }
  _map(key, id, n = 1) { if (!id || FORBIDDEN.has(id)) return; const m = this.t[key] || (this.t[key] = {}); m[id] = (m[id] || 0) + n; this._dirty = true; }
  _def(id) { if (!id || FORBIDDEN.has(id)) return null; const m = this.t.byDef || (this.t.byDef = {}); return m[id] || (m[id] = { spawned: 0, kills: 0, deaths: 0 }); }
  /** Set a numeric stat computed elsewhere (e.g. dailyStreak from the daily document). */
  setValue(key, v) { const n = fin(v); if (NUM_KEYS.indexOf(key) < 0) return false; if (n) this.t[key] = n; else delete this.t[key]; this._dirty = true; this._touch(); return true; }
  _touch(now) {
    if (!this._dirty && !now) return; this._dirty = true;
    for (const f of this.listeners) { try { f(); } catch (e) { /* listeners never break accumulation */ } }
    if (now || !this.debounceMs) { this.flush(); return; }
    if (!this._cancel) this._cancel = this.schedule(() => { this._cancel = null; this.flush(); }, this.debounceMs);
  }
  flush() {
    if (this._cancel) { this._cancel(); this._cancel = null; }
    if (!this._dirty) return true; this._dirty = false;
    try { return this.adapter ? this.adapter.save(this.serialize()) !== false : true; } catch (e) { this.error = String(e && e.message); return false; }
  }

  // ------------------------------------------------------------------ battle lifecycle
  /** A World was attached: reset the per-battle tracker (lifetime totals are kept). */
  beginBattle(o = {}) { this.B = newBattle(o); this.teamOf.clear(); this.now = 0; return this.B; }
  /** The last BattleSummary (or null before the first battle ends). */
  summary() { return this.B.summary || this.lastSummary; }
  battle() { return this.B; }

  /** Feed one sim event. env = { t: simTime, roster?: [[unitId, team, defId]...] (battle_start: every unit on the field) }. Returns the achievement event or null. */
  onEvent(type, p, env) {
    const h = HANDLERS[type]; if (!h) return null;
    if (env && typeof env.t === 'number') this.now = env.t;
    const ret = h(this, this.B, p || {}, env || null);
    if (this._dirty) this._touch(type === 'battle_end');
    return ret || null;
  }

  /** UI-side events -> the achievement event to check (or null for an unknown/invalid one). */
  ui(kind, p = {}) {
    let ev = null;
    if (kind === 'arena_saved') { this._inc('arenasSaved'); ev = { kind: 'arena_saved' }; }
    else if (kind === 'soldier_saved') { this._inc('soldiersSaved'); ev = { kind: 'soldier_saved' }; }
    else if (kind === 'arena_played') { const id = String(p.arenaId || ''); if (ARENA_SET.has(id)) this._map('arenasPlayed', id); ev = { kind: 'arena_played', arenaId: id }; }
    else if (kind === 'campaign') ev = this.setCampaign(p.mission, p.stars, p.completed);
    if (ev) this._touch();
    return ev;
  }
  /** Record campaign stars for a mission (best of old/new) -> the 'campaign' achievement event. */
  setCampaign(mission, stars, completed) {
    const c = this.t.campaign || (this.t.campaign = { stars: {}, completed: false });
    if (typeof mission === 'string' && MISSION_IDS.indexOf(mission) >= 0) { const s = Math.max(0, Math.min(3, Math.round(+stars) || 0)); if (s > (c.stars[mission] | 0)) c.stars[mission] = s; }
    if (completed || MISSION_IDS.every((id) => (c.stars[id] | 0) >= 1)) c.completed = true;
    const tot = totalCampaignStars(c); if (tot) this.t.campaignStars = tot; else delete this.t.campaignStars;
    this._dirty = true;
    return { kind: 'campaign' };
  }
}

// ======================================================================================================== the mapping table
const mine = (B, team) => team === B.pt;
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

const HANDLERS = {
  unit_spawn(S, B, p) {
    S.teamOf.set(p.id, p.team);
    if (!B.live) { B.pending.set(p.id, [p.team, p.def]); return; }
    if (p.team === B.pt) { S._inc('unitsPlaced'); const d = S._def(p.def); if (d) d.spawned++; }
  },
  unit_convert(S, B, p) { S.teamOf.set(p.id, p.team); S._inc('bribes'); B.x.bribes++; },
  battle_start(S, B, p, env) {
    B.live = true; B.ended = false; B.summary = null;
    // the roster is what is actually on the field now (units erased during placement never existed)
    const roster = env && Array.isArray(env.roster) ? env.roster : Array.from(B.pending, ([id, v]) => [id, v[0], v[1]]);
    B.pending.clear();
    for (const r of roster) { S.teamOf.set(r[0], r[1]); if (r[1] === B.pt) { S._inc('unitsPlaced'); const d = S._def(r[2]); if (d) d.spawned++; } }
    const teams = Array.isArray(p.teams) ? p.teams : [];
    for (const t of teams) { if (t.team === B.pt) { B.unitsStart = t.count | 0; B.playerCostStart = +t.cost || 0; S._inc('drachmaeSpent', +t.cost || 0); } else { B.enemyCostStart = +t.cost || 0; } }
    if (ARENA_SET.has(B.arenaId)) { S._map('arenasPlayed', B.arenaId); return { kind: 'arena_played', arenaId: B.arenaId }; }
    return null;
  },
  unit_hit(S, B, p) {
    if (B.objective === 'protect_vip') {
      if (!B.vipId && B.getVip) { const v = B.getVip(); if (v) { B.vipId = v.id; B.vipDef = v.def ? v.def.id : null; } }
      if (B.vipId && p.dst === B.vipId) B.vipDamage += +p.dmg || 0;
    }
  },
  unit_block(S, B, p) { if (S.teamOf.get(p.dst) === B.pt) { S._inc('shieldBlocks'); B.x.shieldBlocks++; } },
  unit_kill(S, B, p) {
    const srcMine = mine(B, p.srcTeam), dstMine = mine(B, p.dstTeam), friendly = !!p.friendly;
    if (dstMine) { S._inc('unitsLost'); B.unitsLost++; const d = S._def(p.dstDef); if (d) d.deaths++; }
    if (B.vipId && p.dst === B.vipId && B.vipDamage <= 0) B.vipDamage = 1;
    if (friendly) { if (srcMine) { S._inc('friendlyKills'); B.friendlyKills++; } return; }
    if (p.revived && srcMine) S._inc('immortalsKilledAfterRevive');
    // meteor attribution: enemy deaths near a player-cast meteor inside its 3 s window count toward that cast (the sim reports god-power kills without a source unit)
    if (B.meteors.length && !dstMine && p.srcTeam === -1 && (p.cause === 'aoe' || p.cause === 'fire')) for (const m of B.meteors) {
      if (S.now - m.t0 > 3 || (p.x - m.x) ** 2 + (p.z - m.z) ** 2 > 81) continue;
      m.n++; if (m.n > B.maxMeteorKills) B.maxMeteorKills = m.n;
    }
    if (!srcMine) return;
    S._inc('kills'); B.kills++;
    if (p.cause) { S._map('byCause', p.cause); bump(B.killsByCause, p.cause); }
    if (p.srcDef) { const d = S._def(p.srcDef); if (d) d.kills++; bump(B.killsByDef, p.srcDef); }
    if (p.srcDef === 'sacred_chicken') { S._inc('chickenKills'); B.x.chickenKills++; }
    if (p.srcDef === 'battle_goat') { S._inc('goatKills'); B.x.goatKills++; }
    if (p.cause === 'trample') { S._inc('trampleKills'); B.x.trampleKills++; if (p.srcDef === 'war_elephant') { B.elephantTrampleKills++; S._inc('elephantTramples'); } }
    if (p.byPlayer) { S._inc('takeCommandKills'); B.takeCommandKills++; }
  },
  hero_down(S, B, p) { if (p.team === B.pt) S._inc('heroLosses'); else { S._inc('heroKills'); B.x.heroKills++; } },
  kill_streak(S, B, p) { if (S.teamOf.get(p.id) === B.pt) { S._max('maxStreak', p.count | 0); if ((p.count | 0) > B.x.longestStreak) B.x.longestStreak = p.count | 0; } },
  ability_cast(S, B, p) { if (p.ability === 'kick' && p.team === B.pt) { S._inc('kicks'); B.kicks++; } },
  chicken_tantrum(S) { S._inc('chickenTantrums'); },
  philosopher_monologue(S) { S._inc('monologues'); },
  status_apply(S, B, p) { if (p.status === 'sleep') S._inc('sleeps'); },
  trojan_reveal(S, B) { S._inc('trojanReveals'); B.trojanRevealed = true; },
  cyclops_misaim(S, B) { S._inc('cyclopsMisses'); B.cyclopsMisses++; },
  catapult_misfire(S, B) { S._inc('catapultMisfires'); B.x.misfires++; },
  unit_revive(S, B) { S._inc('immortalsRevived'); B.x.revives++; },
  throne_sit(S, B, p) { if (p.sitting === undefined || p.sitting) S._inc('thronesSat'); },
  intervention(S, B, p) { if (p.kind === 'zeus') S._inc('zeusInterventions'); },
  god_power(S, B, p) {
    if (p.team !== undefined && p.team !== B.pt) return;
    S._map('godPowers', p.kind);
    if (p.kind === 'wine_rain') B.wineRain = true;
    if (p.kind === 'meteor') { B.meteors.push({ x: +p.x || 0, z: +p.z || 0, t0: S.now, n: 0 }); if (B.meteors.length > 8) B.meteors.shift(); }
  },
  stone_gaze(S, B, p) { const tm = S.teamOf.get(p.src); if (tm !== undefined && tm !== B.pt) return; const n = p.count | 0; if (n > 0) { S._inc('stoned', n); B.stonedUnits += n; } },
  unit_rout(S, B, p) { if (p.team === B.pt) B.x.routs++; },
  projectile_launch(S, B, p) { if (p.team === B.pt && (p.kind === 'arrow' || p.kind === 'javelin')) { S._inc('arrows'); B.x.arrowsFired++; } },
  explosion(S, B, p) { if (p.kind === 'boulder') { S._inc('boulders'); B.x.boulders++; } },
  wave_spawn(S, B, p) { S._max('bestWave', p.n | 0); },
  battle_end(S, B, p) {
    const pt = B.pt, w = p.winner;
    const draw = w !== 0 && w !== 1, win = w === pt;
    const t = +p.t || 0;
    S._inc('battles'); S._inc(win ? 'wins' : draw ? 'draws' : 'losses'); if (t > 0) S._inc('playSeconds', t);
    const per = p.perDef || [];
    const mineAlive = per[pt] || {}, theirAlive = per[1 - pt] || {};
    if (!win && !draw && (theirAlive.sacred_chicken | 0) > 0) S._inc('chickenDefeats');
    if (draw && p.reason === 'intervention') S._inc('zeusRagequits');
    if (win && B.objective === 'protect_vip' && B.vipDef === 'battle_goat') S._inc('goatsSaved');
    const st = p.stats && p.stats[pt], es = p.stats && p.stats[1 - pt];
    if (st && st.damageDealt) S._inc('damage', +st.damageDealt || 0);
    if (!B.vipId && B.getVip && B.objective === 'protect_vip') { const v = B.getVip(); if (v) { B.vipId = v.id; B.vipDef = v.def ? v.def.id : null; } }
    const aliveDefs = {}; let alive = 0; for (const k of Object.keys(mineAlive)) { const n = mineAlive[k] | 0; if (n > 0) { aliveDefs[k] = n; alive += n; } }
    if (st && B.unitsStart === 0) B.unitsStart = st.startCount | 0;
    if (st && !B.playerCostStart) B.playerCostStart = +st.startCost || 0;
    if (es && !B.enemyCostStart) B.enemyCostStart = +es.startCost || 0;
    B.live = false; B.ended = true;
    B.summary = S.lastSummary = {
      kind: 'battle_end', win, draw, reason: p.reason || 'elimination', t, playerTeam: pt, arenaId: B.arenaId, mission: B.mission, objective: B.objective,
      vipDef: B.vipDef, vipDamage: B.vipDamage, unitsStart: B.unitsStart, unitsLost: B.unitsLost, unitsAlive: alive, aliveDefs,
      playerCostStart: B.playerCostStart, enemyCostStart: B.enemyCostStart, kills: B.kills, friendlyKills: B.friendlyKills,
      killsByDef: Object.assign({}, B.killsByDef), killsByCause: Object.assign({}, B.killsByCause), elephantTrampleKills: B.elephantTrampleKills, stonedUnits: B.stonedUnits,
      cyclopsMisses: B.cyclopsMisses, kicks: B.kicks, maxMeteorKills: B.maxMeteorKills, trojanRevealed: B.trojanRevealed, wineRain: B.wineRain, takeCommandKills: B.takeCommandKills,
    };
    return B.summary;
  },
};
export const HANDLED_EVENTS = Object.keys(HANDLERS);
