// Records G7, the generator golden (docs/eras/spec/VF.md 3.6.2): 48 generateArmy tuples (composition and placements hashes), the counterTable of the 43 defs,
// 20 scoutReport cases (every scout code is produced), the first 12 survival waves for 20 seeds, and dailyPlan(key) for 400 dates from 2026-01-01
// (plus dailyEnemy for every 10th date). The record stores its INPUTS (unit ids, factions, scout compositions, daily content lists) so the test replays
// them on the live tree with the defs restricted to the 43 Ancient ids. Source: the baseline worktree, after TWO identical collections in fresh processes.
//
// usage: node tools/golden/g7_record.mjs [--worktree=<dir>] [--out=<file>] [--check] [--regime=baked] [--help]
//   --check    collect again and compare with tests/golden/g7_armygen.json (exit 1 on any difference)
//   --regime   accepted for the common CLI of VF 3.3; only 'baked' exists here (G1 alone has default_meta records), anything else exits 2
//   --worktree default .cache/baseline/ancient-v8; refused unless its HEAD is the baseline commit 4aafd2e3...
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCli, isMain } from './common.mjs';
import { collectG7 } from './g7_collect.mjs';
import { ROOT } from '../lib/paths.mjs';

export const G7_OUT = path.join(ROOT, 'tests', 'golden', 'g7_armygen.json');
export const SPEC = {
  script: fileURLToPath(import.meta.url), id: 'g7', kind: 'g7_armygen', defaultOut: G7_OUT,
  collect: (o) => collectG7(o.worktree),
  summary: (d) => `${d.armies.length} armies, ${d.counterTable.units} counter rows, ${d.scouts.length} scouts, ${Object.keys(d.waves).length} wave seeds, ${d.dailyPlans.rows.length} dates`,
};
if (isMain(import.meta.url)) process.exit(await recordCli(SPEC, process.argv.slice(2)));
