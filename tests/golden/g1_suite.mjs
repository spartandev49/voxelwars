// G1 sim matrix: the shared body of tests/golden/g1_sim.test.mjs (core 12) and tests/golden/g1_sim_full.slow.test.mjs (all 83); docs/eras/spec/VF.md 3.6.1.
// Runs the cases on THIS tree (the tree this file lives in) and compares them with the digests recorded from the baseline worktree in the same engine and regime:
// chain (legacy stateHash every 100 ticks), walk (statwalk every 300), evHash, the 15-number result tuple. Labels (failure ids of the criterion):
//   g1/digest_equal  any digest of any case differs       g1/chain  g1/walk  g1/evhash  g1/tuple   which part differs, first diverging tick named
//   g1/legacy_hash   legacyStateHash(w) != w.stateHash()  g1/legacy_pin  tests/golden/legacy_hash.mjs is not the frozen v8 text   g1/finite  NaN in the statwalk
//   g1/matrix_shape  g1/fixtures  g1/record  g1/record_shape  g1/exercise   the fixtures and the stored record are what VF 3.6.1 says they are
//   g1/coverage      the whole subset ran (12 for core, 83 for full): a selection that silently shrinks cannot pass
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRecord, assertComparable, canonicalJSON } from '../../tools/lib/records.mjs';
import { loadFixtures, selectCases, compareDigest, digestShapeProblems, fixtureHashes, sha256, FIXTURE_FILES, GROUP_COUNTS } from '../../tools/golden/g1_lib.mjs';
import { runCases } from '../../tools/golden/g1_pool.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const BASELINE_SHA = '4aafd2e3fb83f20e1b19e0db8465c117032ba3b7';
/** sha256 of tests/golden/legacy_hash.mjs as recorded with the baseline (the verbatim v8 World.stateHash body); a change is a golden re-record. */
export const LEGACY_HASH_PIN = '7447c9869e2b4c66c9be5c1231749ddb2a293e91ca77b76059dd51d9e463807a';
export const DIGEST_FILES = { baked: 'g1_digests.node.baked.json', default_meta: 'g1_digests.node.default_meta.json' };

export function parseArgs(argv, dflt) {
  const o = { mode: dflt, regime: 'baked', only: null, jobs: null, quiet: false };
  for (const a of argv) {
    if (a === '--core') o.mode = 'core';
    else if (a === '--full') o.mode = 'full';
    else if (a === '--quiet') o.quiet = true;
    else if (a === '--help' || a === '-h') { o.help = true; }
    else {
      const m = /^--(regime|case|jobs)=(.+)$/.exec(a);
      if (!m) throw new Error('unknown argument: ' + a);
      if (m[1] === 'regime') { if (!DIGEST_FILES[m[2]]) throw new Error('--regime must be baked or default_meta'); o.regime = m[2]; }
      else if (m[1] === 'case') o.only = m[2].split(',').filter(Boolean);
      else { o.jobs = +m[2]; if (!(o.jobs >= 1 && o.jobs <= 4)) throw new Error('--jobs must be 1..4'); }
    }
  }
  return o;
}
export const USAGE = `usage: node <this test> [--core | --full] [--regime=baked|default_meta] [--case=id,id] [--jobs=N] [--quiet]
  --core   the 12 core cases (default for g1_sim.test.mjs)      --full   all 83 cases (default for g1_sim_full.slow.test.mjs)
  --regime which digest record to compare with (baked is canonical; default_meta is for provenance and refactor checks)
  --jobs   worker processes (default 1 for core, 2 for full)   exit: 0 equal, 1 any digest or fixture differs, 2 usage`;

/** Provenance of a golden file: recorded in node from a clean checkout of the baseline commit, never refreshed by a witness (VF-D6). */
function provenance(r) {
  const p = [];
  if (r.sha !== BASELINE_SHA) p.push(`sha ${String(r.sha).slice(0, 10)} is not the baseline`);
  if (r.tag !== 'ancient-v8') p.push('tag ' + r.tag);
  if (r.engine !== 'node') p.push('engine ' + r.engine);
  if (r.dirty !== false) p.push('recorded from a dirty checkout');
  if (r.witness !== undefined || r.staleSince !== undefined) p.push('a golden never carries witness/staleSince');
  return p;
}

/** @param c the criterion handle  @param o parsed options  @returns {Promise<{failures:string[], ran:number, secs:number}>} */
export async function g1Suite(c, o) {
  const t0 = Date.now(), problems = [];
  const bad = (label, msg) => { problems.push(`${label}: ${msg}`); };
  const soft = (label, cond, msg) => { if (!c.soft(label, cond)) bad(label, msg); return !!cond; };

  // ---- the frozen legacy hash
  const legacyText = fs.readFileSync(path.join(HERE, 'legacy_hash.mjs'));
  soft('g1/legacy_pin', sha256(legacyText) === LEGACY_HASH_PIN, 'tests/golden/legacy_hash.mjs is not the frozen v8 World.stateHash text (sha256 differs from the pin)');

  // ---- fixtures and the stored record
  const fx = loadFixtures(HERE);
  const counts = {}; for (const k of fx.cases) counts[k.group] = (counts[k.group] || 0) + 1;
  soft('g1/matrix_shape', Object.keys(GROUP_COUNTS).every((g) => counts[g] === GROUP_COUNTS[g]) && fx.cases.length === 83 && new Set(fx.ids).size === 83, `group sizes ${JSON.stringify(counts)} (expected ${JSON.stringify(GROUP_COUNTS)}, 83 unique ids)`);
  soft('g1/matrix_shape', fx.core.length === 12 && fx.core.every((i) => fx.ids.includes(i)), 'the core subset must be 12 ids of the matrix');
  const missingArmies = fx.cases.filter((k) => !fx.armies[k.armies]).map((k) => k.id), missingLogs = fx.cases.filter((k) => k.inputs && !fx.inputs.logs[k.inputs]).map((k) => k.id);
  soft('g1/fixtures', missingArmies.length === 0 && missingLogs.length === 0, `cases without an army set: ${missingArmies.join(',')}; without an input log: ${missingLogs.join(',')}`);
  soft('g1/fixtures', Object.keys(fx.kinds.kinds).length === 10 && Object.keys(fx.abilities.abilities).length === 27, 'kinds fixture must cover 10 projectile kinds and the abilities fixture 27 abilities');
  const hero = fx.inputs.ids.possess && fx.inputs.ids.possess.hero;
  soft('g1/fixtures', Number.isInteger(hero) && hero > 0 && fx.inputs.logs.possess[0].cmd.unit === hero && fx.inputs.logs.combined.some((e) => e.cmd.unit === fx.inputs.ids.combined.hero), 'the possession logs must name the frozen hero ids');
  for (const [k, f] of Object.entries(FIXTURE_FILES)) {
    const r = fx.records[k], p = validateRecord(r);
    soft('g1/fixtures', p.length === 0 && provenance(r).length === 0, `${f}: not a clean record made from the baseline (${p.concat(provenance(r)).join(', ')})`);
  }

  const file = path.join(HERE, DIGEST_FILES[o.regime]);
  let rec = null;
  try { rec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { bad('g1/record', `${DIGEST_FILES[o.regime]} unreadable: ${e.message}`); c.soft('g1/record', false); }
  if (!rec) return { failures: problems, ran: 0, secs: (Date.now() - t0) / 1000 };
  const rp = validateRecord(rec);
  const pv = provenance(rec);
  if (rec.kind !== 'g1_digests') pv.push('kind ' + rec.kind);
  if (rec.regime !== o.regime) pv.push(`regime ${rec.regime} != ${o.regime}`);
  soft('g1/record', rp.length === 0 && pv.length === 0, `${DIGEST_FILES[o.regime]}: malformed record or not recorded from the clean baseline in engine node (${rp.concat(pv).join(', ')})`);
  try { assertComparable({ engine: 'node', engineVersion: process.version, regime: o.regime }, rec, 'a'); soft('g1/record', true); } catch (e) { soft('g1/record', false, e.message); }
  const fh = fixtureHashes(fx);
  soft('g1/fixtures', Object.keys(fh).every((k) => rec.data.fixtures && rec.data.fixtures[k] === fh[k]), 'the digest record was made with different fixtures than the ones on disk (re-record needs two golden_log entries)');
  const D = rec.data;
  soft('g1/record_shape', canonicalJSON(D.order) === canonicalJSON(fx.ids) && Object.keys(D.cases).length >= 40 && fx.ids.every((i) => D.cases[i]), 'the record must hold a digest for every case of the matrix (>= 40)');
  const shape = []; for (const i of fx.ids) shape.push(...digestShapeProblems(i, D.cases[i], fx.matrix.params));
  soft('g1/record_shape', shape.length === 0, shape.slice(0, 3).join('; '));
  // the recorded runs must have exercised what the case claims (VF 3.6.1 D and E)
  const ex = [];
  for (const k of fx.cases) {
    const e = D.exercise && D.exercise[k.id];
    if (!e) { ex.push(`${k.id}: no exercise record`); continue; }
    if (k.group === 'D' && !(e.launch[k.id.slice(2)] > 0)) ex.push(`${k.id}: no projectile of kind ${k.id.slice(2)} was launched`);
    if (k.group === 'E') { const n = ['onAim', 'onFire', 'onHitDealt'].reduce((s, h) => s + ((e.hooks || {})[`${k.id.slice(2)}:${h}`] || 0), 0); if (!(n > 0)) ex.push(`${k.id}: hook never ran`); }
  }
  soft('g1/exercise', ex.length === 0, ex.slice(0, 3).join('; '));

  // ---- run this tree
  const cases = selectCases(fx, o.mode, o.only), ids = cases.map((k) => k.id);
  if (!o.only) soft('g1/coverage', ids.length === (o.mode === 'core' ? 12 : 83) && ids.every((i) => (o.mode === 'core' ? fx.core : fx.ids).includes(i)), `ran ${ids.length} case(s), the ${o.mode} subset has ${o.mode === 'core' ? 12 : 83}`);
  const jobs = o.jobs || (o.mode === 'full' && !o.only ? 2 : 1);
  const res = await runCases({ root: ROOT, regime: o.regime, fixturesDir: HERE, ids, jobs });
  let diverged = 0;
  for (const id of ids) {
    const r = res.get(id), exp = D.cases[id];
    soft('g1/legacy_hash', r.legacyBad === null, `${id}: legacyStateHash(w) != w.stateHash() at tick ${r.legacyBad} (World.stateHash changed)`);
    soft('g1/finite', r.nan === 0, `${id}: statwalk saw ${r.nan} NaN value(s)`);
    const fails = compareDigest(id, exp, r.digest);
    for (const label of ['g1/digest_equal', 'g1/chain', 'g1/walk', 'g1/evhash', 'g1/tuple']) {
      const f = fails.find((x) => x.label === label);
      soft(label, !f, f && f.msg);
    }
    if (fails.length) diverged++;
  }
  return { failures: problems, ran: ids.length, diverged, secs: (Date.now() - t0) / 1000 };
}

/** Print the outcome the way every test of this repo does (small) and set the exit code. */
export function report(c, out, o) {
  if (out.failures.length) {
    console.error(`FAIL g1 (${o.mode}, ${o.regime}): ${out.failures.length} problem(s), ${out.diverged || 0} of ${out.ran} case(s) diverge`);
    for (const m of out.failures.slice(0, 12)) console.error('  ' + m);
    if (out.failures.length > 12) console.error(`  ... ${out.failures.length - 12} more`);
    process.exitCode = 1;
  } else if (!o.quiet) console.log(`ok g1 (${o.mode}, ${o.regime}): ${out.ran} cases equal the baseline record, ${c.assertions} assertions, ${out.secs.toFixed(1)} s`);
}
