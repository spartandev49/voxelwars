// VF-T03 / G1 sim matrix, CORE subset (12 of the 83 cases, T-fast): this tree against tests/golden/g1_digests.node.<regime>.json, recorded from the baseline
// worktree. docs/eras/spec/VF.md 3.6.1. `--full` runs all 83 (tests/golden/g1_sim_full.slow.test.mjs does that in the full tier). --help for the flags.
// @nocache  (it imports the tree through import(<expr>) on purpose: a golden is never served from the closure cache)
import { criterion } from '../lib/criteria.mjs';
import { g1Suite, parseArgs, report, USAGE } from './g1_suite.mjs';

let o;
try { o = parseArgs(process.argv.slice(2), 'core'); } catch (e) { console.error(e.message + '\n' + USAGE); process.exit(2); }
if (o.help) { console.log(USAGE); process.exit(0); }

const c = criterion('VF-T03', {
  er: 'ER1', owner: 'TOOLS-GOLDEN', tier: 'T-fast', negctl: 'tests/negctl/VF-T03.mjs',
  text: 'G1 sim matrix: the core 12 battles reproduce the Ancient v8 digests (chain, walk, evHash, result tuple) bit for bit in the same engine and regime; legacyStateHash equals World.stateHash',
});
report(c, await g1Suite(c, o), o);
