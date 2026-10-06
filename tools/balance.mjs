// VOXELWARS balance & battle-quality harness (owned by SIM). Headless, deterministic, parallel (worker_threads).
//
//   node tools/balance.mjs [section ...] [--quick] [--workers=N] [--seed=N] [--no-report]
//   sections: pairs escort duels comp fuzz mirror fun diff metrics soldier perf   (default: all but tune);  tune / applytune: the stats.js auto-tuner
//
// RUNTIME BUDGET (4 cores, `--workers=12`; measured 47 min on a box with a load average of 10-15 from other agents, ~25 min on an idle one):
//   full run: pairs 3-6 min, escort 3-5, duels <1, comp 1-2, fuzz 6-8 (2000 matchups + 100 NC), mirror 21-23 (15 arenas x 400 battles), fun 2-4 (3 setups x 200), diff 3-4 (3 tiers x 400),
//             soldier <1 (5000 blueprints + 1000 sim runs), metrics <1 (15 arenas x 60 s ~200v200), perf 1 (CPU time, runs alone at the end)
//   --quick: every section at ~1/5 of its sample size, ~8 min.   `tune [--rounds=N] [--fresh]` / `applytune`: the stats.js auto-tuner (~8-11 min per round).
// Results are merged into docs/balance_data.json section by section and docs/balance_report.md is regenerated from them, so partial runs
// (`node tools/balance.mjs pairs`) only refresh their own section. Same code + same seeds => same numbers (perf is the only wall-clock section).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SELF = fileURLToPath(import.meta.url);

// =====================================================================================================================================
//                                                       JOBS (run inside workers; pure functions of their input)
// =====================================================================================================================================
async function jobsModule() {
  const H = await import('./lib/harness.mjs');
  const G = await import('../src/sim/armygen.js');
  const S = await import('../src/sim/stats.js');
  const P = await import('../src/sim/power.js');
  const R = await import('../src/core/rng.js');
  const GEN = await import('../src/world/gen.js');
  const ST = await import('../src/sim/consts.js');
  const ABI = await import('../src/content/era_ancient/stats.js');
  const D = await import('../src/sim/defs.js');
  const SC = await import('./lib/scale.mjs');
  const DC = await import('../tests/sim/design_costs.mjs');
  return { H, G, S, P, R, GEN, ST, ABI, D, SC, DC };
}
let M = null, BASE = null;

const BOSS = (d) => d.tags.includes('boss') || d.role === 'monster';
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** One battle -> compact record. j: {a:[{defId,n}]|placements, b, arena, size, arenaSeed, seed, rules, maxTime, hold:[team], metrics, tag} */
function battle(j) {
  const { H } = M;
  const rules = Object.assign({ timeLimit: 360 }, j.rules || {});
  const w = H.buildWorld({
    arena: j.arena || 'marathon', size: j.size || 'medium', arenaSeed: j.arenaSeed || 5, seed: j.seed || 1, rules, defs: j.defs || undefined,
    a: j.aP ? { placements: j.aP } : { groups: j.a }, b: j.bP ? { placements: j.bP } : { groups: j.b },
  });
  if (j.hold) for (const s of w.squads) if (j.hold.includes(s.team)) s.order = 'hold';
  const kills = [], leaders = []; let first = -1, lastKill = 0, maxGap = 0, kk = 0;
  const flavor = { lead: 0, swing: 0, gag: 0, hero: 0, streak: 0, low: 0, stale: 0, intervention: 0, blood: 0 };
  w.ev.on('unit_kill', () => { const t = w.time; if (kk > 0 && t - lastKill > maxGap) maxGap = t - lastKill; lastKill = t; kk++; });      // dead air = a gap between kills once the fight has started (the approach is not dead air)
  w.ev.on('lead_change', (e) => { leaders.push(e.team); flavor.lead++; });
  w.ev.on('big_swing', () => flavor.swing++);
  w.ev.on('first_blood', () => flavor.blood++);
  w.ev.on('hero_down', () => flavor.hero++);
  w.ev.on('kill_streak', () => flavor.streak++);
  w.ev.on('army_low', () => flavor.low++);
  w.ev.on('stalemate_warning', () => flavor.stale++);
  w.ev.on('intervention', () => flavor.intervention++);
  for (const n of ['chicken_tantrum', 'philosopher_monologue', 'trojan_reveal', 'stone_gaze', 'throne_sit', 'catapult_misfire', 'cyclops_misaim', 'friendly_fire', 'trample', 'crowd_roar']) w.ev.on(n, () => flavor.gag++);
  const maxT = j.maxTime || (rules.timeLimit > 0 ? rules.timeLimit + 6 : 900);
  const met = j.metrics ? new H.Metrics(w) : null;
  const t0 = performance.now();
  let hazardBad = 0, hz = 0;
  while (w.state !== 'ended' && w.time < maxT) {
    w.tick(); if (met) met.sample();
    if (j.s9 && (w.tickN % 15) === 0) hazardBad += blockedUnits(w, hz++);
  }
  const ms = performance.now() - t0;
  const tailGap = kk > 0 ? w.time - lastKill : 0;                   // last kill -> the end of the battle (routers running away): reported, not counted as dead air
  let changes = 0; for (let i = 1; i < leaders.length; i++) if (leaders[i] !== leaders[i - 1]) changes++;
  const sc = w.stats, win = w.winner;
  const keep = win >= 0 ? sc[win].aliveCost / Math.max(1, sc[win].startCost) : 0;
  return {
    winner: win, reason: w.endReason, t: +w.time.toFixed(2), ticks: w.tickN, ms: +ms.toFixed(1),
    alive: [sc[0].alive, sc[1].alive], keep: +keep.toFixed(3), startCost: [sc[0].startCost, sc[1].startCost], startCount: [sc[0].startCount, sc[1].startCount],
    aliveCost: [sc[0].aliveCost, sc[1].aliveCost], changes, leadEvents: leaders.length, maxGap: +maxGap.toFixed(1), tailGap: +tailGap.toFixed(1), kills: kk, flavor, metrics: met ? met.report() : null, hazardBad,
  };
}
/** S9: grounded units standing inside blocked cells (blocking prop footprint / deep water / lava). */
function blockedUnits(w, k) {
  let bad = 0; const nav = w.nav;
  for (let i = 0; i < w.units.length; i++) {
    const u = w.units[i]; if (!u.alive || u.y - w.arena.cellHeight(u.x, u.z) > 0.6 || u.state === M.ST.ST.SIT || u.state === M.ST.ST.FLY) continue;       // a seated Xerxes sits on his own throne prop
    if (u.knockT > 0 || u.air) continue;
    if (!nav.walkable(u.x, u.z) && !nav.walkable(u.x + 0.35, u.z) && !nav.walkable(u.x - 0.35, u.z) && !nav.walkable(u.x, u.z + 0.35) && !nav.walkable(u.x, u.z - 0.35)) bad++;
  }
  return bad;
}

function equalCost(defs, id, budget) { return Math.max(1, Math.round(budget / defs[id].cost)); }
/** Counts (ni, nj) whose total costs agree within ~4%: scan budgets upward from `budget` until both sides field a sensible number of units (>= 3, or >= 2 for units over 400). */
function equalCounts(defs, a, b, budget) {
  const ca = defs[a].cost, cb = defs[b].cost, mina = ca > 400 ? 2 : 3, minb = cb > 400 ? 2 : 3;
  let best = null;
  for (let B = budget; B <= budget * 3.2; B += 25) {
    const na = Math.round(B / ca), nb = Math.round(B / cb);
    if (na < mina || nb < minb) continue;
    const err = Math.abs(na * ca - nb * cb) / Math.max(na * ca, nb * cb);
    if (!best || err < best.err - 1e-9) best = { na, nb, err, B };
    if (err <= 0.03) { best = { na, nb, err, B }; break; }
  }
  if (!best) { const na = Math.max(mina, Math.round(budget / ca)), nb = Math.max(minb, Math.round(budget / cb)); best = { na, nb, err: Math.abs(na * ca - nb * cb) / Math.max(na * ca, nb * cb), B: budget }; }
  return best;
}

const JOBS = {
  battle,
  /** pairs: unit i vs unit j at equal cost, both orientations */
  pair(j) {
    const defs = M.H.DEFS, eq = equalCounts(defs, j.i, j.j, j.budget), n1 = eq.na, n2 = eq.nb;
    const score = (rec, side) => (rec.winner < 0 ? 0.5 : rec.winner === side ? 1 : 0);
    const r = j.side === 1 ? null : battle({ a: [{ defId: j.i, n: n1 }], b: [{ defId: j.j, n: n2 }], seed: j.seed, arena: 'marathon', arenaSeed: 5 });
    const s = j.side === 0 ? null : battle({ b: [{ defId: j.i, n: n1 }], a: [{ defId: j.j, n: n2 }], seed: j.seed + 1, arena: 'marathon', arenaSeed: 5 });
    const o = [r ? score(r, 0) : null, s ? score(s, 1) : null].filter((x) => x !== null);
    const tt = [r, s].filter(Boolean);
    return { i: j.i, j: j.j, n: [n1, n2], score: o.reduce((a, b) => a + b, 0) / o.length, o, t: tt.reduce((a, b) => a + b.t, 0) / tt.length, reason: tt.map((x) => x.reason) };
  },
  /** tuning: apply power multipliers {id: m} to this worker's DEFS (hp and every damage number scale with sqrt(m)); m = 1 restores the shipped numbers */
  setMult(j) {
    const defs = M.H.DEFS; BASE = BASE || {};
    for (const id of Object.keys(defs)) {
      const d = defs[id]; if (!BASE[id]) BASE[id] = { hp: d.hp, md: d.melee ? d.melee.dmg : 0, rd: d.ranged ? d.ranged.dmg : 0 };
      const b = BASE[id], k = Math.sqrt(j.mult[id] || 1);
      d.hp = Math.round(b.hp * k); if (d.melee) d.melee.dmg = +(b.md * k).toFixed(2); if (d.ranged) d.ranged.dmg = +(b.rd * k).toFixed(2);
    }
    return true;
  },
  /** custom soldier: compile, derive, check efficiency, run a tiny sim */
  soldier(j) {
    const { S, P, R, H, D } = M;
    const rng = new R.RNG(j.seed);
    const out = { bad: 0, over: 0, worst: 0, crash: 0, byRole: {}, n: 0, sim: 0, errors: [] };
    const weaponIds = Object.keys(S.WEAPON_ID_STYLE), shieldIds = Object.keys(S.SHIELDS), bodies = ['slim', 'average', 'stocky'];
    const caps = S.STAT_CAPS, keys = Object.keys(caps);
    const pickAI = ['charge', 'hold', 'skirmish', 'flank', 'guard', 'support'];
    const effCache = {};
    for (let k = 0; k < j.count; k++) {
      // random legal point buy (sum <= 100, each <= cap), biased to extremes so "all-in" builds are covered
      const st = {}; let left = 100; const order = keys.slice(); for (let i = order.length - 1; i > 0; i--) { const q = Math.floor(rng.next() * (i + 1)); [order[i], order[q]] = [order[q], order[i]]; }
      const greedy = rng.next() < 0.5;
      for (const key of order) { const cap = caps[key]; const v = greedy ? Math.min(cap, left, Math.floor(rng.next() * (cap + 1) * 1.6)) : Math.min(cap, left, Math.floor(rng.next() * (left / 2 + 1))); st[key] = v; left -= v; }
      const wid = weaponIds[Math.floor(rng.next() * weaponIds.length)];
      const ws = S.WEAPON_ID_STYLE[wid];
      const legal = S.legalAbilities(ws); const abs = [];
      for (let q = 0; q < 2; q++) if (legal.length && rng.next() < 0.7) { const a = legal[Math.floor(rng.next() * legal.length)]; if (!abs.includes(a)) abs.push(a); }
      const off = rng.next() < 0.55 ? shieldIds[Math.floor(rng.next() * shieldIds.length)] : null;
      const cs = { id: 'fz' + j.seed + '_' + k, name: 'Fuzz ' + k, blueprint: { main: wid, off, body: { type: bodies[Math.floor(rng.next() * 3)] } }, stats: st, abilities: abs, ai: pickAI[Math.floor(rng.next() * pickAI.length)], text: {} };
      let def;
      try { def = S.statsToUnitDef(cs, { weaponStyle: ws }); } catch (e) { out.crash++; if (out.errors.length < 5) out.errors.push(String(e && e.message)); continue; }
      out.n++;
      const role = def.role, base = S.roleEfficiency(role);
      const eff = P.power(def) / def.cost / base;
      const rr = out.byRole[role] || (out.byRole[role] = { n: 0, max: 0, sum: 0 });
      rr.n++; rr.sum += eff; if (eff > rr.max) rr.max = eff;
      if (eff > out.worst) out.worst = eff;
      if (eff > S.EFFICIENCY_CAP + 1e-6) out.over++;
      if (!(def.cost > 0) || !Number.isFinite(def.hp) || !Number.isFinite(def.speed) || def.radius > 0.7 + 1e-9) out.bad++;
      // sim run: 3 customs vs 3 hoplites for 6 s (crash / NaN check)
      if (j.sim && (k % j.sim) === 0) {
        try {
          const defs = Object.assign({}, H.DEFS); defs[def.id] = def;
          const w = H.buildWorld({ defs, seed: k + 1, a: { groups: [{ defId: def.id, n: 3 }] }, b: { groups: [{ defId: 'hoplite', n: 3 }] }, arena: 'marathon', rules: { timeLimit: 30 } });
          for (let t = 0; t < 180 && w.state !== 'ended'; t++) w.tick();
          for (const u of w.units) if (!Number.isFinite(u.x) || !Number.isFinite(u.z) || !Number.isFinite(u.hp)) { out.crash++; break; }
          out.sim++;
        } catch (e) { out.crash++; if (out.errors.length < 5) out.errors.push('sim: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
      }
    }
    return out;
  },
  /** S11/S22/S23 random matchup from seeds: styles/factions/budgets/arenas */
  matchup(j) {
    const { G, GEN, R, H } = M;
    const rng = new R.RNG((j.seed * 2654435761) >>> 0);
    const recipes = j.recipes || GEN.RECIPES;
    const recipe = j.recipe || recipes[Math.floor(rng.next() * recipes.length)];
    const arenaSeed = j.arenaSeed || 1 + Math.floor(rng.next() * 40);
    const arena = H.getArena(recipe, j.size || 'medium', arenaSeed);
    const factions = ['hellenes', 'romans', 'egyptians', 'persians', 'barbarians', 'carthage', 'mythic', 'mixed'];
    const styles = G.STYLES, diffs = ['easy', 'normal', 'hard'];
    const budget = j.budget || Math.round((j.bmin || 700) + rng.next() * ((j.bmax || 2600) - (j.bmin || 700)));
    const pick = (a) => a[Math.floor(rng.next() * a.length)];
    const opt = (team, seed) => ({ faction: pick(factions), style: pick(styles), budget, seed, team, arena, difficulty: 'normal' });
    const oa = Object.assign(opt(0, j.seed * 2 + 1), j.oa || {}), ob = Object.assign(opt(1, j.seed * 2 + 2), j.ob || {});
    const ra = G.generateArmy(oa);
    const rb = G.generateArmy(Object.assign(ob, ob.style === 'counter' ? { against: ra.counts } : {}));
    const rules = Object.assign({ timeLimit: 360 }, j.rules || {});
    rules.difficulty = j.difficulty || pick(diffs);
    const out = [];
    const o = battle({ aP: ra.placements, bP: rb.placements, arena: recipe, size: j.size || 'medium', arenaSeed, seed: j.seed, rules, s9: j.s9 });
    o.recipe = recipe; o.budget = budget; o.styles = [oa.style, ob.style]; o.factions = [oa.faction, ob.faction]; o.types = [ra.types, rb.types]; o.units = [ra.total, rb.total];
    out.push(o);
    if (j.swap) {
      // sides swapped: same groups, mirrored zones. (true mirror when j.mirror: B gets A's groups)
      const g1 = ra.groups, g2 = j.mirror ? ra.groups : rb.groups;
      const o2 = battle({ a: g2, b: g1, arena: recipe, size: j.size || 'medium', arenaSeed, seed: j.seed + 7, rules });
      o2.recipe = recipe; o2.budget = budget; out.push(o2);
      const o1 = j.mirror ? battle({ a: g1, b: g2, arena: recipe, size: j.size || 'medium', arenaSeed, seed: j.seed + 3, rules }) : null;
      if (o1) { o1.recipe = recipe; out[0] = o1; }
    }
    return out;
  },
  /** S21: behaviour/army difficulty d (A) against the fixed reference bot (style 'counter', normal behaviour) at equal cost, sides swapped */
  diffBattle(j) {
    const { G, H } = M;
    const arena = H.getArena('marathon', 'medium', 5);
    // the reference bot: army-gen style 'counter' against the tier-d player's own army, normal behaviour. Hard tiers also see the bot's army (army-gen hard counters it).
    const me0 = G.generateArmy({ faction: 'mixed', style: 'balanced', difficulty: j.d, budget: j.budget, seed: j.seed + 100, team: 0, arena });
    const bot = G.generateArmy({ faction: 'mixed', style: 'counter', difficulty: 'hard', budget: j.budget, seed: j.seed + 900, team: 1, arena, against: me0.counts });
    const me = j.d === 'hard' ? G.generateArmy({ faction: 'mixed', style: 'balanced', difficulty: 'hard', budget: j.budget, seed: j.seed + 100, team: 0, arena, against: bot.counts }) : me0;
    const dm = { easy: 0, normal: 1, hard: 2 }[j.d];
    const o1 = battle({ aP: me.placements, bP: bot.placements, seed: j.seed, arena: 'marathon', rules: { difficulty: { 0: dm, 1: 1 } } });
    const o2 = battle({ a: bot.groups, b: me.groups, seed: j.seed + 1, arena: 'marathon', rules: { difficulty: { 0: 1, 1: dm } } });
    const sc = (o, side) => (o.winner < 0 ? 0.5 : o.winner === side ? 1 : 0);
    return { d: j.d, score: (sc(o1, 0) + sc(o2, 1)) / 2, kills: o1.kills + o2.kills };
  },
  /** escorted pair: unit i (~30% of the budget) + hoplite escort vs unit j (same share) + the same escort. For units that cannot fight alone (support, siege, hero). */
  escortPair(j) {
    const defs = M.H.DEFS, eq = equalCounts(defs, j.i, j.j, j.budget * 0.3), nh = Math.round(j.budget * 0.7 / defs.hoplite.cost);
    const ga = [{ defId: j.i, n: eq.na }, { defId: 'hoplite', n: nh }], gb = [{ defId: j.j, n: eq.nb }, { defId: 'hoplite', n: nh }];
    const sc = (o, side) => (o.winner < 0 ? 0.5 : o.winner === side ? 1 : 0);
    const r = battle({ a: ga, b: gb, seed: j.seed, arena: 'marathon' }), q = battle({ a: gb, b: ga, seed: j.seed + 1, arena: 'marathon' });
    return { i: j.i, j: j.j, score: (sc(r, 0) + sc(q, 1)) / 2 };
  },
  /** composition: faction/style matrix cell */
  comp(j) {
    const { G, H } = M;
    const arena = H.getArena('marathon', 'medium', 5);
    const res = [];
    for (let s = 0; s < j.seeds; s++) {
      const ra = G.generateArmy({ faction: j.fa, style: j.sa, budget: j.budget, seed: j.seed + s * 17, team: 0, arena });
      const rb = G.generateArmy({ faction: j.fb, style: j.sb, budget: j.budget, seed: j.seed + s * 17 + 5, team: 1, arena, against: j.sb === 'counter' ? ra.counts : undefined });
      const o1 = battle({ aP: ra.placements, bP: rb.placements, seed: j.seed + s, arena: 'marathon' });
      const o2 = battle({ a: rb.groups, b: ra.groups, seed: j.seed + s + 1, arena: 'marathon' });
      const sc = (o, side) => (o.winner < 0 ? 0.5 : o.winner === side ? 1 : 0);
      res.push((sc(o1, 0) + sc(o2, 1)) / 2);
    }
    return { fa: j.fa, sa: j.sa, fb: j.fb, sb: j.sb, score: res.reduce((a, b) => a + b, 0) / res.length, n: res.length };
  },
  /** duels sanity battle: arbitrary groups + holds */
  duel(j) { const r = battle(j); r.id = j.id; return r; },
};

// =====================================================================================================================================
//                                                       WORKER POOL
// =====================================================================================================================================
if (!isMainThread) {
  (async () => {
    M = await jobsModule();
    parentPort.postMessage({ ready: true });
    parentPort.on('message', (m) => {
      if (m.stop) { process.exit(0); }
      try { parentPort.postMessage({ id: m.id, res: JOBS[m.kind](m.job) }); } catch (e) { parentPort.postMessage({ id: m.id, err: String(e && e.stack || e) }); }
    });
  })();
}

class Pool {
  constructor(n) { this.n = n; this.workers = []; this.queue = []; this.busy = 0; this.pending = new Map(); this.nextId = 1; this.ready = 0; this.done = 0; this.total = 0; this.idle = []; }
  async start() {
    await Promise.all(Array.from({ length: this.n }, () => new Promise((resolve) => {
      const w = new Worker(SELF, { workerData: {} });
      w.on('message', (m) => {
        if (m.ready) { this.idle.push(w); resolve(); return; }
        const p = this.pending.get(m.id); this.pending.delete(m.id);
        if (p.bcast) { if (m.err) p.reject(new Error(m.err)); else p.resolve(m.res); return; }          // broadcast replies do not free the worker for the queue (it was already counted idle/busy)
        this.done++;
        this.idle.push(w);
        if (m.err) p.reject(new Error(m.err)); else p.resolve(m.res);
        this._pump();
      });
      w.on('error', (e) => { console.error('worker error', e); });
      this.workers.push(w);
    })));
  }
  run(kind, job) { return new Promise((resolve, reject) => { this.total++; this.queue.push({ kind, job, resolve, reject }); this._pump(); }); }
  _pump() {
    while (this.idle.length && this.queue.length) {
      const w = this.idle.pop(), t = this.queue.shift(), id = this.nextId++;
      this.pending.set(id, t); w.postMessage({ id, kind: t.kind, job: t.job });
    }
  }
  broadcast(kind, job) { return Promise.all(this.workers.map((w) => new Promise((resolve, reject) => { const id = this.nextId++; this.pending.set(id, { resolve, reject, bcast: true }); w.postMessage({ id, kind, job }); }))); }
  async map(kind, jobs, label) {
    const t0 = Date.now(); let last = 0;
    const tick = setInterval(() => { const el = (Date.now() - t0) / 1000; if (el - last >= 15) { last = el; process.stderr.write(`  [${label}] ${this.done}/${this.total} jobs  ${el.toFixed(0)}s\n`); } }, 5000);
    const before = this.done, tot0 = this.total;
    const res = await Promise.all(jobs.map((j) => this.run(kind, j)));
    clearInterval(tick); void before; void tot0;
    return res;
  }
  async stop() { for (const w of this.workers) w.postMessage({ stop: true }); await new Promise((r) => setTimeout(r, 100)); for (const w of this.workers) w.terminate(); }
}

// =====================================================================================================================================
//                                                       MAIN
// =====================================================================================================================================
const argv = process.argv.slice(2);
const flag = (n, d) => { const a = argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const QUICK = argv.includes('--quick');
const ALL = ['pairs', 'escort', 'duels', 'comp', 'fuzz', 'mirror', 'fun', 'diff', 'metrics', 'soldier', 'perf'];
const wanted = argv.filter((a) => !a.startsWith('--'));
const sections = wanted.length ? wanted : ALL;
const DATA_FILE = path.join(ROOT, 'docs/balance_data.json');
const REPORT_FILE = path.join(ROOT, 'docs/balance_report.md');
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const med = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const quant = (a, q) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

async function sectionPairs(pool) {
  const defs = M.H.DEFS, ids = Object.keys(defs).sort();
  const budget = +flag('budget', QUICK ? 1200 : 2000), jobs = [];
  const only = flag('units', '').split(',').filter(Boolean);
  let k = 0;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    if (only.length && !only.includes(ids[i]) && !only.includes(ids[j])) continue;
    jobs.push({ i: ids[i], j: ids[j], budget, seed: 100 + hashStr(ids[i] + ids[j]) % 9000, side: QUICK ? (k++ & 1) : -1 });
  }
  const res = await pool.map('pair', jobs, 'pairs');
  let m = {}; for (const id of ids) m[id] = {};
  if (only.length) { try { const old = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).pairs; if (old && old.matrix) for (const id of ids) m[id] = Object.assign({}, old.matrix[id] || {}); } catch (e) { /* first run */ } }
  for (const r of res) { m[r.i][r.j] = r.score; m[r.j][r.i] = 1 - r.score; }
  return { budget, ids, matrix: m, quick: QUICK, partial: only.length > 0, battles: res.reduce((a, r) => a + r.o.length, 0), rows: res.map((r) => [r.i, r.j, r.score, r.n[0], r.n[1], +r.t.toFixed(0)]) };
}


// -------------------------------------------------------------------------------------------------------------------------------------
// Auto-tuner: equalises the combat field win rate of the mass-battle units by nudging a per-unit power multiplier (hp and damage by sqrt(m)).
//   node tools/balance.mjs tune --rounds=5 [--budget=1000] [--fresh]      iterate (resumes the multipliers stored in docs/balance_data.json)
//   node tools/balance.mjs applytune                                       write the multipliers into src/content/era_ancient/stats.js (hp and dmg numbers) and reset them to 1
const TUNE_ROLES = ['melee', 'ranged', 'cavalry', 'beast', 'swarm', 'monster', 'siege', 'hero'];
async function sectionTune(pool) {
  const defs = M.H.DEFS, ids = Object.keys(defs).sort().filter((id) => TUNE_ROLES.includes(defs[id].role));
  const rounds = +flag('rounds', 5), budget = +flag('budget', 1000);
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).tune || {}; } catch (e) { /* none */ }
  const mult = argv.includes('--fresh') ? {} : Object.assign({}, prev.mult || {});
  const history = argv.includes('--fresh') ? [] : (prev.history || []);
  const isBoss = (id) => BOSS(defs[id]) || defs[id].role === 'siege';
  for (let r = 0; r < rounds; r++) {
    await pool.broadcast('setMult', { mult });
    const jobs = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) jobs.push({ i: ids[i], j: ids[j], budget, seed: 300 + r * 7 + hashStr(ids[i] + ids[j]) % 9000, side: -1 });
    const res = await pool.map('pair', jobs, 'tune r' + (r + 1));
    const sc = {}, cnt = {};
    for (const x of res) {
      for (const [a, b, v] of [[x.i, x.j, x.score], [x.j, x.i, 1 - x.score]]) {
        if (isBoss(a) && defs[b].cost < 120 && !isBoss(b)) continue;          // bosses are not judged against low tier (by design)
        sc[a] = (sc[a] || 0) + v; cnt[a] = (cnt[a] || 0) + 1;
      }
    }
    const rows = ids.map((id) => ({ id, f: sc[id] / cnt[id], m: mult[id] || 1 }));
    const spread = Math.sqrt(mean(rows.map((x) => (x.f - 0.5) * (x.f - 0.5))));
    console.log(`round ${r + 1}: spread (rms of field win rate - 50%) ${(spread * 100).toFixed(1)} pts`);
    console.log(rows.slice().sort((a, b) => b.f - a.f).map((x) => `  ${x.id.padEnd(18)} ${(x.f * 100).toFixed(0).padStart(3)}%  m=${x.m.toFixed(2)}`).join('\n'));
    history.push({ round: history.length + 1, spread, rows: rows.map((x) => [x.id, +x.f.toFixed(3), +x.m.toFixed(3)]) });
    for (const x of rows) {
      const target = BOSS(defs[x.id]) ? 0.58 : defs[x.id].role === 'hero' ? 0.42 : 0.5;          // heroes are singletons in real armies: a little under par at equal cost
      const lm = Math.log(x.m) + 0.85 * (target - x.f) * 1.5;
      mult[x.id] = Math.min(1.5, Math.max(0.67, Math.exp(lm)));
    }
    const data0 = (() => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return {}; } })();
    data0.tune = { mult, history, budget }; fs.writeFileSync(DATA_FILE, JSON.stringify(data0));
  }
  await pool.broadcast('setMult', { mult: {} });
  return { mult, history, budget };
}

function applyTune() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')), mult = (data.tune && data.tune.mult) || {};
  const file = path.join(ROOT, 'src/content/era_ancient/stats.js'); let txt = fs.readFileSync(file, 'utf8');
  const fmt = (v, orig) => { const dec = /\./.test(orig) ? 1 : 0; return dec ? String(+v.toFixed(1)) : String(Math.round(v)); };
  let changed = 0; const lines = txt.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  ([a-z_]+): \{ faction/); if (!m || !mult[m[1]]) continue;
    const k = Math.sqrt(mult[m[1]]); let L = lines[i];
    L = L.replace(/\bhp: (\d+)/, (a, v) => 'hp: ' + Math.round(+v * k));
    L = L.replace(/\bmelee: M\((\d+(?:\.\d+)?),/, (a, v) => 'melee: M(' + fmt(+v * k, v) + ',');
    L = L.replace(/\branged: R\('([a-z_]+)', (\d+(?:\.\d+)?),/, (a, p, v) => `ranged: R('${p}', ` + fmt(+v * k, v) + ',');
    if (L !== lines[i]) { changed++; lines[i] = L; }
  }
  fs.writeFileSync(file, lines.join('\n'));
  data.tune = { mult: {}, history: data.tune.history || [], budget: data.tune.budget, applied: new Date().toISOString().slice(0, 10) }; fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  console.log('stats.js: rewrote ' + changed + ' unit lines; multipliers reset');
}

async function sectionEscort(pool) {
  const defs = M.H.DEFS, ids = Object.keys(defs).sort(), alone = ids.filter((id) => ['support', 'hero', 'siege'].includes(defs[id].role)), jobs = [];
  for (const a of alone) for (const b of ids) if (a !== b) jobs.push({ i: a, j: b, budget: QUICK ? 1500 : 2400, seed: 700 + hashStr(a + b) % 8000 });
  const res = await pool.map('escortPair', jobs, 'escort');
  const m = {}; for (const r of res) (m[r.i] || (m[r.i] = {}))[r.j] = r.score;
  return { alone, matrix: m };
}

async function sectionDuels(pool) {
  const defs = M.H.DEFS;
  const D = (id, n) => ({ defId: id, n });
  const duels = [
    { id: 'hoplite_vs_peltast_1v1', a: [D('hoplite', 1)], b: [D('peltast', 1)], seed: 11, want: 0, note: 'hoplite beats peltast in melee (1v1, adjacent start)' },
    { id: 'hoplite_vs_cretan_1v1', a: [D('hoplite', 1)], b: [D('cretan_archer', 1)], seed: 12, want: 0, note: 'hoplite beats archer in melee (1v1)' },
    { id: 'hoplites_vs_peltasts_melee', a: [D('hoplite', 20)], b: [D('peltast', 24)], seed: 13, want: 0, rules: { noKite: true }, note: 'hoplite line beats equal-cost peltasts once they are in melee (noKite harness rule)' },
    { id: 'hoplites_vs_peltasts_kiting', a: [D('hoplite', 20)], b: [D('peltast', 24)], seed: 13, want: -1, note: '(info) the same fight with free kiting: skirmishers are not meant to lose to slow spearmen in open ground' },
    { id: 'hoplites_vs_archers_eqcost', a: [D('hoplite', 20)], b: [D('cretan_archer', 22)], seed: 14, want: 0, note: 'hoplite line beats equal-cost archers' },
    { id: 'cavalry_vs_archers', a: [D('companion_cavalry', 9)], b: [D('cretan_archer', 22)], seed: 15, want: 0, note: 'cavalry beats equal-cost archers' },
    { id: 'spears_vs_cavalry', a: [D('hoplite', 20)], b: [D('companion_cavalry', 9)], seed: 16, want: 0, note: 'spears beat equal-cost cavalry' },
    { id: 'spears_vs_cataphract', a: [D('hoplite', 20)], b: [D('cataphract', 6)], seed: 17, want: 0, note: 'spears beat equal-cost heavy cavalry' },
    { id: 'elephant_vs_spears_fire', a: [D('war_elephant', 2)], b: [D('hoplite', 9), D('nubian_archer', 4)], seed: 18, want: 1, note: 'elephants lose to massed spears + fire arrows (~1300 each)' },
    { id: 'elephant_vs_infantry', a: [D('war_elephant', 2)], b: [D('medjay', 15)], seed: 19, want: 0, note: 'elephants beat an equal-cost light infantry blob in the open' },
    { id: 'elephant_vs_legionaries', a: [D('war_elephant', 2)], b: [D('legionary', 11)], seed: 20, want: -1, note: '(info) elephants vs legionaries' },
    { id: 'catapult_vs_cluster', a: [D('catapult', 2)], b: [D('hoplite', 14)], seed: 21, want: 'cluster', hold: [1], rules: { timeLimit: 40 }, note: 'catapults kill a standing cluster (>= 5 kills within 40 s)', maxTime: 40 },
    { id: 'archers_vs_cavalry', a: [D('cretan_archer', 22)], b: [D('companion_cavalry', 9)], seed: 22, want: 1, note: '(info) archers vs cavalry (cavalry should win)' },
    { id: 'ballista_vs_heavy', a: [D('ballista', 4)], b: [D('hoplite', 10)], seed: 23, want: -1, note: '(info) ballista vs spearmen' },
  ];
  const res = await pool.map('duel', duels, 'duels');
  return { duels: duels.map((d, i) => ({ id: d.id, note: d.note, want: d.want, winner: res[i].winner, reason: res[i].reason, t: res[i].t, alive: res[i].alive, kills: res[i].kills, keep: res[i].keep, startCount: res[i].startCount })) };
}

async function sectionComp(pool) {
  const factions = ['hellenes', 'romans', 'egyptians', 'persians', 'barbarians', 'carthage', 'mythic'];
  const jobs = [];
  for (const fa of factions) for (const fb of factions) if (fa < fb) jobs.push({ fa, fb, sa: 'balanced', sb: 'balanced', budget: 3000, seeds: QUICK ? 2 : 4, seed: 500 + hashStr(fa + fb) % 5000 });
  const styles = ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'];
  const sjobs = [];
  for (const sa of styles) for (const sb of styles) if (sa < sb) sjobs.push({ fa: 'mixed', fb: 'mixed', sa, sb, budget: 3000, seeds: QUICK ? 4 : 10, seed: 900 + hashStr(sa + sb) % 5000 });
  const f = await pool.map('comp', jobs, 'comp/factions'), s = await pool.map('comp', sjobs, 'comp/styles');
  return { factions: f.map((r) => [r.fa, r.fb, r.score]), styles: s.map((r) => [r.sa, r.sb, r.score]), factionList: factions, styleList: styles };
}

async function sectionFuzz(pool) {
  const N = QUICK ? 300 : 2000, jobs = [];
  for (let k = 0; k < N; k++) jobs.push({ seed: 7000 + k, bmin: 500, bmax: 2400 });
  const res = (await pool.map('matchup', jobs, 'fuzz')).map((r) => r[0]);
  const nc = [];
  for (let k = 0; k < (QUICK ? 40 : 100); k++) nc.push({ seed: 7000 + k, bmin: 500, bmax: 2400, rules: { timeLimit: 20 } });
  const ncRes = (await pool.map('matchup', nc, 'fuzz/NC')).map((r) => r[0]);
  const byReason = {}; for (const r of res) byReason[r.reason] = (byReason[r.reason] || 0) + 1;
  const ended = res.filter((r) => r.reason !== 'time' && r.t <= 360.5).length;
  const ncEnded = ncRes.filter((r) => r.reason !== 'time').length;
  const slow = res.filter((r) => r.reason === 'time').slice(0, 12).map((r) => ({ recipe: r.recipe, t: r.t, styles: r.styles, factions: r.factions, units: r.units, alive: r.alive }));
  return { n: N, ended, frac: ended / N, byReason, ncN: ncRes.length, ncFrac: ncEnded / ncRes.length, ncReasons: ncRes.reduce((m, r) => { m[r.reason] = (m[r.reason] || 0) + 1; return m; }, {}), slow,
    lenMed: med(res.map((r) => r.t)), lenP90: quant(res.map((r) => r.t), 0.9), recipes: groupBy(res, 'recipe', (a) => ({ n: a.length, time: a.filter((r) => r.reason === 'time').length, med: med(a.map((r) => r.t)) })) };
}
function groupBy(a, key, f) { const m = {}; for (const r of a) (m[r[key]] || (m[r[key]] = [])).push(r); const o = {}; for (const k of Object.keys(m).sort()) o[k] = f(m[k]); return o; }

const SYMMETRIC = ['marathon', 'colosseum', 'persepolis', 'arenalab', 'oasis', 'olympus', 'cyclops'];
const ASYMMETRIC = ['troy', 'thermopylae', 'nile', 'carthage', 'styx', 'alpine', 'giza', 'teutoburg'];
async function sectionMirror(pool) {
  const per = QUICK ? 40 : 200;                                   // pairs per arena; x2 orientations = 400 battles per arena (n >= 400)
  const arenas = SYMMETRIC.concat(ASYMMETRIC), out = {};
  const jobs = [];
  for (const recipe of arenas) for (let k = 0; k < per; k++) jobs.push({ seed: 20000 + hashStr(recipe) % 1000 * 10 + k * 3, recipe, arenaSeed: 1 + (k % 8), bmin: 900, bmax: 1700, swap: true, mirror: (k % 2) === 0, difficulty: 'normal' });
  const res = await pool.map('matchup', jobs, 'mirror');
  for (const r of res) { for (const o of r) { const a = out[o.recipe] || (out[o.recipe] = { n: 0, a: 0, d: 0, t: [], time: 0 }); a.n++; if (o.winner === 0) a.a++; else if (o.winner < 0) a.d++; a.t.push(o.t); if (o.reason === 'time') a.time++; } }
  const rows = {};
  for (const recipe of arenas) { const a = out[recipe]; rows[recipe] = { n: a.n, winA: (a.a + a.d / 2) / a.n, draws: a.d / a.n, lenMed: med(a.t), time: a.time, asym: ASYMMETRIC.includes(recipe) }; }
  return { per, rows };
}

async function sectionFun(pool) {
  const N = QUICK ? 40 : 200;
  const setups = [
    { id: 'skirmish', label: 'skirmish 3,000 per side, mixed, balanced vs balanced, marathon', bmin: 3000, bmax: 3000, recipes: ['marathon'] },
    { id: 'battle', label: 'battle 8,000 per side, mixed, random styles, marathon + 5 arenas', bmin: 8000, bmax: 8000, recipes: ['marathon', 'colosseum', 'persepolis', 'oasis', 'carthage', 'teutoburg'] },
    { id: 'chaos', label: 'chaos 3,000 per side, chaos style both sides, random arena', bmin: 3000, bmax: 3000, oa: { style: 'chaos' }, ob: { style: 'chaos' } },
  ];
  const out = {};
  for (const s of setups) {
    const jobs = [];
    const n = s.id === 'battle' ? Math.max(8, Math.round(N / 2)) : N;
    for (let k = 0; k < n; k++) jobs.push({ seed: 40000 + hashStr(s.id) % 1000 * 50 + k, bmin: s.bmin, bmax: s.bmax, recipes: s.recipes || undefined, oa: s.oa, ob: s.ob, size: s.id === 'battle' ? 'large' : 'medium', difficulty: 'normal' });
    const res = (await pool.map('matchup', jobs, 'fun/' + s.id)).map((r) => r[0]);
    const decided = res.filter((r) => r.winner >= 0);
    out[s.id] = {
      label: s.label, n: res.length, leadChange: res.filter((r) => r.leadEvents >= 1).length / res.length, leadFlip: res.filter((r) => r.changes >= 1).length / res.length, steamroll: decided.filter((r) => r.keep > 0.8).length / res.length,
      close: decided.filter((r) => r.keep < 0.4).length / res.length, deadAir: res.filter((r) => r.maxGap >= 20).length / res.length, deadAirMedian: med(res.map((r) => r.maxGap)),
      lenMed: med(res.map((r) => r.t)), lenP10: quant(res.map((r) => r.t), 0.1), lenP90: quant(res.map((r) => r.t), 0.9),
      announceEvents: mean(res.map((r) => r.flavor.lead + r.flavor.swing + r.flavor.blood + r.flavor.hero + r.flavor.streak + r.flavor.low + r.flavor.stale)),
      gag: res.filter((r) => r.flavor.gag >= 1).length / res.length, kills: mean(res.map((r) => r.kills)), reasons: res.reduce((m, r) => { m[r.reason] = (m[r.reason] || 0) + 1; return m; }, {}),
    };
  }
  return { setups: out };
}

async function sectionDiff(pool) {
  const N = QUICK ? 40 : 200, out = {};
  for (const d of ['easy', 'normal', 'hard']) {
    const jobs = []; for (let k = 0; k < N; k++) jobs.push({ d, seed: 5000 + k * 11, budget: 1500 });
    const res = await pool.map('diffBattle', jobs, 'diff/' + d);
    out[d] = { n: N * 2, win: mean(res.map((r) => r.score)) };
  }
  return { rows: out };
}

async function sectionMetrics(pool) {
  const jobs = [];
  const arenas = QUICK ? ['marathon', 'colosseum', 'carthage'] : ['marathon', 'colosseum', 'persepolis', 'oasis', 'carthage', 'teutoburg', 'olympus', 'alpine', 'giza', 'thermopylae', 'nile', 'troy', 'styx', 'cyclops', 'arenalab'];
  for (const a of arenas) jobs.push({ seed: 60000 + hashStr(a) % 1000, recipe: a, size: 'large', bmin: 20000, bmax: 20000, difficulty: 'normal', s9: true, metrics: true, maxTime: 60, rules: { timeLimit: 0 } });
  const out = await pool.map('metricsBattle', jobs, 'metrics');
  return { runs: out };
}
JOBS.metricsBattle = function (j) {
  const { G, H } = M;
  const arena = H.getArena(j.recipe, j.size, j.arenaSeed || 5);
  // a 200v200 battle needs two armies that both fit their zone with >= 120 units (small zones make the generator trade quantity for quality: those draws are skipped)
  let ra, rb;
  for (let k = 0; k < 12; k++) {
    ra = G.generateArmy({ faction: 'mixed', style: 'balanced', budget: j.bmin, seed: j.seed + 2 * k, team: 0, arena });
    rb = G.generateArmy({ faction: 'mixed', style: 'balanced', budget: j.bmin, seed: j.seed + 2 * k + 1, team: 1, arena });
    if (ra.total >= 120 && rb.total >= 120) break;
  }
  const o = battle({ aP: ra.placements, bP: rb.placements, arena: j.recipe, size: j.size, arenaSeed: j.arenaSeed || 5, seed: j.seed, rules: j.rules, maxTime: j.maxTime, metrics: true, s9: true });
  o.recipe = j.recipe; o.units = [ra.total, rb.total];
  return o;
};

async function sectionSoldier(pool) {
  const total = QUICK ? 1000 : 5000, chunks = 20, per = Math.ceil(total / chunks);
  const jobs = Array.from({ length: chunks }, (_, i) => ({ seed: 90000 + i, count: per, sim: QUICK ? 10 : 5 }));
  const res = await pool.map('soldier', jobs, 'soldier');
  const out = { n: 0, over: 0, worst: 0, crash: 0, bad: 0, sim: 0, byRole: {}, errors: [] };
  for (const r of res) {
    out.n += r.n; out.over += r.over; out.crash += r.crash; out.bad += r.bad; out.sim += r.sim; out.worst = Math.max(out.worst, r.worst); out.errors.push(...r.errors);
    for (const k of Object.keys(r.byRole)) { const a = out.byRole[k] || (out.byRole[k] = { n: 0, max: 0, sum: 0 }); a.n += r.byRole[k].n; a.sum += r.byRole[k].sum; a.max = Math.max(a.max, r.byRole[k].max); }
  }
  for (const k of Object.keys(out.byRole)) { out.byRole[k].mean = out.byRole[k].sum / out.byRole[k].n; delete out.byRole[k].sum; }
  out.errors = out.errors.slice(0, 5);
  return out;
}

async function sectionPerf() {
  const { measure } = await import('./perf_sim.mjs');
  const budgets = { 150: 1.2, 300: 2, 500: 3, 1000: 6 }, rows = [];
  for (const n of [150, 300, 500, 1000]) {
    let r = null;
    for (let rep = 0; rep < (QUICK ? 1 : 3); rep++) { const x = measure(n, { seed: 3 + rep, ticks: n > 500 ? 300 : 600, scenario: 'marathon150' }); if (!r || x.msPerTick < r.msPerTick) r = x; }
    rows.push({ units: n, built: r.n0, alive: Math.round(r.alive), msPerTick: +r.msPerTick.toFixed(2), p99: +r.p99.toFixed(1), max: +r.max.toFixed(1), budget: budgets[n], pass: r.msPerTick <= budgets[n] });
  }
  // heap growth: a long fight between very tanky armies (10k ticks), GC forced before/after
  let heap = null;
  try {
    const v8 = await import('node:v8'), vm = await import('node:vm');
    v8.setFlagsFromString('--expose-gc'); const gc = vm.runInNewContext('gc');
    const tank = Object.assign({}, M.H.DEFS);
    for (const id of ['hoplite', 'legionary', 'peltast', 'pilum_thrower']) tank[id] = Object.assign(Object.create(Object.getPrototypeOf(M.H.DEFS[id])), M.H.DEFS[id], { hp: 90000 });
    const w = M.H.buildWorld({ defs: tank, seed: 4, a: { groups: [{ defId: 'hoplite', n: 50 }, { defId: 'peltast', n: 25 }] }, b: { groups: [{ defId: 'legionary', n: 50 }, { defId: 'pilum_thrower', n: 25 }] }, rules: { timeLimit: 0, morale: false }, arena: 'marathon' });
    for (let i = 0; i < 600; i++) w.tick();
    gc(); const h0 = process.memoryUsage().heapUsed;
    for (let i = 0; i < 10000; i++) w.tick();
    gc(); const h1 = process.memoryUsage().heapUsed;
    heap = { ticks: 10000, growthMB: +((h1 - h0) / 1e6).toFixed(3), alive: w.units.length, state: w.state };
  } catch (e) { heap = { error: String(e && e.message) }; }
  return { rows, heap };
}

// =====================================================================================================================================
//                                                       VERDICTS + REPORT
// =====================================================================================================================================
function analysePairs(d) {
  const { ids, matrix } = d, defs = M.H.DEFS;
  const rows = ids.map((id) => {
    const others = ids.filter((o) => o !== id);
    const dd = defs[id], boss = BOSS(dd);
    const field = others.filter((o) => defs[o].role !== 'support' && !(boss && defs[o].cost < 120 && !BOSS(defs[o])));   // unescorted supports cannot fight: they are not part of the field
    const fw = mean(field.map((o) => matrix[id][o]));
    const counters = others.filter((o) => matrix[o][id] >= 0.6).sort((a, b) => matrix[b][id] - matrix[a][id]);
    const prey = others.filter((o) => matrix[id][o] >= 0.6).sort((a, b) => matrix[id][b] - matrix[id][a]);
    return { id, role: dd.role, cost: dd.cost, boss, field: fw, counters, prey, quick: d.quick };
  });
  return rows;
}

function table(head, rows) { return ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|'].concat(rows.map((r) => '| ' + r.join(' | ') + ' |')).join('\n'); }

function costRows() {
  const defs = M.H.DEFS;
  return Object.keys(defs).sort().map((id) => { const d = defs[id], design = M.DC.DESIGN_COSTS[id], f = M.S.costFormula(d); return { id, role: d.role, cost: d.cost, design, formula: f, drift: d.cost / design - 1, resid: f / d.cost - 1 }; });
}
function verdicts(data) {
  const V = [];
  const add = (id, pass, text) => V.push({ id, pass, text });
  if (M && M.DC && !data.__skipU7) {
    const rows = costRows(), worstDrift = rows.reduce((a, r) => (Math.abs(r.drift) > Math.abs(a.drift) ? r : a), rows[0]), worstRes = rows.reduce((a, r) => (Math.abs(r.resid) > Math.abs(a.resid) ? r : a), rows[0]);
    const hop = M.S.costFormula(M.H.DEFS.hoplite);
    add('U7', Math.abs(worstDrift.drift) <= 0.15 + 1e-9 && Math.abs(hop - 100) <= 5, `shipped costs vs the design table: worst drift ${worstDrift.id} ${pct(worstDrift.drift)} (limit 15%); formula(hoplite) = ${hop}; worst formula residual ${worstRes.id} ${pct(worstRes.resid)}`);
  }
  if (data.pairs) {
    const rows = analysePairs(data.pairs); const q = data.pairs.quick ? ' (quick)' : '';
    const over = rows.filter((r) => r.field > 0.62);          // bosses included, judged against opponents of cost >= 120 only (by design)
    const worst = rows.slice().sort((a, b) => b.field - a.field)[0];
    add('U5a', over.length === 0, `no unit above 62% vs the field${q}: highest ${worst.id} ${pct(worst.field)}${over.length ? '; over: ' + over.map((r) => r.id + ' ' + pct(r.field)).join(', ') : ''}`);
    const nb = rows.filter((r) => !r.boss);
    const esc = data.escort && data.escort.matrix;
    const escPrey = (id) => esc && esc[id] && Object.keys(esc[id]).some((o) => esc[id][o] >= 0.6);
    const escCounter = (id) => esc && esc[id] && Object.keys(esc[id]).some((o) => esc[id][o] <= 0.4);
    const noC = nb.filter((r) => !r.counters.length && !escCounter(r.id)), noP = nb.filter((r) => !r.prey.length && !escPrey(r.id));
    add('U5b', noC.length === 0 && noP.length === 0, `every non-boss unit has a counter (>=60%) and a prey${q} (units that cannot fight alone are judged as 30% of an army with a hoplite escort): without counter [${noC.map((r) => r.id).join(', ')}]; without prey [${noP.map((r) => r.id).join(', ')}]`);
  }
  if (data.duels) {
    const bad = []; let n = 0;
    for (const d of data.duels.duels) {
      if (d.want === -1) continue; n++;
      let ok;
      if (d.want === 'cluster') ok = d.kills >= 5; else ok = d.winner === d.want;
      if (!ok) bad.push(d.id + ' (winner ' + d.winner + ', alive ' + d.alive.join('/') + ', kills ' + d.kills + ')');
    }
    add('U6', bad.length === 0, bad.length ? 'FAILED: ' + bad.join('; ') : `${n} duel sanity checks hold`);
  }
  if (data.fuzz) {
    const f = data.fuzz;
    add('S11', f.frac >= 0.99 && f.ncFrac < 0.99, `${pct(f.frac, 2)} of ${f.n} random matchups end with reason != time within 6 sim-min; NC timeLimit=20: ${pct(f.ncFrac)} (must fail the 99% bar)`);
  }
  if (data.fun) {
    const s = data.fun.setups, def = s.battle || s.skirmish;
    add('S12', def.lenMed >= 60 && def.lenMed <= 120 && def.lenP90 <= 180,
      `battle length median/p90 (s) of the default 8,000 Battle preset: ${def.lenMed.toFixed(0)}/${def.lenP90.toFixed(0)}; skirmish 3,000 ${s.skirmish.lenMed.toFixed(0)}/${s.skirmish.lenP90.toFixed(0)}, chaos 3,000 ${s.chaos ? s.chaos.lenMed.toFixed(0) + '/' + s.chaos.lenP90.toFixed(0) : '-'}`);
    const parts = Object.keys(s).map((k) => { const x = s[k]; return `${k}: lead_change events >=1 ${pct(x.leadChange, 0)} (>=40; lead flipped sides ${pct(x.leadFlip, 0)}), steamroll ${pct(x.steamroll, 0)} (<=20), close ${pct(x.close, 0)} (>=25), dead-air ${pct(x.deadAir, 0)}${k === 'chaos' ? ', gag ' + pct(x.gag, 0) + ' (>=60)' : ''}`; });
    const ok = Object.keys(s).every((k) => s[k].leadChange >= 0.4 && s[k].steamroll <= 0.2 && s[k].close >= 0.25 && s[k].deadAir === 0) && (!s.chaos || s.chaos.gag >= 0.6);
    add('S23', ok, parts.join('; ') + '; announcer line count is HUMOR/UI-owned (sim proxies: ' + Object.keys(s).map((k) => k + ' ' + s[k].announceEvents.toFixed(1)).join(', ') + ' announce-worthy events/battle)');
  }
  if (data.mirror) {
    const rows = data.mirror.rows; const bad = [];
    for (const k of Object.keys(rows)) { const r = rows[k], lo = r.asym ? 0.35 : 0.45, hi = r.asym ? 0.65 : 0.55; if (r.winA < lo || r.winA > hi) bad.push(`${k} ${pct(r.winA)}`); }
    add('S22', bad.length === 0, `side-swapped mirror fairness, ${data.mirror.per * 2} battles per arena: ${bad.length ? 'outside band: ' + bad.join(', ') : 'all 15 arenas inside their band'}`);
  }
  if (data.diff) {
    const r = data.diff.rows;
    add('S21', r.easy.win < 0.35 && r.normal.win >= 0.45 && r.normal.win <= 0.55 && r.hard.win > 0.65, `win rate vs the reference counter bot, equal cost, n=${r.easy.n} each: easy ${pct(r.easy.win, 0)} (<35), normal ${pct(r.normal.win, 0)} (45-55), hard ${pct(r.hard.win, 0)} (>65)`);
  }
  if (data.soldier) {
    const s = data.soldier;
    add('U8', s.over === 0 && s.crash === 0 && s.bad === 0, `${s.n} random blueprints: ${s.over} above 1.35x role efficiency (worst ${s.worst.toFixed(3)}x), ${s.crash} crashes, ${s.bad} invalid defs, ${s.sim} sim runs`);
  }
  if (data.metrics) {
    const r = data.metrics.runs, OPEN = ['marathon', 'colosseum', 'persepolis', 'oasis', 'olympus', 'arenalab', 'cyclops'];     // the symmetric arenas of spec section 13
    const open = r.filter((x) => OPEN.includes(x.recipe)), choke = r.filter((x) => !OPEN.includes(x.recipe));
    const ov = mean(open.map((x) => x.metrics.overlap)), idle = mean(r.map((x) => x.metrics.idleInContact)), fl = mean(r.map((x) => x.metrics.flipsPerUnitSec)), st = mean(open.map((x) => x.metrics.stuck));
    const hz = r.reduce((a, x) => a + x.hazardBad, 0);
    add('S5', ov < 0.03, `overlap ${pct(ov, 2)} averaged over the ${open.length} open arenas x 60 s ~200v200 (worst open: ${open.slice().sort((a, b) => b.metrics.overlap - a.metrics.overlap)[0].recipe} ${pct(Math.max(...open.map((x) => x.metrics.overlap)), 1)}); chokepoint arenas (${choke.map((x) => x.recipe + ' ' + pct(x.metrics.overlap, 0)).join(', ')}) are geometry-bound`);
    add('S6', idle < 0.03, `in-contact idle ${pct(idle, 2)} over all ${r.length} arenas`);
    add('S7', fl < 0.15, `heading flips ${fl.toFixed(3)} per unit-second over all ${r.length} arenas`);
    add('S8', st < 0.01, `stuck ${pct(st, 2)} over the open arenas (chokepoints: ${choke.map((x) => x.recipe + ' ' + pct(x.metrics.stuck, 1)).join(', ')})`);
    add('S9', hz === 0, `${hz} unit-samples inside blocked cells over ${r.length} battles`);
  }
  if (data.perf) {
    const p = data.perf;
    add('S3', p.rows.every((r) => r.pass) && p.heap && p.heap.growthMB < 1, p.rows.map((r) => `${r.units}u ${r.msPerTick} ms (<=${r.budget})`).join(', ') + `; heap growth over ${p.heap && p.heap.ticks} ticks ${p.heap && p.heap.growthMB} MB`);
  }
  return V;
}

function renderReport(data) {
  const L = [];
  L.push('# VOXELWARS balance report');
  L.push('');
  L.push('Generated by `node tools/balance.mjs` (SIM). Numbers are deterministic for a given code revision except the perf section (CPU time, noisy on a shared machine).');
  L.push('Sections run: ' + Object.keys(data).filter((k) => k !== 'meta').map((k) => k + (data[k] && data[k].quick ? ' (quick)' : '')).join(', ') + '. Last update: ' + (data.meta && data.meta.updated || '') + '.');
  L.push('');
  const V = verdicts(data);
  L.push('## Criteria');
  L.push('');
  L.push(table(['Criterion', 'Result', 'Evidence'], V.map((v) => [v.id, v.pass ? 'PASS' : 'FAIL', v.text.replace(/\|/g, '/')])));
  L.push('');
  if (M && M.DC) {
    const rows = costRows();
    L.push('## Costs (U7)');
    L.push('');
    L.push('Shipped cost vs the design table (docs/spec/units.md, must stay within 15%) and vs the fitted cost formula (a guide: `costFormula(def)`, hoplite = 100).');
    L.push('');
    L.push(table(['unit', 'role', 'design', 'shipped', 'drift', 'formula', 'formula/shipped'], rows.filter((r) => Math.abs(r.drift) > 0.001 || Math.abs(r.resid) > 0.2).map((r) => [r.id, r.role, r.design, r.cost, (r.drift >= 0 ? '+' : '') + pct(r.drift, 0), r.formula, (r.resid >= 0 ? '+' : '') + pct(r.resid, 0)])));
    L.push('');
    L.push('(Only units that moved from the design cost or whose formula residual exceeds 20% are listed.)');
    L.push('');
  }
  if (data.pairs) {
    const rows = analysePairs(data.pairs);
    L.push('## Equal-cost mass battles (U5)');
    L.push('');
    L.push(`Every pair of the ${data.pairs.ids.length} shipped units fights at equal cost (~${data.pairs.budget} drachmae each side, marathon medium, both orientations; draw = 0.5). ${data.pairs.battles} battles. "field" is the mean win rate against all other units except the four pure-support units, which cannot fight unescorted (bosses/monsters also ignore opponents under cost 120, by design). Counter = a unit that beats it >= 60%; prey = beaten >= 60%.`);
    L.push('');
    L.push(table(['unit', 'role', 'cost', 'field win%', 'counters', 'prey'], rows.slice().sort((a, b) => b.field - a.field).map((r) => [r.id + (r.boss ? ' (boss)' : ''), r.role, r.cost, pct(r.field, 0), r.counters.slice(0, 4).join(', ') || '-', r.prey.slice(0, 4).join(', ') || '-'])));
    L.push('');
  }
  if (data.escort) {
    const e = data.escort.matrix, defs = M.H.DEFS;
    L.push('## Units that cannot fight alone (escorted pairs)');
    L.push('');
    L.push('Support, siege and hero units are judged as ~30% of an army whose other 70% is hoplites, against the same army with another unit in that 30% (both orientations). Marginal win rate = how often the army wins against the army carrying each other unit.');
    L.push('');
    L.push(table(['unit', 'role', 'mean', 'beats (>=60%)', 'beaten by (<=40%)'], data.escort.alone.map((id) => { const o = Object.keys(e[id] || {}); const mean2 = mean(o.map((k) => e[id][k])); return [id, defs[id].role, pct(mean2, 0), o.filter((k) => e[id][k] >= 0.6).sort((a, b) => e[id][b] - e[id][a]).slice(0, 4).join(', ') || '-', o.filter((k) => e[id][k] <= 0.4).sort((a, b) => e[id][a] - e[id][b]).slice(0, 4).join(', ') || '-']; })));
    L.push('');
  }
  if (data.duels) {
    L.push('## Duel sanity (U6)');
    L.push('');
    L.push(table(['check', 'expected', 'winner', 'alive A/B', 'kills', 't (s)'], data.duels.duels.map((d) => [d.note, d.want === -1 ? 'info' : d.want === 'cluster' ? '>=5 kills' : d.want === 0 ? 'A' : 'B', d.winner < 0 ? 'draw' : d.winner === 0 ? 'A' : 'B', d.alive.join('/'), d.kills, d.t])));
    L.push('');
  }
  if (data.comp) {
    L.push('## Composition matrices');
    L.push('');
    L.push('Faction vs faction (generated balanced armies, 3,000 each; row beats column at the given score, both orientations):');
    L.push('');
    const fl = data.comp.factionList; const cell = (a, b) => { if (a === b) return '-'; const x = data.comp.factions.find((r) => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a)); if (!x) return '?'; return pct(x[0] === a ? x[2] : 1 - x[2], 0); };
    L.push(table([''].concat(fl), fl.map((a) => [a].concat(fl.map((b) => cell(a, b))))));
    L.push('');
    L.push('Army style vs style (mixed factions, 3,000 each):');
    L.push('');
    const sl = data.comp.styleList; const cell2 = (a, b) => { if (a === b) return '-'; const x = data.comp.styles.find((r) => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a)); if (!x) return '?'; return pct(x[0] === a ? x[2] : 1 - x[2], 0); };
    L.push(table([''].concat(sl), sl.map((a) => [a].concat(sl.map((b) => cell2(a, b))))));
    L.push('');
  }
  if (data.fuzz) {
    const f = data.fuzz;
    L.push('## Termination fuzz (S11)');
    L.push('');
    L.push(`${f.n} random matchups (random factions/styles/budgets 500-2400, random arena recipe and seed, random difficulty): reasons ${JSON.stringify(f.byReason)}; median length ${f.lenMed.toFixed(0)} s, p90 ${f.lenP90.toFixed(0)} s. Negative control (timeLimit 20): ${JSON.stringify(f.ncReasons)}.`);
    if (f.slow.length) { L.push(''); L.push('Slowest/unended examples: ' + f.slow.map((s) => `${s.recipe} ${s.units.join('v')}u ${s.styles.join('/')}`).join('; ')); }
    L.push('');
    L.push(table(['arena', 'n', 'time-limit endings', 'median s'], Object.keys(f.recipes).map((k) => [k, f.recipes[k].n, f.recipes[k].time, f.recipes[k].med.toFixed(0)])));
    L.push('');
  }
  if (data.mirror) {
    L.push('## Mirror fairness (S22)');
    L.push('');
    L.push(`Per arena ${data.mirror.per} army pairs (half true mirrors, half different equal-budget armies) x both orientations. "A wins" counts draws as half.`);
    L.push('');
    L.push(table(['arena', 'band', 'battles', 'A wins', 'draws', 'median s'], Object.keys(data.mirror.rows).map((k) => { const r = data.mirror.rows[k]; return [k, r.asym ? '35-65' : '45-55', r.n, pct(r.winA), pct(r.draws, 0), r.lenMed.toFixed(0)]; })));
    L.push('');
  }
  if (data.fun) {
    L.push('## Fun metrics (S12 / S23)');
    L.push('');
    L.push(table(['setup', 'n', 'len med/p10/p90 s', 'lead_change event', 'steamroll>80%', 'close<40%', 'dead air>=20s', 'gag', 'kills', 'endings'], Object.keys(data.fun.setups).map((k) => { const x = data.fun.setups[k]; return [x.label, x.n, `${x.lenMed.toFixed(0)}/${x.lenP10.toFixed(0)}/${x.lenP90.toFixed(0)}`, pct(x.leadChange, 0) + ' (flip ' + pct(x.leadFlip, 0) + ')', pct(x.steamroll, 0), pct(x.close, 0), pct(x.deadAir, 0), pct(x.gag, 0), x.kills.toFixed(0), JSON.stringify(x.reasons)]; })));
    L.push('');
  }
  if (data.tune && data.tune.history && data.tune.history.length) {
    const h = data.tune.history;
    L.push('## Tuning pass (stats.js)');
    L.push('');
    L.push(`An automatic tuner (\`node tools/balance.mjs tune\`) round-robins the ${h[0].rows.length} mass-battle units (melee, ranged, cavalry, beast, swarm, monster, siege) at equal cost (${data.tune.budget} drachmae, both orientations, new seeds every round) and nudges a per-unit power multiplier (hp and damage by its square root) toward a 50% field win rate (58% for bosses, which are not judged against low-tier units). Spread = rms of (field win rate - 50%) in percentage points, the measurement noise floor is about 8: ${h.map((x) => 'round ' + x.round + ' ' + (x.spread * 100).toFixed(1)).join(', ')}. Its output was applied to \`stats.js\`, combined with cost nudges within the 15% band and three mechanism fixes (Trojan stowaways arrive at 40% hp, goat knockback 12 -> 6 with a 9 s dash, gladiator/berserker knockback trimmed to keep S25).`);
    L.push('');
  }
  if (data.diff) {
    L.push('## Difficulty tiers (S21)');
    L.push('');
    L.push(table(['AI tier', 'battles', 'win rate vs reference counter bot'], ['easy', 'normal', 'hard'].map((k) => [k, data.diff.rows[k].n, pct(data.diff.rows[k].win)])));
    L.push('');
  }
  if (data.metrics) {
    L.push('## Battle quality metrics (S5-S9)');
    L.push('');
    L.push('Generated 20,000-drachma armies (~200 units a side), first 60 sim-seconds, `normal` difficulty.');
    L.push('');
    L.push(table(['arena', 'units', 'overlap', 'idle in contact', 'flips/unit-s', 'stuck', 'blocked-cell samples', 'ended'], data.metrics.runs.map((r) => [r.recipe, r.units.join('v'), pct(r.metrics.overlap, 2), pct(r.metrics.idleInContact, 2), r.metrics.flipsPerUnitSec.toFixed(3), pct(r.metrics.stuck, 2), r.hazardBad, r.reason || 'running'])));
    L.push('');
  }
  if (data.soldier) {
    const s = data.soldier;
    L.push('## Custom soldier fuzzer (U8)');
    L.push('');
    L.push(`${s.n} random legal blueprints (random weapon/shield/body/point-buy/abilities). Worst efficiency ${s.worst.toFixed(3)}x of the best shipped unit in its role (cap 1.35x). Crashes ${s.crash}, invalid defs ${s.bad}, tiny sim runs ${s.sim}.`);
    L.push('');
    L.push(table(['role', 'n', 'mean eff.', 'max eff.'], Object.keys(s.byRole).map((k) => [k, s.byRole[k].n, s.byRole[k].mean.toFixed(3), s.byRole[k].max.toFixed(3)])));
    L.push('');
  }
  if (data.perf) {
    L.push('## Performance (S3)');
    L.push('');
    L.push(table(['units', 'built', 'avg alive', 'ms/tick (thread CPU, warm JIT)', 'p99', 'worst tick', 'budget', 'result'], data.perf.rows.map((r) => [r.units, r.built, r.alive, r.msPerTick, r.p99, r.max, r.budget, r.pass ? 'PASS' : 'FAIL'])));
    L.push('');
    L.push('Heap growth: ' + JSON.stringify(data.perf.heap));
    L.push('');
  }
  return L.join('\n') + '\n';
}

async function main() {
  M = await jobsModule();
  if (argv.includes('applytune') || sections.includes('applytune')) { applyTune(); process.exit(0); }
  const workers = Math.max(1, Math.min(+flag('workers', Math.min(4, os.cpus().length)), 16));
  let data = {};
  try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { data = {}; }
  const pool = new Pool(workers); await pool.start();
  const t0 = Date.now();
  const runners = { escort: sectionEscort, diff: sectionDiff, tune: sectionTune, pairs: sectionPairs, duels: sectionDuels, comp: sectionComp, fuzz: sectionFuzz, mirror: sectionMirror, fun: sectionFun, metrics: sectionMetrics, soldier: sectionSoldier };
  for (const s of sections) {
    if (s === 'perf') continue;
    if (!runners[s]) { console.error('unknown section ' + s); continue; }
    const t = Date.now();
    data[s] = await runners[s](pool); data[s].quick = QUICK; data[s].seconds = +((Date.now() - t) / 1000).toFixed(0);
    console.log(`section ${s} done in ${data[s].seconds}s`);
    const vs = verdicts({ [s]: data[s], __skipU7: true }); for (const v of vs) console.log(`  ${v.pass ? 'PASS' : 'FAIL'} ${v.id}: ${v.text}`);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  }
  await pool.stop();
  if (sections.includes('perf')) {                                // CPU-time perf runs alone, after the workers are gone
    data.perf = await sectionPerf(); data.perf.quick = QUICK;
    for (const v of verdicts({ perf: data.perf, __skipU7: true })) console.log(`  ${v.pass ? 'PASS' : 'FAIL'} ${v.id}: ${v.text}`);
  }
  data.meta = { updated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  if (!argv.includes('--no-report')) { fs.writeFileSync(REPORT_FILE, renderReport(data)); console.log('wrote docs/balance_report.md'); }
  console.log(`total ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(0);
}
if (isMainThread) main().catch((e) => { console.error(e); process.exit(1); });
