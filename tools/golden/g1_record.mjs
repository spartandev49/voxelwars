// G1 recorder and checker (docs/eras/spec/VF.md 3.6.1): records the sim matrix FROM THE BASELINE worktree (.cache/baseline/ancient-v8, sha 4aafd2e3...),
// never from this tree. Writes the five fixtures and one digest record per regime:
//   tests/golden/g1_matrix.json g1_placements.json g1_kinds.json g1_abilities.json g1_inputs.json
//   tests/golden/g1_digests.node.baked.json  tests/golden/g1_digests.node.default_meta.json
//
// usage: node tools/golden/g1_record.mjs [--worktree=<dir>] [--regime=baked|default_meta|both] [--engine=node|chromium] [--jobs=N] [--only=id,id]
//                                       [--out-dir=<dir>] [--check] [--verbose] [--json] [--help]
//   (default)  record: regenerate the fixtures from the baseline (twice, must be identical), run every case TWICE (pass 1 with the hook counters, pass 2
//              without; the digests must be identical, the legacy hash must equal World.stateHash at every sample, statwalk must see no NaN/Infinity,
//              every projectile kind and every hooking ability must be exercised) and only then write the files. Refuses to run unless the worktree
//              HEAD is the baseline sha. A changed golden is a re-record: it needs two docs/eras/golden_log.md entries (author excluded).
//   --check    run the stored fixtures on the baseline in memory and compare with the stored digests (and the regenerated fixtures with the stored
//              ones); writes nothing. Exit 1 on any difference. (Checking THIS tree against the digests is tests/golden/g1_sim.test.mjs.)
//   --engine=chromium  delegates every other flag to tools/golden/g1_chromium.mjs (core 12 in the baseline's own page under Chromium; --check, --page, --rebuild).
//   --jobs=N   worker processes (default 2; this box has 4 CPUs shared with other agents).   --only=ids  restrict (never writes with --only).
// exit: 0 ok, 1 mismatch / refused, 2 usage
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBaseline, assertBaseline, BASELINE_WORKTREE, BASELINE_TAG } from './baseline.mjs';
import { makeRecord, writeRecord, readRecord, canonicalJSON } from '../lib/records.mjs';
import { makeFixtures } from './g1_fixtures.mjs';
import { FIXTURE_FILES, loadFixtures, selectCases, compareDigest, digestShapeProblems, fixtureHashes, GROUP_COUNTS } from './g1_lib.mjs';
import { runCases } from './g1_pool.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_DIR = path.join(REPO, 'tests', 'golden');
export const digestFile = (dir, engine, regime) => path.join(dir, `g1_digests.${engine}.${regime}.json`);

const kindOfFixture = { matrix: 'g1_matrix', placements: 'g1_placements', kinds: 'g1_kinds', abilities: 'g1_abilities', inputs: 'g1_inputs' };

function usage() {
  return fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
}

/** Regenerate the fixtures from the baseline twice; returns the documents (data only). Throws when the two generations differ. */
async function freshFixtures(wt) {
  const B = await loadBaseline({ worktree: wt, regime: 'baked' });
  const a = await makeFixtures(B), b = await makeFixtures(B);
  for (const k of Object.keys(kindOfFixture)) if (canonicalJSON(a[k]) !== canonicalJSON(b[k])) throw new Error(`fixture ${k} is not deterministic: two generations from the baseline differ`);
  return { B, docs: a };
}
function writeFixtures(dir, docs, B) {
  fs.mkdirSync(dir, { recursive: true });
  for (const k of Object.keys(kindOfFixture)) writeRecord(path.join(dir, FIXTURE_FILES[k]), makeRecord(kindOfFixture[k], docs[k], { engine: 'node', regime: 'baked', root: B.wt, tag: BASELINE_TAG }));
}

/** Pass/fail rules of a recording pass (the things a digest cannot say about itself). Returns problems. */
function auditRun(fx, results) {
  const p = [];
  for (const [id, r] of results) {
    if (r.legacyBad !== null) p.push(`${id}: legacyStateHash != World.stateHash() at tick ${r.legacyBad}`);
    if (r.nan) p.push(`${id}: statwalk saw ${r.nan} NaN value(s) at the end of the battle`);       // Infinity is legitimate state in v8 (unset distances); only NaN is a defect
    p.push(...digestShapeProblems(id, r.digest, fx.matrix.params));
    const spec = fx.cases.find((c) => c.id === id);
    if (spec.group === 'D') {
      const kind = id.slice(2);
      if (!(r.exercise.launch[kind] > 0)) p.push(`${id}: no projectile_launch of kind ${kind}`);
    }
    if (spec.group === 'E') {
      const name = id.slice(2), hooks = r.exercise.hooks || {};
      const n = ['onAim', 'onFire', 'onHitDealt'].reduce((s, h) => s + (hooks[`${name}:${h}`] || 0), 0);
      if (!(n > 0)) p.push(`${id}: the ability's onAim/onFire/onHitDealt hook never ran`);
    }
    const ev = r.exercise.events, need = (type, min) => { if (!((ev[type] || 0) >= min)) p.push(`${id}: expected >= ${min} ${type} event(s), saw ${ev[type] || 0}`); };
    if (spec.group === 'G') {
      if (spec.id !== 'G-orders' && spec.id !== 'G-possess') need('god_power', 1);
      if (spec.id === 'G-possess' || spec.id === 'G-combined') need('possess', 1);
    }
    if (id === 'H-stalemate') { need('stalemate_warning', 1); need('intervention', 1); }
    if (id === 'H-waves') need('wave_spawn', 2);
  }
  return p;
}

async function record(opt) {
  const wt = assertBaseline(opt.worktree);
  const { B, docs } = await freshFixtures(wt);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-g1-'));
  try {
    writeFixtures(tmp, docs, B);
    const fx = loadFixtures(tmp);
    const ids = selectCases(fx, 'full', opt.only).map((c) => c.id);
    const counts = {}; for (const c of fx.cases) counts[c.group] = (counts[c.group] || 0) + 1;
    for (const [g, n] of Object.entries(GROUP_COUNTS)) if (counts[g] !== n) throw new Error(`matrix group ${g} has ${counts[g]} cases, VF 3.6.1 says ${n}`);
    if (fx.cases.length < 40 || new Set(fx.ids).size !== fx.ids.length) throw new Error('the matrix needs >= 40 unique case ids');
    const regimes = opt.regime === 'both' ? ['baked', 'default_meta'] : [opt.regime];
    const outputs = [];
    for (const regime of regimes) {
      const t0 = Date.now();
      const p1 = await runCases({ root: wt, regime, fixturesDir: tmp, ids, jobs: opt.jobs, hooks: true, fork: true });
      const p2 = await runCases({ root: wt, regime, fixturesDir: tmp, ids, jobs: opt.jobs, hooks: false, fork: true });
      const problems = auditRun(fx, p1);
      for (const id of ids) if (canonicalJSON(p1.get(id).digest) !== canonicalJSON(p2.get(id).digest)) problems.push(`${id}: two runs of the baseline disagree (not deterministic, or the hook counters change the run)`);
      if (problems.length) { console.error(`REFUSED ${regime}: ${problems.length} problem(s)\n  ` + problems.slice(0, 12).join('\n  ')); return 1; }
      const data = { params: fx.matrix.params, order: fx.ids, core: fx.core, runs: 2, fixtures: fixtureHashes(fx), cases: {}, exercise: {} };
      for (const id of ids) { data.cases[id] = p1.get(id).digest; data.exercise[id] = p1.get(id).exercise; }
      outputs.push({ regime, data, secs: (Date.now() - t0) / 1000 });
      console.log(`recorded ${regime}: ${ids.length} cases x 2 runs identical in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    if (opt.only) { console.log('--only given: nothing written'); return 0; }
    writeFixtures(opt.outDir, docs, B);
    for (const o of outputs) {
      const file = digestFile(opt.outDir, 'node', o.regime);
      const rec = makeRecord('g1_digests', o.data, { engine: 'node', regime: o.regime, root: B.wt, tag: BASELINE_TAG });
      const { written } = writeRecord(file, rec);
      console.log(`${written ? 'wrote' : 'unchanged'} ${path.relative(REPO, file)} (${Object.keys(o.data.cases).length} digests, ${fs.statSync(file).size} bytes)`);
    }
    return 0;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

async function check(opt) {
  const wt = assertBaseline(opt.worktree);
  let bad = 0;
  const say = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) bad++; };
  // 1. the stored fixtures are what the baseline generates today
  const { docs } = await freshFixtures(wt);
  const stored = loadFixtures(opt.outDir);
  for (const k of Object.keys(kindOfFixture)) say(canonicalJSON(stored.records[k].data) === canonicalJSON(docs[k]), `fixture ${FIXTURE_FILES[k]} equals a fresh generation from the baseline`);
  // 2. the stored digests are what the baseline produces from the stored fixtures
  const regimes = opt.regime === 'both' ? ['baked', 'default_meta'] : [opt.regime];
  const fx = stored, ids = selectCases(fx, 'full', opt.only).map((c) => c.id);
  for (const regime of regimes) {
    const rec = readRecord(digestFile(opt.outDir, 'node', regime));
    const t0 = Date.now();
    const res = await runCases({ root: wt, regime, fixturesDir: opt.outDir, ids, jobs: opt.jobs, hooks: true, fork: true });
    const fails = [];
    for (const id of ids) { const d = rec.data.cases[id]; if (!d) { fails.push(`${id}: not in the record`); continue; } for (const f of compareDigest(id, d, res.get(id).digest)) if (f.label !== 'g1/digest_equal') fails.push(f.msg); }
    const fh = fixtureHashes(fx); for (const k of Object.keys(fh)) if (rec.data.fixtures[k] !== fh[k]) fails.push(`record was made with a different ${FIXTURE_FILES[k]}`);
    say(fails.length === 0, `g1_digests.node.${regime}: ${ids.length} cases equal a fresh baseline run (${((Date.now() - t0) / 1000).toFixed(0)} s)${fails.length ? '\n  ' + fails.slice(0, 8).join('\n  ') : ''}`);
    if (opt.verbose) for (const id of ids) console.log(`  ${id} ${res.get(id).digest.result[2]} ticks ${res.get(id).ms.toFixed(0)} ms`);
  }
  return bad ? 1 : 0;
}

async function main(argv) {
  if (argv.includes('--engine=chromium')) {                       // the Chromium column has its own flags (--page, --rebuild, --timeout-s): hand everything over
    const { main: chromiumMain } = await import('./g1_chromium.mjs');
    return chromiumMain(argv.filter((a) => a !== '--engine=chromium'));
  }
  const opt = { worktree: BASELINE_WORKTREE, regime: 'both', engine: 'node', jobs: 2, only: null, outDir: DEFAULT_DIR, check: false, verbose: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(usage()); return 0; }
    if (a === '--check') { opt.check = true; continue; }
    if (a === '--verbose') { opt.verbose = true; continue; }
    const m = /^--(worktree|regime|engine|jobs|only|out-dir)=(.+)$/.exec(a);
    if (!m) { console.error('unknown argument: ' + a + '\n(see --help)'); return 2; }
    const [, k, v] = m;
    if (k === 'worktree') opt.worktree = path.resolve(v);
    else if (k === 'out-dir') opt.outDir = path.resolve(v);
    else if (k === 'regime') { if (!['baked', 'default_meta', 'both'].includes(v)) { console.error('--regime must be baked, default_meta or both'); return 2; } opt.regime = v; }
    else if (k === 'engine') { if (!['node', 'chromium'].includes(v)) { console.error('--engine must be node or chromium'); return 2; } opt.engine = v; }
    else if (k === 'jobs') { opt.jobs = +v; if (!(opt.jobs >= 1 && opt.jobs <= 4)) { console.error('--jobs must be 1..4'); return 2; } }
    else if (k === 'only') opt.only = v.split(',').filter(Boolean);
  }
  return opt.check ? check(opt) : record(opt);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
