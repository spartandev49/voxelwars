// Tests of the golden recorders themselves (TOOLS-GOLDEN; docs/eras/spec/VF.md 3.6 "Common rules"): tools/golden/common.mjs recordCli and the four recorders
// g2/g3/g4/g7_record.mjs. The recorders must: print usage and exit 0 on --help, exit 2 on an unknown argument, REFUSE a worktree that is not the baseline commit,
// refuse to write when two collections disagree, write a valid record (kind, engine, regime, baseline sha) when they agree, and `--check` must reproduce the
// committed fixtures from the baseline and turn red when a fixture is tampered with. (The slow part, g2 in Node and Chromium, is golden_tools.g2.slow.test.mjs.)
//   labels: help, exit_codes, refuses_non_baseline, determinism_gate, record_roundtrip, checks_reproduce, tamper_detected
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { readRecord } from '../../tools/lib/records.mjs';
import { BASELINE_SHA, BASELINE_WORKTREE, headOf } from '../../tools/golden/baseline.mjs';
import { red, finish } from './_golden.mjs';

const c = criterion('VF-G0', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G0.mjs', engine: 'node',
  text: 'Golden recorders: --help, exit codes, baseline-only, two-run determinism gate, record round trip, --check reproduces and detects tampering' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-g0-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const run = (script, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const REC = ['g2', 'g3', 'g4', 'g7'].map((g) => path.join(ROOT, 'tools', 'golden', `${g}_record.mjs`));
const haveBaseline = headOf(BASELINE_WORKTREE) === BASELINE_SHA;
red(c, 'baseline_present', haveBaseline, `${BASELINE_WORKTREE} must be a checkout of ${BASELINE_SHA}`);
if (!haveBaseline) { finish(c); process.exit(1); }

const helps = REC.map((s) => run(s, ['--help']));
red(c, 'help', helps.every((h) => h.code === 0 && /usage: node tools\/golden\/g\d_record\.mjs/.test(h.out) && /exit: 0 ok, 1 /.test(h.out)), helps.map((h) => h.code + ' ' + h.out.slice(0, 60)).join(' | '));
const bad = REC.map((s) => run(s, ['--bogus-flag']));
const badEngine = run(REC[1], ['--engine=chromium']);
const badRegime = run(REC[1], ['--regime=default_meta']);
red(c, 'exit_codes', bad.every((b) => b.code === 2 && /unknown argument/.test(b.out)) && badEngine.code === 2 && badRegime.code === 2 && /only --regime=baked/.test(badRegime.out),
  bad.map((b) => b.code).join() + ' / engine ' + badEngine.code + ' / regime ' + badRegime.code);
const notBase = fs.mkdtempSync(path.join(tmp, 'wt-'));
const refused = REC.map((s) => run(s, [`--worktree=${notBase}`]));
const refusedHead = run(REC[1], [`--worktree=${ROOT}`, `--out=${path.join(tmp, 'never.json')}`]);   // this repo's HEAD is not the baseline commit
red(c, 'refuses_non_baseline', refused.every((r) => r.code === 1 && /refusing to run/.test(r.out)) && refusedHead.code === 1 && !fs.existsSync(path.join(tmp, 'never.json')),
  refused.map((r) => r.code + ' ' + r.out.slice(0, 80)).join(' | ') + ' head: ' + refusedHead.code);

// a stand-in recorder built on the same recordCli: deterministic and non-deterministic collections
const common = pathToFileURL(path.join(ROOT, 'tools', 'golden', 'common.mjs')).href;
const fake = path.join(tmp, 'fake_record.mjs');
fs.writeFileSync(fake, `import { fileURLToPath } from 'node:url';
import { recordCli, isMain } from ${JSON.stringify(common)};
const SPEC = { script: fileURLToPath(import.meta.url), id: 'fake', kind: 'g_fake', defaultOut: process.env.FAKE_OUT,
  collect: async () => ({ data: process.env.FAKE_MODE === 'random' ? { x: Math.random(), y: [1, 2, 3] } : { x: 1, y: [1, 2, 3], z: { b: 2, a: 1 } } }) };
if (isMain(import.meta.url)) process.exit(await recordCli(SPEC, process.argv.slice(2)));
`);
const outRandom = path.join(tmp, 'random.json'), outFixed = path.join(tmp, 'fixed.json');
const rnd = run(fake, [], { FAKE_MODE: 'random', FAKE_OUT: outRandom });
red(c, 'determinism_gate', rnd.code === 1 && /REFUSING to write/.test(rnd.out) && !fs.existsSync(outRandom), `exit ${rnd.code}, file exists ${fs.existsSync(outRandom)}: ${rnd.out.slice(0, 120)}`);
const fix = run(fake, [], { FAKE_MODE: 'fixed', FAKE_OUT: outFixed });
let rec = null; try { rec = readRecord(outFixed); } catch { /* reported below */ }
const chk = run(fake, ['--check'], { FAKE_MODE: 'fixed', FAKE_OUT: outFixed });
const chkRandom = run(fake, ['--check'], { FAKE_MODE: 'random', FAKE_OUT: outFixed });
const tampered = JSON.parse(fs.readFileSync(outFixed, 'utf8')); tampered.data.z.a = 2; fs.writeFileSync(outFixed, JSON.stringify(tampered));
const chkTamper = run(fake, ['--check'], { FAKE_MODE: 'fixed', FAKE_OUT: outFixed });
red(c, 'record_roundtrip', fix.code === 0 && rec && rec.kind === 'g_fake' && rec.engine === 'node' && rec.regime === 'baked' && rec.sha === BASELINE_SHA && rec.tag === 'ancient-v8' && rec.dirty === false
  && chk.code === 0 && /^PASS/.test(chk.out) && chkRandom.code === 1 && chkTamper.code === 1 && /\$\.z\.a: recorded 2 \| fresh 1/.test(chkTamper.out),
  `write ${fix.code}, check ${chk.code}, check-vs-random ${chkRandom.code}, check-vs-tampered ${chkTamper.code}: ${chkTamper.out.slice(0, 160)}`);

// the real recorders reproduce their committed fixtures from the baseline
const real = [['g3', REC[1]], ['g4', REC[2]], ['g7', REC[3]]].map(([n, s]) => [n, run(s, ['--check'])]);
red(c, 'checks_reproduce', real.every(([, r]) => r.code === 0 && /^PASS/.test(r.out)), real.map(([n, r]) => `${n}: ${r.code} ${r.out.slice(0, 100)}`).join(' | '));
// ...and turn red on a tampered copy of the fixture (the copy is passed with --out; the committed file is never touched)
const tamper = [
  ['g3', REC[1], 'tests/fixtures/shipped_ids.json', (t) => t.replace('"hoplite",', '"hoplitx",')],
  ['g4', REC[2], 'tests/golden/g4_text.json', (t) => t.replace(/("sha256": ")([0-9a-f])/, (m, a, d) => a + (d === '0' ? '1' : '0'))],
  ['g7', REC[3], 'tests/golden/g7_armygen.json', (t) => t.replace(/("placementsSha": ")([0-9a-f])/, (m, a, d) => a + (d === '0' ? '1' : '0'))],
].map(([n, s, rel, edit]) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8'), out = path.join(tmp, n + '_tampered.json'), t = edit(src);
  if (t === src) throw new Error('tamper edit changed nothing for ' + n);
  fs.writeFileSync(out, t);
  return [n, run(s, ['--check', `--out=${out}`])];
});
red(c, 'tamper_detected', tamper.every(([, r]) => r.code === 1 && /^FAIL/.test(r.out) && /recorded .* \| fresh /.test(r.out)), tamper.map(([n, r]) => `${n}: ${r.code} ${r.out.slice(0, 100)}`).join(' | '));
finish(c);
