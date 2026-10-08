// VF-T13d: the generated registry tables of the repository are current (VF 3.4: "drift = gate failure"). Slow tier on purpose: a fast gate of an agent that has just added a
// test must not turn red because a generated file waits for COORD's `node tools/report.mjs --scan`; the full gate (COORD, every commit) does.
// Labels: manifest_current, er_table_current, no_stale_controls. ("every criterion has a control file" is plan_lint PL15 and the registry's U3 rule, not a drift failure.)
import fs from 'node:fs';
import path from 'node:path';
import { criterion } from '../lib/criteria.mjs';
import { ROOT } from '../../tools/lib/paths.mjs';
import { scanManifest, parseErTable, stable } from '../../tools/lib/er_rollup.mjs';
import { loadControls, lintControls } from '../../tools/lib/negctl.mjs';

const c = criterion('VF-T13d', { er: ['gate'], owner: 'TOOLS-VERIFY', tier: 'T-full', negctl: 'tests/negctl/VF-T13d.mjs', text: 'tools/lib/criteria_manifest.json and er_table.json equal a fresh scan; every control names a criterion of the manifest' });
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const fresh = await scanManifest(ROOT);
c.soft('manifest_current', read('tools/lib/criteria_manifest.json') === stable(fresh), 'run: node tools/report.mjs --scan');
c.soft('er_table_current', read('tools/lib/er_table.json') === stable(parseErTable(read('docs/eras/spec/VF.md'))), 'run: node tools/report.mjs --er-table');
const controls = await loadControls(ROOT);
const problems = lintControls(controls, fresh);
const stale = problems.filter((p) => !/has no negative control|no primary file/.test(p));
c.soft('no_stale_controls', stale.length === 0, stale.join(' | '));
if (c.failures.length) { console.error('RED VF-T13d: ' + c.failures.join(', ')); process.exitCode = 1; } else console.log(`ok  VF-T13d: ${c.assertions} assertions`);
c.done();
