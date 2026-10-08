// Feasibility recorder (docs/eras/spec/VF.md 3.7, RP0 "Ancient feasibility under regime baked from the baseline worktree"): fights the scripted reference players of the
// campaign (counter, greedy, turtle and the star-hunting thrifty / melee / raid / expert variants of tests/campaign/run_feasibility.mjs) against the Ancient missions in the
// real sim and writes the NEW-STYLE record tests/campaign/feasibility.ancient.json through tools/lib/records.mjs makeRecord (kind `feasibility`, engineHash/eraHash instead of
// the old `sim` string). The battle list (mission, bot, number of seeds) is taken from the legacy record so the re-take measures the SAME battles under the other regime.
//   data = { version: 2, legacy: '<file>', seedsFrom: 1, workarounds: [..], runs: {<mission>: {hash, bots: {<bot>: {n, wins, rate, starHits, avgWinT, budget, hash, perSeed:[[win,t,stars]..]}}}},
//            battles: [{id: '<mission>/<bot>/<seed>', tuple: [win, endTick, stars, endDigest]}..] }       (battles = the witness-refresh sample space, records.mjs selectWitnessSample)
// The battles run through the baseline's OWN tests/campaign/_lib.mjs (buildMissionWorld, so the harness workaround of its line 12 applies, exactly as for the legacy
// record; it is listed in `workarounds` and in tests/baseline/harness_workarounds.json), after registerAllClips (regime baked). Every (mission, bot) job runs in its own
// process, TWICE (two fresh processes), and the record is written only when both runs agree battle for battle (VF 3.6 rule 2). At most --jobs processes at a time.
//
// usage: node tools/feasibility_record.mjs [--worktree=<dir>] [--out=<file>] [--legacy=<file>] [--regime=baked|default_meta] [--jobs=2] [--once] [--only=<mission,..>] [--dry] [--check] [--help]
//   --worktree  default .cache/baseline/ancient-v8 (HEAD must be the baseline commit 4aafd2e3...)
//   --legacy    battle list source (default tests/campaign/feasibility.v8.json, else tests/campaign/feasibility.json)
//   --once      run every job once (development; a record is NEVER written from a single run)
//   --only      limit to some missions (development; never written)
//   --dry       measure and print the band table, write nothing
//   --check     measure again and compare with the committed record (exit 1 on any battle that differs)
//   --jobs      parallel processes (default 2; the box has 4 CPUs shared with other agents)
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertBaseline, BASELINE_WORKTREE, BASELINE_SHA, BASELINE_TAG } from './golden/baseline.mjs';
import { openTree } from './golden/tree.mjs';
import { makeRecord, writeRecord, readRecord, canonicalJSON } from './lib/records.mjs';
import { fingerprint } from './lib/fingerprint.mjs';
import { ROOT } from './lib/paths.mjs';
import { legacyStateHash } from '../tests/golden/legacy_hash.mjs';

export const FEAS_OUT = path.join(ROOT, 'tests', 'campaign', 'feasibility.ancient.json');
export const LEGACY_V8 = path.join(ROOT, 'tests', 'campaign', 'feasibility.v8.json');
export const LEGACY_OLD = path.join(ROOT, 'tests', 'campaign', 'feasibility.json');
export const WORKAROUNDS = ['trojan_horse.siege=false (tests/campaign/_lib.mjs:12, SIM bug docs/requests/campaign_sim_bugs.md #1)'];
const HELP = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');

/** The campaign harness of a tree (its own tests/campaign/_lib.mjs, workaround included) after the regime's clip baking: { T, L, C }. */
export async function loadHarness(root, regime) {
  const T = await openTree(root, { regime });
  return { T, L: await T.imp('tests/campaign/_lib.mjs'), C: await T.imp('src/content/era_ancient/campaign.js') };
}
/** One battle (mission, bot, seed) exactly as the feasibility bots fight it (run_feasibility.mjs: thrifty = par budget + god powers, expert = counter + god powers). */
export function battleOf(H, missionId, bot, seed) {
  const { L, C } = H, m = L.MISSIONS.find((x) => x.id === missionId);
  if (!m) throw new Error('unknown mission ' + missionId);
  const mm = bot === 'thrifty' ? Object.assign({}, m, { budget: m.par || Math.round(m.budget * 0.75) }) : m;
  const powers = bot === 'thrifty' || bot === 'expert', kind = powers ? 'counter' : bot;
  const { w, rt } = L.buildMissionWorld(mm, kind, seed, { powers });
  const maxT = (mm.timeLimit || 360) + 40;
  while (w.state !== 'ended' && w.time < maxT) w.tick();
  if (w.state !== 'ended') w.end(-1, 'time');
  const summary = C.battleSummary(w, mm, rt.tracker), ev = C.evaluateStars(mm, summary);
  rt.destroy();
  return { win: !!summary.win, t: w.time, stars: ev.stars, earned: ev.earned, tickN: w.tickN, end: legacyStateHash(w), hash: C.missionHash(m), budget: mm.budget };
}
/** The witness tuple of a battle row: [win, endTick, stars, endDigest] (records.mjs selectWitnessSample / refreshRecord). */
export const tupleOf = (b) => [b.win ? 1 : 0, b.tickN, b.stars, b.end];

/** One (mission, bot) job in the current process: seeds 1..n. -> {id, bot, n, hash, budget, battles:[{win, t, stars, earned, tickN, end}]} */
export async function runJob(worktree, regime, missionId, bot, n) {
  const H = await loadHarness(worktree, regime), battles = [];
  let hash = null, budget = null;
  for (let seed = 1; seed <= n; seed++) { const b = battleOf(H, missionId, bot, seed); hash = b.hash; budget = b.budget; battles.push({ win: b.win, t: b.t, stars: b.stars, earned: b.earned, tickN: b.tickN, end: b.end }); }
  return { id: missionId, bot, n, hash, budget, battles };
}

/** Legacy file -> the job list [{id, bot, n}] in legacy order, and the mission order. */
export function jobsFromLegacy(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8')), jobs = [];
  for (const [id, r] of Object.entries(j.runs)) for (const [bot, b] of Object.entries(r.bots)) jobs.push({ id, bot, n: b.n });
  return jobs;
}

/** Aggregate job results into the `runs` block of the record (legacy field names) and the `battles` list. */
export function assemble(results) {
  const runs = {}, battles = [];
  for (const r of results) {
    const run = runs[r.id] || (runs[r.id] = { hash: r.hash, bots: {} });
    const wins = r.battles.filter((b) => b.win), starHits = [0, 1, 2].map((k) => r.battles.filter((b) => b.earned[k]).length);
    run.bots[r.bot] = { n: r.n, wins: wins.length, rate: wins.length / r.n, starHits, avgWinT: wins.length ? wins.reduce((a, b) => a + b.t, 0) / wins.length : 0, budget: r.budget, hash: r.hash,
      perSeed: r.battles.map((b) => [b.win ? 1 : 0, +b.t.toFixed(1), b.stars]) };
    r.battles.forEach((b, i) => battles.push({ id: `${r.id}/${r.bot}/${i + 1}`, tuple: [b.win ? 1 : 0, b.tickN, b.stars, b.end] }));
  }
  return { runs, battles };
}

/** Band table of an assembled record against the mission data of the tree: [{mission, bot, rate, band:[lo,hi], ok}] for counter / greedy / turtle. */
export async function bandRows(worktree, runs) {
  const C = await (await openTree(worktree, { regime: null })).imp('src/content/era_ancient/campaign.js');
  const rows = [];
  for (const m of C.MISSIONS) for (const bot of ['counter', 'greedy', 'turtle']) {
    const b = runs[m.id] && runs[m.id].bots[bot]; if (!b) continue;
    const [lo, hi] = m.bots[bot];
    rows.push({ mission: m.id, bot, wins: b.wins, n: b.n, rate: b.rate, band: [lo, hi], ok: b.rate >= lo - 1e-9 && b.rate <= hi + 1e-9 });
  }
  return rows;
}

function runChild(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), ...args], { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let err = ''; p.stderr.on('data', (d) => { err += d; }); p.stdout.on('data', () => {});
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`child ${args.join(' ')} exited ${code}: ${err.trim().split('\n').slice(-3).join(' | ')}`))));
  });
}
async function pool(tasks, jobs, onDone) {
  let next = 0, failed = null;
  const worker = async () => { while (!failed) { const i = next++; if (i >= tasks.length) return; try { await tasks[i](); onDone && onDone(i); } catch (e) { failed = e; } } };
  await Promise.all(Array.from({ length: jobs }, worker));
  if (failed) throw failed;
}

export async function main(argv) {
  const o = { worktree: BASELINE_WORKTREE, out: FEAS_OUT, legacy: fs.existsSync(LEGACY_V8) ? LEGACY_V8 : LEGACY_OLD, regime: 'baked', jobs: 2, once: false, only: null, dry: false, check: false, job: null, emit: null };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    if (a === '--once') { o.once = true; continue; } if (a === '--dry') { o.dry = true; continue; } if (a === '--check') { o.check = true; continue; }
    const m = /^--(worktree|out|legacy|regime|jobs|only|job|emit)=(.+)$/.exec(a);
    if (!m) { console.error('unknown argument: ' + a + '\n(see --help)'); return 2; }
    const [, k, v] = m;
    if (k === 'worktree' || k === 'out' || k === 'legacy') o[k] = path.resolve(v); else if (k === 'jobs') o.jobs = Math.max(1, Math.min(4, +v | 0)); else if (k === 'only') o.only = v.split(',');
    else if (k === 'regime') { if (v !== 'baked' && v !== 'default_meta') { console.error('--regime must be baked or default_meta'); return 2; } o.regime = v; } else o[k] = v;
  }
  if (o.job) {                                   // child: one job -> JSON file
    const [id, bot, n] = o.job.split(':');
    assertBaseline(o.worktree);
    const r = await runJob(o.worktree, o.regime, id, bot, +n);
    fs.writeFileSync(o.emit, canonicalJSON(r) + '\n');
    return 0;
  }
  try { assertBaseline(o.worktree); } catch (e) { console.error('feasibility_record: refusing to run: ' + e.message); return 1; }
  try { os.setPriority(0, 10); } catch { /* not allowed */ }
  let jobs = jobsFromLegacy(o.legacy);
  if (o.only) jobs = jobs.filter((j) => o.only.includes(j.id));
  if (!jobs.length) { console.error('no jobs'); return 2; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-feas-')), passes = o.once ? 1 : 2, t0 = Date.now();
  const total = jobs.reduce((s, j) => s + j.n, 0);
  console.log(`[feas] ${jobs.length} jobs, ${total} battles x ${passes} pass(es), regime ${o.regime}, ${o.jobs} process(es), legacy list ${path.relative(ROOT, o.legacy)}`);
  try {
    const tasks = [];
    for (let pass = 0; pass < passes; pass++) for (const j of jobs) tasks.push(() => runChild([`--job=${j.id}:${j.bot}:${j.n}`, `--emit=${path.join(tmp, `${pass}-${j.id}-${j.bot}.json`)}`, `--worktree=${o.worktree}`, `--regime=${o.regime}`]));
    let done = 0;
    await pool(tasks, o.jobs, () => { done++; if (done % 6 === 0 || done === tasks.length) console.log(`[feas] ${done}/${tasks.length} job runs done (${((Date.now() - t0) / 1000).toFixed(0)} s)`); });
    const read = (pass) => jobs.map((j) => JSON.parse(fs.readFileSync(path.join(tmp, `${pass}-${j.id}-${j.bot}.json`), 'utf8')));
    const A = read(0);
    if (!o.once) {
      const B = read(1), bad = jobs.filter((j, i) => canonicalJSON(A[i]) !== canonicalJSON(B[i]));
      if (bad.length) { console.error(`feasibility_record: REFUSING to write: two runs disagree for ${bad.map((j) => j.id + '/' + j.bot).join(', ')}`); return 1; }
    }
    const { runs, battles } = assemble(A);
    const rows = await bandRows(o.worktree, runs);
    console.log('[feas] bands (counter / greedy / turtle) under regime ' + o.regime + ':');
    for (const r of rows) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.mission.padEnd(20)} ${r.bot.padEnd(7)} ${String(r.wins).padStart(2)}/${r.n} = ${Math.round(r.rate * 100)}%  band ${Math.round(r.band[0] * 100)}-${Math.round(r.band[1] * 100)}%`);
    const failing = rows.filter((r) => !r.ok);
    console.log(`[feas] ${battles.length} battles; ${rows.length - failing.length}/${rows.length} bands hold${failing.length ? '; FAILING bands are REPORTED, not fixed (VF 3.7 RP0): ' + failing.map((r) => r.mission + '/' + r.bot).join(', ') : ''}`);
    const data = { version: 2, legacy: path.basename(o.legacy), seedsFrom: 1, workarounds: WORKAROUNDS, runs, battles };
    if (o.check) {
      const want = readRecord(o.out);
      const same = canonicalJSON(want.data) === canonicalJSON(data) && want.regime === o.regime;
      console.log(`${same ? 'PASS' : 'FAIL'} feasibility ${path.relative(ROOT, o.out)} ${same ? 'equals' : 'DIFFERS from'} a fresh measurement`);
      return same ? 0 : 1;
    }
    if (o.dry || o.once || o.only) { console.log('[feas] nothing written (' + (o.dry ? '--dry' : o.once ? '--once' : '--only') + ')'); return 0; }
    const rec = makeRecord('feasibility', data, { engine: 'node', regime: o.regime, root: o.worktree, tag: BASELINE_TAG, fingerprint: fingerprint(o.worktree, ['ancient']) });
    if (rec.sha !== BASELINE_SHA) throw new Error('record sha is not the baseline sha');
    const { written } = writeRecord(o.out, rec);
    console.log(`[feas] ${written ? 'wrote' : 'unchanged'} ${path.relative(ROOT, o.out)} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    return 0;
  } catch (e) { console.error('feasibility_record: ' + (e && e.message)); return 1; }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
