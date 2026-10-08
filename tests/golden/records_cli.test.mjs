// VF-L06: tools/records.mjs check (docs/eras/spec/VF.md 3.7): the six record states end to end on a synthetic tree, with the witness, the age clock, --strict and --mark.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import * as REC from '../../tools/lib/records.mjs';

const TOOL = path.join(ROOT, 'tools/records.mjs');
const tmp = [];
const mkRoot = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-reccli-')); tmp.push(d);
  const files = { 'src/sim/world.js': 'w1', 'src/world/gen.js': 'g1', 'src/core/rng.js': 'r1', 'src/voxel/mesher.js': 'm1', 'src/render/engine.js': 'e1', 'src/content/era_ancient/stats.js': 's1', 'src/content/era_ancient/arenas.js': 'a1', 'src/content/era_medieval/stats.js': 'ms1' };
  for (const [f, t] of Object.entries(files)) { const a = path.join(d, f); fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, t); }
  return d;
};
process.on('exit', () => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });
const run = (root, ...args) => { const r = spawnSync('node', [TOOL, 'check', '--root=' + root, '--json', ...args], { encoding: 'utf8' }); let j = null; try { j = JSON.parse(r.stdout); } catch { /* usage error */ } return { status: r.status, j, out: r.stdout + r.stderr }; };
const put = (root, f, text) => { const a = path.join(root, f); fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, text); };
const rec = (root, kind, over = {}) => ({ ...REC.makeRecord(kind, { battles: [{ id: 'b1', tuple: [1, 100, 3, 'x'] }] }, { engine: 'node', regime: 'baked', root, eras: ['ancient'], tag: 't' }), ...over });
const state = (r, i = 0) => r.j.rows[i] && r.j.rows[i].state;

const c = criterion('VF-L06', { er: ['ER1', 'ER7'], owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-L06.mjs', text: 'tools/records.mjs check classifies measurement records (CURRENT, STALE-ENGINE, RED-WITNESS, RED-ERA, RED-AGE, MISSING) and exits 1 on red' });
let bad = 0;
try {
  let root = mkRoot();
  let r = run(root);
  c.soft('empty_tree', r.status === 0 && r.j.rows.length === 0 && r.j.ok === true);
  REC.writeRecord(path.join(root, 'tests/campaign/feasibility.ancient.json'), rec(root, 'feasibility'));
  put(root, 'tests/campaign/feasibility.v8.json', JSON.stringify({ legacy: true, sim: '489eccc492' }));
  put(root, 'docs/balance/legacy.json', JSON.stringify({ sim: 'x' }));
  r = run(root);
  c.soft('current', r.status === 0 && r.j.rows.length === 1 && state(r) === 'CURRENT' && r.j.ignored.length === 2);
  // engine edit without a witness configured: fail closed
  put(root, 'src/sim/world.js', 'w2');
  r = run(root);
  c.soft('witness_fail_closed', r.status === 1 && state(r) === 'RED-WITNESS' && r.j.rows[0].red === true);
  put(root, 'tests/golden/witness.json', JSON.stringify({ ancient: [['node', '-e', 'process.exit(1)']] }));
  c.soft('witness_failing_command', run(root).status === 1 && state(run(root)) === 'RED-WITNESS');
  put(root, 'tests/golden/witness.json', JSON.stringify({ ancient: [['node', '-e', 'process.exit(0)'], ['node', '-e', 'process.exit(0)']] }));
  r = run(root);
  c.soft('amber_with_witness', r.status === 0 && state(r) === 'STALE-ENGINE' && r.j.rows[0].amber === true && /staleSince not set/.test(r.j.rows[0].reason) && r.j.amber === 1);
  c.soft('strict', run(root, '--strict').status === 1);
  // --mark starts the age clock and changes nothing else in the record
  const f = path.join(root, 'tests/campaign/feasibility.ancient.json'), before = JSON.parse(fs.readFileSync(f, 'utf8'));
  r = run(root, '--mark');
  const after = JSON.parse(fs.readFileSync(f, 'utf8'));
  const { staleSince, ...rest } = after;
  c.soft('mark', r.status === 0 && after.staleSince && Number.isInteger(after.staleSince.landing) && REC.canonicalJSON(rest) === REC.canonicalJSON(before) && run(root).j.rows[0].reason.indexOf('not set') < 0);
  // age: more than 6 landings is red, exactly 6 is amber
  const setLanding = (n) => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); j.staleSince = { landing: 0, at: new Date().toISOString() }; fs.writeFileSync(f, JSON.stringify(j)); put(root, 'docs/eras/ledger/landings.jsonl', Array.from({ length: n }, (_, i) => JSON.stringify({ i })).join('\n') + '\n'); };
  setLanding(6); c.soft('age_6_amber', run(root).status === 0 && state(run(root)) === 'STALE-ENGINE');
  setLanding(7); r = run(root);
  c.soft('age_7_red', r.status === 1 && state(r) === 'RED-AGE');
  // era change is red whatever the engine did
  root = mkRoot(); REC.writeRecord(path.join(root, 'tests/campaign/feasibility.ancient.json'), rec(root, 'feasibility')); put(root, 'src/content/era_ancient/stats.js', 's2');
  r = run(root); c.soft('era_change', r.status === 1 && state(r) === 'RED-ERA');
  // MISSING: red only for a frozen era
  root = mkRoot();
  c.soft('missing_not_frozen', run(root).j.rows.length === 0);
  r = run(root, '--frozen=ancient');
  c.soft('missing_frozen', r.status === 1 && r.j.rows.length === 2 && r.j.rows.every((x) => x.state === 'MISSING' && x.red) && r.j.rows.map((x) => x.kind).sort().join() === 'balance,feasibility');
  REC.writeRecord(path.join(root, 'tests/campaign/feasibility.ancient.json'), rec(root, 'feasibility')); REC.writeRecord(path.join(root, 'docs/balance/ancient.json'), rec(root, 'balance'));
  r = run(root, '--frozen=ancient'); c.soft('missing_resolved', r.status === 0 && r.j.rows.length === 2 && r.j.rows.every((x) => x.state === 'CURRENT'));
  // scope: a red ancient record is invisible to a medieval-only check; perf records take their eras from eraHash
  put(root, 'src/content/era_ancient/stats.js', 's3');
  c.soft('scope', run(root, '--era=medieval').status === 0 && run(root, '--scope=ancient,medieval').status === 1 && run(root, '--scope=all').status === 1);
  REC.writeRecord(path.join(root, '.cache/gate/perf.node.json'), rec(root, 'perf'));
  c.soft('perf_record_found', run(root, '--scope=ancient').j.rows.some((x) => x.kind === 'perf'));
  // malformed and wrong-kind files are red, never ignored
  root = mkRoot(); put(root, 'tests/campaign/feasibility.ancient.json', '{ not json'); put(root, 'docs/balance/ancient.json', JSON.stringify(rec(root, 'g1')));
  put(root, 'tests/campaign/era_fingerprint.ancient.json', JSON.stringify({ ...rec(root, 'era_fingerprint'), engineHash: { simCore: 'x', shared: 'y' } }));
  r = run(root); c.soft('malformed', r.status === 1 && r.j.rows.length === 3 && r.j.rows.every((x) => x.state === 'RED-MALFORMED'));
  // usage
  const h = spawnSync('node', [TOOL, '--help'], { encoding: 'utf8' });
  c.soft('usage', h.status === 0 && /exit: 0/.test(h.stdout) && spawnSync('node', [TOOL], { encoding: 'utf8' }).status === 2 && spawnSync('node', [TOOL, 'check', '--nope'], { encoding: 'utf8' }).status === 2);
  // the real tree has no new-style record yet: the gate step is green and says so
  const real = spawnSync('node', [TOOL, 'check'], { encoding: 'utf8' });
  c.soft('real_tree', real.status === 0 && /records: \d+ checked, 0 red/.test(real.stdout));
} catch (e) { bad++; c.soft('uncaught: ' + String(e.message).slice(0, 100), false); console.error(e.stack); }
if (c.failures.length) { bad++; console.error('RED VF-L06: ' + c.failures.join(', ')); } else console.log(`ok  VF-L06: ${c.assertions} assertions`);
c.done();
process.exitCode = bad ? 1 : 0;
