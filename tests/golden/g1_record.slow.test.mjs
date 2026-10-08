// VF-T03R / the G1 recorder and checker (tools/golden/g1_record.mjs): CLI contract (exit codes, --help), the refusal to record from anything but the baseline commit,
// --check passing on the committed record and FAILING on a flipped digest and on a changed fixture, --only never writing. Full tier (about 60 s: it runs the baseline).
// @nocache  (it runs the baseline worktree, an input outside the tree)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { criterion } from '../lib/criteria.mjs';
import { FIXTURE_FILES } from '../../tools/golden/g1_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const TOOL = path.join(ROOT, 'tools/golden/g1_record.mjs');
const run = (args, opt = {}) => { const r = spawnSync('node', [TOOL, ...args], { encoding: 'utf8', cwd: ROOT, timeout: 300000, ...opt }); return { status: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
const tmps = [];
const mk = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); tmps.push(d); return d; };
process.on('exit', () => { for (const d of tmps) fs.rmSync(d, { recursive: true, force: true }); });
const copyRecord = (dir, regimes = ['baked']) => {
  for (const f of Object.values(FIXTURE_FILES)) fs.copyFileSync(path.join(HERE, f), path.join(dir, f));
  for (const r of regimes) fs.copyFileSync(path.join(HERE, `g1_digests.node.${r}.json`), path.join(dir, `g1_digests.node.${r}.json`));
};

const c = criterion('VF-T03R', {
  er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-full', negctl: 'tests/negctl/VF-T03R.mjs',
  text: 'tools/golden/g1_record.mjs: usage errors exit 2, refuses a worktree that is not the baseline, --check passes on the committed record and fails on a changed digest or fixture, --only writes nothing',
});

{ // help and usage errors
  const h = run(['--help']);
  c.soft('g1rec/help', h.status === 0 && /usage: node tools\/golden\/g1_record\.mjs/.test(h.out) && /--check/.test(h.out) && /--regime/.test(h.out));
  c.soft('g1rec/usage_errors', run(['--bogus']).status === 2 && run(['--regime=nope']).status === 2 && run(['--jobs=9']).status === 2 && run(['--engine=gpu']).status === 2);
}
{ // refuses anything that is not the baseline commit
  const d = mk('vw-g1-wt-');
  spawnSync('git', ['init', '-q', d]);
  spawnSync('git', ['-C', d, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x']);
  const out = mk('vw-g1-out-');
  const r = run(['--worktree=' + d, '--out-dir=' + out, '--only=A-alpine-easy', '--regime=baked']);
  c.soft('g1rec/refuses_wrong_worktree', r.status === 1 && /4aafd2e3fb83f20e1b19e0db8465c117032ba3b7/.test(r.out) && fs.readdirSync(out).length === 0, r.out.slice(0, 200));
}
{ // --check passes on the committed record (a subset: the full check is `node tools/golden/g1_record.mjs --check`)
  const r = run(['--check', '--only=A-alpine-easy,D-boulder', '--regime=baked', '--jobs=2']);
  c.soft('g1rec/check_passes', r.status === 0 && (r.out.match(/^PASS /gm) || []).length === 6 && !/FAIL/.test(r.out), r.out.slice(0, 300));
}
{ // --check fails on a flipped digest and names the tick
  const d = mk('vw-g1-flip-'); copyRecord(d);
  const f = path.join(d, 'g1_digests.node.baked.json');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/("chain": \[)(\d+)/, (m, a, v) => a + (+v + 1)));
  const r = run(['--check', '--only=A-alpine-easy', '--regime=baked', '--out-dir=' + d]);
  c.soft('g1rec/check_detects_digest', r.status === 1 && /FAIL g1_digests\.node\.baked/.test(r.out) && /diverges at tick 100/.test(r.out), r.out.slice(0, 300));
}
{ // --check fails when a fixture differs from what the baseline generates
  const d = mk('vw-g1-fix-'); copyRecord(d);
  const f = path.join(d, 'g1_inputs.json');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/"tick": 150/, '"tick": 151'));
  const r = run(['--check', '--only=A-alpine-easy', '--regime=baked', '--out-dir=' + d]);
  c.soft('g1rec/check_detects_fixture', r.status === 1 && /FAIL fixture g1_inputs\.json/.test(r.out), r.out.slice(0, 300));
}
{ // --engine=chromium hands over to the Chromium column (its own --help, then a real --check of one case against the v8 page)
  const h = run(['--engine=chromium', '--help']);
  const r = run(['--engine=chromium', '--check', '--only=A-alpine-easy', '--page=release/v8/index.html']);
  c.soft('g1rec/chromium_delegates', h.status === 0 && /g1_chromium\.mjs/.test(h.out) && r.status === 0 && /^PASS g1 chromium /m.test(r.out), (h.out + r.out).slice(0, 300));
}
{ // --only records nothing
  const out = mk('vw-g1-only-');
  const r = run(['--only=A-alpine-easy', '--regime=baked', '--out-dir=' + out, '--jobs=2']);
  c.soft('g1rec/only_writes_nothing', r.status === 0 && /nothing written/.test(r.out) && fs.readdirSync(out).length === 0, r.out.slice(0, 300));
}
if (c.failures.length) { console.error('FAIL g1_record: ' + c.failures.join(', ')); process.exitCode = 1; } else console.log(`ok g1_record: ${c.assertions} assertions`);
