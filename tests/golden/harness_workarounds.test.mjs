// VF 3.6.2: "tests/baseline/harness_workarounds.json lists that one workaround so none can be added". The harness sources named in the file are scanned for lines that mutate
// the sim's defs or AI info (the file's `patterns`); the set of lines found must equal the listed workarounds exactly (file + trimmed line text), and every listed
// workaround must carry a reason and a measured effect. G6 itself never imports the campaign harness (checked: tools/golden/g6_collect.mjs has no import of tests/campaign/_lib.mjs).
//   labels: list_shape, lines_listed, lines_present, g6_independent
import fs from 'node:fs';
import path from 'node:path';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { red, finish } from './_golden.mjs';

const c = criterion('VF-G6w', { er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-G6w.mjs', engine: 'node',
  text: 'The test harnesses contain exactly the listed workaround lines (tests/baseline/harness_workarounds.json); G6 does not use the campaign harness' });
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/baseline/harness_workarounds.json'), 'utf8'));
red(c, 'list_shape', list.schema === 1 && Array.isArray(list.scanned) && list.scanned.length >= 2 && Array.isArray(list.patterns) && list.patterns.length >= 3 && Array.isArray(list.workarounds) && list.workarounds.length === 1
  && list.workarounds.every((w) => w.id && w.file && w.line && w.reason && w.measured && Array.isArray(w.appliedBy) && Array.isArray(w.notAppliedBy)), 'the workaround list is malformed (one workaround with id, file, line, reason, measured, appliedBy, notAppliedBy)');
const res = list.patterns.map((p) => new RegExp(p));
const found = [];
for (const f of list.scanned) {
  const file = path.join(ROOT, f);
  if (!fs.existsSync(file)) continue;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;
    const code = line.replace(/\s\/\/.*$/, '');
    if (res.some((r) => r.test(code))) found.push(`${f}: ${line}`);
  }
}
const listed = list.workarounds.map((w) => `${w.file}: ${w.line}`);
const extra = found.filter((x) => !listed.includes(x)), gone = listed.filter((x) => !found.includes(x));
red(c, 'lines_listed', extra.length === 0, 'a harness workaround is not in tests/baseline/harness_workarounds.json (none may be added): ' + extra.join(' | '));
red(c, 'lines_present', gone.length === 0, 'a listed workaround line is no longer in its harness (remove its row with two signers): ' + gone.join(' | '));
const g6 = fs.readFileSync(path.join(ROOT, 'tools/golden/g6_collect.mjs'), 'utf8');
red(c, 'g6_independent', !/campaign\/_lib\.mjs/.test(g6.split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n')) && !/trojan_horse/.test(g6.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')), 'G6 must not import the campaign harness nor patch the trojan horse');
finish(c);
