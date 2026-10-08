// STALE-ENGINE (amber) versus RED-WITNESS / RED-ERA / RED-AGE on the REAL feasibility record with the REAL witness (docs/eras/spec/VF.md 3.7; criterion VF-G6s).
// tools/records.mjs check classifies tests/campaign/feasibility.ancient.json against the tree it is run in; when the engine differs it runs the witness of tests/golden/witness.json
// (G1 core 12 + G6 15, about 45 s) in that tree. Four hard-link copies of this tree (like tools/lib/negctl_lite.mjs; node_modules and assets are shared symlinks) get one edit each:
//   inert_edit_is_amber      a comment appended to src/sim/ai.js: engineHash differs, behaviour does not -> the witness is green -> STALE-ENGINE, amber, exit 0, "staleSince not set"
//   behaviour_edit_is_red    one extra rng draw inside applyDamage -> the witness fails -> RED-WITNESS, exit 1
//   era_edit_is_red          a comment appended to src/content/era_ancient/stats.js: eraHash differs -> RED-ERA, exit 1 (no witness needed, none run)
//   age_is_red               the inert edit again, with staleSince 7 landings old -> RED-AGE, exit 1; with 6 landings still amber
// Slow tier (about 3 minutes): `node tests/golden/records_states.slow.test.mjs`.
// @nocache  (a golden imports the tree and the baseline through import(<expr>) on purpose: never served from the closure cache)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT, MAIN_ROOT } from '../../tools/lib/paths.mjs';
import { writeRecord, readRecord } from '../../tools/lib/records.mjs';
import { red, finish } from './_golden.mjs';

const c = criterion('VF-G6s', { er: ['ER1', 'ER24'], owner: 'TOOLS-GOLDEN', tier: 'T-full', negctl: 'tests/negctl/VF-G6s.mjs', engine: 'node',
  text: 'STALE-ENGINE is amber when the replay witness (G1 core + G6) is green and red when it fails; an era change and an overdue stale record are red (real record, real witness)' });

const work = path.join(MAIN_ROOT, '.cache', 'records_states', String(process.pid));
const COPIED = ['src', 'tools', 'tests', 'release', 'package.json'];
function makeCopy(name) {
  const dir = path.join(work, name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const n of COPIED) { if (!fs.existsSync(path.join(ROOT, n))) continue; const r = spawnSync('cp', ['-al', path.join(ROOT, n), path.join(dir, n)], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('cp -al ' + n + ': ' + r.stderr); }
  for (const n of ['node_modules', 'assets']) if (fs.existsSync(path.join(MAIN_ROOT, n))) fs.symlinkSync(path.join(MAIN_ROOT, n), path.join(dir, n));
  return dir;
}
const edit = (dir, rel, fn) => { const f = path.join(dir, rel), t = fs.readFileSync(f, 'utf8'), n = fn(t); if (n === t) throw new Error('edit changed nothing: ' + rel); fs.rmSync(f); fs.writeFileSync(f, n); };      // rm first: the file is a hard link into the real tree
const check = (dir, ...args) => {
  const r = spawnSync(process.execPath, [path.join(dir, 'tools/records.mjs'), 'check', '--root=' + dir, '--json', '--scope=ancient', ...args], { encoding: 'utf8', env: { ...process.env, VW_MAIN_ROOT: MAIN_ROOT }, timeout: 600000 });
  let j = null; try { j = JSON.parse(r.stdout); } catch { /* reported by the labels */ }
  return { status: r.status, j, row: j && j.rows.find((x) => /feasibility\.ancient/.test(x.file)), tail: ((r.stderr || '') + (r.stdout || '')).slice(-300) };
};

try {
  const base = check(ROOT);
  red(c, 'current_is_green', base.status === 0 && base.row && base.row.state === 'CURRENT', `the real tree: ${base.row ? base.row.state + ' ' + base.row.reason : base.tail}`);

  let d = makeCopy('inert');
  edit(d, 'src/sim/ai.js', (t) => t + '\n// inert edit of tests/golden/records_states.slow.test.mjs: bytes change, behaviour does not\n');
  let r = check(d);
  red(c, 'inert_edit_is_amber', r.status === 0 && r.row && r.row.state === 'STALE-ENGINE' && r.row.amber === true && !r.row.red && /staleSince not set/.test(r.row.reason) && r.j.amber === 1, `inert edit: ${r.row ? r.row.state + ' ' + r.row.reason : r.tail}, exit ${r.status}`);
  r = check(d, '--strict');
  red(c, 'strict_makes_amber_red', r.status === 1 && r.row && r.row.state === 'STALE-ENGINE' && r.row.red === true, `--strict: exit ${r.status}, ${r.row && r.row.state}`);

  // age: --mark writes staleSince; 6 landings later still amber, 7 red
  r = check(d, '--mark');
  const recFile = path.join(d, 'tests/campaign/feasibility.ancient.json'), rec = readRecord(recFile);
  const setLandings = (n) => { const j = readRecord(recFile); j.staleSince = { landing: 0, at: new Date().toISOString() }; fs.rmSync(recFile); writeRecord(recFile, j); fs.mkdirSync(path.join(d, 'docs/eras/ledger'), { recursive: true }); const ld = path.join(d, 'docs/eras/ledger/landings.jsonl'); fs.rmSync(ld, { force: true }); fs.writeFileSync(ld, Array.from({ length: n }, (_, i) => JSON.stringify({ n: i + 1 })).join('\n') + '\n'); };
  red(c, 'mark_starts_the_clock', r.status === 0 && !!rec.staleSince && Number.isInteger(rec.staleSince.landing), `--mark: exit ${r.status}, staleSince ${JSON.stringify(rec.staleSince)}`);
  setLandings(6); r = check(d);
  const six = r.row && r.row.state;
  setLandings(7); r = check(d);
  red(c, 'age_is_red', six === 'STALE-ENGINE' && r.status === 1 && r.row && r.row.state === 'RED-AGE' && r.row.red === true, `6 landings: ${six}; 7 landings: ${r.row && r.row.state} exit ${r.status}`);

  d = makeCopy('behaviour');
  edit(d, 'src/sim/combat.js', (t) => t.replace('let raw = base * (0.9 + w.rng.next() * 0.2);', 'w.rng.next(); let raw = base * (0.9 + w.rng.next() * 0.2);'));
  r = check(d);
  red(c, 'behaviour_edit_is_red', r.status === 1 && r.row && r.row.state === 'RED-WITNESS' && r.row.red === true && !r.row.amber, `behaviour edit: ${r.row ? r.row.state + ' ' + r.row.reason : r.tail}, exit ${r.status}`);

  d = makeCopy('era');
  edit(d, 'src/content/era_ancient/stats.js', (t) => t + '\n// inert edit of tests/golden/records_states.slow.test.mjs\n');
  r = check(d);
  red(c, 'era_edit_is_red', r.status === 1 && r.row && r.row.state === 'RED-ERA' && r.row.red === true, `era edit: ${r.row ? r.row.state + ' ' + r.row.reason : r.tail}, exit ${r.status}`);
} finally { fs.rmSync(work, { recursive: true, force: true }); try { fs.rmdirSync(path.dirname(work)); } catch { /* other runs */ } }
finish(c);
