// Records G6, the campaign replay golden (docs/eras/spec/VF.md 3.6.2, 3.7, PC-3): the 9 Ancient missions at seed 1, each with an EXPLICIT frozen deployment (the 7
// authored `mission.reference` lists and the frozen counter-picks of marathon_sort_of and cyclops_meet, with their layoutArmy placements), plus the 6 stored puzzle
// solutions, fought to the end in the real sim: {win, t, stars, earned, endReason, spent, tickN, alive, dead, kills}, the legacy World.stateHash chain every 300
// ticks, the statwalk chain at the same ticks, and the final hashes. The harness workaround of tests/campaign/_lib.mjs:12 is NOT applied (docs: VF-impl T5).
// Source: the baseline worktree, after TWO identical collections in fresh processes (VF 3.6 rule 2). Files: tests/golden/g6_campaign.node.<regime>.json.
//
// usage: node tools/golden/g6_record.mjs [--worktree=<dir>] [--out=<file>] [--regime=baked|default_meta] [--check] [--help]
//   --regime   baked (default, the golden: registerAllClips like app/main.js) or default_meta (provenance and refactor checks; VF-D4 records G6 under both)
//   --check    collect again from the worktree and compare with the committed file for the regime (exit 1 on any difference)
//   --worktree default .cache/baseline/ancient-v8; refused unless its HEAD is the baseline commit 4aafd2e3...
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCli, isMain } from './common.mjs';
import { collectG6 } from './g6_collect.mjs';
import { ROOT } from '../lib/paths.mjs';

export const g6File = (regime) => path.join(ROOT, 'tests', 'golden', `g6_campaign.node.${regime}.json`);
export const SPEC = {
  script: fileURLToPath(import.meta.url), id: 'g6', kind: 'g6_campaign', defaultOut: g6File('baked'), regimes: ['baked', 'default_meta'],
  outFor: (o) => g6File(o.regime),
  collect: (o) => collectG6(o.worktree, o.regime),
  summary: (d) => `${d.inputs.missions.length} missions + ${d.inputs.puzzles.length} puzzles, ${Object.values(d.results).filter((r) => r.result.win).length} wins`,
};
if (isMain(import.meta.url)) process.exit(await recordCli(SPEC, process.argv.slice(2)));
