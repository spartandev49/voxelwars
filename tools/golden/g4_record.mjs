// Records G4, the text golden (docs/eras/spec/VF.md 3.6.2): for each shipped Ancient text module (the 13 modules of tests/humor/text.test.mjs plus sim_text
// (SIM_BARKS), lesson_text, wave_names, custom_text, ui/strings and the puzzle text) the sha256 of the canonical JSON of its data exports, the sha256 of every
// export, a per-key hash map (object key / array index / announcer template id) for diff output, the function export names, and the announcer template
// id order (486 lines). Source: the baseline worktree, after TWO identical collections in fresh processes.
//
// usage: node tools/golden/g4_record.mjs [--worktree=<dir>] [--out=<file>] [--check] [--regime=baked] [--help]
//   --check    collect again and compare with tests/golden/g4_text.json (exit 1 on any difference)
//   --regime   accepted for the common CLI of VF 3.3; only 'baked' exists here (G1 alone has default_meta records), anything else exits 2
//   --worktree default .cache/baseline/ancient-v8; refused unless its HEAD is the baseline commit 4aafd2e3...
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCli, isMain } from './common.mjs';
import { collectG4 } from './g4_collect.mjs';
import { ROOT } from '../lib/paths.mjs';

export const G4_OUT = path.join(ROOT, 'tests', 'golden', 'g4_text.json');
export const SPEC = {
  script: fileURLToPath(import.meta.url), id: 'g4', kind: 'g4_text', defaultOut: G4_OUT,
  collect: (o) => collectG4(o.worktree),
  summary: (d) => `${Object.keys(d.modules).length} modules, ${Object.values(d.modules).reduce((n, m) => n + Object.values(m.keys).reduce((k, x) => k + Object.keys(x).length, 0), 0)} key hashes, ${d.announcerOrder.count} announcer templates`,
};
if (isMain(import.meta.url)) process.exit(await recordCli(SPEC, process.argv.slice(2)));
