// Records tests/golden/fp_ancient_v8.json: the fingerprint DEFINITION applied to the v8 baseline (file lists, unmatched patterns, hashes).
// A test (tests/golden/lib.test.mjs, VF-L01) recomputes it from the baseline worktree, so an edit of the pattern tables of tools/lib/fingerprint.mjs
// that changes what is hashed turns red until the record is re-taken with two signers (docs/eras/golden_log.md).
//
// usage: node tools/golden/fp_record.mjs [--worktree=<dir>] [--out=<file>] [--check] [--help]
//   (default) write the record;  --check  compare a fresh computation with the file (exit 1 on any difference).
// exit: 0 ok, 1 mismatch / failure, 2 usage
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertBaseline, BASELINE_WORKTREE, BASELINE_TAG } from './baseline.mjs';
import { describe, fingerprint, hashFiles } from '../lib/fingerprint.mjs';
import { makeRecord, writeRecord, readRecord, canonicalJSON } from '../lib/records.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_OUT = path.join(REPO, 'tests', 'golden', 'fp_ancient_v8.json');

export function recordPin(worktree = BASELINE_WORKTREE) {
  const wt = assertBaseline(worktree);
  const lists = {}, unmatched = {};
  for (const [k, args] of [['simCore', ['simCore']], ['shared', ['shared']], ['render', ['render']], ['era:ancient', ['era', wt, 'ancient']]]) {
    const d = args.length === 1 ? describe(args[0], wt) : describe(...args);
    lists[k] = d.files; unmatched[k] = d.unmatched;
  }
  const hashes = {};
  for (const k of Object.keys(lists)) hashes[k] = hashFiles(wt, lists[k]);
  return makeRecord('fingerprint_pin', { lists, unmatched, hashes }, { engine: 'node', regime: 'baked', root: wt, render: true, tag: BASELINE_TAG, fingerprint: fingerprint(wt, ['ancient']) });
}

function main(argv) {
  const opt = { worktree: BASELINE_WORKTREE, out: DEFAULT_OUT, check: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, arr) => arr.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return 0; }
    if (a === '--check') { opt.check = true; continue; }
    const m = /^--(worktree|out)=(.+)$/.exec(a);
    if (!m) { console.error('unknown argument: ' + a); return 2; }
    opt[m[1]] = path.resolve(m[2]);
  }
  const rec = recordPin(opt.worktree);
  if (opt.check) {
    const keep = (r) => { const { box, sha, dirty, tag, ...rest } = r; return canonicalJSON(rest); };
    const same = keep(readRecord(opt.out)) === keep(rec);
    console.log(`${same ? 'PASS' : 'FAIL'} fingerprint pin ${path.relative(REPO, opt.out)} ${same ? 'equals' : 'DIFFERS from'} the definition applied to the baseline`);
    return same ? 0 : 1;
  }
  const { written } = writeRecord(opt.out, rec);
  console.log(`${written ? 'wrote' : 'unchanged'} ${path.relative(REPO, opt.out)}: ${Object.entries(rec.data.lists).map(([k, v]) => `${k} ${v.length}`).join(', ')} files`);
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
