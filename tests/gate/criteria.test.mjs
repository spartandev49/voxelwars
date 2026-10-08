// GATE-T08: the criteria registry client (tests/lib/criteria.mjs, VF 3.4): assertion counting, failure labels, skip, the JSONL line and the gate-side merge.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { criterion } from '../lib/criteria.mjs';
import { mergeCriteria } from '../../tools/lib/criteria_merge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const c = criterion('GATE-T08', { er: 'gate', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T08.mjs', text: 'criteria client counts assertions, records failures and skips; the merge applies the UNVERIFIED rules' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-crit-'));
const out = path.join(tmp, 'crit.jsonl');

// a child process that registers three criteria: one passing with 3 assertions, one failing, one with zero assertions, one skipped
const script = path.join(tmp, 'child.mjs');
fs.writeFileSync(script, `
import { criterion } from ${JSON.stringify(path.join(ROOT, 'tests/lib/criteria.mjs'))};
const a = criterion('X-PASS', { er: 'ER2', owner: 'T', tier: 'T-fast', negctl: 'tests/lib/criteria.mjs', text: 'p' });
a.check('one', true); a.assert.equal(1, 1); a.assert.deepEqual({ a: 1 }, { a: 1 });
const b = criterion('X-FAIL', { owner: 'T', tier: 'T-fast' });
b.check('fine', true);
try { b.check('broken', false, 'boom'); } catch { /* the label is recorded, the test goes on */ }
try { b.assert.equal(1, 2); } catch { /* counted and labelled */ }
criterion('X-ZERO', { owner: 'T', tier: 'T-fast' });
criterion('X-SKIP', { owner: 'T', tier: 'T-fast' }).skip('not today');
`);
const r = spawnSync('node', [script], { encoding: 'utf8', env: { ...process.env, VW_CRITERIA_OUT: out, VW_ERA: 'ancient' } });
c.check('child_exit_zero', r.status === 0, r.stderr);
const lines = fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const by = Object.fromEntries(lines.map((l) => [l.id, l]));
c.check('four_lines', lines.length === 4, String(lines.length));
c.check('counts_assertions', by['X-PASS'].assertions === 3 && by['X-PASS'].failures.length === 0, JSON.stringify(by['X-PASS']));
c.check('records_failure_labels', by['X-FAIL'].failures.includes('broken') && by['X-FAIL'].failures.includes('assert.equal'), JSON.stringify(by['X-FAIL'].failures));
c.check('zero_assertions_line', by['X-ZERO'].assertions === 0);
c.check('skip_recorded', by['X-SKIP'].skipped === 'not today');
c.check('line_fields', ['id', 'er', 'owner', 'tier', 'negctl', 'file', 'scriptHash', 'assertions', 'failures', 'seconds', 'at', 'era'].every((k) => k in by['X-PASS']) && by['X-PASS'].scriptHash.length === 64 && by['X-PASS'].era === 'ancient');

// merge rules
const negOk = { 'X-PASS': { result: 'red-as-expected', scriptHash: by['X-PASS'].scriptHash } };
const m = mergeCriteria(lines, { root: ROOT, negctlStore: negOk, run: { id: 't' } }).criteria;
c.check('merge_pass', m['X-PASS'].status === 'PASS', JSON.stringify(m['X-PASS']));
c.check('merge_fail', m['X-FAIL'].status === 'FAIL');
c.check('merge_zero_unverified', m['X-ZERO'].status === 'UNVERIFIED' && /U2/.test(m['X-ZERO'].reason), JSON.stringify(m['X-ZERO']));
c.check('merge_skip_unverified', m['X-SKIP'].status === 'UNVERIFIED' && /U5/.test(m['X-SKIP'].reason));
const noNeg = mergeCriteria(lines, { root: ROOT, negctlStore: {}, run: {} }).criteria;
c.check('merge_negctl_unproven', noNeg['X-PASS'].status === 'UNVERIFIED' && /U4/.test(noNeg['X-PASS'].reason), JSON.stringify(noNeg['X-PASS']));
const stale = mergeCriteria(lines, { root: ROOT, negctlStore: { 'X-PASS': { result: 'red-as-expected', scriptHash: 'deadbeef' } }, run: {} }).criteria;
c.check('merge_negctl_stale_script', stale['X-PASS'].status === 'UNVERIFIED' && /U4/.test(stale['X-PASS'].reason));
const missingFile = mergeCriteria([{ ...by['X-PASS'], negctl: 'tests/negctl/does_not_exist.mjs' }], { root: ROOT, negctlStore: negOk, run: {} }).criteria;
c.check('merge_no_negctl_file', missingFile['X-PASS'].status === 'UNVERIFIED' && /U3/.test(missingFile['X-PASS'].reason));

// duplicate registration in one process is an error (ids are unique per run)
let dup = false; try { criterion('GATE-T08', {}); } catch { dup = true; }
c.check('duplicate_id_throws', dup);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`GATE-T08 ok: ${c.assertions} assertions`);
