// GATE-T05: tools/gate.mjs end to end on a scratch project (copy of the gate, a handful of tiny tests): flags, exit codes, snapshot, lanes, cache hit/miss/poison,
// serial retry-alone, criteria merge, logs. Nothing here touches the real tree's caches: every VW_* variable is stripped from the children.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { criterion } from '../lib/criteria.mjs';
import { treeHash } from '../../tools/lib/snapshot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const c = criterion('GATE-T05', { er: 'gate', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T05.mjs', text: 'gate CLI: exit codes, flags, snapshot, cache hit/miss/poison, serial retry, criteria merge, logs' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-gatecli-'));
const mini = path.join(tmp, 'mini');
const w = (rel, text) => { const f = path.join(mini, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const rm = (rel) => fs.rmSync(path.join(mini, rel), { force: true });

// scratch project: the gate and its libraries, the criteria client, the syntax fixtures, node_modules linked
for (const f of ['gate.mjs']) { fs.mkdirSync(path.join(mini, 'tools/lib'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'tools', f), path.join(mini, 'tools', f)); }
for (const f of ['lanes', 'snapshot', 'syntax', 'gate_cache', 'criteria_merge', 'size_budget', 'paths']) fs.copyFileSync(path.join(ROOT, `tools/lib/${f}.mjs`), path.join(mini, `tools/lib/${f}.mjs`));
fs.mkdirSync(path.join(mini, 'tests/lib'), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'tests/lib/criteria.mjs'), path.join(mini, 'tests/lib/criteria.mjs'));
fs.cpSync(path.join(ROOT, 'tests/fixtures/syntax_bad'), path.join(mini, 'tests/fixtures/syntax_bad'), { recursive: true });
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(mini, 'node_modules'));
fs.mkdirSync(path.join(mini, 'src/content/era_ancient'), { recursive: true });
w('package.json', '{"name":"mini","type":"module"}\n'); w('src/content/era_ancient/x.js', 'export const x = 1;\n');
w('tests/helpers/lib.mjs', 'export const v = 1;\n');
w('tests/ok.test.mjs', "import { criterion } from '../tests/lib/criteria.mjs';\nconst c = criterion('MINI-OK', { er: 'ER0', tier: 'T-fast' });\nc.check('one', true); c.assert.equal(2, 2);\nconsole.log('ok');\n");
w('tests/dep.test.mjs', "import { v } from './helpers/lib.mjs';\nif (v !== 1) process.exit(1);\nconsole.log('dep', v);\n");
w('tests/bad.test.mjs', "console.log('  FAIL something is wrong -> {\"x\":1}');\nconsole.log('line 2'); process.exit(1);\n");

const cleanEnv = () => { const e = { ...process.env }; for (const k of Object.keys(e)) if (k.startsWith('VW_')) delete e[k]; return e; };
const gate = (args, env = {}) => {
  if (!args.some((a) => a.startsWith('--tier') || a === '--fast' || a === '--help' || a === '--bogus')) args = ['--tier=fast', ...args];   // 'full' verifies ~10% of cache hits by tree hash; tests that need that pick the tree on purpose
  const r = spawnSync('node', ['tools/gate.mjs', ...args], { cwd: mini, encoding: 'utf8', env: { ...cleanEnv(), ...env }, timeout: 120000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), r };
};
const last = () => JSON.parse(fs.readFileSync(path.join(mini, '.cache/gate/last.json'), 'utf8'));
const lines = () => fs.readFileSync(path.join(mini, '.cache/gate/gate_log.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// usage errors: exit 2 and a message, nothing runs
for (const [args, re] of [[['--bogus'], /unknown flag/], [['--tier=nope'], /--tier must be/], [['--era=medieval'], /unknown era 'medieval'/], [['--jobs=0'], /--jobs/], [['--serial=x'], /--serial/]]) {
  const r = gate(args);
  c.check('usage_exit_2:' + args[0], r.code === 2 && re.test(r.out), r.out.slice(0, 160));
}
const help = gate(['--help']);
c.check('help_exit_0', help.code === 0 && /--tier=fast\|era\|full\|release/.test(help.out) && /--verify-cache/.test(help.out) && /--steps/.test(help.out));

// 1. a red test: exit 1, the failure excerpt names the failing line, the other tests still ran, a snapshot was made, logs written
let r = gate(['--steps=tests', '--jobs=2', '--no-cache']);
c.check('red_exit_1', r.code === 1 && /GATE FAILED \(1\): tests\/bad\.test\.mjs/.test(r.out), r.out.slice(-400));
c.check('red_excerpt_has_failure_line', /FAIL something is wrong/.test(r.out));
let L = last();
c.check('others_ran', L.tests.n === 3 && L.tests.passed === 2 && L.tests.failed === 1, JSON.stringify(L.tests));
const snaps = fs.readdirSync(path.join(mini, '.cache/snap')).filter((n) => /^[0-9a-f]{64}$/.test(n));
c.check('snapshot_made_and_named_by_tree_hash', snaps.length === 1 && snaps[0] === L.treeHash, snaps.join());
c.check('log_line_fields', (() => { const g = lines().pop(); return ['id', 'tier', 'era', 'treeHash', 'enqueuedAt', 'startedAt', 'finishedAt', 'wallS', 'cpuS', 'load1Start', 'steps', 'cacheHits', 'cacheVerified', 'red', 'amber'].every((k) => k in g) && g.red[0] === 'tests/bad.test.mjs' && g.tier === 'fast'; })());
const crit = JSON.parse(fs.readFileSync(path.join(mini, '.cache/gate/criteria.json'), 'utf8'));
c.check('criteria_merged', crit.criteria['MINI-OK'] && crit.criteria['MINI-OK'].assertions === 2 && crit.criteria['MINI-OK'].status === 'UNVERIFIED' && /U3|U4/.test(crit.criteria['MINI-OK'].reason) && crit.run.treeHash === L.treeHash, JSON.stringify(crit.criteria));

// 2. drop the red test: green, all executed, tests stored; second run: all cache hits
rm('tests/bad.test.mjs');
r = gate(['--steps=tests', '--jobs=2', '--no-cache']);
c.check('green_exit_0', r.code === 0 && /GATE PASSED/.test(r.out), r.out.slice(-300));
c.check('no_cache_run_executes_everything', last().tests.cacheHits === 0 && last().tests.passed === 2);
r = gate(['--steps=tests', '--jobs=2', '--verbose']);
L = last();
c.check('second_run_all_hits', L.tests.cacheHits === 2 && /HIT\s+tests\/ok\.test\.mjs/.test(r.out) && L.cacheHits === 2, JSON.stringify(L.tests) + r.out.slice(-500));
c.check('criteria_survive_cache_hits', JSON.parse(fs.readFileSync(path.join(mini, '.cache/gate/criteria.json'), 'utf8')).criteria['MINI-OK'].assertions === 2, 'a cached PASS must replay its criteria lines');
// 2b. a later run on the SAME tree adds to the criteria of the earlier one; a changed tree starts afresh
r = gate(['--steps=syntax-nc,syntax']);
const merged = JSON.parse(fs.readFileSync(path.join(mini, '.cache/gate/criteria.json'), 'utf8'));
c.check('criteria_merge_same_tree', r.code === 0 && merged.criteria['MINI-OK'] && merged.run.merged.length >= 2 && merged.run.tiers.length >= 1, JSON.stringify(merged.run));
// 3. a change inside one closure misses exactly that test
w('tests/helpers/lib.mjs', 'export const v = 1; // touched\n');
r = gate(['--steps=tests', '--jobs=2', '--verbose']);
c.check('closure_change_misses_only_dependent', /PASS\s+tests\/dep\.test\.mjs/.test(r.out) && /HIT\s+tests\/ok\.test\.mjs/.test(r.out) && last().tests.cacheHits === 1, r.out.slice(-300));
c.check('criteria_fresh_on_new_tree', JSON.parse(fs.readFileSync(path.join(mini, '.cache/gate/criteria.json'), 'utf8')).run.merged === undefined);
r = gate(['--steps=tests', '--no-cache', '--jobs=2']);
c.check('no_cache_flag', last().tests.cacheHits === 0 && r.code === 0);
r = gate(['--steps=tests', '--jobs=2', '--tier=release']);
c.check('release_tier_never_uses_cache', last().tests.cacheHits === 0 && last().tier === 'release');

// 4. --only filters (legacy meaning: lint + syntax + matching tests only)
r = gate(['--only=ok.test', '--no-cache', '--jobs=1']);
L = last();
c.check('only_filters_tests', L.tests.n === 1 && L.steps.some((s) => s.name === 'tests'), JSON.stringify(L.steps));
c.check('only_runs_syntax_not_build', L.steps.some((s) => s.name === 'syntax' && s.status === 'PASS') && !L.steps.some((s) => ['build', 'contracts', 'size'].includes(s.name)));

// 5. cache poison: an environment-dependent test is cached green; --verify-cache catches it, a plain run serves the stale PASS
rm('tests/ok.test.mjs'); rm('tests/dep.test.mjs');
w('tests/envdep.test.mjs', "if (process.env.POISON) { console.log('  FAIL poisoned'); process.exit(1); }\nconsole.log('clean');\n");
r = gate(['--steps=tests', '--jobs=1']);
c.check('poison_setup_green', r.code === 0 && last().tests.cacheHits === 0);
r = gate(['--steps=tests', '--jobs=1'], { POISON: '1' });
c.check('stale_pass_served_without_verify', r.code === 0 && last().tests.cacheHits === 1, 'documents the limit of import-closure keys');
r = gate(['--steps=tests', '--jobs=1', '--verify-cache'], { POISON: '1' });
c.check('verify_cache_catches_poison', r.code === 1 && /cache-poison/.test(r.out) && last().tests.verified === 1, r.out.slice(-300));

// 5b. full tier verifies a seeded ~10% of the hits on its own, chosen by the tree hash (first 4 hex digits / 65535 < 0.1): pick the tree on purpose
const autoVerify = () => { const h = treeHash(mini).treeHash; return parseInt(h.slice(0, 4), 16) / 65535 < 0.1; };
const nonce = (want) => { for (let n = 0; n < 400; n++) { w('package.json', `{"name":"mini","type":"module","nonce":${n}}\n`); if (autoVerify() === want) return n; } throw new Error('no nonce found'); };
nonce(false);
r = gate(['--steps=tests', '--jobs=1', '--tier=full'], { POISON: '1' });
c.check('full_tier_without_auto_verify_serves_stale_pass', r.code === 0 && last().tests.cacheHits === 1 && last().tests.verified === 0, r.out.slice(-300));
nonce(true);
r = gate(['--steps=tests', '--jobs=1', '--tier=full'], { POISON: '1' });
c.check('full_tier_auto_verify_catches_poison', r.code === 1 && /cache-poison/.test(r.out) && last().tests.verified === 1, r.out.slice(-300));
nonce(false);
// 6. serial lane: a timing test that fails the first time passes alone; with --no-retry-serial it is red
w('tests/timing.test.mjs', "// @serial\nimport fs from 'fs';\nconst m = new URL('../.flaky-marker', import.meta.url);\nif (!fs.existsSync(m)) { fs.writeFileSync(m, '1'); console.log('  FAIL too slow under load'); process.exit(1); }\nconsole.log('fast alone');\n");
rm('tests/envdep.test.mjs');
const marker = () => rm('.flaky-marker');
marker();
r = gate(['--steps=tests', '--jobs=2', '--no-cache']);
L = last();
c.check('serial_retry_alone_green', r.code === 0 && L.tests.retried === 1 && L.testDetail.find((t) => t.name === 'tests/timing.test.mjs').serial === true, r.out.slice(-300));
fs.rmSync(path.join(mini, '.cache/snap'), { recursive: true, force: true });   // the snapshot would otherwise reuse the marker-free copy
marker();
r = gate(['--steps=tests', '--jobs=2', '--no-cache', '--no-retry-serial']);
c.check('no_retry_serial_is_red', r.code === 1 && /tests\/timing\.test\.mjs/.test(r.out) && last().tests.retried === 0, r.out.slice(-300));
c.check('serial_flagged_in_plan', JSON.parse(gate(['--list', '--json', '--steps=tests']).out).serialTests.join() === 'tests/timing.test.mjs');

// 7. --bail and --list
w('tests/bad.test.mjs', "process.exit(1);\n");
r = gate(['--steps=tests', '--jobs=1', '--no-cache', '--bail']);
c.check('bail_stops_scheduling', r.code === 1, r.out.slice(-200));
const plan = JSON.parse(gate(['--list', '--json', '--tier=fast']).out);
c.check('list_json_plan', plan.tier === 'fast' && plan.steps.includes('lint') && plan.steps.includes('syntax') && plan.tests >= 2 && /^[0-9a-f]{64}$/.test(plan.treeHash));
// 8. --json prints one parseable object on stdout, progress on stderr
rm('tests/bad.test.mjs'); rm('tests/timing.test.mjs');
const j = gate(['--steps=syntax-nc,syntax', '--json']);
c.check('json_stdout_object', j.code === 0 && (() => { const o = JSON.parse(j.r.stdout.trim().split('\n').pop()); return o.status === 'PASS' && o.steps.some((s) => s.name === 'syntax' && s.status === 'PASS'); })());
// 9. syntax-nc is a real step: with the six fixtures gone the gate is red
fs.rmSync(path.join(mini, 'tests/fixtures/syntax_bad'), { recursive: true });
const nc = gate(['--steps=syntax-nc']);
c.check('syntax_nc_red_without_fixtures', nc.code === 1 && /syntax-nc/.test(nc.out), nc.out.slice(-200));
// 10. a syntax error in a source file turns the gate red and names the file and line
fs.cpSync(path.join(ROOT, 'tests/fixtures/syntax_bad'), path.join(mini, 'tests/fixtures/syntax_bad'), { recursive: true });
w('src/content/era_ancient/broken.js', 'export const a = 1;\nlet a = 2;\n');
const sx = gate(['--steps=syntax-nc,syntax']);
c.check('syntax_error_is_red', sx.code === 1 && /src\/content\/era_ancient\/broken\.js: 2:/.test(sx.out), sx.out.slice(-300));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`GATE-T05 ok: ${c.assertions} assertions`);
