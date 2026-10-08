// Slow half of the recorder tests (T-full): g2_record.mjs reproduces BOTH committed arena records from the baseline, in Node and in headless Chromium, and
// turns red on a tampered copy of the Node record. (The fast half, including g3/g4/g7, is golden_tools.test.mjs.) Needs .cache/baseline/ancient-v8.
//   labels: node_reproduces, chromium_reproduces, node_tamper_detected
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { red, finish } from './_golden.mjs';

const c = criterion('VF-G0g2', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-full', negctl: 'tests/negctl/VF-G0g2.mjs', engine: 'chromium',
  text: 'g2_record --check reproduces tests/world/gen_golden.json (Node) and gen_golden_chromium.json (Chromium) from the baseline and detects a tampered copy' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-g0g2-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const g2 = (args) => { const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'golden', 'g2_record.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 300000 }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; };

const n = g2(['--check']);
red(c, 'node_reproduces', n.code === 0 && /^PASS g2 tests\/world\/gen_golden\.json/.test(n.out), `${n.code} ${n.out.slice(0, 300)}`);
const ch = g2(['--engine=chromium', '--check']);
red(c, 'chromium_reproduces', ch.code === 0 && /^PASS g2 tests\/world\/gen_golden_chromium\.json/.test(ch.out), `${ch.code} ${ch.out.slice(0, 300)}`);
const src = fs.readFileSync(path.join(ROOT, 'tests', 'world', 'gen_golden.json'), 'utf8');
const edited = src.replace(/("marathon\/medium\/1": \[")([0-9a-f])/, (m, a, d) => a + (d === '0' ? '1' : '0'));
if (edited === src) throw new Error('tamper edit changed nothing');
const copy = path.join(tmp, 'gen_golden_tampered.json');
fs.writeFileSync(copy, edited);
const t = g2(['--check', `--out=${copy}`]);
red(c, 'node_tamper_detected', t.code === 1 && /^FAIL g2/.test(t.out) && /marathon\/medium\/1\[0\]: recorded "[0-9a-f]{8}" \| fresh "[0-9a-f]{8}"/.test(t.out), `${t.code} ${t.out.slice(0, 300)}`);
finish(c);
