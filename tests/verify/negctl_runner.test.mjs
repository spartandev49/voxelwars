// VF-T14: the negative-control runner (tools/negcontrols.mjs + tools/lib/negctl.mjs; docs/eras/spec/VF.md 3.13 and 4 row VF-T14).
// Five synthetic checks on a scratch project: green -> red, stayed-green, wrong-red, baseline-red, in-place write; then the store aggregation rule,
// the tier/needs/availability rules, deterministic sampling (always adding changed scripts), `--draw`, and the CLI end to end (exit codes 0 / 1 / 2).
// Labels: classify_*, hardlink_safety (NC-VF-71), barred_edits, snapshot_untouched, aggregate_*, select_*, cli_*.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { treeHash } from '../../tools/lib/snapshot.mjs';
import { runControl, select, shuffle, recordResult, readStore, isStale, loadControls, lintControls, validateControl, classify, runPool } from '../../tools/lib/negctl.mjs';

const c = criterion('VF-T14', {
  er: ['gate'], owner: 'TOOLS-VERIFY', tier: 'T-fast', negctl: 'tests/negctl/VF-T14.mjs',
  text: 'negcontrols runner: green->red, stayed-green, wrong-red, baseline-red, in-place write; hard-link safety; sample/draw determinism; store aggregation; CLI exit codes',
});
const tmpRoots = [];
const mk = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); tmpRoots.push(d); return d; };
process.on('exit', () => { for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true }); });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const write = (root, rel, text) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };

/** A scratch project: the criteria client plus synthetic checks. Check N registers SYN-N with labels alpha and beta read from tests/syn/flagN.txt. */
function project(n = 1, flags = {}) {
  const root = mk('vw-nc-');
  fs.mkdirSync(path.join(root, 'tests/lib'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'tests/lib/criteria.mjs'), path.join(root, 'tests/lib/criteria.mjs'));
  write(root, 'package.json', '{"name":"scratch","type":"module"}\n');
  for (let i = 1; i <= n; i++) {
    write(root, `tests/syn/check${i}.mjs`, `import fs from 'node:fs';
import { criterion } from '../lib/criteria.mjs';
const c = criterion('SYN-${i}', { er: 'syn', owner: 'T', tier: 'T-fast', text: 'synthetic' });
const flag = fs.readFileSync(new URL('./flag${i}.txt', import.meta.url), 'utf8');
c.soft('alpha', !flag.includes('red-a'));
c.soft('beta', !flag.includes('red-b'));
c.soft('plain', true);
`);
    write(root, `tests/syn/flag${i}.txt`, flags[i] || 'green\n');
    write(root, `tests/syn/other${i}.txt`, 'x\n');
  }
  return root;
}
const ctl = (n, over = {}) => {
  const nc = { id: `NC-SYN-${n}`, criterion: `SYN-${n}`, expectRed: [`SYN-${n}/alpha`], alsoRed: [], tier: 'T-fast', needs: [], costS: 2, run: ['node', `tests/syn/check${n}.mjs`], mutate(m) { m.edit(`tests/syn/flag${n}.txt`, /green/, 'red-a'); }, ...over };
  return { stem: nc.criterion, file: `tests/negctl/${nc.criterion}.mjs`, hash: crypto.createHash('sha256').update(nc.id).digest('hex'), nc, errors: [] };
};
const opts = (root, extra = {}) => ({ srcDir: root, treeHash: 'scratch', workBase: path.join(root, '.cache/negctl-test'), mainRoot: root, gateDir: path.join(root, '.cache/gate'), ...extra });

let bad = 0;
try {
  // ---- the five synthetic checks
  {
    const root = project(1, { 1: 'green\n' });
    const before = sha(path.join(root, 'tests/syn/flag1.txt'));
    const r1 = await runControl(ctl(1), opts(root));
    c.soft('classify_red_as_expected', r1.result === 'red-as-expected' && r1.failed.join() === 'SYN-1/alpha' && !r1.missing.length && !r1.extra.length, JSON.stringify(r1));
    c.soft('snapshot_untouched', sha(path.join(root, 'tests/syn/flag1.txt')) === before, 'the source file changed');
    const r2 = await runControl(ctl(1, { id: 'NC-SYN-1-vac', mutate(m) { m.edit('tests/syn/other1.txt', /x/, 'y'); } }), opts(root));
    c.soft('classify_stayed_green', r2.result === 'stayed-green' && !r2.failed.length && r2.missing.join() === 'SYN-1/alpha', JSON.stringify(r2));
    const r3 = await runControl(ctl(1, { id: 'NC-SYN-1-wrong', mutate(m) { m.edit('tests/syn/flag1.txt', /green/, 'red-b'); } }), opts(root));
    c.soft('classify_wrong_red', r3.result === 'wrong-red' && r3.failed.join() === 'SYN-1/beta' && r3.extra.join() === 'SYN-1/beta' && r3.missing.join() === 'SYN-1/alpha', JSON.stringify(r3));
    const r3b = await runControl(ctl(1, { id: 'NC-SYN-1-also', alsoRed: ['SYN-1/beta'], mutate(m) { m.edit('tests/syn/flag1.txt', /green/, 'red-a red-b'); } }), opts(root));
    const r3c = await runControl(ctl(1, { id: 'NC-SYN-1-noalso', mutate(m) { m.edit('tests/syn/flag1.txt', /green/, 'red-a red-b'); } }), opts(root));
    c.soft('classify_also_red', r3b.result === 'red-as-expected' && r3c.result === 'wrong-red' && r3c.extra.join() === 'SYN-1/beta', JSON.stringify([r3b.result, r3c.result, r3c.extra]));
    const bl = project(1, { 1: 'red-a\n' });
    const r4 = await runControl(ctl(1, { mutate(m) { m.edit('tests/syn/other1.txt', /x/, 'y'); } }), opts(bl));
    c.soft('classify_baseline_red', r4.result === 'baseline-red' && r4.failed.join() === 'SYN-1/alpha' && /before any mutation/.test(r4.detail), JSON.stringify(r4));
    const r4b = await runControl(ctl(1, { criterion: 'SYN-9', expectRed: ['SYN-9/alpha'] }), opts(root));
    c.soft('baseline_red_when_criterion_not_registered', r4b.result === 'baseline-red' && /not registered/.test(r4b.detail), r4b.detail);
    // unit rule of the classifier, independent of any process
    const k = (F, st = 0, crashed = false) => classify({ expectRed: ['A/x'], alsoRed: ['A/y'] }, new Set(F), { status: st, crashed }).result;
    c.soft('classify_rules', k(['A/x']) === 'red-as-expected' && k(['A/x', 'A/y']) === 'red-as-expected' && k([]) === 'stayed-green' && k(['A/z']) === 'wrong-red' && k(['A/x', 'A/z']) === 'wrong-red' && k([], 1, true) === 'wrong-red', 'rules');
  }
  // ---- in-place writes can never reach the snapshot (NC-VF-71 allows them and must turn this label red)
  {
    const root = project(1);
    const file = path.join(root, 'tests/syn/flag1.txt');
    const before = sha(file);
    const r = await runControl(ctl(1, { id: 'NC-SYN-1-inplace', mutate(m) { fs.writeFileSync(path.join(m.dir, 'tests/syn/flag1.txt'), 'red-a\n'); } }), opts(root));
    const r2 = await runControl(ctl(1, { id: 'NC-SYN-1-inplace2', mutate(m) { const fd = fs.openSync(path.join(m.dir, 'tests/syn/flag1.txt'), 'r+'); fs.writeSync(fd, 'red-a'); fs.closeSync(fd); } }), opts(root));
    const r3 = await runControl(ctl(1, { id: 'NC-SYN-1-append', mutate(m) { fs.appendFileSync(path.join(m.dir, 'tests/syn/flag1.txt'), 'red-a\n'); } }), opts(root));
    c.soft('hardlink_safety', r.result === 'error' && /in-place/.test(r.detail) && r2.result === 'error' && r3.result === 'error' && sha(file) === before, JSON.stringify([r.result, r.detail, r2.result, r3.result]) + ' sha ' + (sha(file) === before));
    // the stat-signature backstop: a child process that bypasses the JS guard is still detected
    const root2 = project(1);
    const r4 = await runControl(ctl(1, { id: 'NC-SYN-1-shell', mutate(m) { spawnSync('sh', ['-c', 'echo red-a >> tests/syn/flag1.txt'], { cwd: m.dir }); } }), opts(root2));
    c.soft('hardlink_backstop', r4.result === 'error' && /frozen snapshot/.test(r4.detail), JSON.stringify([r4.result, r4.detail]));
    // c.edit replaces the link: the source keeps its inode and bytes while the copy changes
    const ino = fs.statSync(file).ino;
    await runControl(ctl(1), opts(root));
    c.soft('edit_replaces_link', fs.statSync(file).ino === ino && sha(file) === before, 'edit touched the source inode');
  }
  // ---- barred edits and bad mutations
  {
    const root = project(1);
    write(root, 'tests/negctl/SYN-1.mjs', 'export default {};\n');
    write(root, 'tests/baseline/limit.json', '{"max":1}\n');
    const attempt = async (mutate, over = {}) => runControl(ctl(1, { id: 'NC-SYN-1-barred', mutate, ...over }), opts(root));
    const own = await attempt((m) => m.edit('tests/syn/check1.mjs', /alpha/, 'zzz'));
    const neg = await attempt((m) => m.edit('tests/negctl/SYN-1.mjs', /export/, 'export'));
    const thr = await attempt((m) => m.edit('tests/baseline/limit.json', /1/, '9'));
    const thrOk = await attempt((m) => { m.edit('tests/baseline/limit.json', /1/, '9'); m.edit('tests/syn/flag1.txt', /green/, 'red-a'); }, { mayEdit: ['tests/baseline/limit.json'] });
    const outside = await attempt((m) => m.write('../escape.txt', 'x'));
    const linked = await attempt((m) => m.write('node_modules/x.js', 'x'));
    const noop = await attempt((m) => m.edit('tests/syn/flag1.txt', /nothing-matches/, 'z'));
    const asyncMut = await attempt(async () => {});
    const e = (r, re) => r.result === 'error' && re.test(r.detail);
    c.soft('barred_edits', e(own, /own script/) && e(neg, /may not edit tests\/negctl/) && e(thr, /threshold|baselines/) && thrOk.result === 'red-as-expected' && e(outside, /outside the copy/) && e(linked, /symlinked/) && e(noop, /changed nothing/) && e(asyncMut, /synchronous/),
      JSON.stringify([own, neg, thr, thrOk, outside, linked, noop, asyncMut].map((r) => [r.result, (r.detail || '').slice(0, 60)])));
    c.soft('remove_and_pad', (await attempt((m) => { m.pad('tests/syn/other1.txt', 40); m.write('tests/syn/new.txt', 'n'); m.remove('tests/syn/new.txt'); m.edit('tests/syn/flag1.txt', /green/, 'red-a'); })).result === 'red-as-expected' && !fs.existsSync(path.join(root, 'tests/syn/new.txt')));
    const un = await runControl(ctl(1, { needs: ['baseline'] }), opts(root));
    c.soft('unavailable_need', un.result === 'unavailable' && /baseline/.test(un.detail), JSON.stringify(un));
  }
  // ---- the store: aggregate result of a criterion needs every one of its control files fresh
  {
    const root = project(1);
    const store = path.join(root, 'neg.json');
    const A = ctl(1, { id: 'NC-A' }), B = ctl(1, { id: 'NC-B' });
    A.stem = 'SYN-1'; B.stem = 'SYN-1-b'; B.file = 'tests/negctl/SYN-1-b.mjs';
    const all = [A, B];
    const res = (cc, h, result = 'red-as-expected') => ({ id: cc.nc.id, criterion: 'SYN-1', file: cc.file, result, treeHash: 't', scriptHash: h, negctlHash: cc.hash, mutationHash: 'm', secs: 1, at: 'now', failed: [], missing: [], extra: [] });
    recordResult(store, res(A, 'h1'), all, { 'SYN-1': 'h1' });
    let s = readStore(store);
    c.soft('aggregate_incomplete_until_all_controls_ran', s['SYN-1'].result === 'incomplete' && s['SYN-1'].pending.join() === 'NC-B', JSON.stringify(s['SYN-1'].pending));
    recordResult(store, res(B, 'h1'), all, { 'SYN-1': 'h1' });
    s = readStore(store);
    c.soft('aggregate_red_when_all_fresh', s['SYN-1'].result === 'red-as-expected' && !s['SYN-1'].pending && Object.keys(s['SYN-1'].controls).length === 2);
    recordResult(store, res(A, 'h2'), all, { 'SYN-1': 'h2' });
    s = readStore(store);
    c.soft('aggregate_script_change_invalidates', s['SYN-1'].result === 'incomplete' && s['SYN-1'].pending.join() === 'NC-B', JSON.stringify(s['SYN-1']));
    recordResult(store, res(B, 'h2', 'stayed-green'), all, { 'SYN-1': 'h2' });
    s = readStore(store);
    c.soft('aggregate_worst_result_wins', s['SYN-1'].result === 'stayed-green', s['SYN-1'].result);
    c.soft('stale_detection', isStale(A, s, 'h3') && !isStale(A, s, 'h2') && isStale({ ...A, hash: 'changed' }, s, 'h2') && isStale(ctl(2), s, 'x'), 'isStale');
    // the entry shape the gate's merge reads: {result, scriptHash}
    c.soft('store_shape_for_merge', typeof s['SYN-1'].scriptHash === 'string' && typeof s['SYN-1'].result === 'string');
  }
  // ---- selection
  {
    const many = Array.from({ length: 40 }, (_, i) => ctl(1, { id: `NC-${String(i).padStart(2, '0')}`, tier: i < 25 ? 'T-fast' : i < 35 ? 'T-full' : 'release' }));
    many.forEach((m, i) => { m.stem = `S${i}`; });
    const ids = (arr) => arr.map((x) => x.nc.id);
    const fresh = {}; for (const m of many) fresh[m.nc.criterion] = { controls: { ...(fresh[m.nc.criterion] ? fresh[m.nc.criterion].controls : {}), [m.nc.id]: { scriptHash: 'h', negctlHash: m.hash } } };
    const sel = (seed, extra = {}) => ids(select(many, { mode: 'sample', frac: 0.1, seed, store: fresh, scriptHashOf: () => 'h', ...extra }));
    const a = sel('abc'), b = sel('abc'), d = sel('abd');
    c.soft('select_deterministic_per_seed', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(d), a.join() + ' / ' + d.join());
    c.soft('select_sample_size_and_tier_cap', a.length === Math.ceil(0.1 * 35) && a.every((x) => Number(x.slice(3)) < 35), `n=${a.length}`);
    c.soft('select_sample_tier_option', sel('abc', { tierMax: 'T-fast' }).every((x) => Number(x.slice(3)) < 25) && sel('abc', { tierMax: 'T-fast' }).length === 3);
    const staleStore = JSON.parse(JSON.stringify(fresh)); staleStore.SYN_X = {};
    const target = many[7]; staleStore[target.nc.criterion].controls[target.nc.id].scriptHash = 'old';
    const forced = ids(select(many, { mode: 'sample', frac: 0.1, seed: 'abc', store: staleStore, scriptHashOf: () => 'h' }));
    const unseeded = ids(select(many, { mode: 'sample', frac: 0.1, seed: 'abc', store: { }, scriptHashOf: () => 'h' }));
    c.soft('select_always_adds_changed_scripts', forced.includes(target.nc.id) && forced.length >= a.length && unseeded.length === 35, `${forced.length} ${unseeded.length}`);
    const dr = ids(select(many, { mode: 'draw', count: 8, seed: '42' }));
    c.soft('select_draw_eight_distinct', dr.length === 8 && new Set(dr).size === 8 && JSON.stringify(dr) === JSON.stringify(ids(select(many, { mode: 'draw', count: 8, seed: '42' }))) && JSON.stringify(dr) !== JSON.stringify(ids(select(many, { mode: 'draw', count: 8, seed: '43' }))));
    let threw = false; try { select(many, { mode: 'draw', count: 99, seed: '1' }); } catch { threw = true; }
    c.soft('select_draw_too_many_throws', threw);
    c.soft('select_id_forms', ids(select(many, { mode: 'id', ids: ['NC-03'] })).join() === 'NC-03' && ids(select(many, { mode: 'id', ids: ['S3'] })).join() === 'NC-03' && select(many, { mode: 'id', ids: ['SYN-1'] }).length === 40);
    c.soft('shuffle_is_a_permutation', JSON.stringify([...shuffle([1, 2, 3, 4, 5, 6, 7, 8], 's')].sort()) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]));
  }
  // ---- the pool honours the chromium cap and runs a `quiet` control alone
  {
    const mkc = (id, needs, costS) => ({ nc: { id, criterion: id, needs, costS } });
    let live = 0, maxLive = 0, chrome = 0, maxChrome = 0, quietWith = 0;
    const items = [mkc('a', ['chromium'], 9), mkc('b', ['chromium'], 8), mkc('c', ['chromium'], 7), mkc('d', [], 3), mkc('e', [], 2), mkc('q', ['quiet'], 1)];
    const out = await runPool(items, {
      jobs: 4, chromiumMax: 2,
      run: async (it) => {
        live++; maxLive = Math.max(maxLive, live); if (it.nc.needs.includes('chromium')) { chrome++; maxChrome = Math.max(maxChrome, chrome); }
        if (it.nc.id === 'q' && live > 1) quietWith++;
        await new Promise((res) => setTimeout(res, 40));
        live--; if (it.nc.needs.includes('chromium')) chrome--;
        return { id: it.nc.id, criterion: it.nc.id, result: 'red-as-expected', failed: [], missing: [], extra: [], secs: 0 };
      },
    });
    c.soft('pool_chromium_cap_and_quiet_alone', out.length === 6 && maxChrome === 2 && maxLive <= 4 && quietWith === 0, `chrome ${maxChrome} live ${maxLive} quietWith ${quietWith}`);
  }
  // ---- control file validation and lint
  {
    const ok = { id: 'NC-X', criterion: 'X-1', expectRed: ['X-1/a'], tier: 'T-fast', run: ['node', 'a.mjs'], mutate() {} };
    c.soft('validate_control', validateControl(ok, 'X-1').length === 0 && validateControl({ ...ok, expectRed: ['Y/a'] }, 'X-1').length === 1 && validateControl(ok, 'Z-9').length === 1 && validateControl({ ...ok, tier: 'soon' }, 'X-1').length === 1 && validateControl({ ...ok, needs: ['gpu'] }, 'X-1').length === 1 && validateControl({ ...ok, run: 'node' }, 'X-1').length === 1 && validateControl({ ...ok, mutate: null }, 'X-1').length === 1);
    const root = project(2);
    write(root, 'tests/negctl/SYN-1.mjs', `export default ${JSON.stringify({ id: 'NC-SYN-1', criterion: 'SYN-1', expectRed: ['SYN-1/alpha'], run: ['node', 'tests/syn/check1.mjs'] })};\n`);
    const loaded = await loadControls(root);
    const manifest = { criteria: [{ id: 'SYN-1', file: 'tests/syn/check1.mjs' }, { id: 'SYN-2', file: 'tests/syn/check2.mjs' }] };
    const probs = lintControls(loaded, manifest);
    c.soft('lint_reports_missing_control_and_bad_shape', probs.some((p) => /SYN-2.*no negative control/.test(p)) && probs.some((p) => /mutate/.test(p)), probs.join(' | '));
  }
  // ---- the CLI
  {
    const root = project(10);
    for (let i = 1; i <= 10; i++) {
      const mutate = i === 3 ? "m.edit('tests/syn/other3.txt', /x/, 'y');" : `m.edit('tests/syn/flag${i}.txt', /green/, 'red-a');`;
      write(root, `tests/negctl/SYN-${i}.mjs`, `export default { id: 'NC-SYN-${i}', criterion: 'SYN-${i}', expectRed: ['SYN-${i}/alpha'], alsoRed: [], tier: 'T-fast', needs: [], costS: 2, mutate(m) { ${mutate} }, run: ['node', 'tests/syn/check${i}.mjs'] };\n`);
    }
    const cli = (...args) => spawnSync('node', [path.join(ROOT, 'tools/negcontrols.mjs'), `--root=${root}`, `--gate-dir=${path.join(root, 'gate')}`, ...args], { encoding: 'utf8', env: { ...process.env, VW_GATE_DIR: '', VW_MAIN_ROOT: '' } });
    const help = cli('--help'); c.soft('cli_help', help.status === 0 && /negcontrols/.test(help.stdout) && /--sample/.test(help.stdout));
    const none = cli(); c.soft('cli_usage_exit_2', none.status === 2 && cli('--bogus').status === 2 && cli('--sample=10%').status === 2 && cli('--id=NO-SUCH').status === 2 && cli('--jobs=0', '--all').status === 2, `${none.status}`);
    const one = cli('--id=SYN-1', '--json');
    const j1 = (() => { try { return JSON.parse(one.stdout); } catch { return null; } })();
    c.soft('cli_red_as_expected_exit_0', one.status === 0 && j1 && j1[0].result === 'red-as-expected' && readStore(path.join(root, 'gate/negctl.json'))['SYN-1'].result === 'red-as-expected', one.stdout.slice(0, 200) + one.stderr.slice(0, 200));
    const vac = cli('--id=SYN-3');
    c.soft('cli_vacuous_control_exit_1', vac.status === 1 && /FAIL\s+NC-SYN-3 \(SYN-3\): stayed-green/.test(vac.stdout), vac.stdout);
    c.soft('cli_store_keeps_stayed_green', readStore(path.join(root, 'gate/negctl.json'))['SYN-3'].result === 'stayed-green');
    const dr = cli('--draw=8', '--seed=7'); const dr2 = cli('--draw=8', '--seed=7');
    const lines = dr.stdout.trim().split('\n');
    c.soft('cli_draw_prints_eight_distinct_ids', dr.status === 0 && lines.length === 8 && new Set(lines).size === 8 && dr.stdout === dr2.stdout && lines.every((l) => /^NC-SYN-\d+$/.test(l)), dr.stdout);
    const smp = cli('--sample=30%', '--seed=deadbeef', '--no-store', '--jobs=2');
    c.soft('cli_sample_runs_selection_and_reports', /negcontrols: \d+ control\(s\) of 10/.test(smp.stdout) && /red-as-expected in/.test(smp.stdout), smp.stdout.slice(0, 400));
    const list = cli('--list'); c.soft('cli_list', list.status === 0 && list.stdout.trim().split('\n').length === 10 && /NC-SYN-1 .*red-as-expected/.test(list.stdout), list.stdout.slice(0, 300));
    const lint = cli('--lint'); c.soft('cli_lint_clean', lint.status === 0 && /10 control files, 10 valid, 0 problem/.test(lint.stdout), lint.stdout + lint.stderr);
    write(root, 'tests/negctl/SYN-BROKEN.mjs', "export default { id: 'NC-B', criterion: 'SYN-BROKEN', run: ['node', 'x.mjs'] };\n");
    const lint2 = cli('--lint'); c.soft('cli_lint_reports_invalid_file', lint2.status === 1 && /SYN-BROKEN\.mjs: expectRed/.test(lint2.stdout), lint2.stdout);
    fs.rmSync(path.join(root, 'tests/negctl/SYN-BROKEN.mjs'));
    const all = cli('--all', '--jobs=2', '--no-store');
    c.soft('cli_all_exit_1_when_one_control_is_vacuous', all.status === 1 && /9\/10 red-as-expected/.test(all.stdout), all.stdout.slice(-300));
    // the real repository is never written by a run against a scratch root
    c.soft('cli_scratch_root_leaves_repo_alone', !fs.existsSync(path.join(ROOT, '.cache/negctl/' + process.pid)), 'work dir leaked');
  }
  // ---- nothing above touched the real tree's include set
  c.soft('repo_tree_hash_is_defined', /^[0-9a-f]{64}$/.test(treeHash(ROOT).treeHash));
} catch (e) { bad++; c.soft('uncaught: ' + String(e && e.message).slice(0, 100), false); console.error(e.stack); }
if (c.failures.length) { bad++; console.error('RED VF-T14: ' + c.failures.join(', ')); } else console.log(`ok  VF-T14: ${c.assertions} assertions`);
c.done();
process.exitCode = bad ? 1 : 0;
