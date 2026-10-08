// Records tests/golden/v8_fields.json: the FROZEN field lists the statwalk witness reads (docs/eras/spec/VF.md 3.6.1).
// The lists are the own enumerable fields of the v8 Unit, Projectile, ground-effect and Prop objects, observed in a fixed battery of baseline battles
// (all 43 defs, five arenas, storm / mutators / friendly fire / god powers / possession / survival waves), plus the nested key lists of the object-valued
// fields (unit.anim, unit.breach, the per-ability runtime state keys).
//
// usage: node tools/golden/v8_fields.mjs [--worktree=<dir>] [--out=<file>] [--check] [--help]
//   (default)  record to tests/golden/v8_fields.json   (only from the baseline worktree; the battery runs twice and must agree before anything is written)
//   --check    re-record into memory and compare with the file; exit 1 on any difference
// exit: 0 ok, 1 mismatch / failure, 2 usage
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBaseline, BASELINE_WORKTREE, BASELINE_TAG } from './baseline.mjs';
import { makeRecord, writeRecord, readRecord, canonicalJSON } from '../lib/records.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_OUT = path.join(REPO, 'tests', 'golden', 'v8_fields.json');

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v) && !ArrayBuffer.isView(v) && typeof v.id !== 'number' && typeof v.id !== 'string';

/** Observation accumulator: per object kind the fields in first-seen order, nested key unions sorted. */
function newObs() { return { unit: new Map(), projectile: new Map(), effect: new Map(), prop: new Map(), anim: new Set(), breach: new Set(), abilSt: new Map(), n: { unit: 0, projectile: 0, effect: 0, prop: 0, samples: 0 } }; }
function seen(map, o) { for (const k of Object.keys(o)) if (!map.has(k)) map.set(k, true); }
function observe(w, obs) {
  obs.n.samples++;
  for (const u of w.units) {
    obs.n.unit++; seen(obs.unit, u);
    if (u.anim) for (const k of Object.keys(u.anim)) obs.anim.add(k);
    if (isPlain(u.breach)) for (const k of Object.keys(u.breach)) obs.breach.add(k);
    for (const a of u.abil || []) {
      if (!a || !a.p || typeof a.p.id !== 'string' || !a.st || typeof a.st !== 'object') continue;
      let s = obs.abilSt.get(a.p.id); if (!s) obs.abilSt.set(a.p.id, s = new Set());
      for (const k of Object.keys(a.st)) s.add(k);
    }
  }
  for (const p of w.proj.list) if (p.active) { obs.n.projectile++; seen(obs.projectile, p); }
  for (const e of w.effects) { obs.n.effect++; seen(obs.effect, e); }
  for (const p of w.props) { obs.n.prop++; seen(obs.prop, p); }
}

async function battery(B) {
  const { H } = B;
  const ids = Object.keys(H.DEFS), godIds = (await B.imp('src/sim/godpowers.js')).GOD_POWERS.map((g) => g.id);
  const mutIds = (await B.imp('src/sim/mutators.js')).MUTATORS.map((m) => m.id);
  const all = (n) => ids.map((d) => ({ defId: d, n }));
  const cases = [
    { name: 'all-marathon', arena: 'marathon', seed: 1, ticks: 900 },
    { name: 'all-troy-storm-powers', arena: 'troy', seed: 2, ticks: 900, rules: { weather: 'storm' }, casts: godIds.map((g, i) => [120 + i * 40, g]) },
    { name: 'all-thermopylae-mutators', arena: 'thermopylae', seed: 3, ticks: 900, rules: { mutators: mutIds } },
    { name: 'all-styx-ff-hard', arena: 'styx', seed: 4, ticks: 900, rules: { friendlyFire: true, difficulty: 'hard', weather: 'sandstorm' } },
    { name: 'all-oasis-possess', arena: 'oasis', seed: 5, ticks: 900, possess: true, rules: { weather: 'snow' } },
    { name: 'all-alpine-fog', arena: 'alpine', seed: 7, ticks: 900, rules: { weather: 'fog', morale: false } },
    { name: 'survival-waves', arena: 'marathon', seed: 6, ticks: 2700, waves: true },
  ];
  const obs = newObs();
  for (const c of cases) {
    const opts = { arena: c.arena, seed: c.seed, rules: c.rules || {}, a: { groups: all(c.waves ? 2 : 3) }, b: c.waves ? null : { groups: all(3) } };
    if (c.waves) opts.rules = { waves: true };
    const w = H.buildWorld(opts);
    for (const [t, g] of c.casts || []) w.input(t, { type: 'cast', power: g, x: (t % 7) * 4 - 12, z: (t % 5) * 5 - 10, team: t % 2 });
    if (c.possess) {
      const hero = w.units.find((u) => u.team === 0 && u.def.role === 'hero');
      if (hero) for (let t = 60; t < 500; t += 15) w.input(t, { type: 'possess', unit: t === 60 ? hero.id : undefined, move: { x: Math.sin(t) , z: Math.cos(t) }, attack: t % 30 === 0, ability: t % 45 === 0 ? 1 : 0 });
    }
    for (let i = 0; i < c.ticks && w.state !== 'ended'; i++) { w.tick(); if (i % 10 === 0) observe(w, obs); }
    observe(w, obs);
  }
  return { obs, cases: cases.map((c) => c.name) };
}

function toSpec(obs) {
  const sorted = (s) => [...s].sort();
  const abilSt = {}; for (const id of [...obs.abilSt.keys()].sort()) abilSt[id] = sorted(obs.abilSt.get(id));
  return {
    unit: [...obs.unit.keys()], projectile: [...obs.projectile.keys()], effect: [...obs.effect.keys()], prop: [...obs.prop.keys()],
    walk: { prop: ['hp', 'dead'] },
    nested: { 'unit.anim': sorted(obs.anim), 'unit.breach': sorted(obs.breach), 'unit.abil.st': abilSt },
  };
}

export async function recordFields({ worktree = BASELINE_WORKTREE } = {}) {
  const B = await loadBaseline({ worktree, regime: 'baked' });
  const r1 = await battery(B), r2 = await battery(B);
  const s1 = toSpec(r1.obs), s2 = toSpec(r2.obs);
  if (canonicalJSON(s1) !== canonicalJSON(s2) || JSON.stringify(r1.obs.n) !== JSON.stringify(r2.obs.n)) throw new Error('the baseline battery is not deterministic: two runs observed different fields');
  const data = { ...s1, observed: r1.obs.n, battery: r1.cases };
  const rec = makeRecord('v8_fields', data, { engine: 'node', regime: 'baked', root: B.wt, tag: BASELINE_TAG });
  return rec;
}

async function main(argv) {
  const opt = { worktree: BASELINE_WORKTREE, out: DEFAULT_OUT, check: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return 0; }
    if (a === '--check') { opt.check = true; continue; }
    const m = /^--(worktree|out)=(.+)$/.exec(a);
    if (!m) { console.error('unknown argument: ' + a); return 2; }
    opt[m[1]] = path.resolve(m[2]);
  }
  const rec = await recordFields({ worktree: opt.worktree });
  const n = rec.data;
  if (opt.check) {
    const old = readRecord(opt.out);
    const keep = (r) => { const { box, sha, dirty, tag, ...rest } = r; return canonicalJSON(rest); };
    const same = keep(old) === keep(rec);
    console.log(`${same ? 'PASS' : 'FAIL'} v8_fields ${path.relative(REPO, opt.out)} ${same ? 'equals' : 'DIFFERS from'} a fresh recording of the baseline`);
    return same ? 0 : 1;
  }
  const { written } = writeRecord(opt.out, rec);
  console.log(`${written ? 'wrote' : 'unchanged'} ${path.relative(REPO, opt.out)}: unit ${n.unit.length}, projectile ${n.projectile.length}, effect ${n.effect.length}, prop ${n.prop.length} fields; abilities with state keys ${Object.keys(n.nested['unit.abil.st']).length}`);
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
