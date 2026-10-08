#!/usr/bin/env node
// tools/landing_order.mjs: machine model, scorer and searcher of the SIM landing order of the "three new eras" program.
// Owner DESIGN-SIM with COORD (spec: docs/eras/spec/landing_order.md). Pure Node 22, no dependencies, deterministic (seeded), read-only on the tree.
//
//   node tools/landing_order.mjs                    report: recommended order, freezes, margin tables, waivers (add --md for markdown, --json for JSON)
//   node tools/landing_order.mjs --check            exit 1 unless the RECOMMENDED order passes every check: LO-COMPLETE LO-DAG LO-P1 LO-AFTER-FREEZE LO-MED-FIRST
//                                                   LO-WAIVER LO-WAIVER-STALE LO-UNIT-COVER LO-BLESSING LO-ERA-SCOPE LO-BUDGET LO-STALE-RECOMMENDATION
//   node tools/landing_order.mjs --selftest         negative controls NC-LO1..NC-LO12 (each mutates order, model or data and must turn a NAMED check red)
//   node tools/landing_order.mjs --baseline         the plan v3.1 order (19 modules, spec/M.md `modules` block) scored with the same rules
//   node tools/landing_order.mjs --variants         the design requests (Medieval M13, Modern R1/R2, Sci-Fi swap) scored one by one on the 19-module DAG
//   node tools/landing_order.mjs --search [--era-order=med,mod,sf;med,sf,mod] [--beam=60] [--free] [--seed=1]
//                                                   exhaustive block search per era order (and with --free a seeded hill climb over the whole order)
//   node tools/landing_order.mjs --windows          for each landing, the positions it may take without a waiver, a DAG break or a changed freeze
//   node tools/landing_order.mjs --robust=2000      Monte-Carlo, every session estimate jittered +-30 percent: how often does the margin rule hold
//   node tools/landing_order.mjs --rewrite          the requiresModules / softModules rewrite (module names -> landing ids) for the three missions.json
//   node tools/landing_order.mjs --blessings [--md] where each parameter request (F1..F18, Medieval/Modern/Sci-Fi M13-style, MS H*) lands
//   node tools/landing_order.mjs --needed           per landing, the first headline-first mission of each era whose closure contains it
//   node tools/landing_order.mjs --block            the 26-row \`landings\` block (and the budget rows) in the exact JSON the spec/M.md blocks use
//   node tools/landing_order.mjs --budget           per-era prefix sums of the sim cost shares (replaces 0.36/0.45/0.50 and 0.57/0.71/0.80)
//   node tools/landing_order.mjs --order=A,B,C      score an explicit order of landing ids (26 ids) or of the 19 module ids
//   Options: --margin-land=2 --margin-sess=1 (the margin rule, spec 3.2), --sizes=q2|layers (session table, spec 3.3)
//
// Inputs (read at run time; nothing is copied): docs/eras/spec/M.md (```modules block), docs/eras/design/<era>/{missions.json,context.json}, docs/eras/spec/ms.schema.json (x-vocab headline flags).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = fs.existsSync(path.join(ROOT, 'docs/eras')) ? ROOT : (process.env.VW_MAIN_ROOT || ROOT);
const ERAS = ['medieval', 'modern', 'scifi'];
const ERA_NAME = { medieval: 'Medieval', modern: 'Modern', scifi: 'Sci-Fi' };
const args = process.argv.slice(2);
const opt = (name, d) => { const a = args.find((x) => x === `--${name}` || x.startsWith(`--${name}=`)); if (!a) return d; const i = a.indexOf('='); return i < 0 ? true : a.slice(i + 1); };
const MARGIN_LAND = Number(opt('margin-land', 2));
const MARGIN_SESS = Number(opt('margin-sess', 1));

// ------------------------------------------------------------------------------------------------------------------------------ data loading
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(DOCS, p), 'utf8'));
function parseModulesBlock() {
  const t = fs.readFileSync(path.join(DOCS, 'docs/eras/spec/M.md'), 'utf8');
  const m = t.match(/```modules\n([\s\S]*?)\n```/);
  if (!m) throw new Error('spec/M.md has no ```modules block');
  return JSON.parse(m[1]);
}
function loadEra(era) {
  const ms = readJSON(`docs/eras/design/${era}/missions.json`);
  const ctx = readJSON(`docs/eras/design/${era}/context.json`);
  const missions = ms.missions.map((x, i) => {
    const ids = new Set();
    const walk = (o) => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') {
        for (const [k, v] of Object.entries(o)) {
          if ((k === 'defId' || k === 'def' || k === 'unit') && typeof v === 'string') ids.add(v);
          else if (k === 'roster' && Array.isArray(v)) v.forEach((s) => typeof s === 'string' && ids.add(s));
          else walk(v);
        }
      }
    };
    [x.roster, x.enemy, x.fixed, x.script, x.reference, x.core].forEach(walk);
    const abilities = new Set();
    for (const id of ids) { const u = ctx.units[id]; if (u) u.abilities.forEach((a) => abilities.add(a)); }
    return { id: x.id, n: i + 1, hard: x.requiresModules || [], soft: x.softModules || [], teaches: x.teaches || [], abilities, units: ids };
  });
  const puzzles = (ms.puzzles || []).map((p) => ({ id: p.id, hard: p.requiresModules || [], teaches: p.teaches || [] }));
  return { era, missions, puzzles, ctx };
}
function loadHeadline() {
  const s = readJSON('docs/eras/spec/ms.schema.json');
  const v = s['x-vocab'].mechanics;
  const out = {};
  for (const era of ERAS) { out[era] = {}; for (const [k, m] of Object.entries(v[era] || {})) out[era][k] = !!m.headline && !m.firstSightOnly; }
  return out;
}

// ------------------------------------------------------------------------------------------------------------------------------ models
// A MODEL = { name, nodes[{id,mod,S,deps,sess,p1}], expand(token, mission, era) -> node ids, extras{era:[ids]}, p1:Set }.
// Session sizes: SIM sessions (one session = one WP of 1.7 h incl. gate and golden replay), q2_schedule Q9 allocation: M7 5, M12 3, M14 3, M13 2, M10 3,
// M8 4, M9 2, M11 1, M4 2, M5 2, M6 1, M15b 2, M17 3 (P2, 33 WPs) and the P1 SIM chain of 15 WPs (M0 M1 M2 M2b M3 M15a M17-basic).
// The apportioning of the P1 15 and of the split halves below is THIS document's (assumption A-S1/A-S2 in spec 3.3); `--sizes=layers` replaces the
// M7/M8/M9 rows by the M-layers 3.14 work-package sizes (S/M/L = 1/2/4 sessions) as a sensitivity run.
const SESS_PLAN19 = { M0: 3, M1: 2, M3: 1, M2: 4, M2b: 2.5, M10: 3, M6a: 0.5, M7: 5, M12: 3, M14: 3, M13: 2, M15: 3.5, M17e: 4, M8: 4, M9: 2, M11: 1, M4: 2, M5: 2, M6b: 0.5 };
function plan19Model() {
  const mods = parseModulesBlock();
  const nodes = mods.map((m) => ({ id: m.id, mod: m.id, S: m.S, deps: m.deps.slice(), sess: SESS_PLAN19[m.id], p1: m.pos <= 5 }));
  const sizes = opt('sizes', 'q2');
  if (sizes === 'layers') { for (const n of nodes) { if (n.id === 'M7') n.sess = 14; if (n.id === 'M8') n.sess = 8; if (n.id === 'M9') n.sess = 4; } }
  return { name: 'plan19', nodes, expand: (t) => [t], extras: { medieval: [], modern: [], scifi: [] }, planOrder: mods.sort((a, b) => a.pos - b.pos).map((m) => m.id) };
}
// The SPLIT model: 19 modules become 27 landing nodes. Every node is a real SIM hand-back; the justification of each split/edge is in spec 3.2 (table `nodes`).
const N = (id, mod, S, deps, sess, p1 = false) => ({ id, mod, S, deps, sess, p1 });
function splitModel() {
  const nodes = [
    N('M0', 'M0', 'S28', [], 3, true), N('M1', 'M1', 'S29', ['M0'], 2, true), N('M3', 'M3', 'S30', ['M0'], 1, true),
    N('M2', 'M2', 'S31', ['M0', 'M1', 'M3'], 4, true), N('M2b', 'M2b', 'S32', ['M1', 'M2', 'M3'], 2.5, true),
    N('M15c', 'M15', 'S45', ['M0'], 1.5, true),
    N('M17e.eng', 'M17e', 'S46', ['M1', 'M3'], 1),
    N('M10', 'M10', 'S33', ['M1', 'M2'], 3),
    N('M13a', 'M13', 'S38', ['M2b', 'M3', 'M10'], 1.5),
    N('M6a', 'M6a', 'S34', ['M2b'], 0.5),
    N('M7', 'M7', 'S35', ['M2', 'M2b', 'M3', 'M10'], 5),
    N('M12', 'M12', 'S36', ['M7', 'M10'], 3),
    N('M14', 'M14', 'S37', ['M10', 'M12', 'M13a'], 3),
    N('M15r', 'M15', 'S45', ['M15c', 'M2', 'M10', 'M14'], 1),
    N('M17e.wreck', 'M17e', 'S46', ['M17e.eng', 'M12'], 3),
    N('M8', 'M8', 'S39', ['M1', 'M2', 'M7', 'M13a', 'M17e.wreck'], 3),
    N('M8c', 'M8', 'S39', ['M8'], 1.25),
    N('M9', 'M9', 'S40', ['M2', 'M2b', 'M12', 'M13a'], 2),
    N('M11', 'M11', 'S41', ['M10', 'M12', 'M13a'], 1),
    N('M4', 'M4', 'S42', ['M1', 'M3', 'M15c'], 2),
    N('M5', 'M5', 'S43', ['M2b', 'M3', 'M13a'], 2),
    N('M6b1', 'M6b', 'S44', ['M3', 'M4', 'M6a', 'M13a'], 0.5),
    N('M6b2', 'M6b', 'S44', ['M6b1', 'M5', 'M8c'], 0.5),
    N('M13b', 'M13', 'S38', ['M13a', 'M12'], 0.75),
    N('M15g.mod', 'M15', 'S45', ['M15r', 'M11'], 0.5),
    N('M15g.sf', 'M15', 'S45', ['M15r', 'M4', 'M6b1', 'M5'], 0.75),
  ];
  if (opt('sizes', 'q2') === 'layers') { const s = { M7: 14, M8: 4, M8c: 2, M9: 4 }; for (const n of nodes) if (s[n.id] !== undefined) n.sess = s[n.id]; }
  const expand = (token, mission) => {
    switch (token) {
      case 'M13': return ['M13a'].concat(mission && mission.abilities.has('blink') ? ['M13b'] : []);
      case 'M15': return ['M15c'];
      case 'M17e': return ['M17e.eng', 'M17e.wreck'];
      case 'M6b': return ['M6b1'].concat(mission && mission.hard.includes('M5') ? ['M6b2'] : []);
      default: return [token];
    }
  };
  // Era requirements that no mission token states (units, god powers, kit completeness, possession per class, mechanic slice); spec 3.2 table `eraextras`.
  const extras = {
    medieval: ['M15c', 'M15r', 'M17e.eng'],
    modern: ['M15c', 'M15r', 'M17e.eng', 'M8c', 'M15g.mod'],
    scifi: ['M15c', 'M15r', 'M17e.eng', 'M8c', 'M15g.sf'],
  };
  return { name: 'split', nodes, expand, extras };
}

// ------------------------------------------------------------------------------------------------------------------------------ analysis helpers
function closureOf(model) {
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const memo = new Map();
  const cl = (id) => {
    if (memo.has(id)) return memo.get(id);
    const n = byId.get(id);
    if (!n) throw new Error(`unknown node ${id}`);
    const s = new Set([id]);
    for (const d of n.deps) for (const x of cl(d)) s.add(x);
    memo.set(id, s);
    return s;
  };
  return { byId, cl };
}
function missionNeeds(model, E, mission, kind) {
  const toks = kind === 'soft' ? mission.soft : mission.hard;
  const out = new Set();
  for (const t of toks) for (const id of model.expand(t, mission, E.era)) out.add(id);
  return out;
}
/** Everything static about a model on the loaded data: closures, per-mission hard sets, era required sets, headline-first missions. */
function prepare(model, eraData, headline) {
  const { byId, cl } = closureOf(model);
  const p1 = new Set(model.nodes.filter((n) => n.p1).map((n) => n.id));
  const eras = {};
  for (const era of ERAS) {
    const E = eraData[era];
    const required = new Set(model.extras[era] || []);
    const missions = E.missions.map((m) => {
      const hard = missionNeeds(model, E, m, 'hard');
      const soft = missionNeeds(model, E, m, 'soft');
      const clos = new Set();
      for (const id of hard) for (const x of cl(id)) clos.add(x);
      const closSoft = new Set();
      for (const id of soft) for (const x of cl(id)) closSoft.add(x);
      const headlineMech = m.teaches.filter((t) => headline[era][t]);
      return { id: m.id, n: m.n, teaches: m.teaches, headline: headlineMech, hard, soft, clos, closSoft };
    });
    const puzzleNeeds = new Set();
    for (const p of E.puzzles) for (const t of p.hard) for (const id of model.expand(t, { id: p.id, hard: p.hard, abilities: new Set() }, era)) for (const x of cl(id)) puzzleNeeds.add(x);
    for (const x of puzzleNeeds) required.add(x);
    for (const m of missions) { for (const x of m.clos) required.add(x); for (const x of m.closSoft) required.add(x); }
    for (const id of [...required]) for (const x of cl(id)) required.add(x);
    eras[era] = { missions, required, puzzleNeeds };
  }
  return { model, byId, cl, p1, eras };
}

// ------------------------------------------------------------------------------------------------------------------------------ scorer
function evaluate(P, order, o = {}) {
  const mL = o.marginLand ?? MARGIN_LAND, mS = o.marginSess ?? MARGIN_SESS;
  const { byId, p1 } = P;
  const idx = new Map(order.map((id, i) => [id, i]));
  const cum = []; let acc = 0;
  for (const id of order) { acc += byId.get(id).sess; cum.push(acc); }
  const p1Sess = [...p1].reduce((s, id) => s + byId.get(id).sess, 0);
  const checks = {};
  const fail = (k, msg) => { (checks[k] = checks[k] || []).push(msg); };
  // hard checks
  if (order.length !== P.model.nodes.length || new Set(order).size !== order.length) fail('LO-COMPLETE', `order has ${order.length} ids for ${P.model.nodes.length} nodes`);
  for (const n of P.model.nodes) { if (!idx.has(n.id)) continue; for (const d of n.deps) if (idx.has(d) && idx.get(d) > idx.get(n.id)) fail('LO-DAG', `${n.id} lands before its dependency ${d}`); }
  const first = order.slice(0, p1.size);
  if (!first.every((id) => p1.has(id))) fail('LO-P1', `the first ${p1.size} landings are not exactly the plumbing-slice set: ${first.join(' ')}`);
  const eras = {};
  for (const era of ERAS) {
    const R = P.eras[era].required;
    let F = -1; for (const id of R) F = Math.max(F, idx.has(id) ? idx.get(id) : Infinity);
    const prefix = order.slice(0, F + 1);
    const extrasIn = prefix.filter((id) => !R.has(id));
    const after = order.slice(F + 1);
    const ms = P.eras[era].missions.map((m) => {
      let L = -1; for (const id of m.clos) L = Math.max(L, idx.has(id) ? idx.get(id) : Infinity);
      const hs = m.headline.length > 0;
      const marginLand = F - L;
      const marginSess = L >= F ? 0 : cum[F] - cum[L];
      if (L > F) fail('LO-AFTER-FREEZE', `${era} ${m.id} needs ${order[L]} which lands after the E-FREEZE of the era`);
      const fine = marginLand >= mL && marginSess >= mS;
      return { id: m.id, n: m.n, headline: m.headline, L, last: order[L], lastCum: round2(cum[L]), avail: Math.max(0, round2(cum[L] - p1Sess)), marginLand, marginSess: round2(marginSess), waiver: hs && !fine, ok: !hs || fine };
    });
    eras[era] = { F, freezeNode: order[F], freezeSess: round2(cum[F]), afterP1: round2(cum[F] - p1Sess), landings: F + 1, extrasIn, after, postFreezeLandings: after.length, ms,
      waivers: ms.filter((m) => m.waiver), availHeadlineSum: round2(ms.filter((m) => m.headline.length).reduce((s, m) => s + m.avail, 0)), availAllSum: round2(ms.reduce((s, m) => s + m.avail, 0)),
      tailNodes: tailOf(P, era, order, F), required: order.filter((id) => R.has(id)) };
  }
  // Medieval must be able to start P3 first: its freeze is strictly before the other two and its prefix holds nothing the era does not need
  if (!(eras.medieval.F < eras.modern.F && eras.medieval.F < eras.scifi.F)) fail('LO-MED-FIRST', 'the Medieval E-FREEZE is not strictly the earliest');
  const waivers = ERAS.reduce((s, e) => s + eras[e].waivers.length, 0);
  const inert = ERAS.reduce((s, e) => s + eras[e].postFreezeLandings, 0);
  return { order, cum, checks, eras, waivers, inertTests: inert, p1Sess: round2(p1Sess), totalSess: round2(acc), ok: Object.keys(checks).length === 0 };
}
function tailOf(P, era, order, F) {
  // required nodes of the era that no headline-first mission needs: the only landings that can legitimately sit after the last headline module
  const hs = new Set();
  for (const m of P.eras[era].missions) if (m.headline.length) for (const x of m.clos) hs.add(x);
  return order.slice(0, F + 1).filter((id) => P.eras[era].required.has(id) && !hs.has(id));
}
const round2 = (x) => Math.round(x * 100) / 100;

// ------------------------------------------------------------------------------------------------------------------------------ search
// Compiled form: integer indices, typed arrays; one candidate scores in about 2 microseconds, so a block of 10 nodes is searched exhaustively.
function compile(P) {
  const ids = P.model.nodes.map((n) => n.id);
  const ix = new Map(ids.map((id, i) => [id, i]));
  const deps = P.model.nodes.map((n) => n.deps.map((d) => ix.get(d)));
  const sess = Float64Array.from(P.model.nodes.map((n) => n.sess));
  const eras = {};
  for (const era of ERAS) {
    eras[era] = { req: [...P.eras[era].required].map((id) => ix.get(id)), ms: P.eras[era].missions.filter((m) => m.headline.length).map((m) => ({ clos: [...m.clos].map((id) => ix.get(id)) })) };
  }
  return { ids, ix, deps, sess, eras, n: ids.length, p1: [...P.p1].map((id) => ix.get(id)) };
}
const POS = new Int16Array(64); const CUM = new Float64Array(64);
function fastKey(C, order, eraList) {
  // order: array of node indices (possibly partial); eras in eraList must be complete in it
  let acc = 0;
  for (let i = 0; i < order.length; i++) { POS[order[i]] = i; acc += C.sess[order[i]]; CUM[i] = acc; }
  let waivers = 0, avail = 0, fsum = 0;
  for (const era of eraList) {
    const E = C.eras[era];
    let F = -1; for (const r of E.req) { const p = POS[r]; if (p > F) F = p; }
    for (const m of E.ms) {
      let L = -1; for (const c of m.clos) { const p = POS[c]; if (p > L) L = p; }
      const mLand = F - L, mSess = L >= F ? 0 : CUM[F] - CUM[L];
      if (!(mLand >= MARGIN_LAND && mSess >= MARGIN_SESS)) waivers++;
      avail += CUM[L];
    }
    fsum += CUM[F];
  }
  return [waivers, round2(fsum), round2(avail)];
}
function blockSearch(P, eraOrder, beam) {
  const C = compile(P);
  const p1Order = topoP1(P).map((id) => C.ix.get(id));
  const seen = new Set(p1Order);
  const blocks = [];
  for (const era of eraOrder) {
    const b = C.eras[era].req.filter((i) => !seen.has(i)).sort((a, b2) => a - b2);
    b.forEach((i) => seen.add(i));
    blocks.push({ era, nodes: b });
  }
  const rest = C.ids.map((_, i) => i).filter((i) => !seen.has(i));
  if (rest.length) blocks.push({ era: '(unneeded)', nodes: rest });
  let frontier = [p1Order];
  const stats = { blocks: [], evaluated: 0 };
  for (let bi = 0; bi < blocks.length; bi++) {
    const blk = blocks[bi];
    const doneEras = eraOrder.slice(0, bi + 1).filter((e) => ERAS.includes(e));
    const top = []; // sorted ascending by key, bounded by beam
    let count = 0;
    const consider = (order) => {
      count++;
      const key = fastKey(C, order, doneEras);
      if (top.length >= beam && cmpKey(key, top[top.length - 1].key) >= 0) return;
      let lo = 0, hi = top.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (cmpKey(top[mid].key, key) <= 0) lo = mid + 1; else hi = mid; }
      top.splice(lo, 0, { key, order: order.slice() });
      if (top.length > beam) top.pop();
    };
    for (const base of frontier) {
      const placed = new Set(base); const cur = base.slice(); const free = blk.nodes.slice();
      const rec = () => {
        if (!free.length) { consider(cur); return; }
        for (let i = 0; i < free.length; i++) {
          const v = free[i];
          if (!C.deps[v].every((d) => placed.has(d))) continue;
          free.splice(i, 1); cur.push(v); placed.add(v);
          rec();
          placed.delete(v); cur.pop(); free.splice(i, 0, v);
        }
      };
      rec();
    }
    stats.blocks.push({ era: blk.era, nodes: blk.nodes.length, extensions: count });
    stats.evaluated += count;
    frontier = top.map((t) => t.order);
  }
  const finals = frontier.map((o) => o.map((i) => C.ids[i])).map((order) => ({ order, r: evaluate(P, order) }));
  finals.sort((a, b) => cmpKey(totalKey(a.r), totalKey(b.r)));
  return { best: finals[0], top: finals.slice(0, 5), stats, blocks: blocks.map((b) => ({ era: b.era, nodes: b.nodes.map((i) => C.ids[i]) })) };
}
function topoP1(P) {
  const ids = [...P.p1]; const out = []; const done = new Set();
  while (out.length < ids.length) for (const id of ids) if (!done.has(id) && P.byId.get(id).deps.every((d) => done.has(d))) { out.push(id); done.add(id); }
  return out;
}
function totalKey(r) {
  // lexicographic: hard checks, waivers, E-FREEZE sessions weighted 3/2/1 by the order of the freezes, sum of headline first-run times, inert tests
  const fr = ERAS.map((e) => r.eras[e].freezeSess).sort((a, b) => a - b);
  const avail = ERAS.reduce((s, e) => s + r.eras[e].availHeadlineSum, 0);
  return [Object.keys(r.checks).length, r.waivers, round2(3 * fr[0] + 2 * fr[1] + fr[2]), round2(avail), r.inertTests];
}
function cmpKey(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return d; } return 0; }
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hillClimb(P, start, seed, iters = 6000) {
  const rnd = mulberry(seed);
  const p1n = P.p1.size;
  let cur = start.slice(), curR = evaluate(P, cur), curK = totalKey(curR);
  for (let it = 0; it < iters; it++) {
    const i = p1n + Math.floor(rnd() * (cur.length - p1n)); const j = p1n + Math.floor(rnd() * (cur.length - p1n));
    if (i === j) continue;
    const nxt = cur.slice(); const [x] = nxt.splice(i, 1); nxt.splice(j, 0, x);
    const r = evaluate(P, nxt);
    if (Object.keys(r.checks).length) continue;
    const k = totalKey(r);
    if (cmpKey(k, curK) <= 0) { cur = nxt; curR = r; curK = k; }
  }
  return { order: cur, r: curR, key: curK };
}

// ------------------------------------------------------------------------------------------------------------------------------ coverage checks, windows, rewrite, blessings
// Which landing node a unit ability / tag needs (split model). Used to check that no unit of an era needs a node outside the era's required set
// and to list units whose first mission does not name the node (information: a fallback exists in the design, spec 3.6).
const ABILITY_NODE = {
  banner: 'M13a', bailout: 'M13a', call_strike: 'M13a', smoke: 'M13a', gas: 'M13a', dot_cloud: 'M13a', stun: 'M13a', oil: 'M13a', recharge: 'M4', aura: null,
  blink: 'M13b', lay_mine: 'M11', mine_immune: 'M11', turret: 'M8', setup: 'M8', cloak: 'M5', detect: 'M5', emp: 'M6b1', eshield: 'M4', heal_pulse: 'M6a', poison: 'M6a',
};
// Tags are era-scoped: the Medieval `air` tag and the Medieval/Modern `shielded` tag mean anti-air capable / block shield, not an air layer or an energy bubble.
const TAG_NODE = { medieval: {}, modern: { air: 'M7', mine_layer: 'M11' }, scifi: { air: 'M7', hover: 'M7', cloaked: 'M5', detector: 'M5', shielded: 'M4' } };
const RIG_NODE = [[/dragon1/, 'M7'], [/heli1|drone1|hover1/, 'M7'], [/tank1/, 'M8'], [/mech\d|mech1/, 'M8']];
function unitCoverage(P, eraData) {
  const out = { uncovered: [], unlisted: [] };
  for (const era of ERAS) {
    const R = P.eras[era].required;
    const first = new Map(); // node -> earliest mission number whose units carry it
    for (const [id, u] of Object.entries(eraData[era].ctx.units)) {
      const need = new Set();
      for (const a of u.abilities) if (ABILITY_NODE[a]) need.add(ABILITY_NODE[a]);
      for (const t of u.tags.join(' ').split(/\s+/)) if (TAG_NODE[era][t]) need.add(TAG_NODE[era][t]);
      for (const [re, n] of RIG_NODE) if (re.test(String(u.rig))) need.add(n);
      for (const n of need) {
        if (!R.has(n)) out.uncovered.push(`${era}:${id} needs ${n} which is outside the era's freeze set`);
        const fm = Number((String(u.firstMission).match(/M(\d)/) || [])[1] || 0);
        if (fm) {
          const m = P.eras[era].missions[fm - 1];
          if (m && !m.clos.has(n) && !m.closSoft.has(n)) out.unlisted.push(`${era}:${id} (first in M${fm}) carries ${n}, absent from that mission's requiresModules closure`);
        }
      }
    }
  }
  return out;
}
/** For each node: the positions it may move to in `order` without creating a waiver, a DAG break or moving any E-FREEZE landing count. */
function windows(P, order) {
  const base = evaluate(P, order);
  const out = {};
  for (let i = P.p1.size; i < order.length; i++) {
    const id = order[i]; const okPos = [];
    for (let j = P.p1.size; j < order.length; j++) {
      const nxt = order.slice(); nxt.splice(i, 1); nxt.splice(j, 0, id);
      const r = evaluate(P, nxt);
      const same = ERAS.every((e) => r.eras[e].F === base.eras[e].F || Math.abs(r.eras[e].freezeSess - base.eras[e].freezeSess) < 1e-9);
      if (!Object.keys(r.checks).length && r.waivers === 0 && same && ERAS.every((e) => r.eras[e].extrasIn.length === base.eras[e].extrasIn.length)) okPos.push(j + 1);
    }
    out[id] = { at: i + 1, from: Math.min(...okPos), to: Math.max(...okPos), count: okPos.length };
  }
  return out;
}
/** requiresModules rewrite: old tokens -> explicit node ids, per mission (CAMPAIGN applies it to missions.json; the lint then needs no heuristics). */
function rewriteTable(P) {
  const rows = [];
  for (const era of ERAS) for (const m of eraData[era].missions) {
    const hard = [...new Set(m.hard.flatMap((t) => P.model.expand(t, m, era)))];
    const soft = [...new Set(m.soft.flatMap((t) => P.model.expand(t, m, era)))];
    const same = m.hard.length === hard.length && m.hard.every((t, i) => t === hard[i]) && m.soft.join() === soft.join();
    rows.push({ era, id: m.id, n: m.n, oldHard: m.hard, oldSoft: m.soft, hard, soft, changed: !same });
  }
  return rows;
}
// Parameter blessings: where each Sci-Fi F1..F18 request, each Medieval/Modern M13-style parameter request and each request addressed to SIM lands.
// node = the landing node whose hand-back owns the semantics; decl = a node that only declares the key (schema); first = earliest mission using it.
export const BLESSINGS = [
  ['F1', 'scifi', 'aura effect recharge (ally shield delay x0.2, regen x3)', 'M4', 'M13a', 'bubble_tender', 'heal_pulse variant refilling shields 8/s'],
  ['F2', 'scifi', 'SHIELDDOWN break window 2.0 s, optional breakWindow.dmgTakenMul', 'M4', 'M3', 'all shields', 'plain delay doubling, wireframe tell kept'],
  ['F3', 'scifi', 'boss EMP stun cap 2.0-2.5 s as cc_field emp data', 'M6b1', 'M13a', 'rustbucket_rex, grand_concierge', 'uniform 3.0 s with a boss armour penalty'],
  ['F4', 'scifi', 'detect radius def key + tag detector; no cloaked unit in the first 6 s', 'M5', 'M2b', 'spritz_medic, valet_drone, glow_grazer, silent_signer', 'detector tag with fixed 10 u'],
  ['F5', 'scifi', 'cc_field effect taunt', 'M13a', 'M13a', 'greeter_unit', 'no ability, plain blocker'],
  ['F6', 'scifi', 'dash lunge params (goat-charge kind: 6 u, x1.5, cd 7)', 'M13a', 'M13a', 'wrench_runner', 'charge via the charge AI'],
  ['F7', 'scifi', 'point-blank ranged {hitscan, aoe, groundOnly} as a stomp ring', 'M10', 'M2', 'rustbucket_rex, elder_hummock', 'melee knock-back only'],
  ['F8', 'scifi', 'armorFace on non-vehicle defs (mechs, queen rear sac)', 'M8', 'M1', 'rustbucket_rex, grand_concierge, hive_queen', 'plain armour, scripted note'],
  ['F9', 'scifi', 'summon_on_death brood (existing params)', null, null, 'hive_queen', 'none needed (existing code)'],
  ['F10', 'scifi', 'dot_cloud gas (slow 30 percent + poison 3 dps, r4, 4 s)', 'M13a', 'M13a', 'spore_shepherd, spore pod prop', 'poison only'],
  ['F11', 'scifi', 'call_strike from a unit: 1.2 s channel, 2.0 s ring, channel cancel on caster death, crater, range 40', 'M13a', 'M10', 'grand_housekeeper', 'no cancel, ring remains'],
  ['F12', 'scifi', 'poison.proj on arc globs and a strafing-line aoe', 'M6a', 'M10', 'acid_spitter, glidewing, hive_queen', 'single-target poison dart'],
  ['F13', 'scifi', 'air-layer cloak (manta 6 s on, 10 s off)', 'M5', 'M7', 'void_manta', 'no cloak: shield and shadow only'],
  ['F14', 'scifi', 'bailout driver spawn excluded from startCount/startCost', 'M13a', 'M13a', 'junk_buggy', 'the buggy just dies'],
  ['F15', 'scifi', 'hitscan lock-line telegraph event for the rail', 'M2', 'M2', 'silent_signer, maitre_deluxe', 'ground ring at the target for 1.1 s'],
  ['F16', 'scifi', 'mech topple death clip, ground_shake event, wreck prop', 'M17e.wreck', 'M17e.eng', 'rustbucket_rex, grand_concierge', 'stagger death'],
  ['F17', 'scifi', 'hover-layer drones attackable by melee and ground shooters (only air layer excluded)', 'M7', 'M2b', 'spritz_medic, valet_drone, shush_bike, dustpan_hover', 'none: roster fails S11 otherwise'],
  ['F18', 'scifi', 'energy ap .5, bullet ap 0, explosive ap .3 and structure multiplier rows', 'M1', 'M12', 'all', 'energy ap .3'],
  ['MED-1', 'medieval', 'aura banner {dmg, lossMul, radius, fall:{r, shock}}', 'M13a', 'M13a', 'standard_bearer, ser_valiant, reeve, castellan, abbess', 'aura rally + officer shock x1.5'],
  ['MED-2', 'medieval', 'summon_on_death bailout {unit, hpFrac, getup}, multi-spawn list, exclusion from startCount/startCost', 'M13a', 'M13a', 'knight_errant, rolling_keep, coin_golem', 'one unit type x N'],
  ['MED-3', 'medieval', 'call_strike kind oil {delay, r, dps, dur, cd}', 'M13a', 'M10', 'castellan', 'dot_cloud fire'],
  ['MED-4', 'medieval', 'cc_field effect stun', 'M13a', 'M13a', 'bellringer, abbess', 'scare'],
  ['MED-5', 'medieval', 'stance kind pavise', 'M13a', 'M13a', 'pavise_bearer', 'shield block .90'],
  ['MED-6', 'medieval', 'dot_cloud trail:true', 'M13a', 'M13a', 'plague_cart', 'one cloud every 20 s at the cart'],
  ['MED-7', 'medieval', 'heal_pulse notTag machine (filter organic), poison.proj, NOHEAL', 'M6a', 'M6a', 'physician, abbess, apothecary, plague_cart', 'none (headline)'],
  ['MED-8', 'medieval', 'ranged mag/reload, arc high, air, groundOnly, structDmg, volley, minRange', 'M2', 'M10', 'crossbowman, trebuchets, springald, mangonel, longbowman', 'none (headline)'],
  ['MED-9', 'medieval', 'dash kinds lance, bull_charge', 'M13a', 'M13a', 'ser_valiant, great_hog', 'existing dash'],
  ['MED-10', 'medieval', 'projectile kind dragonfire (fireball volley of 3, aoe 3.5, ignite)', 'M2', 'M10', 'cinderwyrm', 'single fireball'],
  ['MED-11', 'medieval', 'air layer and boss landing rule (40 percent hp or 30 s without AA)', 'M7', 'M7', 'wyvern, cinderwyrm', 'none (headline); hp trigger only + unhittable-remnant rule'],
  ['MED-12', 'medieval', 'gate ownership, structDmg, explosive props, editTerrain', 'M12', 'M10', 'props, arenas', 'none (headline)'],
  ['MED-13', 'medieval', 'script strike {kind gas|fire} and strike with a status payload (M9 coda pause)', 'M14', 'M10', 'med_pennywhistle_blaze, med_bell_tolls_lunch, med_grand_pageant', 'render-only pause'],
  ['MOD-1', 'modern', 'weapon kit burst, mag/reload, suppress, hitscan, homing, lead, air/groundOnly, muzzle, clip', 'M2', 'M2', 'tin_hat_trooper and the rifle line', 'none (headline)'],
  ['MOD-2', 'modern', 'setup (crew weapons 0.8-4 s) in the firing gate', 'M8', 'M2', 'mortar_pair, filing_howitzer, tripod_mg_team', 'none (gate declared by M2, AI rule by M8)'],
  ['MOD-3', 'modern', 'turret {rate, arc}, armorFace, hull faces movement', 'M8', 'M8', 'biscuit_tank, teapot_heavy, lunchbox_apc', 'none (mission 4 is the mechanic)'],
  ['MOD-4', 'modern', 'call_strike telegraph 2.2 s, pending list', 'M13a', 'M10', 'signal_officer, deputy_director', 'script strike'],
  ['MOD-5', 'modern', 'aura banner (Spot aura)', 'M13a', 'M13a', 'spotter_balloon', 'aura rally'],
  ['MOD-6', 'modern', 'bailout (APC crew)', 'M13a', 'M13a', 'lunchbox_apc', 'APC just dies'],
  ['MOD-7', 'modern', 'smoke as a dot_cloud kind', 'M13a', 'M10', 'signal_officer', 'no smoke (cut ladder rung 5)'],
  ['MOD-8', 'modern', 'lay_mine <= 4 live, arm 3 s, x1.5 vs vehicles, mine_immune flag', 'M11', 'M13a', 'caution_sapper, dozer_plough', 'none (never cut)'],
  ['MOD-9', 'modern', 'heal_pulse organic / machine filters', 'M6a', 'M6a', 'site_first_aider, spanner_mechanic', 'none'],
  ['MOD-10', 'modern', 'aura pinfield (new effect value inside aura)', 'M13a', 'M2', 'chief_spokesperson, broadcast_behemoth', 'confuse pulse alone'],
  ['MOD-11', 'modern', 'god power family spawn_hazards (R-GP1)', 'M15g.mod', 'M11', 'god power slot 3', 'zone_quake rolling barrage'],
  ['MOD-12', 'modern', 'R3 group override passive:true (unarmed, untargetable, uncounted)', 'M14', 'M2b', 'fishbowl_chopper (M6 cameo)', 'harmless armed-off chopper'],
  ['MOD-13', 'modern', 'R5 arena.hazards[].team (pre-laid friendly mines)', 'M11', 'M12', 'mission 6', 'lay_mine only'],
  ['MOD-14', 'modern', 'R6 script event kinds beat/prop/weather/spawn/strike/setpiece; R7 capture {points, hold, holdAll:false} (amended to need 3 + flip, MS A3)', 'M14', 'M14', 'missions 2-5, 9', 'none'],
  ['SF-R2', 'scifi', 'M14 ops order {group, order} and kill {def|tag, within, cause}', 'M14', 'M14', 'sf_overclock_oops, sf_grand_reopening, sf_queen_size', 'timer-based fallbacks'],
  ['SF-R6', 'scifi', 'M14 triggers hp_frac on prop/unit, prop_destroyed by type', 'M14', 'M12', 'sf_overclock_oops, sf_blink_jungle, sf_queen_size', 'timer-based spawns'],
  ['SF-R7', 'scifi', 'WEATHER_KINDS ember_ion neon_rain spores with rows', 'M15c', 'M0', 'sf_floor_lava, sf_overclock_oops', 'map to ash rain fog'],
  ['MS-H1/H3', 'all', 'ScriptRunner ops order/kill, spawn.free/unique, triggers hp_frac/unit_kill/objective/counter, the counter-rule engine', 'M14', 'M14', 'every mission with events', 'per-mission tracker in campaign_run.js'],
  ['MS-H4', 'modern', 'world counters cover_unit_ticks, unit_ticks', 'M9', 'M9', 'mod_trench_pardon star 3', 'usedMechanic cover'],
  ['MS-H5a', 'all', 'unit_hit payload += ap armor face', 'M1', 'M1', 'armour counters', 'counter cannot exist: mechanic cut'],
  ['MS-H5b', 'all', 'events banner_fall, unit_bailout', 'M13a', 'M13a', 'colours, bailout counters', 'counter cannot exist: mechanic cut'],
  ['MS-H6', 'medieval', 'event prop_ignited {id type x z}', 'M12', 'M12', 'med_pennywhistle_blaze, med_toll_bridge', 'set-piece on a timer'],
  ['MS-H7', 'medieval', 'STRIKE_KINDS rows fire and gas (and oil for MED-3)', 'M10', 'M10', 'med_bell_tolls_lunch, med_pennywhistle_blaze', 'strike kind shell with visual substitution'],
  ['MS-H9', 'medieval', 'burning props and oil kill with cause fire, barrels keep explosive', 'M12', 'M10', 'fire_kill star', 'burnKills dropped'],
  ['MS-H10', 'all', 'accounting: spawned units flagged, aliveRoster, lostDefs excludes them (moved from M14 to M13a, amendment AM-M6)', 'M13a', 'M13a', 'stars 2/3 of every mission with bailout or reinforcements', 'none'],
  ['MS-H11', 'all', 'passive units: unarmed, untargetable, outside accounting', 'M14', 'M2b', 'med_pennywhistle_blaze, mod_switchboard_hold', 'cameo dropped'],
  ['ALL-R3/R4', 'all', 'mission rules powers.disable[] / powers.override{} (COORD accepted)', 'M15c', 'M15c', 'Modern 1-6, Sci-Fi 1-4, Medieval 4', 'none (accepted)'],
  ['GP-EMP', 'scifi', 'god power slot 5 zone_status EMP with shieldZero and cancelCloak', 'M15g.sf', 'M6b1', 'god power slot 5', 'slot 5 disabled until landed (powers.disable)'],
  ['GP-SHIELD', 'scifi', 'god power slot 4 heal_area shield refill (u.sh = shMax, clears SHIELDDOWN)', 'M15g.sf', 'M4', 'god power slot 4', 'heal only, no refill'],
];
function blessingCheck(P, order = null) {
  const bad = [];
  const r = order ? evaluate(P, order) : null;
  for (const b of BLESSINGS) {
    const [id, era, , node, decl] = b;
    for (const n of [node, decl]) if (n && !P.byId.has(n)) bad.push(`${id}: unknown node ${n}`);
    if (r && node && P.byId.has(node) && r.eras[era]) { const at = order.indexOf(node); if (at > r.eras[era].F) bad.push(`${id}: ${node} lands at #${at + 1}, after the ${era} E-FREEZE #${r.eras[era].F + 1}`); }
  }
  return bad;
}

// Per-node sim cost shares in reference-box ms (spec/M 3.13 `budget` block, apportioned over the split nodes; zero rows are per-cast code with no per-tick cost).
// The 300-unit column sums to 0.50 and the 500-unit column to 0.80 (the plan's era-total ceilings); `--budget` prints the prefix sums that replace 0.36/0.45/0.50 and 0.57/0.71/0.80.
export const BUDGET = {
  M0: [0.01, 0.02], M1: [0.02, 0.03], M3: [0.01, 0.02], M2: [0.06, 0.10], M2b: [0.04, 0.07], M15c: [0.01, 0.01], 'M17e.eng': [0.00, 0.01],
  M10: [0.03, 0.05], M13a: [0.01, 0.01], M7: [0.11, 0.17], M12: [0.03, 0.05], M14: [0.01, 0.01], M6a: [0.01, 0.01], M15r: [0.00, 0.00],
  M9: [0.04, 0.06], 'M17e.wreck': [0.01, 0.01], M8: [0.04, 0.07], M11: [0.01, 0.01], M8c: [0.00, 0.00], 'M15g.mod': [0.00, 0.00],
  M4: [0.03, 0.05], M6b1: [0.01, 0.02], M13b: [0.00, 0.00], M5: [0.01, 0.02], M6b2: [0.00, 0.00], 'M15g.sf': [0.00, 0.00],
};
function budgetReport(order) {
  const r = evaluate(SPLIT, order);
  const sum = (ids, k) => Math.round(ids.reduce((s, id) => s + BUDGET[id][k], 0) * 1e9) / 1e9;
  const out = { total: [sum(order, 0), sum(order, 1)], eras: {}, max: 0 };
  for (const e of ERAS) out.eras[e] = [sum(order.slice(0, r.eras[e].F + 1), 0), sum(order.slice(0, r.eras[e].F + 1), 1)];
  out.max = Math.max(...order.map((id) => BUDGET[id][0]));
  return out;
}

// ------------------------------------------------------------------------------------------------------------------------------ output helpers
function fmtOrder(P, order) { return order.map((id, i) => `${String(i + 1).padStart(2)} ${id.padEnd(11)} ${P.byId.get(id).S} ${String(P.byId.get(id).sess).padStart(4)}s`).join('\n'); }
function printReport(P, r, label, md = false) {
  const L = [];
  L.push(md ? `### ${label}` : `== ${label}`);
  L.push(md ? '' : '');
  L.push(md ? '| # | node | S | sessions | cumulative |\n|---|---|---|---|---|' : 'order:');
  r.order.forEach((id, i) => {
    const n = P.byId.get(id);
    L.push(md ? `| ${i + 1} | ${id} | ${n.S} | ${n.sess} | ${round2(r.cum[i])} |` : `  ${String(i + 1).padStart(2)}  ${id.padEnd(11)} ${n.S}  ${String(n.sess).padStart(4)}  cum ${String(round2(r.cum[i])).padStart(6)}${P.p1.has(id) ? '  [P1 slice]' : ''}`);
  });
  L.push('');
  L.push(md ? '| era | E-FREEZE landing | prefix landings | cumulative SIM sessions | after the P1 slice | waits for modules it does not need | landings after the freeze (inert tests) |\n|---|---|---|---|---|---|---|' : 'freezes:');
  for (const e of ERAS) {
    const x = r.eras[e];
    L.push(md ? `| ${ERA_NAME[e]} | #${x.F + 1} ${x.freezeNode} | ${x.landings} | ${x.freezeSess} | ${x.afterP1} | ${x.extrasIn.join(' ') || '-'} | ${x.postFreezeLandings} |`
      : `  ${ERA_NAME[e].padEnd(9)} F=#${x.F + 1} ${x.freezeNode.padEnd(10)} sessions ${String(x.freezeSess).padStart(5)} (after P1 ${x.afterP1})  extras-in-prefix [${x.extrasIn.join(' ')}]  post-freeze landings ${x.postFreezeLandings}`);
  }
  L.push('');
  L.push(md ? '| era | mission | headline | last hard landing | cumulative SIM sessions at that landing | margin landings | margin sessions | verdict |\n|---|---|---|---|---|---|---|---|' : 'margins (headline-first missions marked *):');
  for (const e of ERAS) for (const m of r.eras[e].ms) {
    const hs = m.headline.length ? m.headline.join('+') : '';
    const verdict = !m.headline.length ? '(not headline-first)' : m.ok ? 'PASS' : 'WAIVER';
    L.push(md ? `| ${ERA_NAME[e]} | ${m.n} ${m.id} | ${hs || '-'} | #${m.L + 1} ${m.last} | ${m.lastCum} | ${m.marginLand} | ${m.marginSess} | ${verdict} |`
      : `  ${e.padEnd(8)} ${String(m.n)} ${m.id.padEnd(24)} ${hs ? '*' : ' '} ${hs.padEnd(10)} last #${String(m.L + 1).padStart(2)} ${m.last.padEnd(10)} run@${String(m.avail).padStart(5)}  margin ${m.marginLand} landings / ${m.marginSess} sessions  ${verdict}`);
  }
  L.push('');
  L.push(`waivers: ${r.waivers}   checks: ${r.ok ? 'all green' : JSON.stringify(r.checks)}   inert tests: ${r.inertTests}   SIM sessions total ${r.totalSess} (P1 ${r.p1Sess})`);
  return L.join('\n');
}

// ------------------------------------------------------------------------------------------------------------------------------ main
const eraData = Object.fromEntries(ERAS.map((e) => [e, loadEra(e)]));
const headline = loadHeadline();
const SPLIT = prepare(splitModel(), eraData, headline);
const PLAN = prepare(plan19Model(), eraData, headline);
// plan-19 era sets are the plan's prefixes (plan section 4), not the mission closure: patch `required` to the prefix of the M.md block
{
  const posOf = Object.fromEntries(PLAN.model.planOrder.map((id, i) => [id, i + 1]));
  const ef = readJSON('docs/eras/design/medieval/context.json').eFreeze;
  for (const era of ERAS) PLAN.eras[era].required = new Set(PLAN.model.planOrder.filter((id) => posOf[id] <= ef[era]));
}

// The recommended order (spec 3.4). `--check` fails when a fresh exhaustive block search over the CURRENT data finds a strictly better key,
// so changing missions.json / the DAG / the session table forces COORD to re-confirm (or amend) this literal.
const RECOMMENDED = [
  'M0', 'M1', 'M3', 'M2', 'M2b', 'M15c',
  'M10', 'M13a', 'M7', 'M12', 'M14', 'M6a', 'M17e.eng', 'M15r',
  'M9', 'M17e.wreck', 'M8', 'M11', 'M8c', 'M15g.mod',
  'M4', 'M6b1', 'M13b', 'M5', 'M6b2', 'M15g.sf',
];
// Waivers the recommended order still needs under the rule (2 landings, 1.0 session). Empty: none. `--check` fails on any waiver not listed here.
const WAIVERS_ON_FILE = [];

function variants() {
  const V = [];
  const plan = PLAN.model.planOrder;
  const without = (a, ...ids) => a.filter((x) => !ids.includes(x));
  const after = (a, id, anchor) => { const b = without(a, id); b.splice(b.indexOf(anchor) + 1, 0, id); return b; };
  V.push(['V0 plan v3.1 as written', PLAN, plan]);
  V.push(['V1 Medieval request: M13 right after M10 (its true deps M2b M3 M10)', PLAN, after(plan, 'M13', 'M10')]);
  V.push(['V2 Modern R1 as asked: M9 right after M2b (violates M2->M9, M8->M9, M12->M9, M13->M9)', PLAN, after(plan, 'M9', 'M2b')]);
  V.push(['V3 Modern R1 earliest legal on the M.md DAG: M8 M9 right after M13', PLAN, after(after(plan, 'M8', 'M13'), 'M9', 'M8')]);
  V.push(['V4 Modern R2 literally: M11 immediately before M8', PLAN, after(plan, 'M11', 'M17e')]);
  V.push(['V5 Modern R1 legal + R2: M13 M11 M8 M9 ahead of M15 M17e', PLAN, after(after(after(plan, 'M11', 'M13'), 'M8', 'M11'), 'M9', 'M8')]);
  V.push(['V6 Sci-Fi swap: M6b before M5', PLAN, after(plan, 'M6b', 'M4')]);
  V.push(['V8 recommended (26 landings)', SPLIT, RECOMMENDED]);
  return V;
}
function wlist(r) { return ERAS.flatMap((e) => r.eras[e].waivers.map((m) => `${e}:${m.n}(${m.marginLand}L/${m.marginSess}s)`)).join(' ') || '-'; }

function main() {
  if (opt('selftest')) return selftest();
  if (opt('variants')) {
    const md = !!opt('md');
    if (md) console.log('| variant | DAG | waivers (landings/sessions) | Medieval freeze | Modern freeze | Sci-Fi freeze |\n|---|---|---|---|---|---|');
    for (const [label, P, order] of variants()) {
      const r = evaluate(P, order);
      const dag = r.checks['LO-DAG'] ? `RED x${r.checks['LO-DAG'].length}` : 'green';
      if (md) console.log(`| ${label} | ${dag} | ${r.waivers}: ${wlist(r)} | #${r.eras.medieval.F + 1} (${r.eras.medieval.freezeSess}s) | #${r.eras.modern.F + 1} (${r.eras.modern.freezeSess}s) | #${r.eras.scifi.F + 1} (${r.eras.scifi.freezeSess}s) |`);
      else console.log(`${label}\n    DAG ${dag}   waivers ${r.waivers}: ${wlist(r)}\n    freezes ${ERAS.map((e) => `${e} #${r.eras[e].F + 1}/${r.eras[e].freezeSess}s`).join('  ')}`);
    }
    return;
  }
  if (opt('baseline')) { console.log(printReport(PLAN, evaluate(PLAN, PLAN.model.planOrder), 'plan v3.1 baseline', !!opt('md'))); return; }
  if (opt('order')) {
    const ord = String(opt('order')).split(',');
    const P = ord.length === PLAN.model.nodes.length && ord.every((x) => PLAN.byId.has(x)) ? PLAN : SPLIT;
    console.log(printReport(P, evaluate(P, ord), 'explicit order', !!opt('md')));
    return;
  }
  if (opt('search')) return searchMode();
  if (opt('robust')) return robust();
  if (opt('windows')) {
    const w = windows(SPLIT, RECOMMENDED);
    console.log('node         at  legal positions without a waiver, a DAG break or a changed freeze (from..to, count)');
    for (const [id, x] of Object.entries(w)) console.log(`${id.padEnd(11)} ${String(x.at).padStart(3)}  ${x.from}..${x.to}  (${x.count})`);
    return;
  }
  if (opt('rewrite')) {
    const rows = rewriteTable(SPLIT);
    for (const x of rows.filter((r) => r.changed || opt('all'))) console.log(`${x.era}/${x.id}: requiresModules ${JSON.stringify(x.oldHard)} -> ${JSON.stringify(x.hard)}${x.oldSoft.length || x.soft.length ? `   softModules ${JSON.stringify(x.oldSoft)} -> ${JSON.stringify(x.soft)}` : ''}`);
    return;
  }
  if (opt('blessings')) {
    const idx = new Map(RECOMMENDED.map((id, i) => [id, i + 1]));
    const r = evaluate(SPLIT, RECOMMENDED);
    const md = !!opt('md');
    if (md) console.log('| id | era | request | owning node (lands at) | declared by | units | fallback |\n|---|---|---|---|---|---|---|');
    for (const [id, era, text, node, decl, units, fb] of BLESSINGS) {
      const f = era === 'all' ? null : r.eras[era] ? r.eras[era].F + 1 : null;
      const late = node && f !== null && idx.get(node) > f ? ' AFTER-FREEZE' : '';
      const lands = node ? `${node} (#${idx.get(node)})${late}` : 'existing code';
      console.log(md ? `| ${id} | ${era} | ${text} | ${lands} | ${decl || '-'} | ${units} | ${fb} |` : `${id.padEnd(9)} ${era.padEnd(8)} ${lands.padEnd(22)} decl ${String(decl).padEnd(9)} ${text}`);
    }
    return;
  }
  if (opt('needed')) {
    for (const id of RECOMMENDED) {
      const per = ERAS.map((e) => { const m = SPLIT.eras[e].missions.find((x) => x.headline.length && x.clos.has(id)); return m ? `${ERA_NAME[e]} ${m.n} ${m.headline.join('+')}` : null; }).filter(Boolean);
      console.log(`${id.padEnd(11)} ${per.join('; ') || '-'}`);
    }
    return;
  }
  if (opt('block')) { const idx = new Map(RECOMMENDED.map((id, i) => [id, i + 1])); const rows = RECOMMENDED.map((id) => { const n = SPLIT.byId.get(id); return { id, mod: n.mod, S: n.S, pos: idx.get(id), deps: n.deps, sess: n.sess, p1: n.p1 }; }); console.log(JSON.stringify(rows)); const bud = RECOMMENDED.map((id) => ({ id, ms300: BUDGET[id][0], ms500: BUDGET[id][1] })); console.log(JSON.stringify(bud)); return; }
  if (opt('budget')) { const b = budgetReport(RECOMMENDED); console.log(JSON.stringify(b)); return; }
  if (opt('check')) return checkMode();
  const r = evaluate(SPLIT, RECOMMENDED);
  if (opt('json')) { console.log(JSON.stringify({ order: r.order, eras: r.eras, waivers: r.waivers, checks: r.checks }, (k, v) => (v instanceof Set ? [...v] : v), 1)); return; }
  console.log(printReport(SPLIT, r, 'recommended order', !!opt('md')));
  if (!opt('md')) {
    const b = evaluate(PLAN, PLAN.model.planOrder);
    console.log(`\nbaseline (plan v3.1, same rules): waivers ${b.waivers}: ${wlist(b)}\n  freezes: ${ERAS.map((e) => `${e} #${b.eras[e].F + 1} ${b.eras[e].freezeSess}s`).join('  ')}`);
  }
}

/** Every hard check of the spec in one place; returns {codes, lines, info}. Used by --check and by the negative controls (which pass a mutated model/order). */
function runChecks(order, P = SPLIT, data = eraData, o = {}) {
  const r = evaluate(P, order);
  const codes = new Set(Object.keys(r.checks));
  const lines = [];
  for (const [k, v] of Object.entries(r.checks)) lines.push(`${k}: ${v.join('; ')}`);
  const filed = ERAS.flatMap((e) => r.eras[e].waivers.map((m) => `${e}:${m.id}`));
  const extra = filed.filter((w) => !WAIVERS_ON_FILE.includes(w)), gone = WAIVERS_ON_FILE.filter((w) => !filed.includes(w));
  if (extra.length) { codes.add('LO-WAIVER'); lines.push(`LO-WAIVER: waivers not on file: ${extra.join(' ')}`); }
  if (gone.length) { codes.add('LO-WAIVER-STALE'); lines.push(`LO-WAIVER-STALE: waiver on file no longer needed: ${gone.join(' ')}`); }
  const cov = unitCoverage(P, data);
  if (cov.uncovered.length) { codes.add('LO-UNIT-COVER'); lines.push(`LO-UNIT-COVER: ${cov.uncovered.join('; ')}`); }
  const bl = blessingCheck(P, order); if (bl.length) { codes.add('LO-BLESSING'); lines.push(`LO-BLESSING: ${bl.join('; ')}`); }
  // plan-scope: no mission closure may contain a module that the plan's E-FREEZE set of that era does not contain (by module NAME)
  for (const era of ERAS) {
    const names = new Set([...PLAN.eras[era].required]);
    for (const m of P.eras[era].missions) for (const id of m.clos) { const mod = P.byId.get(id).mod; if (!names.has(mod)) { codes.add('LO-ERA-SCOPE'); lines.push(`LO-ERA-SCOPE: ${era} ${m.id} needs ${mod}, outside the plan E-FREEZE set`); } }
  }
  { const b = budgetReport(order); if (Math.abs(b.total[0] - 0.5) > 1e-9 || Math.abs(b.total[1] - 0.8) > 1e-9) { codes.add('LO-BUDGET'); lines.push(`LO-BUDGET: shares sum to ${b.total.join('/')}, not 0.50/0.80`); } }
  // optimality: a fresh search must not find a better key than the order under test
  if (o.optimality !== false) {
    const kLit = totalKey(r);
    const res = blockSearch(P, ['medieval', 'modern', 'scifi'], Number(opt('beam', 60)));
    const kBest = totalKey(res.best.r);
    if (cmpKey(kBest, kLit) < 0) { codes.add('LO-STALE-RECOMMENDATION'); lines.push(`LO-STALE-RECOMMENDATION: a search finds a better key ${JSON.stringify(kBest)} than ${JSON.stringify(kLit)}: ${res.best.order.join(',')}`); }
    else lines.push(`optimality: key ${JSON.stringify(kLit)} <= search key ${JSON.stringify(kBest)}`);
  }
  return { r, codes, lines, cov };
}
function checkMode() {
  const { r, codes, lines, cov } = runChecks(RECOMMENDED);
  console.log(printReport(SPLIT, r, 'recommended order (check)'));
  if (cov.unlisted.length) console.log(`information (no fail), units whose ability node is not in their first mission's requiresModules closure:\n  ${cov.unlisted.join('\n  ')}`);
  console.log(lines.join('\n'));
  console.log(codes.size ? `\nlanding_order --check: red ${[...codes].join(' ')}` : '\nlanding_order --check: green');
  process.exit(codes.size ? 1 : 0);
}

function searchMode() {
  const beam = Number(opt('beam', 60));
  const orders = String(opt('era-order', 'med,mod,sf;med,sf,mod')).split(';').filter(Boolean);
  const map = { med: 'medieval', mod: 'modern', sf: 'scifi' };
  for (const o of orders) {
    const eo = o.split(',').filter(Boolean).map((x) => map[x]);
    const res = blockSearch(SPLIT, eo, beam);
    console.log(`\n### era order ${eo.join(' < ')}: ${res.stats.blocks.map((b) => `${b.era}: ${b.nodes} nodes, ${b.extensions} legal extensions scored`).join('; ')}`);
    console.log(printReport(SPLIT, res.best.r, `best for ${eo.join(' < ')}`, !!opt('md')));
    console.log(`key (hard checks, waivers, weighted freeze sessions 3/2/1, headline first-run sum, inert tests) = ${JSON.stringify(totalKey(res.best.r))}`);
    console.log(`order: ${res.best.order.join(',')}`);
  }
  if (opt('free')) {
    const seed = Number(opt('seed', 1));
    let best = null;
    const starts = [RECOMMENDED, blockSearch(SPLIT, ['medieval', 'scifi', 'modern'], beam).best.order];
    for (let s = 0; s < starts.length; s++) for (let k = 0; k < 8; k++) {
      const h = hillClimb(SPLIT, starts[s], seed * 1000 + s * 10 + k);
      if (!best || cmpKey(h.key, best.key) < 0) best = h;
    }
    console.log('\n### free hill climb over the whole order (seeded, P1 prefix fixed, 16 climbs of 6000 moves)');
    console.log(`best key = ${JSON.stringify(best.key)}   literal key = ${JSON.stringify(totalKey(evaluate(SPLIT, RECOMMENDED)))}`);
    console.log(`order: ${best.order.join(',')}`);
  }
}

function robust() {
  const n = Number(opt('robust', 2000));
  const rnd = mulberry(7);
  const base = SPLIT.model.nodes.map((x) => x.sess);
  let ok = 0; const per = {};
  for (let t = 0; t < n; t++) {
    SPLIT.model.nodes.forEach((x, i) => { x.sess = round2(base[i] * (0.7 + 0.6 * rnd())); });
    const r = evaluate(SPLIT, RECOMMENDED);
    if (ERAS.every((e) => r.eras[e].ms.every((m) => !m.waiver))) ok++;
    for (const e of ERAS) for (const m of r.eras[e].ms) if (m.headline.length) { const k = `${e}:${m.n}:${m.headline.join('+')}`; per[k] = (per[k] || 0) + (m.ok ? 1 : 0); }
  }
  SPLIT.model.nodes.forEach((x, i) => { x.sess = base[i]; });
  console.log(`every session estimate jittered uniformly +-30 percent, ${n} samples: margin rule (>= ${MARGIN_LAND} landings and >= ${MARGIN_SESS} sessions) holds for ALL headline-first missions in ${(100 * ok / n).toFixed(1)} percent of samples`);
  for (const [k, v] of Object.entries(per)) if (v < n) console.log(`  ${k.padEnd(34)} holds in ${(100 * v / n).toFixed(1)} percent`);
}

// ------------------------------------------------------------------------------------------------------------------------------ negative controls
// Each control mutates the order, the model or the data and requires a NAMED check to turn red; a control that stays green is a broken control (exit 1).
function selftest() {
  const results = [];
  const swap = (a, x, y) => { const c = a.slice(); const i = c.indexOf(x), j = c.indexOf(y); [c[i], c[j]] = [c[j], c[i]]; return c; };
  const clone = (d) => JSON.parse(JSON.stringify(d, (k, v) => (v instanceof Set ? { __set: [...v] } : v)), (k, v) => (v && v.__set ? new Set(v.__set) : v));
  const ctl = (name, code, { order = RECOMMENDED, P = SPLIT, data = eraData, optimality = false } = {}) => {
    const { codes } = runChecks(order, P, data, { optimality });
    results.push([name, code, codes.has(code)]);
  };
  // hard structure
  ctl('NC-LO1 M14 lands before M12 (edge M12 -> M14)', 'LO-DAG', { order: swap(RECOMMENDED, 'M14', 'M12') });
  ctl('NC-LO2 M10 swapped into the plumbing slice', 'LO-P1', { order: swap(RECOMMENDED, 'M15c', 'M10') });
  ctl('NC-LO3 order misses M9', 'LO-COMPLETE', { order: RECOMMENDED.filter((x) => x !== 'M9') });
  // margin rule: M13b (blink) moved behind the Sci-Fi tail, no DAG break, so only the margin can fail
  ctl('NC-LO4 M13b lands last (blink mission loses its tail)', 'LO-WAIVER', { order: RECOMMENDED.filter((x) => x !== 'M13b').concat(['M13b']) });
  // Medieval first: the Medieval tail landing after the Modern freeze
  ctl('NC-LO5 Medieval kit (M15r) lands after the Modern freeze', 'LO-MED-FIRST', { order: RECOMMENDED.filter((x) => x !== 'M15r').concat(['M15r']) });
  // a mission that needs a node after its era's freeze: Modern's required set loses M11 while mission 6 still needs it
  {
    const P2 = prepare(splitModel(), eraData, headline); P2.eras.modern.required.delete('M11');
    ctl('NC-LO6 mission needs a module after its E-FREEZE', 'LO-AFTER-FREEZE', { order: RECOMMENDED.filter((x) => x !== 'M11').concat(['M11']), P: P2 });
  }
  // the scorer must see the baseline problems (6 waivers on the plan order under the 2-landing rule): a scorer that reports none is broken
  { const r = evaluate(PLAN, PLAN.model.planOrder); results.push(['NC-LO7 plan v3.1 order shows waivers', 'margin', r.waivers >= 5]); }
  // data mutations
  {
    const d = clone(eraData); d.medieval.missions[1].hard.push('M8'); // a Medieval mission suddenly needs vehicles
    ctl('NC-LO8 Medieval mission needs M8 (outside the Medieval freeze set by plan name)', 'LO-ERA-SCOPE', { P: prepare(splitModel(), d, headline), data: d });
  }
  {
    const P2 = prepare(splitModel(), eraData, headline); P2.eras.modern.required.delete('M11'); P2.eras.modern.required.delete('M15g.mod');
    ctl('NC-LO9 a Modern unit (caution_sapper, lay_mine) needs M11 outside the Modern freeze set', 'LO-UNIT-COVER', { P: P2 });
  }
  // stale recommendation: a legal but worse order (M17e.eng pulled out of the Medieval tail) must lose to the search
  ctl('NC-LO10 legal but worse literal (M17e.eng early, Medieval tail shrinks)', 'LO-STALE-RECOMMENDATION', { order: [...RECOMMENDED.slice(0, 6), 'M17e.eng', ...RECOMMENDED.slice(6).filter((x) => x !== 'M17e.eng')], optimality: true });
  // blessing table: an unknown node id must be caught
  { BLESSINGS.push(['X', 'scifi', 'x', 'M99', null, '', '']); const bl = blessingCheck(SPLIT); BLESSINGS.pop(); results.push(['NC-LO11 blessing names an unknown node', 'LO-BLESSING', bl.length > 0]); }
  { BLESSINGS.push(['X', 'medieval', 'x', 'M11', null, '', '']); const bl = blessingCheck(SPLIT, RECOMMENDED); BLESSINGS.pop(); results.push(['NC-LO12 a Medieval request is owned by a node after the Medieval freeze', 'LO-BLESSING', bl.length > 0]); }
  let bad = 0;
  for (const [name, code, red] of results) { console.log(`${red ? 'RED (expected)' : 'NOT RED (BROKEN CONTROL)'}  ${name}  -> ${code}`); if (!red) bad++; }
  process.exit(bad ? 1 : 0);
}

main();
