// VF-T03-full / G1 sim matrix, ALL 83 cases (full tier): this tree against tests/golden/g1_digests.node.<regime>.json. docs/eras/spec/VF.md 3.6.1.
// Two worker processes by default (--jobs=N). `--regime=default_meta` compares with the unbaked record (provenance and refactor checks).
// @nocache  (it imports the tree through import(<expr>) on purpose: a golden is never served from the closure cache)
import { criterion } from '../lib/criteria.mjs';
import { g1Suite, parseArgs, report, USAGE } from './g1_suite.mjs';

let o;
try { o = parseArgs(process.argv.slice(2), 'full'); } catch (e) { console.error(e.message + '\n' + USAGE); process.exit(2); }
if (o.help) { console.log(USAGE); process.exit(0); }

const c = criterion('VF-T03-full', {
  er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-full', negctl: 'tests/negctl/VF-T03-full.mjs',
  text: 'G1 sim matrix: all 83 battles (arenas x difficulty, mutators, rules, 10 projectile kinds, 27 abilities, input logs, stalemate, waves) reproduce the Ancient v8 digests bit for bit',
});
report(c, await g1Suite(c, o), o);
