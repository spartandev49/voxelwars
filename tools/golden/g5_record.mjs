// Records G5 customs, the cost golden (docs/eras/spec/VF.md 3.6.2): 200 random Ancient custom soldiers (RNG(8008), the shape of the U8 fuzzer) and, for each, the cost the Workshop
// shows and every number derived next to it (role, hp, armor, speed, radius, scale, dmg, cd, range, moraleBonus, power, efficiency, rev). The record keeps the 200 inputs.
// The real v8 PROFILE half of G5 (tests/save/fixtures/ancient_release_v8.mjs) is produced by tools/golden/g5_make_fixture.mjs (Chromium).
// Source: the baseline worktree, after TWO identical collections in fresh processes (VF 3.6 rule 2). File: tests/golden/g5_customs.json.
//
// usage: node tools/golden/g5_record.mjs [--worktree=<dir>] [--out=<file>] [--regime=baked] [--check] [--help]
//   --check    collect again from the worktree and compare with tests/golden/g5_customs.json (exit 1 on any difference)
//   --worktree default .cache/baseline/ancient-v8; refused unless its HEAD is the baseline commit 4aafd2e3...
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCli, isMain } from './common.mjs';
import { collectG5 } from './g5_collect.mjs';
import { ROOT } from '../lib/paths.mjs';

export const G5_OUT = path.join(ROOT, 'tests', 'golden', 'g5_customs.json');
export const SPEC = {
  script: fileURLToPath(import.meta.url), id: 'g5', kind: 'g5_customs', defaultOut: G5_OUT,
  collect: (o) => collectG5(o.worktree),
  summary: (d) => `${d.n} customs, cost ${d.summary.minCost}..${d.summary.maxCost}, ${d.summary.clamped} clamped`,
};
if (isMain(import.meta.url)) process.exit(await recordCli(SPEC, process.argv.slice(2)));
