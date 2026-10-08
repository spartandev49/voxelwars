// VF-L05: tools/lib/negctl_lite.mjs classifies a negative control exactly as docs/eras/spec/VF.md 3.13 says and never touches the original tree.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { runControl } from '../../tools/lib/negctl_lite.mjs';

const c = criterion('VF-L05', { er: ['ER1'], owner: 'TOOLS-GOLDEN', tier: 'T-full', negctl: 'tests/negctl/VF-L05.mjs', text: 'negctl_lite: red-as-expected / stayed-green / wrong-red / baseline-red, alsoRed, hard-link safety, refusals' });
const FX = 'tests/fixtures/negctl_synth';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const make = (over) => ({ id: 'NC-SYN', criterion: 'SYN-1', expectRed: ['SYN-1/alpha'], alsoRed: [], needs: [], costS: 3, run: ['node', `${FX}/ok/check.mjs`], mutate(m) { m.edit(`${FX}/ok/flag.txt`, /green/, 'red-a'); }, ...over });
const before = [`${FX}/ok/flag.txt`, `${FX}/bad/flag.txt`, `${FX}/ok/other.txt`].map(sha);
let bad = 0;
try {
  const r = {};
  r.ok = await runControl(make({}));
  c.soft('red_as_expected', r.ok.result === 'red-as-expected' && r.ok.failed.join() === 'SYN-1/alpha' && r.ok.missing.length === 0);
  r.green = await runControl(make({ mutate(m) { m.edit(`${FX}/ok/other.txt`, /x/, 'y'); } }));
  c.soft('stayed_green', r.green.result === 'stayed-green' && r.green.failed.length === 0 && r.green.missing.join() === 'SYN-1/alpha');
  r.wrong = await runControl(make({ mutate(m) { m.edit(`${FX}/ok/flag.txt`, /green/, 'red-b'); } }));
  c.soft('wrong_red', r.wrong.result === 'wrong-red' && r.wrong.failed.join() === 'SYN-1/beta' && r.wrong.extra.join() === 'SYN-1/beta');
  r.base = await runControl(make({ run: ['node', `${FX}/bad/check.mjs`], mutate(m) { m.edit(`${FX}/bad/other.txt`, /x/, 'y'); } }));
  c.soft('baseline_red', r.base.result === 'baseline-red' && r.base.failed.join() === 'SYN-1/alpha');
  const two = { mutate(m) { m.edit(`${FX}/ok/flag.txt`, /green/, 'red-a red-b'); } };
  r.also = await runControl(make({ ...two, alsoRed: ['SYN-1/beta'] }));
  r.noalso = await runControl(make({ ...two }));
  c.soft('also_red', r.also.result === 'red-as-expected' && r.noalso.result === 'wrong-red' && r.noalso.extra.join() === 'SYN-1/beta');
  const refuses = async (mutate) => { try { await runControl(make({ mutate })); return false; } catch (e) { return /mutation|changed nothing|negctl/.test(e.message); } };
  c.soft('refuses_noop_edit', await refuses((m) => m.edit(`${FX}/ok/flag.txt`, /nothing-matches/, 'z')));
  c.soft('refuses_symlinked_assets', await refuses((m) => m.write('assets/manifest.json', '{}')));
  c.soft('refuses_outside_copy', await refuses((m) => m.write('../escape.txt', 'x')));
  c.soft('original_untouched', same(before, [`${FX}/ok/flag.txt`, `${FX}/bad/flag.txt`, `${FX}/ok/other.txt`].map(sha)));
  c.soft('remove_and_pad', (await runControl(make({ mutate(m) { m.pad(`${FX}/ok/other.txt`, 40); m.edit(`${FX}/ok/flag.txt`, /green/, 'red-a'); m.write(`${FX}/ok/new.txt`, 'n'); m.remove(`${FX}/ok/new.txt`); } }))).result === 'red-as-expected' && !fs.existsSync(path.join(ROOT, FX, 'ok/new.txt')));
} catch (e) { bad++; c.soft('uncaught: ' + String(e.message).slice(0, 100), false); console.error(e.stack); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
if (c.failures.length) { bad++; console.error('RED VF-L05: ' + c.failures.join(', ')); } else console.log(`ok  VF-L05: ${c.assertions} assertions`);
c.done();
process.exitCode = bad ? 1 : 0;
