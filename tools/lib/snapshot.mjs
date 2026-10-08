// Content-addressed snapshots of the working tree (VF 3.8.1, AR 3.11.4; owner TOOLS-GATE).
//   treeHash  = sha256 over the sorted lines "path\0sha256(content)\0exec" of the include set below (existing files only).
//   snapshot  = a private copy of exactly that include set in .cache/snap/<treeHash>/ with node_modules, .cache/cdn and .cache/baseline symlinked,
//               so a gate (or a negative control) runs on a frozen tree while other agents keep editing the shared one.
//   rev mode  = the same include set taken from a git commit with `git archive` (read-only git), so COORD can gate a committed sha and map it to a snapshot.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync, execFileSync } from 'child_process';
import { MAIN_ROOT, SNAP_DIR } from './paths.mjs';

/** Directory prefixes end with '/', 'docs/*.md' style entries are direct-child globs, anything else is an exact file. */
export const SNAP_INCLUDE = [
  'src/', 'tools/', 'tests/', 'package.json', 'package-lock.json',
  'assets/audio/', 'assets/anim/', 'assets/manifest.json', 'assets/CREDITS.md', 'assets/vfx/',
  'release/', 'docs/*.md', 'docs/*.json', 'docs/eras/', 'docs/spec/', 'docs/requests/',
];
/** Symlinks created inside every snapshot (target relative to MAIN_ROOT). */
export const SNAP_LINKS = ['node_modules', '.cache/cdn', '.cache/baseline', '.cache/fonts', '.cache/fonts_uib'];   // read-only inputs that live outside the tracked tree (CDN libs, cached webfonts, the v8 baseline worktree)
const SKIP_DIRS = new Set(['node_modules', '.cache', '.git', '__pycache__']);

export function included(relPath) {
  for (const inc of SNAP_INCLUDE) {
    if (inc.endsWith('/')) { if (relPath.startsWith(inc)) return true; }
    else if (inc.includes('*')) { const [dir, glob] = [path.posix.dirname(inc), path.posix.basename(inc)]; if (path.posix.dirname(relPath) === dir && new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$').test(path.posix.basename(relPath))) return true; }
    else if (relPath === inc) return true;
  }
  return false;
}

function walkFiles(root) {
  const out = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r); else if (included(r)) out.push(r);
    }
  })(root, '');
  return out;
}

/** Candidate files: tracked + untracked-not-ignored (git), else a directory walk. Only existing included files are returned, sorted by code unit. */
export function listFiles(root) {
  let names = null;
  const r = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 });
  if (r.status === 0 && r.stdout.length) names = r.stdout.toString('utf8').split('\0').filter(Boolean);
  if (!names) names = walkFiles(root);
  const seen = new Set();
  const out = [];
  for (const n of names) {
    if (seen.has(n) || !included(n) || n.split('/').some((s) => SKIP_DIRS.has(s))) continue;
    seen.add(n);
    let st; try { st = fs.lstatSync(path.join(root, n)); } catch { continue; }
    if (st.isFile() || st.isSymbolicLink()) out.push(n);
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** @returns {{treeHash:string, files:{path:string,sha:string,exec:boolean,size:number,link?:string}[], bytes:number}} */
export function treeHash(root) {
  const files = [];
  let bytes = 0;
  const h = crypto.createHash('sha256');
  for (const p of listFiles(root)) {
    const abs = path.join(root, p);
    const st = fs.lstatSync(abs);
    let sha, link;
    if (st.isSymbolicLink()) { link = fs.readlinkSync(abs); sha = sha256('symlink:' + link); } else sha = sha256(fs.readFileSync(abs));
    const exec = !!(st.mode & 0o111) && !st.isSymbolicLink();
    files.push({ path: p, sha, exec, size: st.isSymbolicLink() ? 0 : st.size, ...(link ? { link } : {}) });
    bytes += st.size;
    h.update(`${p}\0${sha}\0${exec ? 1 : 0}\n`);
  }
  return { treeHash: h.digest('hex'), files, bytes };
}

/** Same hash from a git revision (tracked files only), through `git archive` into a temp dir. */
export function treeHashOfRev(rev, { repo = MAIN_ROOT } = {}) {
  const dir = extractRev(rev, repo, fs.mkdtempSync(path.join(MAIN_ROOT, '.cache', 'treehash-')));
  try { return treeHash(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function extractRev(rev, repo, dir) {
  fs.mkdirSync(dir, { recursive: true });
  // exact file list of the include set at that revision, archived in chunks (git archive takes pathspecs on the command line only)
  const ls = spawnSync('git', ['ls-tree', '-r', '-z', '--name-only', rev], { cwd: repo, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 });
  if (ls.status !== 0) throw new Error('git ls-tree ' + rev + ': ' + String(ls.stderr || ''));
  const names = ls.stdout.toString('utf8').split('\0').filter((n) => n && included(n));
  for (let i = 0; i < names.length; i += 300) {
    const tar = execFileSync('git', ['archive', '--format=tar', rev, '--', ...names.slice(i, i + 300)], { cwd: repo, maxBuffer: 1024 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    const x = spawnSync('tar', ['-x', '-C', dir], { input: tar });
    if (x.status !== 0) throw new Error('tar extract failed: ' + String(x.stderr || ''));
  }
  return dir;
}

function copyTree(srcRoot, destRoot, files) {
  const made = new Set();
  for (const f of files) {
    const to = path.join(destRoot, f.path);
    const d = path.dirname(to);
    if (!made.has(d)) { fs.mkdirSync(d, { recursive: true }); made.add(d); }
    if (f.link !== undefined) fs.symlinkSync(f.link, to);
    else fs.copyFileSync(path.join(srcRoot, f.path), to, fs.constants.COPYFILE_FICLONE);   // reflink where the filesystem has it, else a plain copy; mode (exec bit) is preserved
  }
}

/**
 * Create (or reuse) the snapshot of `root`.
 * @param {string} root working tree to snapshot (or, with opts.rev, the repository whose commit is archived)
 * @param {{rev?:string, snapDir?:string, linkRoot?:string, th?:object}} opts   `th` = a treeHash(root) result the caller already has
 * @returns {{dir:string, treeHash:string, reused:boolean, files:number, bytes:number, ms:number}}
 */
export function makeSnapshot(root, opts = {}) {
  const t0 = Date.now();
  const snapDir = opts.snapDir || SNAP_DIR;
  const linkRoot = opts.linkRoot || MAIN_ROOT;
  let src = root, tmpRev = null;
  if (opts.rev) { tmpRev = extractRev(opts.rev, root, fs.mkdtempSync(path.join(path.dirname(snapDir), 'rev-'))); src = tmpRev; }
  try {
    const th = opts.th && !opts.rev ? opts.th : treeHash(src);
    const dest = path.join(snapDir, th.treeHash);
    const okFile = path.join(dest, '.snap.ok');
    if (fs.existsSync(okFile)) { const now = new Date(); fs.utimesSync(okFile, now, now); return { dir: dest, treeHash: th.treeHash, reused: true, files: th.files.length, bytes: th.bytes, ms: Date.now() - t0 }; }
    fs.mkdirSync(snapDir, { recursive: true });
    const tmp = dest + '.tmp-' + process.pid;
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    copyTree(src, tmp, th.files);
    for (const l of SNAP_LINKS) {
      const target = path.join(linkRoot, l);
      if (!fs.existsSync(target)) continue;
      fs.mkdirSync(path.dirname(path.join(tmp, l)), { recursive: true });
      fs.symlinkSync(target, path.join(tmp, l));
    }
    fs.writeFileSync(path.join(tmp, '.snap.ok'), JSON.stringify({ treeHash: th.treeHash, files: th.files.length, bytes: th.bytes, rev: opts.rev || null }) + '\n');
    fs.rmSync(dest, { recursive: true, force: true });
    try { fs.renameSync(tmp, dest); } catch (e) { if (fs.existsSync(okFile)) { fs.rmSync(tmp, { recursive: true, force: true }); } else throw e; }   // a concurrent gate on the same tree won the rename
    return { dir: dest, treeHash: th.treeHash, reused: false, files: th.files.length, bytes: th.bytes, ms: Date.now() - t0 };
  } finally { if (tmpRev) fs.rmSync(tmpRev, { recursive: true, force: true }); }
}

/** Remove old snapshots: keep the newest `keep` and anything touched within `graceMin` minutes (another gate may be running in it). */
export function pruneSnapshots({ keep = 4, graceMin = 45, snapDir = SNAP_DIR, protect = [] } = {}) {
  if (!fs.existsSync(snapDir)) return [];
  const rows = fs.readdirSync(snapDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => {
    const p = path.join(snapDir, e.name);
    let m = 0; try { m = fs.statSync(fs.existsSync(path.join(p, '.snap.ok')) ? path.join(p, '.snap.ok') : p).mtimeMs; } catch { /* gone */ }
    return { p, m, name: e.name };
  }).sort((a, b) => b.m - a.m);
  const removed = [];
  rows.forEach((r, i) => {
    if (protect.includes(r.p)) return;
    const stale = /\.tmp-\d+$/.test(r.name) ? Date.now() - r.m > 600000 : i >= keep && Date.now() - r.m > graceMin * 60000;
    if (stale) { fs.rmSync(r.p, { recursive: true, force: true }); removed.push(r.name); }
  });
  return removed;
}
