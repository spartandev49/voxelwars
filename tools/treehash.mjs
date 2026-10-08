// Prints the gate tree hash (VF 3.8.1) of the working tree or of a git revision, optionally creating the content-addressed snapshot.
// Usage: node tools/treehash.mjs [--worktree | --rev <sha>] [--snapshot] [--json] [--list] [--help]
// Exit: 0 ok, 2 usage / git error.
import path from 'path';
import { ROOT, MAIN_ROOT } from './lib/paths.mjs';
import { treeHash, treeHashOfRev, makeSnapshot, SNAP_INCLUDE } from './lib/snapshot.mjs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`treehash: content hash of the gate include set.
  node tools/treehash.mjs [--worktree]          hash of the working tree (default)
  node tools/treehash.mjs --rev <sha>           hash of a commit (tracked files only, via git archive); equal to the snapshot a clean tree at that commit produces
  --snapshot                                    also create (or reuse) .cache/snap/<treeHash>/ and print its path
  --list                                        print "sha256  path" for every file of the set
  --json                                        machine-readable output
include set: ${SNAP_INCLUDE.join(' ')}`);
  process.exit(0);
}
const revIx = argv.indexOf('--rev');
const rev = revIx >= 0 ? argv[revIx + 1] : null;
if (revIx >= 0 && !rev) { console.error('treehash: --rev needs a sha'); process.exit(2); }
try {
  const th = rev ? treeHashOfRev(rev) : treeHash(ROOT);
  const out = { treeHash: th.treeHash, files: th.files.length, bytes: th.bytes, source: rev ? 'rev:' + rev : 'worktree:' + (path.relative(MAIN_ROOT, ROOT) || '.') };
  if (argv.includes('--snapshot')) { const s = makeSnapshot(rev ? MAIN_ROOT : ROOT, rev ? { rev } : {}); out.snapshot = path.relative(MAIN_ROOT, s.dir); out.reused = s.reused; }
  if (argv.includes('--json')) { if (argv.includes('--list')) out.list = th.files.map((f) => ({ path: f.path, sha: f.sha, exec: f.exec })); console.log(JSON.stringify(out)); }
  else {
    if (argv.includes('--list')) for (const f of th.files) console.log(`${f.sha}  ${f.path}`);
    console.log(out.treeHash);
    if (out.snapshot) console.error(`snapshot ${out.snapshot} (${out.reused ? 'reused' : 'created'}), ${out.files} files, ${(out.bytes / 1048576).toFixed(1)} MB`);
  }
} catch (e) { console.error('treehash: ' + e.message); process.exit(2); }
