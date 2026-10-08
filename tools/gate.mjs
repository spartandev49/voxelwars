// The gate: lane scheduler (VF 3.8, AR 3.8; owner TOOLS-GATE). `node tools/gate.mjs --help` lists every flag.
//   node tools/gate.mjs --tier=fast          hand-back gate: lint, syntax, ap, gen-check, own-check, unit tests in lanes (closure cache), contracts, private build, size, records
//   node tools/gate.mjs --tier=era --era=X   + browser lane for that era (smoke, modes, ...)
//   node tools/gate.mjs --tier=full          + slow tests, tour, flow, every era   (default when no tier is given: the old unflagged gate)
//   node tools/gate.mjs --tier=release       full without the closure cache + release-only tools
//   node tools/gate.mjs --fast               = --tier=fast (the old flag keeps its meaning); --only=<substr> keeps its meaning (lint + syntax + matching tests only)
//   node tools/gate.mjs --legacy [--fast]    the old sequential gate of release v8, byte for byte (tools/lib/gate_legacy.mjs)
// Exit: 0 green (amber allowed), 1 red, 2 usage error.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runProc, runTasks } from './lib/lanes.mjs';
import { treeHash, makeSnapshot, pruneSnapshots } from './lib/snapshot.mjs';
import { syntaxStep, syntaxNegativeControl, REQUIRED_FIXTURES } from './lib/syntax.mjs';
import { makeIndex, loadFacts, analyzeTest, cacheKey, cacheGet, cachePut, cachePrune, seededSample, makeExternalHasher } from './lib/gate_cache.mjs';
import { readLines, mergeCriteria, writeCriteria } from './lib/criteria_merge.mjs';
import { checkBudget } from './lib/size_budget.mjs';
import { eraDirs } from './lib/paths.mjs';

const SELF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAIN_ROOT = process.env.VW_MAIN_ROOT ? path.resolve(process.env.VW_MAIN_ROOT) : SELF;
const GATE_DIR = process.env.VW_GATE_DIR ? path.resolve(process.env.VW_GATE_DIR) : path.join(MAIN_ROOT, '.cache/gate');
const TIERS = ['fast', 'era', 'full', 'release'];
const SLOW_RE = /slow|fuzz|balance/;
const BUDGET_S = { fast: 240, era: 480, full: 900, release: null };   // VF 3.8.5, idle 4-CPU box
const TIMEOUT = { default: 300000, test: 600000, smoke: 600000, tour: 900000, flow: 900000, modes: 1200000 };

const HELP = `usage: node tools/gate.mjs [flags]
  --tier=fast|era|full|release   which steps run (default full; --fast = --tier=fast)
  --era=<id[,id]|all>            eras in scope, exported to every child as VW_ERA (default all; ids = src/content/era_<id> directories)
  --steps=a,b                    run only these steps (plus what they depend on): lint syntax-nc syntax ap gen-check own-check tests serial contracts build size records
                                 smoke-standalone smoke-fragment tour flow modes campaign_play uiscan pack_check leak_scan negcontrols ...; groups: tests, browser
  --only=<substr>                legacy filter: lint + syntax + only the test files whose path contains <substr>
  --dist=<dir>                   private build/dist directory (default .cache/dist/<gate id>, removed afterwards; an explicit --dist is kept)
  --jobs=N                       CPU lanes of the test pool (default cpus-1 = ${Math.max(1, os.cpus().length - 1)})
  --browsers=N                   concurrent Chromium steps (default 2; each counts as 2 CPU units)
  --serial=parallel|after        timing-sensitive tests: on their own worker beside the pool (default), or alone after the pool drains
  --snapshot / --no-snapshot     run on a content-addressed copy .cache/snap/<treeHash> (default) or on the shared tree
  --no-cache                     ignore the closure cache (always on at --tier=release)
  --verify-cache                 re-run a seeded 10% of the cache hits; a hit that now fails is a red cache-poison (automatic on ~10% of full runs)
  --no-retry-serial              a serial test that fails under load is red at once (default: re-run alone, red only if it fails alone)
  --bail                         stop scheduling after the first failure
  --keep-dist                    keep the private dist directory
  --list                         print the plan (steps, test counts, cacheability) and exit
  --json                         machine-readable result on stdout (progress goes to stderr)
  --verbose                      one line per test
  --legacy                       the old sequential gate
exit: 0 green, 1 red, 2 usage error`;

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
function usage(msg) { console.error(`gate: ${msg}\n\n${HELP}`); process.exit(2); }
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
if (argv.includes('--legacy')) { await import('./lib/gate_legacy.mjs'); await new Promise(() => {}); }   // the legacy script exits the process itself

const opt = { tier: null, era: 'all', steps: null, only: '', dist: null, jobs: Math.max(1, os.cpus().length - 1), browsers: 2, serial: 'parallel', snapshot: true, cache: true, verify: false, retrySerial: true, bail: false, keepDist: false, list: false, json: false, verbose: false };
for (const a of argv) {
  const [k, v] = a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, null];
  switch (k) {
    case '--fast': opt.tier = opt.tier || 'fast'; break;
    case '--tier': if (!TIERS.includes(v)) usage(`--tier must be one of ${TIERS.join('|')}`); opt.tier = v; break;
    case '--era': if (!v) usage('--era needs a value'); opt.era = v; break;
    case '--steps': if (!v) usage('--steps needs a list'); opt.steps = v.split(',').filter(Boolean); break;
    case '--only': opt.only = v || ''; break;
    case '--dist': if (!v) usage('--dist needs a directory'); opt.dist = v; break;
    case '--jobs': if (!(+v >= 1)) usage('--jobs needs a number >= 1'); opt.jobs = +v | 0; break;
    case '--browsers': if (!(+v >= 1)) usage('--browsers needs a number >= 1'); opt.browsers = +v | 0; break;
    case '--serial': if (!['parallel', 'after'].includes(v)) usage('--serial must be parallel|after'); opt.serial = v; break;
    case '--snapshot': opt.snapshot = true; break;
    case '--no-snapshot': opt.snapshot = false; break;
    case '--no-cache': opt.cache = false; break;
    case '--verify-cache': opt.verify = true; break;
    case '--retry-serial': opt.retrySerial = true; break;
    case '--no-retry-serial': opt.retrySerial = false; break;
    case '--bail': opt.bail = true; break;
    case '--keep-dist': opt.keepDist = true; break;
    case '--list': opt.list = true; break;
    case '--json': opt.json = true; break;
    case '--verbose': opt.verbose = true; break;
    default: usage(`unknown flag ${a}`);
  }
}
const onlyFlag = argv.some((a) => a.startsWith('--only='));
if (!opt.tier) opt.tier = 'full';
const tierIx = TIERS.indexOf(opt.tier);
const knownEras = eraDirs(SELF);
const eraList = opt.era === 'all' ? ['all'] : opt.era.split(',');
for (const e of eraList) if (e !== 'all' && !knownEras.includes(e)) usage(`unknown era '${e}' (have: ${knownEras.join(', ') || 'none'})`);
if (eraList.includes('all') && eraList.length > 1) usage("--era: 'all' cannot be combined with ids");
if (opt.tier === 'release') opt.cache = false;

const log = (...a) => (opt.json ? console.error(...a) : console.log(...a));
const say = (s) => log(s);

// ---------------------------------------------------------------- run identity, snapshot
const t0 = Date.now();
const stamp = new Date(t0).toISOString().replace(/[-:T]/g, '').slice(0, 14);
const gateId = `g-${stamp}-${process.pid}`;
const load1Start = os.loadavg()[0];
const cpuTicks = () => { try { const f = fs.readFileSync('/proc/self/stat', 'utf8'); const p = f.slice(f.lastIndexOf(')') + 2).split(' '); return (+p[13] + +p[14]) / 100; } catch { return 0; } };   // cutime + cstime of waited-for children
const cpu0 = cpuTicks();

const th = treeHash(SELF);
let WORK = SELF, snapInfo = null;
if (opt.snapshot && !opt.list) {
  snapInfo = makeSnapshot(SELF, { th, linkRoot: MAIN_ROOT });
  WORK = snapInfo.dir;
}
const rel = (p) => path.relative(WORK, p).split(path.sep).join('/');
const distRel = opt.dist || `.cache/dist/${gateId}`;
const distAbs = path.resolve(WORK, distRel);
const runDir = path.join(GATE_DIR, 'runs', gateId);
const procs = new Set();

const childEnv = {
  VW_ERA: opt.era, VW_GATE_ID: gateId, VW_TIER: opt.tier, VW_DIST: distRel, VW_SNAP: snapInfo ? snapInfo.dir : '', VW_MAIN_ROOT: MAIN_ROOT, VW_GATE_DIR: GATE_DIR, VW_TREEHASH: th.treeHash,
  VW_PAGE_STANDALONE: path.posix.join(distRel, 'voxelwars.html'), VW_PAGE_FRAGMENT: path.posix.join(distRel, 'artifact/index.html'),
};
const stepCritFiles = [];
let procSeq = 0;
const sh = (cmd, args, o = {}) => {
  const env = { ...childEnv, ...(o.env || {}) };
  if (!env.VW_CRITERIA_OUT) { env.VW_CRITERIA_OUT = path.join(runDir, 'crit', `proc-${++procSeq}.jsonl`); stepCritFiles.push(env.VW_CRITERIA_OUT); }
  return runProc(cmd, args, { cwd: WORK, env, timeout: o.timeout || TIMEOUT.default, registry: procs });
};

// ---------------------------------------------------------------- plan
const exists = (p) => fs.existsSync(path.join(WORK, p));
const stepsWanted = opt.steps ? new Set(opt.steps) : null;
const isOnly = onlyFlag && !opt.steps;
const want = (name, groups = []) => {
  if (stepsWanted) return stepsWanted.has(name) || groups.some((g) => stepsWanted.has(g));
  if (isOnly) return ['lint', 'syntax-nc', 'syntax'].includes(name) || groups.includes('tests');
  return true;
};

/** Optional steps are tools owned by other roles; they run once the file exists and are SKIP (visible, counted, with the reason) until then. */
const OPTIONAL = [
  { name: 'ap', file: 'tools/ap_lint.mjs', args: [], tiers: 0, owner: 'TOOLS-GATE' },
  { name: 'own-check', file: 'tools/own_check.mjs', args: ['--any'], tiers: 0, owner: 'TOOLS-GATE' },
  { name: 'records', file: 'tools/records.mjs', args: ['check'], tiers: 0, owner: 'TOOLS-GOLDEN', after: 'build' },
  { name: 'campaign_play', file: 'tools/campaign_play.mjs', args: [], tiers: 1, browser: true, owner: 'TOOLS-VERIFY', after: 'build' },
  { name: 'uiscan', file: 'tools/uiscan.mjs', args: [], tiers: 1, browser: true, owner: 'TOOLS-VERIFY', after: 'build' },
  { name: 'pack_check', file: 'tools/pack_check.mjs', args: [], tiers: 2, owner: 'TOOLS-VERIFY', after: 'build' },
  { name: 'leak_scan', file: 'tools/leak_scan.mjs', args: [], tiers: 2, browser: true, owner: 'TOOLS-VERIFY', after: 'build' },
  { name: 'negcontrols', file: 'tools/negcontrols.mjs', args: ['--sample=10%', '--seed=' + th.treeHash.slice(0, 8)], tiers: 2, owner: 'TOOLS-VERIFY', relArgs: ['--all'], after: 'build' },
  { name: 'readability', file: 'tools/readability.mjs', args: [], tiers: 3, browser: true, owner: 'TOOLS-VERIFY', after: 'build' },
  { name: 'perf_assert', file: 'tools/perf_assert.mjs', args: [], tiers: 3, serial: true, owner: 'TOOLS-VERIFY', after: 'build' },
  { name: 'soak', file: 'tools/soak.mjs', args: [], tiers: 3, serial: true, owner: 'TOOLS-VERIFY', after: 'build' },
];

const tasks = [];
const meta = new Map();          // task id -> {kind, label, test?}
const add = (t, m) => { tasks.push(t); meta.set(t.id, m); };

// A: cheap checks
if (want('lint')) add({ id: 'lint', est: 1, run: async () => procResult(await sh('node', ['tools/lint.mjs', '--quiet'])) }, { kind: 'step', label: 'lint' });
if (want('syntax-nc')) add({ id: 'syntax-nc', est: 1, run: async () => {
  const t = Date.now();
  const nc = await syntaxNegativeControl(path.join(WORK, 'tests/fixtures/syntax_bad'));
  const missing = REQUIRED_FIXTURES.filter((n) => !nc.rejected.some((r) => r.file === n));
  const bad = nc.accepted.length > 0 || missing.length > 0;
  return { status: bad ? 'FAIL' : 'PASS', secs: (Date.now() - t) / 1000, note: `${nc.rejected.length}/${nc.fixtures} bad fixtures rejected`, tail: bad ? `ACCEPTED (the syntax step would miss these): ${nc.accepted.join(' ') || '-'}; missing fixtures: ${missing.join(' ') || '-'}` : '' };
} }, { kind: 'step', label: 'syntax-nc' });
if (want('syntax')) add({ id: 'syntax', deps: want('syntax-nc') ? ['syntax-nc'] : [], est: 2, run: async () => {
  const r = await syntaxStep(WORK);
  return { status: r.bad.length ? 'FAIL' : 'PASS', secs: r.ms / 1000, note: `${r.files} files`, tail: r.bad.slice(0, 20).map((b) => `${b.file}: ${b.error}`).join('\n') };
} }, { kind: 'step', label: 'syntax' });
if (want('gen-check')) add({ id: 'gen-check', est: 2, run: async () => procResult(await sh('node', ['tools/gen-registry.mjs', '--check'])) }, { kind: 'step', label: 'gen-check' });

// optional tools (ap, own-check, records, ...)
for (const o of OPTIONAL) {
  if (!want(o.name, o.browser ? ['browser'] : [])) continue;
  if (tierIx < o.tiers && !stepsWanted) continue;
  const present = exists(o.file);
  const dep = o.after && want(o.after) ? [o.after] : [];
  add({
    id: o.name, deps: dep, browser: !!o.browser, weight: o.browser ? 2 : 1, group: o.serial ? 'serial' : undefined, est: o.browser ? 60 : 5,
    run: async () => {
      if (!present) return { status: 'SKIP', reason: `${o.file} not built yet (owner ${o.owner})` };
      const args = [o.file, ...(opt.tier === 'release' && o.relArgs ? o.relArgs : o.args)];
      return procResult(await sh('node', args, { timeout: TIMEOUT.modes }));
    },
  }, { kind: 'step', label: o.name });
}

// C: contracts, build, size
if (want('contracts')) add({ id: 'contracts', est: 3, run: async () => procResult(await sh('node', ['tools/contracts.mjs', '--strict'])) }, { kind: 'step', label: 'contracts' });
const hasApp = exists('src/app/main.js');
const browserWanted = tierIx >= 1 || (stepsWanted && ['smoke-standalone', 'smoke-fragment', 'tour', 'flow', 'modes', 'browser'].some((s) => stepsWanted.has(s)));
const needBuild = hasApp && !isOnly && (want('build') || want('size') || browserWanted || OPTIONAL.some((o) => want(o.name) && o.after === 'build' && (tierIx >= o.tiers || stepsWanted)));
if (needBuild) {
  add({ id: 'build', est: 6, weight: 1, run: async () => procResult(await sh('node', ['tools/build.mjs', '--minify', `--out=${distRel}`, '--report', '--quiet'], { timeout: TIMEOUT.default })) }, { kind: 'step', label: 'build' });
  add({ id: 'size', deps: ['build'], est: 1, run: async () => {
    const t = Date.now();
    let rep; try { rep = JSON.parse(fs.readFileSync(path.join(distAbs, 'report/bytes.json'), 'utf8')); } catch (e) { return { status: 'FAIL', reason: 'no byte report: ' + e.message }; }
    const histFile = path.join(GATE_DIR, 'bytes.json');
    let hist = []; try { hist = JSON.parse(fs.readFileSync(histFile, 'utf8')).history || []; } catch { /* first run */ }
    const prev = [...hist].reverse().find((h) => h.minified === rep.minified && h.treeHash !== th.treeHash) || null;
    const b = checkBudget(rep, prev);
    const row = { treeHash: th.treeHash, at: new Date().toISOString(), minified: rep.minified, fragmentBytes: rep.fragmentBytes, standaloneBytes: rep.standaloneBytes, publishedFiles: rep.publishedFiles, families: rep.families.map((f) => [f.family, f.raw]) };
    if (!hist.length || hist[hist.length - 1].treeHash !== th.treeHash) { hist.push(row); hist = hist.slice(-60); atomicWrite(histFile, JSON.stringify({ schema: 1, history: hist }, null, 0) + '\n'); }
    const bad = b.checks.filter((c) => !c.ok);
    return { status: b.status, secs: (Date.now() - t) / 1000, note: `fragment ${rep.fragmentBytes} B, ${rep.publishedFiles + 1} published files`, tail: bad.map((c) => `${c.level}: ${c.msg}`).join('\n') };
  } }, { kind: 'step', label: 'size' });
}

// B: tests
const testFiles = [];
(function walk(d) { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.test\.mjs$/.test(e.name)) testFiles.push(rel(p)); } })(path.join(WORK, 'tests'));
testFiles.sort();
const slowIncluded = tierIx >= 2;
const serialOnly = !!stepsWanted && stepsWanted.has('serial') && !stepsWanted.has('tests');
let selectedTests = want('tests', ['tests', 'serial']) ? testFiles.filter((f) => (!opt.only || f.includes(opt.only)) && (slowIncluded || !SLOW_RE.test(f))) : [];
if (serialOnly) selectedTests = selectedTests.filter((f) => /\.serial\.test\.mjs$/.test(f) || /^\s*\/\/\s*@serial\b/m.test(fs.readFileSync(path.join(WORK, f), 'utf8')));
let analyses = new Map(), index = null;
const timesFile = path.join(GATE_DIR, 'test_times.json');
let times = {}; try { times = JSON.parse(fs.readFileSync(timesFile, 'utf8')); } catch { /* none yet */ }
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
if (selectedTests.length) {
  index = makeIndex(th.files);   // a snapshot holds exactly the files of this tree hash
  const facts = await loadFacts(WORK, th.files, path.join(GATE_DIR, 'facts.json'));
  for (const f of selectedTests) analyses.set(f, analyzeTest(f, index, facts, fs.readFileSync(path.join(WORK, f), 'utf8')));
}
const erasHelperSha = exists('tests/_eras.mjs') ? crypto.createHash('sha256').update(fs.readFileSync(path.join(WORK, 'tests/_eras.mjs'))).digest('hex') : '-';
const cacheDir = path.join(GATE_DIR, 'cache');
const cacheCtx = { nodeVersion: process.version, era: opt.era, erasHelperSha, externalHash: makeExternalHasher(MAIN_ROOT) };
const verifyAuto = opt.tier === 'full' && parseInt(th.treeHash.slice(0, 4), 16) / 65535 < 0.1;
const keys = new Map(), hitsInitial = [];
for (const f of selectedTests) {
  const a = analyses.get(f);
  const k = cacheKey(a, index, cacheCtx);
  keys.set(f, k);
  if (opt.cache && k && cacheGet(cacheDir, k)) hitsInitial.push(f);
}
const verifySet = new Set((opt.verify || verifyAuto) && opt.cache ? seededSample(hitsInitial, 0.1, th.treeHash) : []);
const isSerialTest = (f, a) => /\.serial\.test\.mjs$/.test(f) || a.why.includes('@serial');
const critDir = path.join(runDir, 'crit');
fs.mkdirSync(critDir, { recursive: true });
let nTest = 0;
// a hung page must not eat the full 600 s: with history the limit is 6x the median runtime (at least 90 s); the timed-out test is re-run alone before it counts as red
const testTimeout = (f) => { const m = median(times[f] || []); return m ? Math.min(TIMEOUT.test, Math.max(90000, Math.round(m * 6000))) : TIMEOUT.test; };
for (const f of selectedTests) {
  const a = analyses.get(f), k = keys.get(f), idx = nTest++;
  const serial = isSerialTest(f, a);
  const est = median(times[f] || []) || 25;
  add({
    id: 'test:' + f, group: serial ? 'serial' : undefined, retryAlone: serial && opt.retrySerial, retryOnTimeout: opt.retrySerial, weight: a.browser ? 2 : 1, est,
    run: async (ctx = {}) => {
      const hit = opt.cache && k && !ctx.alone ? cacheGet(cacheDir, k) : null;
      if (hit && !verifySet.has(f)) return { status: 'PASS', secs: 0, cached: true, savedSecs: hit.secs || 0, criteria: (hit.criteria || []).map((l) => ({ ...l, cached: true })) };
      const critFile = path.join(critDir, `${idx}${ctx.alone ? 'a' : ''}.jsonl`);
      const r = await sh('node', [f], { timeout: testTimeout(f), env: { VW_CRITERIA_OUT: critFile } });
      const criteria = readLines(critFile);
      let status = r.code === 0 ? 'PASS' : 'FAIL';
      const out = { status, secs: r.secs, tail: status === 'FAIL' ? r.tail : '', hits: status === 'FAIL' ? r.hits : [], criteria, timedOut: r.timedOut };
      if (hit && verifySet.has(f)) { out.verified = true; if (status === 'FAIL') { out.status = 'FAIL'; out.reason = `cache-poison: stored PASS for key ${k.slice(0, 12)} but the test fails now`; } }
      if (status === 'PASS' && k) cachePut(cacheDir, k, { status: 'PASS', test: f, secs: r.secs, at: new Date().toISOString(), treeHash: th.treeHash, criteria });
      return out;
    },
  }, { kind: 'test', label: f, serial, cacheable: a.cacheable });
}

// D: browser lane (existing real-build checks)
if (hasApp && !isOnly) {
  const BROWSER = [
    { name: 'smoke-standalone', args: ['tools/smoke.mjs', '--battle=6', `--page=${path.posix.join(distRel, 'voxelwars.html')}`], tiers: 1, timeout: TIMEOUT.smoke, est: 35 },
    { name: 'smoke-fragment', args: ['tools/smoke.mjs', `--page=${path.posix.join(distRel, 'artifact/index.html')}`, '--battle=6'], tiers: 1, timeout: TIMEOUT.smoke, est: 35 },
    { name: 'tour', args: ['tools/tour.mjs', `--page=${path.posix.join(distRel, 'voxelwars.html')}`], tiers: 2, timeout: TIMEOUT.tour, est: 35 },
    { name: 'flow', args: ['tools/flow.mjs', `--page=${path.posix.join(distRel, 'voxelwars.html')}`], tiers: 2, timeout: TIMEOUT.flow, est: 50 },
    { name: 'modes', args: ['tools/modes.mjs', `--page=${path.posix.join(distRel, 'voxelwars.html')}`], tiers: 1, timeout: TIMEOUT.modes, est: 227 },
  ];
  for (const b of BROWSER) {
    if (!want(b.name, ['browser'])) continue;
    if (!stepsWanted && tierIx < b.tiers) continue;
    add({ id: b.name, deps: ['build'], browser: true, weight: 2, est: b.est, run: async () => procResult(await sh('node', b.args, { timeout: b.timeout })) }, { kind: 'step', label: b.name });
  }
}

// make sure every dependency of a selected task is itself in the plan (e.g. --steps=size pulls build in)
for (const t of tasks) t.deps = (t.deps || []).filter((d) => tasks.some((x) => x.id === d));

if (opt.list) {
  const plan = { tier: opt.tier, era: opt.era, jobs: opt.jobs, steps: tasks.filter((t) => meta.get(t.id).kind === 'step').map((t) => t.id), tests: selectedTests.length, serialTests: [...meta.values()].filter((m) => m.kind === 'test' && m.serial).map((m) => m.label), cacheable: [...meta.values()].filter((m) => m.kind === 'test' && m.cacheable).length, cacheHits: hitsInitial.length, treeHash: th.treeHash };
  if (opt.json) console.log(JSON.stringify(plan)); else { console.log(`plan tier=${plan.tier} era=${plan.era} tree=${plan.treeHash.slice(0, 12)}\nsteps: ${plan.steps.join(' ')}\ntests: ${plan.tests} (${plan.cacheable} cacheable, ${plan.cacheHits} cache hits now, ${plan.serialTests.length} serial: ${plan.serialTests.join(' ')})`); }
  process.exit(0);
}

// ---------------------------------------------------------------- run
function procResult(r) { return { status: r.code === 0 ? 'PASS' : 'FAIL', secs: r.secs, tail: r.code === 0 ? '' : r.tail, hits: r.code === 0 ? [] : r.hits, timedOut: r.timedOut }; }
const excerpt = (r) => { const t = (r.tail || '').split('\n').slice(-25); const h = (r.hits || []).filter((l) => !t.includes(l)); return (h.length ? 'failure lines:\n' + h.join('\n') + '\n--- last lines:\n' : '') + t.join('\n'); };
function atomicWrite(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = file + '.tmp-' + process.pid; fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); }

const cleanup = () => {
  for (const c of procs) { try { process.kill(-c.pid, 'SIGKILL'); } catch { try { c.kill('SIGKILL'); } catch { /* gone */ } } }
  if (!opt.keepDist && !opt.dist) { try { fs.rmSync(distAbs, { recursive: true, force: true }); } catch { /* ignore */ } }
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); console.error(`gate: ${sig}, children killed`); process.exit(130); });

say(`gate ${gateId} tier=${opt.tier} era=${opt.era} jobs=${opt.jobs}${opt.tier !== 'fast' ? ` browsers=${opt.browsers}` : ''} tree=${th.treeHash.slice(0, 12)}${snapInfo ? ` snapshot=${snapInfo.reused ? 'reused' : `created ${snapInfo.files} files ${(snapInfo.bytes / 1048576).toFixed(1)} MB ${snapInfo.ms} ms`}` : ' (shared tree, no snapshot)'} load=${load1Start.toFixed(2)}`);

const startedAt = new Date().toISOString();
const onDone = (t, r) => {
  const m = meta.get(t.id);
  if (m.kind === 'test') { if (r.status === 'FAIL') say(`FAIL  ${m.label}  (${(r.secs || 0).toFixed(1)}s)${r.reason ? '  ' + r.reason : ''}`); else if (opt.verbose) say(`${r.cached ? 'HIT ' : 'PASS'}  ${m.label}  (${(r.secs || 0).toFixed(1)}s)`); return; }
  say(`${r.status.padEnd(5)} ${m.label}  (${(r.secs || 0).toFixed(1)}s)${r.note ? '  ' + r.note : ''}${r.reason ? '  ' + r.reason : ''}`);
};
const results = await runTasks(tasks, { jobs: opt.jobs, browsers: opt.browsers, serialMode: opt.serial, bail: opt.bail, onDone });

// ---------------------------------------------------------------- report
const finishedAt = new Date().toISOString();
const wallS = +((Date.now() - t0) / 1000).toFixed(1);
const stepRows = [], testRows = [];
for (const t of tasks) {
  const m = meta.get(t.id), r = results.get(t.id);
  if (m.kind === 'step') stepRows.push({ name: m.label, s: +(r.secs || 0).toFixed(1), status: r.status, ...(r.note ? { note: r.note } : {}), ...(r.reason ? { reason: r.reason } : {}), ...(r.tail && r.status !== 'PASS' ? { tail: excerpt(r) } : {}) });
  else testRows.push({ name: m.label, s: +(r.secs || 0).toFixed(1), status: r.status, cached: !!r.cached, serial: m.serial, retried: !!r.retried, verified: !!r.verified, ...(r.reason ? { reason: r.reason } : {}), ...(r.status === 'FAIL' ? { tail: excerpt(r) } : {}) });
}
const tFail = testRows.filter((r) => r.status === 'FAIL'), tRun = testRows.filter((r) => !r.cached);
const tests = { n: testRows.length, passed: testRows.filter((r) => r.status === 'PASS').length, failed: tFail.length, cacheHits: testRows.filter((r) => r.cached).length, verified: testRows.filter((r) => r.verified).length, retried: testRows.filter((r) => r.retried).length, uncacheable: [...meta.values()].filter((m) => m.kind === 'test' && !m.cacheable).length, savedS: +testRows.filter((r) => r.cached).reduce((a, r) => a + ((results.get('test:' + r.name) || {}).savedSecs || 0), 0).toFixed(1), slowest: tRun.slice().sort((a, b) => b.s - a.s).slice(0, 5).map((r) => `${r.name} ${r.s}s`) };
const stepFail = stepRows.filter((r) => r.status === 'FAIL');
const amber = stepRows.filter((r) => r.status === 'AMBER').map((r) => r.name);
const red = [...stepFail.map((r) => r.name), ...tFail.map((r) => r.name)];
const skipped = stepRows.filter((r) => r.status === 'SKIP').map((r) => r.name);

// test times (median of the last 5 real runs)
for (const r of testRows) if (!r.cached && r.status === 'PASS') times[r.name] = [...(times[r.name] || []), r.s].slice(-5);
atomicWrite(timesFile, JSON.stringify(times));

// criteria
const critLines = [];
for (const t of tasks) { const r = results.get(t.id); if (meta.get(t.id).kind === 'test' && r && r.criteria) critLines.push(...r.criteria); }
for (const f of stepCritFiles) critLines.push(...readLines(f));
let negStore = {}; try { negStore = JSON.parse(fs.readFileSync(path.join(GATE_DIR, 'negctl.json'), 'utf8')); } catch { /* none yet */ }
const run = { id: gateId, tier: opt.tier, era: opt.era, treeHash: th.treeHash, startedAt, node: process.versions.node, box: { cpus: os.cpus().length, load1: +load1Start.toFixed(2) }, steps: opt.steps || null };
{
  const critFile = path.join(GATE_DIR, 'criteria.json');
  const doc = mergeCriteria(critLines, { root: WORK, negctlStore: negStore, run });
  // a run on the SAME tree hash adds to the previous one (T-fast, then T-full: one merged evidence set, VF 3.4); another tree starts afresh
  try {
    const old = JSON.parse(fs.readFileSync(critFile, 'utf8'));
    if (old && old.run && old.run.treeHash === th.treeHash) { doc.criteria = { ...old.criteria, ...doc.criteria }; doc.run.merged = [...(old.run.merged || [old.run.id]), gateId]; doc.run.tiers = [...new Set([...(old.run.tiers || [old.run.tier]), opt.tier])]; }
  } catch { /* none yet */ }
  writeCriteria(critFile, doc);
}

const cpuS = +(cpuTicks() - cpu0).toFixed(1);
const taskS = +[...results.values()].reduce((a, r) => a + (r.secs || 0), 0).toFixed(1);
const overBudget = BUDGET_S[opt.tier] ? wallS > BUDGET_S[opt.tier] : false;
const green = red.length === 0;
const logLine = { id: gateId, tier: opt.tier, era: opt.era, treeHash: th.treeHash, enqueuedAt: startedAt, startedAt, finishedAt, wallS, cpuS, taskS, load1Start: +load1Start.toFixed(2), load1End: +os.loadavg()[0].toFixed(2), jobs: opt.jobs, peak: results.peak, snapshot: snapInfo ? { reused: snapInfo.reused, ms: snapInfo.ms } : null, budgetS: BUDGET_S[opt.tier], overBudget, steps: stepRows.map((r) => ({ name: r.name, s: r.s, status: r.status })).concat([{ name: 'tests', s: +tRun.reduce((a, r) => a + r.s, 0).toFixed(1), status: tests.n === 0 ? 'SKIP' : tests.failed ? 'FAIL' : 'PASS' }]), tests, cacheHits: tests.cacheHits, cacheVerified: tests.verified, red, amber, skipped, status: green ? 'PASS' : 'FAIL' };
fs.mkdirSync(GATE_DIR, { recursive: true });
fs.appendFileSync(path.join(GATE_DIR, 'gate_log.jsonl'), JSON.stringify(logLine) + '\n');
atomicWrite(path.join(GATE_DIR, 'last.json'), JSON.stringify({ ...logLine, stepDetail: stepRows, testDetail: testRows }, null, 1) + '\n');

// human output
for (const r of stepRows.filter((x) => x.status === 'FAIL' && x.tail)) say(`--- ${r.name} (last lines)\n${r.tail}`);
for (const r of tFail) say(`--- ${r.name} (last lines)${r.reason ? ' ' + r.reason : ''}\n${r.tail}`);
say(`tests: ${tests.passed}/${tests.n} pass (${tests.cacheHits} cache hits${tests.verified ? `, ${tests.verified} verified` : ''}${tests.retried ? `, ${tests.retried} re-run alone` : ''}${tests.uncacheable ? `, ${tests.uncacheable} uncacheable` : ''}; slowest: ${tests.slowest.slice(0, 3).join(', ') || '-'})`);
say(`wall ${wallS}s (cpu ${cpuS}s, peak ${results.peak.cpu} units / ${results.peak.procs} procs, load ${load1Start.toFixed(2)} -> ${os.loadavg()[0].toFixed(2)})${overBudget ? `  OVER the ${BUDGET_S[opt.tier]}s ${opt.tier} budget (budget is for an idle 4-CPU box)` : ''}`);
if (amber.length) say(`AMBER: ${amber.join(', ')}`);
if (skipped.length) say(`SKIP (tool not built yet): ${skipped.join(', ')}`);
say(green ? 'GATE PASSED' : `GATE FAILED (${red.length}): ${red.slice(0, 8).join(', ')}${red.length > 8 ? ', ...' : ''}`);
if (opt.json) console.log(JSON.stringify(logLine));

cleanup();
try {
  pruneSnapshots({ keep: 4, protect: [WORK] }); cachePrune(cacheDir);
  const runsDir = path.join(GATE_DIR, 'runs');
  for (const d of fs.existsSync(runsDir) ? fs.readdirSync(runsDir) : []) { const p = path.join(runsDir, d); if (Date.now() - fs.statSync(p).mtimeMs > 86400000) fs.rmSync(p, { recursive: true, force: true }); }
} catch { /* housekeeping only */ }
process.exit(green ? 0 : 1);
