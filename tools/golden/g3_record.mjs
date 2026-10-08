// Records G3, the id ledger of the shipped Ancient content (docs/eras/spec/VF.md 3.6.2, AR rule zero): ids by kind (units 43, factions 7, arenas 16, recipes 16,
// props 41, prop categories 4, missions 9, puzzles 6, parts 254, achievements 24, mutators 9, abilities 27, projectile kinds 10, god powers 6, rigs 8, clip ids,
// music 8, sfx 374, cue ids, unlock keys 3), the tombstone kinds, and sha256(JSON.stringify(def)) of each of the 43 unit defs (spec/M X4).
// Two files from one collection: tests/fixtures/shipped_ids.json (the ledger and the digests) and tests/golden/g3_defs.json (per def: digest, top-level key
// order and the JSON text itself, so a red def digest can print which field moved; the file spec/AR names for AR-T06).
//
// usage: node tools/golden/g3_record.mjs [--worktree=<dir>] [--out=<ledger file>] [--check] [--regime=baked] [--help]
//   (default)  write both files from the baseline worktree after TWO identical collections in fresh processes
//   --check    collect again and compare both files with the fresh collection (exit 1 on any difference)
//   --regime   accepted for the common CLI of VF 3.3; only 'baked' exists here (G1 alone has default_meta records), anything else exits 2
//   --worktree default .cache/baseline/ancient-v8; refused unless its HEAD is the baseline commit 4aafd2e3...
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordCli, isMain } from './common.mjs';
import { collectG3 } from './g3_collect.mjs';
import { ROOT } from '../lib/paths.mjs';

export const G3_OUT = path.join(ROOT, 'tests', 'fixtures', 'shipped_ids.json');
export const G3_DEFS_OUT = path.join(ROOT, 'tests', 'golden', 'g3_defs.json');
export const SPEC = {
  script: fileURLToPath(import.meta.url), id: 'g3', kind: 'g3_ids', defaultOut: G3_OUT,
  companions: [{ name: 'g3_defs', kind: 'g3_defs', out: G3_DEFS_OUT }],
  collect: (o) => collectG3(o.worktree),
  summary: (d) => `${Object.keys(d.counts).length} kinds, ${Object.keys(d.defs).length} def digests`,
};
if (isMain(import.meta.url)) process.exit(await recordCli(SPEC, process.argv.slice(2)));
