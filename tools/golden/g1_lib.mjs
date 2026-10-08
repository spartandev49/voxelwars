// G1 sim matrix: the case runner shared by the recorder (tools/golden/g1_record.mjs), the worker pool, the Chromium column and the test
// (docs/eras/spec/VF.md 3.6.1). Tree-agnostic: every function takes the ROOT of the tree under test (the baseline worktree when recording, the
// candidate tree when checking) and imports that tree's own `tools/lib/harness.mjs`, so the same code produces and verifies the digests.
//
//   loadTree(root, regime)          -> ctx { root, regime, H (harness of that tree), imp(rel) }  (regime baked = app/main.js:53 registerAllClips; one regime per process)
//   loadFixtures(dir)               -> fx { matrix, placements, kinds, abilities, inputs, armies, cases, ids, core }
//   runCase(ctx, fx, spec, opts)    -> { digest, exercise, legacyBad, nan, inf, ms }
//   compareDigest(id, exp, act)     -> [{ label, msg }]   (labels g1/chain g1/walk g1/evhash g1/tuple g1/digest_equal)
//
// What a digest is (3.6.1): chain = legacy stateHash every 100 ticks (+ endHash), walk = statwalk every 300 ticks (+ endWalk), evHash = FNV over every
// event in registration order (frozen per-type field lists, so a field added by a later module cannot move it), result = the 15-number tuple.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { legacyStateHash } from '../../tests/golden/legacy_hash.mjs';
import { statwalkDetail } from '../lib/statwalk.mjs';
import { simulate } from './g1_core.mjs';
import { firstDivergence, canonicalJSON } from '../lib/records.mjs';

const clone = (v) => JSON.parse(JSON.stringify(v));
export const FIXTURE_FILES = {
  matrix: 'g1_matrix.json', placements: 'g1_placements.json', kinds: 'g1_kinds.json', abilities: 'g1_abilities.json', inputs: 'g1_inputs.json',
};
export const TUPLE_FIELDS = ['winner', 'endReason', 'tick', 'timeMs', 'alive0', 'alive1', 'dead0', 'dead1', 'kills0', 'kills1', 'dmg0', 'dmg1', 'start0', 'start1', 'events'];
export const GROUP_COUNTS = { A: 18, B: 9, C: 8, D: 10, E: 8, F: 19, G: 9, H: 2 };

export const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
/** sha256 of the canonical JSON of each fixture's data: ties a digest record to the exact fixtures it was recorded with. */
export function fixtureHashes(fx) { const o = {}; for (const k of Object.keys(FIXTURE_FILES)) o[k] = sha256(canonicalJSON(fx.records[k].data)); return o; }

// ------------------------------------------------------------------------------------------------------------- tree loading
/** Import the harness of `root` and (regime baked) bake the humanoid clips exactly like src/app/main.js does. One regime per process. */
export async function loadTree(root, regime = 'baked') {
  if (regime !== 'baked' && regime !== 'default_meta') throw new Error("regime must be 'baked' or 'default_meta'");
  const abs = path.resolve(root);
  const imp = (rel) => import(pathToFileURL(path.join(abs, rel)).href);
  const H = await imp('tools/lib/harness.mjs');
  let bake = null;
  if (regime === 'baked') {
    const [Clips, Boot] = await Promise.all([imp('src/anim/clips.js'), imp('src/anim/boot.js')]);
    const humanoid = JSON.parse(fs.readFileSync(path.join(abs, 'assets', 'anim', 'humanoid_clips.json'), 'utf8'));
    bake = Boot.registerAllClips(Clips.ClipLib, { humanoid });
  }
  return { root: abs, regime, H, imp, bake };
}

// ------------------------------------------------------------------------------------------------------------- fixtures
export function readFixtureRecord(file) {
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!rec || typeof rec !== 'object' || !rec.data) throw new Error(`${file}: not a record with data`);
  return rec;
}
export function loadFixtures(dir) {
  const fx = {}, records = {};
  for (const [k, f] of Object.entries(FIXTURE_FILES)) { records[k] = readFixtureRecord(path.join(dir, f)); fx[k] = records[k].data; }
  fx.records = records;
  fx.armies = armiesOf(fx);
  fx.cases = fx.matrix.cases;
  fx.ids = fx.cases.map((c) => c.id);
  fx.core = fx.matrix.core;
  return fx;
}
/** One lookup table of armies { key: {a:[placements], b:[placements]} } over the three army-bearing fixture files. */
export function armiesOf(fx) {
  const m = Object.create(null);
  for (const [k, v] of Object.entries(fx.placements.sets)) m[k] = v;
  for (const [k, v] of Object.entries(fx.kinds.kinds)) m['kind:' + k] = v;
  for (const [k, v] of Object.entries(fx.abilities.abilities)) m['ability:' + k] = v;
  return m;
}

// ------------------------------------------------------------------------------------------------------------- the case runner
/** Build the world of one matrix case (not started). Exported for the Chromium column and the tests. */
export function buildCaseWorld(ctx, fx, spec) {
  const arm = fx.armies[spec.armies];
  if (!arm) throw new Error(`case ${spec.id}: no army set "${spec.armies}" in the fixtures`);
  const w = ctx.H.buildWorld({
    arena: spec.arena, size: spec.size || 'medium', arenaSeed: spec.arenaSeed || 5, seed: spec.seed, rules: clone(spec.rules || {}),
    a: arm.a && arm.a.length ? { placements: clone(arm.a) } : null, b: arm.b && arm.b.length ? { placements: clone(arm.b) } : null, start: false,
  });
  if (spec.inputs) {
    const log = fx.inputs.logs[spec.inputs];
    if (!log) throw new Error(`case ${spec.id}: no input log "${spec.inputs}"`);
    for (const e of log) w.input(e.tick, clone(e.cmd));
  }
  return w;
}

/**
 * Run one case to `ended` or the tick cap (the simulate() of g1_core.mjs on a world built through the harness of `ctx`). opts: { hooks: true } counts ability hooks.
 * -> { digest:{chain,walk,endHash,endWalk,evHash,result}, exercise:{events,launch,inf,hooks?,unknownEvents?}, legacyBad:tick|null, nan, inf, ms }
 */
export function runCase(ctx, fx, spec, opts = {}) {
  const t0 = performance.now();
  const w = buildCaseWorld(ctx, fx, spec);
  const r = simulate(w, spec, fx.matrix.params, fx.matrix.eventFields, { legacyStateHash, statwalkDetail }, opts);
  r.ms = performance.now() - t0;
  return r;
}

/** Two digests of one case -> the failures, each { label, msg }; empty when equal. `id` only names the case in messages. */
export function compareDigest(id, exp, act) {
  const out = [];
  const add = (label, msg) => out.push({ label, msg: `${id}: ${msg}` });
  const dc = firstDivergence(exp.chain, act.chain);
  if (dc) add('g1/chain', `legacy-hash chain diverges at tick ${dc.tick} (${dc.reason}: expected ${dc.a}, got ${dc.b})`);
  else if (exp.endHash !== act.endHash) add('g1/chain', `legacy hash at the end of the battle (tick ${act.result[2]}) differs: expected ${exp.endHash}, got ${act.endHash}`);
  const dw = firstDivergence(exp.walk, act.walk, { every: 300, first: 300 });
  if (dw) add('g1/walk', `statwalk witness diverges at tick ${dw.tick} (${dw.reason}: expected ${dw.a}, got ${dw.b})`);
  else if (exp.endWalk !== act.endWalk) add('g1/walk', `statwalk at the end of the battle (tick ${act.result[2]}) differs: expected ${exp.endWalk}, got ${act.endWalk}`);
  if (exp.evHash !== act.evHash) add('g1/evhash', `event hash differs: expected ${exp.evHash}, got ${act.evHash} (events ${exp.result[14]} vs ${act.result[14]})`);
  const names = [];
  for (let i = 0; i < TUPLE_FIELDS.length; i++) if (exp.result[i] !== act.result[i]) names.push(`${TUPLE_FIELDS[i]} ${exp.result[i]} -> ${act.result[i]}`);
  if (names.length || exp.result.length !== act.result.length) add('g1/tuple', `result tuple differs: ${names.join(', ') || 'length'}`);
  if (out.length) out.unshift({ label: 'g1/digest_equal', msg: `${id}: digest differs from the baseline record (${out.map((o) => o.label.slice(3)).join(', ')})` });
  return out;
}

/** Stored digest sanity: sample counts follow from the end tick, so a record with samples deleted or added cannot hide a divergence. */
export function digestShapeProblems(id, d, params) {
  const p = [];
  if (!d || typeof d !== 'object') return [`${id}: digest missing`];
  const tick = d.result && d.result[2];
  if (!Array.isArray(d.result) || d.result.length !== TUPLE_FIELDS.length) p.push(`${id}: result tuple must have ${TUPLE_FIELDS.length} fields`);
  if (!Number.isInteger(tick) || tick < 1) p.push(`${id}: end tick missing`);
  else {
    if (!Array.isArray(d.chain) || d.chain.length !== Math.floor(tick / params.chainEvery)) p.push(`${id}: chain has ${d.chain && d.chain.length} samples, expected ${Math.floor(tick / params.chainEvery)} for end tick ${tick}`);
    if (!Array.isArray(d.walk) || d.walk.length !== Math.floor(tick / params.walkEvery)) p.push(`${id}: walk has ${d.walk && d.walk.length} samples, expected ${Math.floor(tick / params.walkEvery)} for end tick ${tick}`);
  }
  for (const k of ['endHash', 'endWalk', 'evHash']) if (!Number.isInteger(d[k]) || d[k] < 0 || d[k] > 4294967295) p.push(`${id}: ${k} is not a uint32`);
  return p;
}

/** Cases of a mode: 'core' (the 12 of the matrix), 'full' (all), or an explicit id list. */
export function selectCases(fx, mode, only) {
  if (only && only.length) {
    const miss = only.filter((i) => !fx.ids.includes(i));
    if (miss.length) throw new Error('unknown case id(s): ' + miss.join(', '));
    return fx.cases.filter((c) => only.includes(c.id));
  }
  return mode === 'core' ? fx.cases.filter((c) => fx.core.includes(c.id)) : fx.cases.slice();
}
