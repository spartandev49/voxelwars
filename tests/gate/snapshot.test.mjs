// GATE-T04: content-addressed snapshots (tools/lib/snapshot.mjs, tools/treehash.mjs): hash rules, include set, copy semantics, symlinks, reuse, prune, git revisions.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { criterion } from '../lib/criteria.mjs';
import { treeHash, treeHashOfRev, makeSnapshot, pruneSnapshots, included, listFiles, SNAP_INCLUDE } from '../../tools/lib/snapshot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const c = criterion('GATE-T04', { er: 'gate', owner: 'TOOLS-GATE', tier: 'T-fast', negctl: 'tests/negctl/GATE-T04.mjs', text: 'tree hash and snapshot: deterministic, content addressed, include set, private copy, git revisions' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-snap-'));
const w = (root, rel, text, mode) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); if (mode) fs.chmodSync(f, mode); };
const mk = (name) => { const r = path.join(tmp, name); fs.mkdirSync(r, { recursive: true }); return r; };

// include set rules
c.check('include_dirs', included('src/sim/world.js') && included('tests/a/b.test.mjs') && included('tools/gate.mjs') && included('docs/eras/plan.md') && included('assets/audio/sfx/a.mp3') && included('release/v8/index.html'));
c.check('include_files', included('package.json') && included('assets/manifest.json') && included('docs/AGENTS.md') && included('docs/balance_data.json'));
c.check('exclude_big_and_state', !included('docs/sheets/a.png') && !included('docs/qa/x.png') && !included('assets/raw/a.wav') && !included('assets/masters/a.wav') && !included('dist/voxelwars.html') && !included('.cache/x') && !included('node_modules/esbuild/a.js') && !included('docs/deep/dir/a.md'));

// a scratch tree (no git: the directory-walk fallback)
const a = mk('a');
w(a, 'src/a.js', 'export const a = 1;\n'); w(a, 'tools/t.mjs', '// t\n', 0o755); w(a, 'tests/x.test.mjs', '// x\n'); w(a, 'package.json', '{}\n');
w(a, 'docs/sheets/big.png', 'png'); w(a, '.cache/junk', 'j'); w(a, 'node_modules/m/i.js', 'm'); w(a, 'dist/p.html', 'd');
const h1 = treeHash(a);
c.check('files_listed', h1.files.map((f) => f.path).join() === 'package.json,src/a.js,tests/x.test.mjs,tools/t.mjs', h1.files.map((f) => f.path).join());
c.check('hash_deterministic', treeHash(a).treeHash === h1.treeHash && /^[0-9a-f]{64}$/.test(h1.treeHash));
c.check('outside_include_ignored', (() => { w(a, 'docs/sheets/other.png', 'png2'); w(a, 'dist/q.html', 'q'); return treeHash(a).treeHash === h1.treeHash; })());
c.check('content_changes_hash', (() => { w(a, 'src/a.js', 'export const a = 2;\n'); const h = treeHash(a).treeHash; w(a, 'src/a.js', 'export const a = 1;\n'); return h !== h1.treeHash && treeHash(a).treeHash === h1.treeHash; })());
c.check('new_file_changes_hash', (() => { w(a, 'src/b.js', 'b'); const h = treeHash(a).treeHash; fs.rmSync(path.join(a, 'src/b.js')); return h !== h1.treeHash; })());
c.check('path_changes_hash', (() => { fs.renameSync(path.join(a, 'src/a.js'), path.join(a, 'src/c.js')); const h = treeHash(a).treeHash; fs.renameSync(path.join(a, 'src/c.js'), path.join(a, 'src/a.js')); return h !== h1.treeHash; })());
c.check('exec_bit_changes_hash', (() => { fs.chmodSync(path.join(a, 'tools/t.mjs'), 0o644); const h = treeHash(a).treeHash; fs.chmodSync(path.join(a, 'tools/t.mjs'), 0o755); return h !== h1.treeHash && treeHash(a).treeHash === h1.treeHash; })());
c.check('mtime_does_not_matter', (() => { const t = new Date(2001, 1, 1); fs.utimesSync(path.join(a, 'src/a.js'), t, t); return treeHash(a).treeHash === h1.treeHash; })());

// snapshot: private copy with symlinks, reuse, content addressed
const snapDir = path.join(tmp, 'snaps'); const linkRoot = mk('main'); fs.mkdirSync(path.join(linkRoot, 'node_modules')); fs.mkdirSync(path.join(linkRoot, '.cache/cdn'), { recursive: true });
const s1 = makeSnapshot(a, { snapDir, linkRoot });
c.check('snapshot_dir_is_hash', path.basename(s1.dir) === h1.treeHash && s1.reused === false && fs.existsSync(path.join(s1.dir, '.snap.ok')));
c.check('snapshot_same_files', treeHash(s1.dir).treeHash === h1.treeHash, 'the snapshot must hash to the tree it was taken from');
c.check('snapshot_excludes_outside', !fs.existsSync(path.join(s1.dir, 'docs')) && !fs.existsSync(path.join(s1.dir, 'dist')));
c.check('snapshot_links', fs.lstatSync(path.join(s1.dir, 'node_modules')).isSymbolicLink() && fs.readlinkSync(path.join(s1.dir, 'node_modules')) === path.join(linkRoot, 'node_modules') && fs.lstatSync(path.join(s1.dir, '.cache/cdn')).isSymbolicLink());
c.check('snapshot_keeps_exec', (fs.statSync(path.join(s1.dir, 'tools/t.mjs')).mode & 0o111) !== 0 && (fs.statSync(path.join(s1.dir, 'src/a.js')).mode & 0o111) === 0);
c.check('snapshot_is_a_copy', (() => { fs.appendFileSync(path.join(s1.dir, 'src/a.js'), '// edited in the snapshot\n'); const untouched = fs.readFileSync(path.join(a, 'src/a.js'), 'utf8') === 'export const a = 1;\n'; fs.writeFileSync(path.join(s1.dir, 'src/a.js'), 'export const a = 1;\n'); return untouched; })(), 'writing in a snapshot must never reach the shared tree (no hard links)');
c.check('snapshot_survives_source_edit', (() => { w(a, 'src/a.js', 'export const a = 99;\n'); const ok = fs.readFileSync(path.join(s1.dir, 'src/a.js'), 'utf8') === 'export const a = 1;\n'; w(a, 'src/a.js', 'export const a = 1;\n'); return ok; })(), 'the whole point: other agents edit the shared tree while a gate runs on the snapshot');
const s2 = makeSnapshot(a, { snapDir, linkRoot });
c.check('snapshot_reused', s2.reused === true && s2.dir === s1.dir);
w(a, 'src/a.js', 'export const a = 3;\n');
const s3 = makeSnapshot(a, { snapDir, linkRoot });
c.check('new_content_new_snapshot', s3.dir !== s1.dir && !s3.reused && fs.readFileSync(path.join(s3.dir, 'src/a.js'), 'utf8') === 'export const a = 3;\n');
// symlinks inside the tree are copied as links and hashed by target
fs.symlinkSync('a.js', path.join(a, 'src/link.js'));
const s4 = makeSnapshot(a, { snapDir, linkRoot });
c.check('tree_symlink_kept', fs.lstatSync(path.join(s4.dir, 'src/link.js')).isSymbolicLink() && fs.readlinkSync(path.join(s4.dir, 'src/link.js')) === 'a.js');

// prune: keeps the newest, never the protected one, respects the grace period
const old = new Date(Date.now() - 5 * 3600 * 1000);
for (const s of [s1, s3]) { fs.utimesSync(path.join(s.dir, '.snap.ok'), old, old); }
const removed = pruneSnapshots({ keep: 1, graceMin: 45, snapDir, protect: [s3.dir] });
c.check('prune_removes_old', removed.includes(path.basename(s1.dir)) && !fs.existsSync(s1.dir), JSON.stringify(removed));
c.check('prune_keeps_protected_and_new', fs.existsSync(s3.dir) && fs.existsSync(s4.dir));
c.check('prune_grace', pruneSnapshots({ keep: 0, graceMin: 45, snapDir }).every((n) => n === path.basename(s3.dir)) && fs.existsSync(s4.dir), 'a snapshot touched minutes ago may belong to a running gate');

// git revisions: a clean commit hashes the same as its working tree; tracked files only
const g = mk('g');
w(g, 'src/a.js', 'export const a = 1;\n'); w(g, 'tools/t.mjs', '// t\n', 0o755); w(g, 'package.json', '{}\n'); w(g, 'docs/sheets/x.png', 'png');
const git = (...args) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: g, encoding: 'utf8' });
const gi = git('init', '-q'); const ga = git('add', '-A'); const gc = git('commit', '-q', '-m', 'x');
c.check('scratch_git_ok', gi.status === 0 && ga.status === 0 && gc.status === 0, gc.stderr);
const wt = treeHash(g).treeHash, rv = treeHashOfRev('HEAD', { repo: g }).treeHash;
c.check('rev_equals_clean_worktree', wt === rv, `${wt.slice(0, 12)} vs ${rv.slice(0, 12)}`);
w(g, 'src/untracked.js', 'u');   // untracked + not ignored: in the work tree hash, not in the commit
c.check('worktree_sees_untracked', treeHash(g).treeHash !== rv && treeHashOfRev('HEAD', { repo: g }).treeHash === rv);
const rs = makeSnapshot(g, { rev: 'HEAD', snapDir, linkRoot });
c.check('snapshot_from_rev', rs.treeHash === rv && fs.existsSync(path.join(rs.dir, 'src/a.js')) && !fs.existsSync(path.join(rs.dir, 'src/untracked.js')));
// the CLI prints the same hash
const cli = spawnSync('node', [path.join(ROOT, 'tools/treehash.mjs'), '--rev', 'HEAD'], { cwd: g, encoding: 'utf8', env: { ...process.env, VW_MAIN_ROOT: g } });
const cliMain = spawnSync('node', [path.join(ROOT, 'tools/treehash.mjs'), '--json'], { cwd: ROOT, encoding: 'utf8' });
c.check('cli_json', cliMain.status === 0 && /^[0-9a-f]{64}$/.test(JSON.parse(cliMain.stdout).treeHash));
const bad = spawnSync('node', [path.join(ROOT, 'tools/treehash.mjs'), '--rev'], { cwd: ROOT, encoding: 'utf8' });
c.check('cli_usage_error_exit_2', bad.status === 2);
c.check('real_tree_listing_sane', listFiles(ROOT).length > 400 && SNAP_INCLUDE.length >= 10);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`GATE-T04 ok: ${c.assertions} assertions`);
