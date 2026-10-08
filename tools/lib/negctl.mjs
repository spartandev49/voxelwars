// Negative-control engine (VF 3.13; owner TOOLS-VERIFY). tools/negcontrols.mjs is the CLI; tests/verify/negctl_runner.test.mjs proves this file.
//
// A control (tests/negctl/<stem>.mjs, default export) names a criterion, the labels that must go red under a mutation, and the command that evaluates the check:
//   { id, criterion, expectRed:[ '<criterion>/<label>' ], alsoRed?:[..], tier, needs?:['chromium','baseline','build','quiet'], costS, mutate(c), run:[cmd,...args] | {gateStep:'lint'}, mayEdit?:[paths] }
// Flow of one control (runControl):
//   1. the copy: a hard-link clone of an immutable tree (a gate snapshot, never the live working tree) into <work>/<run>/<id>/ ; node_modules and .cache/* stay symlinks;
//   2. an UNMUTATED run of the command in the copy (cached per (treeHash, criterion, command)): it must exit 0 and the named criterion must be registered, executed,
//      with assertions and no failing label, else the result is `baseline-red` (an error, never a pass);
//   3. mutate(c) on the copy: c.edit / c.write / c.remove / c.pad write a NEW file and rename it over the hard link, so the snapshot is never touched; any other write to
//      a still-linked file during mutate() throws (the fs write functions are guarded) and the stat signature of every linked file is re-checked after mutate and after the run;
//   4. the mutated run: failing labels F (`<criterion>/<label>` of every criteria line the run wrote):
//        red-as-expected  expectRed subset of F, and F minus expectRed subset of alsoRed
//        stayed-green     no expectRed label is red and nothing failed at all: the check is vacuous (UNVERIFIED U4 and a red `negctl-vacuous`)
//        wrong-red        anything else (a missing label with other labels red, an unexpected label, or the process crashed without a label)
//   5. the result {treeHash, scriptHash, mutationHash, result, secs, at} goes to <gate dir>/negctl.json, keyed by criterion id with a per-control `controls` map; the aggregate
//      `result` of a criterion is red-as-expected only when EVERY control file of that criterion has a fresh red-as-expected entry (same script hash, same control file).
// A mutation may not edit the check's own script, tests/negctl/**, or tests/baseline/** (threshold ratchets) unless the control lists that file in `mayEdit` (a golden that IS the
// thing under test). mutate() must be synchronous.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import module from 'module';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';
import { listFiles, SNAP_LINKS, makeSnapshot, treeHash as hashTree } from './snapshot.mjs';
import { MAIN_ROOT, GATE_DIR, ROOT, CHROMIUM } from './paths.mjs';
import { tierRank } from './er_rollup.mjs';

export const RESULTS = ['red-as-expected', 'stayed-green', 'wrong-red', 'baseline-red', 'unavailable', 'error'];
export const NEEDS = ['chromium', 'baseline', 'build', 'quiet'];
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const fileSha = (f) => { try { return sha256(fs.readFileSync(f)); } catch { return null; } };
const posix = (p) => p.split(path.sep).join('/');
const BARRED_PREFIXES = ['tests/negctl/', 'tests/baseline/'];

// ---------------------------------------------------------------------------------------------------------------- controls on disk
export const controlsDir = (root) => path.join(root, 'tests/negctl');

/** Import every control of a tree. -> [{stem, file, hash, nc, errors:[]}] sorted by stem. */
export async function loadControls(root, dir = controlsDir(root)) {
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort(); } catch { return []; }
  const out = [];
  for (const n of names) {
    const f = path.join(dir, n);
    const stem = n.slice(0, -4);
    let nc = null; const errors = [];
    try { nc = (await import(pathToFileURL(f).href + '?h=' + fileSha(f))).default; } catch (e) { errors.push('cannot import: ' + String(e && e.message).slice(0, 160)); }
    if (nc) errors.push(...validateControl(nc, stem, root));
    out.push({ stem, file: posix(path.relative(root, f)), hash: fileSha(f), nc, errors });
  }
  const seen = new Map();
  for (const c of out) if (c.nc && c.nc.id) { if (seen.has(c.nc.id)) { c.errors.push(`id ${c.nc.id} also used by ${seen.get(c.nc.id)}`); } else seen.set(c.nc.id, c.stem); }
  return out;
}

/** Shape rules of VF 3.13. Returns a list of problems (empty = valid). */
export function validateControl(nc, stem, root) {
  const e = [];
  if (!nc || typeof nc !== 'object') return ['default export is not an object'];
  if (typeof nc.id !== 'string' || !nc.id) e.push('id missing');
  if (typeof nc.criterion !== 'string' || !nc.criterion) e.push('criterion missing');
  else if (stem !== nc.criterion && !stem.startsWith(nc.criterion + '-')) e.push(`file name must be <criterion>.mjs or <criterion>-<suffix>.mjs (criterion ${nc.criterion}, file ${stem})`);
  if (!Array.isArray(nc.expectRed) || !nc.expectRed.length) e.push('expectRed must be a non-empty array');
  else for (const l of nc.expectRed) if (typeof l !== 'string' || !l.startsWith((nc.criterion || '?') + '/')) e.push(`expectRed label "${l}" must start with "${nc.criterion}/"`);
  if (nc.alsoRed != null && (!Array.isArray(nc.alsoRed) || nc.alsoRed.some((x) => typeof x !== 'string'))) e.push('alsoRed must be an array of strings');
  if (typeof nc.mutate !== 'function') e.push('mutate(c) missing');
  if (nc.tier != null && !/^(T-fast|T-era|T-full|release|heavy)$/.test(nc.tier)) e.push('tier must be T-fast|T-era|T-full|release|heavy');
  if (nc.needs != null && (!Array.isArray(nc.needs) || nc.needs.some((x) => !NEEDS.includes(x)))) e.push('needs must be a subset of ' + NEEDS.join(' '));
  if (nc.costS != null && !(nc.costS > 0)) e.push('costS must be a positive number (seconds of the mutated run)');
  if (nc.mayEdit != null && (!Array.isArray(nc.mayEdit) || nc.mayEdit.some((x) => typeof x !== 'string'))) e.push('mayEdit must be an array of paths');
  const run = nc.run;
  if (Array.isArray(run)) {
    if (!run.length || run.some((x) => typeof x !== 'string')) e.push('run must be an array of strings');
    else if (root) {
      const script = scriptArg(run);
      if (script && !fs.existsSync(path.join(root, script))) e.push(`run script ${script} does not exist`);
    }
  } else if (run && typeof run === 'object' && typeof run.gateStep === 'string') { /* a gate step */ } else e.push('run must be [cmd, ...args] or {gateStep}');
  return e;
}

/** The file argument of `node <script> ...` (the check's own script), or null. */
export function scriptArg(run) {
  if (!Array.isArray(run)) return null;
  return run.slice(1).find((a) => /\.(mjs|js|cjs)$/.test(a) && !a.startsWith('-')) || null;
}
export const scriptOf = (nc, root) => (nc && Array.isArray(nc.run) && scriptArg(nc.run) ? scriptArg(nc.run) : null);

// ---------------------------------------------------------------------------------------------------------------- the copy
/** Hard-link clone of the include set of `src` (a frozen tree) into `dest`; SNAP_LINKS stay symlinks. Returns the stat stamp of every linked file. */
export function cloneTree(src, dest, { linkRoot = MAIN_ROOT } = {}) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const stamp = new Map();
  const made = new Set();
  for (const f of listFiles(src)) {
    const from = path.join(src, f), to = path.join(dest, f);
    const d = path.dirname(to);
    if (!made.has(d)) { fs.mkdirSync(d, { recursive: true }); made.add(d); }
    const st = fs.lstatSync(from);
    if (st.isSymbolicLink()) { fs.symlinkSync(fs.readlinkSync(from), to); continue; }
    try { fs.linkSync(from, to); } catch (e) { if (e.code === 'EXDEV' || e.code === 'EPERM') fs.copyFileSync(from, to); else throw e; }
    const t = fs.lstatSync(to);
    stamp.set(f, { ino: t.ino, size: t.size, mtimeMs: t.mtimeMs });
  }
  for (const l of SNAP_LINKS) {
    const own = path.join(src, l);
    let target = null;
    try { if (fs.lstatSync(own).isSymbolicLink()) target = fs.readlinkSync(own); } catch { /* none */ }
    if (!target && fs.existsSync(path.join(linkRoot, l))) target = path.join(linkRoot, l);
    if (!target) continue;
    fs.mkdirSync(path.dirname(path.join(dest, l)), { recursive: true });
    fs.symlinkSync(target, path.join(dest, l));
  }
  return stamp;
}

/** Files of the copy that still share their inode with the frozen tree but changed (size or mtime): an in-place write reached the snapshot. */
export function inPlaceViolations(dest, stamp) {
  const bad = [];
  for (const [f, s] of stamp) {
    let t; try { t = fs.lstatSync(path.join(dest, f)); } catch { continue; }       // removed in the copy: the link is gone, the snapshot is intact
    if (t.ino === s.ino && (t.size !== s.size || t.mtimeMs !== s.mtimeMs)) bad.push(f);
  }
  return bad;
}

const WRITE_FLAGS = /[wa+]/;
const O_WRITE = fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_APPEND | fs.constants.O_TRUNC;
/** While fn() runs (synchronously), any fs write that would modify a still-hard-linked file under `dir` throws. */
export function withWriteGuard(dir, fn) {
  const real = path.resolve(dir) + path.sep;
  const linked = (p) => {
    if (p == null || typeof p === 'number') return null;
    let abs; try { abs = path.resolve(Buffer.isBuffer(p) ? p.toString() : p instanceof URL ? p.pathname : String(p)); } catch { return null; }
    if (!abs.startsWith(real)) return null;
    try { const st = fs.lstatSync(abs); return st.isFile() && st.nlink > 1 ? abs : null; } catch { return null; }
  };
  const deny = (what, abs) => { throw new Error(`in-place ${what} of hard-linked ${posix(path.relative(dir, abs))} would modify the frozen snapshot; mutate only through c.edit / c.write / c.remove / c.pad`); };
  const patches = [
    ['writeFileSync', (a) => [a[0]]], ['appendFileSync', (a) => [a[0]]], ['truncateSync', (a) => [a[0]]], ['copyFileSync', (a) => [a[1]]],
    ['chmodSync', (a) => [a[0]]], ['utimesSync', (a) => [a[0]]], ['cpSync', (a) => [a[1]]], ['createWriteStream', (a) => [a[0]]],
  ];
  const saved = [];
  for (const [name, targets] of patches) {
    const orig = fs[name]; if (typeof orig !== 'function') continue;
    saved.push([name, orig]);
    fs[name] = function guarded(...a) { for (const t of targets(a)) { const abs = linked(t); if (abs) deny(name.replace(/Sync$/, ''), abs); } return orig.apply(this, a); };
  }
  const origOpen = fs.openSync; saved.push(['openSync', origOpen]);
  fs.openSync = function guardedOpen(p, flags, ...r) {
    const w = typeof flags === 'number' ? (flags & O_WRITE) !== 0 : typeof flags === 'string' && WRITE_FLAGS.test(flags);
    if (w) { const abs = linked(p); if (abs) deny('open for writing', abs); }
    return origOpen.call(this, p, flags, ...r);
  };
  const pnames = ['writeFile', 'appendFile', 'truncate', 'copyFile', 'chmod', 'utimes', 'open'];
  const psaved = [];
  for (const name of pnames) {
    const orig = fs.promises[name]; if (typeof orig !== 'function') continue;
    psaved.push([name, orig]);
    fs.promises[name] = function guardedP(...a) { const t = name === 'copyFile' ? a[1] : a[0]; const w = name !== 'open' || (typeof a[1] === 'string' ? WRITE_FLAGS.test(a[1]) : false); if (w) { const abs = linked(t); if (abs) return Promise.reject(new Error(`in-place ${name} of hard-linked ${posix(path.relative(dir, abs))} would modify the frozen snapshot`)); } return orig.apply(this, a); };
  }
  module.syncBuiltinESMExports();
  try { return fn(); } finally {
    for (const [n, o] of saved) fs[n] = o;
    for (const [n, o] of psaved) fs.promises[n] = o;
    module.syncBuiltinESMExports();
  }
}

/** The mutation context `c` handed to mutate(). Every write replaces the hard link by a new file. ops[] feeds the mutation hash. */
export function makeContext(dir, { nc, selfScript = null, scriptFiles = [] } = {}) {
  const ops = [];
  const mayEdit = new Set((nc && nc.mayEdit) || []);
  const guard = (f) => {
    const abs = path.resolve(dir, f);
    const rel = posix(path.relative(dir, abs));
    if (!abs.startsWith(path.resolve(dir) + path.sep)) throw new Error(`negctl: mutation outside the copy: ${f}`);
    const top = rel.split('/')[0];
    if (SNAP_LINKS.some((l) => rel === l || rel.startsWith(l + '/')) || top === 'node_modules' || top === '.cache') throw new Error(`negctl: ${f} is a shared (symlinked) path and cannot be mutated`);
    if (!mayEdit.has(rel)) {
      if (BARRED_PREFIXES.some((p) => rel.startsWith(p))) throw new Error(`negctl: a mutation may not edit ${rel} (negative controls and threshold baselines are fixed; list the file in mayEdit only when it IS the thing under test)`);
      if (selfScript && rel === selfScript) throw new Error(`negctl: a mutation may not edit the check's own script ${rel}`);
      if (scriptFiles.includes(rel)) throw new Error(`negctl: a mutation may not edit the check's own script ${rel}`);
    }
    return { abs, rel };
  };
  const put = (abs, data) => {
    const tmp = abs + '.negctl-' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(tmp, data);
    try { fs.chmodSync(tmp, fs.existsSync(abs) ? fs.statSync(abs).mode & 0o777 : 0o644); } catch { /* keep default */ }
    fs.renameSync(tmp, abs);
  };
  const c = {
    dir,
    ops,
    read(f) { return fs.readFileSync(guardRead(dir, f), 'utf8'); },
    exists(f) { return fs.existsSync(path.resolve(dir, f)); },
    edit(f, re, rep) {
      const { abs, rel } = guard(f);
      let text; try { text = fs.readFileSync(abs, 'utf8'); } catch { throw new Error(`c.edit(${rel}): no such file`); }
      const next = text.replace(re, rep);
      if (next === text) throw new Error(`c.edit(${rel}): the pattern ${re} changed nothing (a mutation that does nothing proves nothing)`);
      put(abs, next); ops.push(['edit', rel, sha256(next)]);
    },
    write(f, content) { const { abs, rel } = guard(f); fs.mkdirSync(path.dirname(abs), { recursive: true }); put(abs, content); ops.push(['write', rel, sha256(content)]); },
    remove(f) { const { abs, rel } = guard(f); if (!fs.existsSync(abs)) throw new Error(`c.remove(${rel}): no such file`); fs.rmSync(abs); ops.push(['remove', rel, '']); },
    pad(f, bytes) {
      const { abs, rel } = guard(f);
      const next = Buffer.concat([fs.readFileSync(abs), Buffer.from('\n' + ' '.repeat(Math.max(0, bytes - 1)))]);
      put(abs, next); ops.push(['pad', rel, sha256(next)]);
    },
  };
  return c;
}
function guardRead(dir, f) { const abs = path.resolve(dir, f); if (!abs.startsWith(path.resolve(dir) + path.sep)) throw new Error('negctl: read outside the copy: ' + f); return abs; }
export const mutationHash = (ops) => sha256(JSON.stringify(ops)).slice(0, 16);

// ---------------------------------------------------------------------------------------------------------------- running a command in the copy
const children = new Set();
let exitHookInstalled = false;
function installExitHook() {
  if (exitHookInstalled) return; exitHookInstalled = true;
  const kill = () => { for (const pid of children) { try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } } } };
  process.on('exit', kill);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { kill(); process.exit(130); });
}

/** Run `cmd` in `dir`; criteria lines come back through $VW_CRITERIA_OUT. -> {status, signal, timedOut, ms, lines, failed:Set, tail} */
export function runIn(dir, cmd, { env = {}, mainRoot = MAIN_ROOT, timeoutMs = 300000, treeHash = '' } = {}) {
  installExitHook();
  return new Promise((resolve) => {
    const out = path.join(dir, '.criteria.jsonl');
    fs.rmSync(out, { force: true });
    const e = { ...process.env, ...env, VW_CRITERIA_OUT: out, VW_MAIN_ROOT: mainRoot, VW_GATE_DIR: path.join(dir, '.gate'), VW_TREEHASH: treeHash, VW_NEGCTL: '1' };
    for (const k of ['VW_SNAP', 'VW_DIST', 'VW_PAGE_STANDALONE', 'VW_PAGE_FRAGMENT']) delete e[k];
    const t0 = Date.now();
    const p = spawn(cmd[0], cmd.slice(1), { cwd: dir, env: e, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    children.add(p.pid);
    let buf = '';
    const eat = (d) => { buf += d; if (buf.length > 20000) buf = buf.slice(-12000); };
    p.stdout.on('data', eat); p.stderr.on('data', eat);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-p.pid, 'SIGKILL'); } catch { /* gone */ } }, timeoutMs);
    const done = (status, signal) => {
      clearTimeout(timer); children.delete(p.pid);
      let lines = [];
      try { lines = fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { /* the process died before writing */ }
      const failed = new Set();
      for (const l of lines) for (const f of l.failures || []) failed.add(`${l.id}/${f}`);
      resolve({ status, signal, timedOut, ms: Date.now() - t0, lines, failed, tail: buf.trim().split('\n').slice(-8).join('\n') });
    };
    p.on('error', (err) => { buf += '\nspawn error: ' + err.message; done(127, null); });
    p.on('close', (code, signal) => done(code, signal));
  });
}

/** The command of a control; a gate step runs `tools/gate.mjs --steps=<step>` and reds become labels `gate/<red item>`. */
export function commandOf(nc) {
  if (Array.isArray(nc.run)) return { cmd: nc.run, gate: null };
  const step = nc.run.gateStep;
  return { cmd: ['node', 'tools/gate.mjs', `--steps=${step}`, '--no-snapshot', '--no-cache', '--jobs=1', '--json'], gate: step };
}
function gateLabels(dir, res) {
  const out = new Set();
  try {
    const last = JSON.parse(fs.readFileSync(path.join(dir, '.gate', 'last.json'), 'utf8'));
    for (const r of last.red || []) out.add('gate/' + String(r).split(/\s+/)[0]);
  } catch { /* no log: the exit code decides */ }
  if (res.status !== 0 && !out.size) out.add('gate/exit:' + res.status);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- classification
/** @returns {{result:string, missing:string[], extra:string[]}} per VF 3.13 (3). */
export function classify(nc, F, { status = 0, crashed = false } = {}) {
  const exp = nc.expectRed, also = new Set(nc.alsoRed || []);
  const missing = exp.filter((l) => !F.has(l));
  const extra = [...F].filter((l) => !exp.includes(l) && !also.has(l)).sort();
  if (!missing.length && !extra.length) return { result: 'red-as-expected', missing, extra };
  if (missing.length === exp.length && F.size === 0 && status === 0 && !crashed) return { result: 'stayed-green', missing, extra };
  return { result: 'wrong-red', missing, extra };
}

// ---------------------------------------------------------------------------------------------------------------- availability of the needs
export function unmetNeeds(nc, { mainRoot = MAIN_ROOT } = {}) {
  const out = [];
  for (const n of nc.needs || []) {
    if (n === 'chromium' && !fs.existsSync(CHROMIUM)) out.push('chromium (' + CHROMIUM + ' missing)');
    if (n === 'baseline' && !fs.existsSync(path.join(mainRoot, '.cache/baseline/ancient-v8/src/sim/world.js'))) out.push('baseline (.cache/baseline/ancient-v8 missing)');
    if (n === 'build' && !fs.existsSync(path.join(ROOT, 'node_modules/esbuild'))) out.push('build (esbuild missing)');
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- the store
export const storeFile = (gateDir = GATE_DIR) => path.join(gateDir, 'negctl.json');
export function readStore(file) { try { const s = JSON.parse(fs.readFileSync(file, 'utf8')); return s && typeof s === 'object' ? s : {}; } catch { return {}; } }

function withLock(dir, fn) {
  const lock = dir + '.lock';
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const t0 = Date.now();
  for (;;) {
    try { fs.mkdirSync(lock); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 30000) { fs.rmSync(lock, { recursive: true, force: true }); continue; } } catch { /* raced */ }
      if (Date.now() - t0 > 20000) throw new Error('negctl store is locked: ' + lock);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  try { return fn(); } finally { fs.rmSync(lock, { recursive: true, force: true }); }
}

/**
 * Merge one result into the store file. `all` = [{stem, file, hash, nc}] of every control of the tree (aggregation needs the full list), `scriptHashes` = {criterion: hash now}.
 * Aggregate rule: red-as-expected only if every control of the criterion has an entry whose scriptHash equals the current one and whose control-file hash is unchanged.
 */
export function recordResult(file, res, all, scriptHashes) {
  withLock(file, () => {
    const store = readStore(file);
    const k = res.criterion;
    const cur = store[k] || { controls: {} };
    cur.controls = cur.controls || {};
    cur.controls[res.id] = {
      file: res.file, result: res.result, treeHash: res.treeHash, scriptHash: res.scriptHash, negctlHash: res.negctlHash, mutationHash: res.mutationHash || null,
      secs: res.secs, at: res.at, failed: res.failed, missing: res.missing, extra: res.extra, ...(res.detail ? { detail: String(res.detail).slice(0, 400) } : {}),
    };
    store[k] = aggregate(cur, k, all, scriptHashes[k] || res.scriptHash);
    store[k].treeHash = res.treeHash; store[k].at = res.at;
    writeAtomic(file, store);
  });
}
function writeAtomic(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1) + '\n');
  fs.renameSync(tmp, file);
}

export function aggregate(entry, criterion, all, scriptHash) {
  const mine = all.filter((c) => c.nc && c.nc.criterion === criterion);
  const controls = {};
  const pending = [];
  let worst = null;
  for (const c of mine) {
    const e = entry.controls[c.nc.id];
    if (!e) { pending.push(c.nc.id); continue; }
    controls[c.nc.id] = e;
    if (e.scriptHash !== scriptHash || e.negctlHash !== c.hash) { pending.push(c.nc.id); continue; }
    if (e.result !== 'red-as-expected' && (!worst || RESULTS.indexOf(e.result) > RESULTS.indexOf(worst))) worst = e.result;
  }
  // entries of controls that no longer exist are dropped; entries for stale ones stay visible in `controls`
  const result = worst || (pending.length ? 'incomplete' : 'red-as-expected');
  return { result, scriptHash, ...(pending.length ? { pending: pending.sort() } : {}), controls: Object.fromEntries(Object.entries(controls).sort()) };
}

// ---------------------------------------------------------------------------------------------------------------- baseline cache
function baselineFile(gateDir) { return path.join(gateDir, 'negctl_base.json'); }
function baselineKey(nc, treeHash) { return sha256(treeHash + '\0' + nc.criterion + '\0' + JSON.stringify(nc.run)).slice(0, 24); }
const inflight = new Map();

// ---------------------------------------------------------------------------------------------------------------- one control
/**
 * @param {object} c       a loaded control {stem, file, hash, nc}
 * @param {{srcDir:string, treeHash:string, workBase:string, mainRoot?:string, gateDir?:string, keep?:boolean, timeoutScale?:number, useBaselineCache?:boolean}} o
 * @returns {Promise<object>} {id, criterion, file, result, failed, missing, extra, detail, secs, treeHash, scriptHash, negctlHash, mutationHash, at}
 */
export async function runControl(c, o) {
  const nc = c.nc;
  const t0 = Date.now();
  const mainRoot = o.mainRoot || MAIN_ROOT;
  const gateDir = o.gateDir || GATE_DIR;
  const base = { id: nc.id, criterion: nc.criterion, file: c.file, negctlHash: c.hash, treeHash: o.treeHash, scriptHash: null, mutationHash: null, failed: [], missing: [], extra: [], detail: '', at: new Date().toISOString() };
  const fin = (r) => ({ ...base, ...r, secs: +((Date.now() - t0) / 1000).toFixed(2), at: new Date().toISOString() });
  const unmet = unmetNeeds(nc, { mainRoot });
  if (unmet.length) return fin({ result: 'unavailable', detail: 'needs not met: ' + unmet.join('; ') });
  const work = path.join(o.workBase, nc.id.replace(/[^A-Za-z0-9_.-]/g, '_') + '-' + process.pid);
  const { cmd, gate } = commandOf(nc);
  const timeoutMs = Math.max(60, (nc.costS || 30) * 8) * 1000 * (o.timeoutScale || 1);
  const own = scriptOf(nc);
  let stamp;
  try {
    stamp = cloneTree(o.srcDir, work, { linkRoot: mainRoot });
    base.scriptHash = own ? fileSha(path.join(work, own)) : null;
    // ---- 2. the unmutated run (once per (treeHash, command))
    const key = baselineKey(nc, o.treeHash);
    let bl = o.useBaselineCache === false ? null : readStore(baselineFile(gateDir))[key];
    if (!bl) {
      const p = inflight.get(key) || (async () => {
        const r = await runIn(work, cmd, { mainRoot, timeoutMs, treeHash: o.treeHash });
        const failed = gate ? gateLabels(work, r) : r.failed;
        const mine = r.lines.find((l) => l.id === nc.criterion);
        return { status: r.status, timedOut: r.timedOut, failed: [...failed].filter((x) => gate || x.startsWith(nc.criterion + '/')), registered: gate ? true : !!mine, skipped: mine ? mine.skipped : null, assertions: mine ? mine.assertions : (gate ? 1 : 0), scriptHash: mine ? mine.scriptHash : null, file: mine ? mine.file : null, tail: r.tail, ms: r.ms };
      })();
      inflight.set(key, p);
      try { bl = await p; } finally { inflight.delete(key); }
      if (bl.status === 0 && !bl.failed.length && bl.registered && !bl.skipped && bl.assertions > 0 && o.useBaselineCache !== false) {
        withLock(baselineFile(gateDir), () => { const s = readStore(baselineFile(gateDir)); s[key] = { ...bl, tail: '', at: new Date().toISOString(), treeHash: o.treeHash }; const keys = Object.keys(s); if (keys.length > 400) for (const k of keys.filter((x) => s[x].treeHash !== o.treeHash).slice(0, keys.length - 300)) delete s[k]; writeAtomic(baselineFile(gateDir), s); });
      }
    }
    if (bl.scriptHash) base.scriptHash = bl.scriptHash;
    const bad = bl.timedOut ? 'the unmutated run timed out' : bl.status !== 0 ? `the unmutated run exited ${bl.status}` : bl.failed.length ? `labels red before any mutation: ${bl.failed.join(', ')}` : !bl.registered ? `criterion ${nc.criterion} was not registered by the command` : bl.skipped ? `criterion ${nc.criterion} was skipped: ${bl.skipped}` : bl.assertions === 0 ? `criterion ${nc.criterion} ran zero assertions` : '';
    if (bad) return fin({ result: 'baseline-red', failed: bl.failed, detail: bad + (bl.tail ? '\n' + bl.tail : '') });
    // the unmutated run may have written into the copy (caches); the stamp covers only linked files
    const pre = inPlaceViolations(work, stamp);
    if (pre.length) return fin({ result: 'error', detail: 'the unmutated run wrote in place to linked files (the snapshot is damaged): ' + pre.slice(0, 5).join(', ') });
    // ---- 3. the mutation
    const ctx = makeContext(work, { nc, selfScript: own, scriptFiles: bl.file ? [bl.file] : [] });
    try {
      const r = withWriteGuard(work, () => nc.mutate(ctx));
      if (r && typeof r.then === 'function') throw new Error('mutate(c) must be synchronous');
    } catch (e) { return fin({ result: 'error', detail: 'mutation failed: ' + String(e && e.message).slice(0, 300) }); }
    const viol = inPlaceViolations(work, stamp);
    if (viol.length) return fin({ result: 'error', detail: 'in-place write to the frozen snapshot: ' + viol.slice(0, 5).join(', ') });
    base.mutationHash = mutationHash(ctx.ops);
    // ---- 4. the mutated run
    const m = await runIn(work, cmd, { mainRoot, timeoutMs, treeHash: o.treeHash });
    const F = gate ? gateLabels(work, m) : new Set([...m.failed].filter((x) => x.startsWith(nc.criterion + '/')));
    const crashed = !gate && !m.lines.some((l) => l.id === nc.criterion);
    const cl = classify(nc, F, { status: m.status, crashed: crashed && m.status !== 0 });
    const after = inPlaceViolations(work, stamp);
    if (after.length) return fin({ result: 'error', detail: 'the mutated run wrote in place to linked files (the snapshot is damaged): ' + after.slice(0, 5).join(', ') });
    return fin({ result: cl.result, failed: [...F].sort(), missing: cl.missing, extra: cl.extra, detail: cl.result === 'red-as-expected' ? '' : (m.timedOut ? 'timed out; ' : '') + (crashed && m.status !== 0 ? 'the mutated command crashed before the criterion registered; ' : '') + m.tail });
  } catch (e) {
    return fin({ result: 'error', detail: String(e && e.stack || e).split('\n').slice(0, 4).join(' | ') });
  } finally {
    if (!o.keep) fs.rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------- selection
function seeded(seed) {
  const h = crypto.createHash('sha256').update(String(seed)).digest();
  let s = h.readUInt32LE(0) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Deterministic shuffle of items (seed string) -> new array. */
export function shuffle(items, seed) {
  const a = items.slice(), r = seeded(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** A control is stale when it never ran, or its stored script hash / control-file hash differs from the current one. */
export function isStale(c, store, scriptHashNow) {
  const e = store[c.nc.criterion] && store[c.nc.criterion].controls && store[c.nc.criterion].controls[c.nc.id];
  if (!e) return true;
  return e.scriptHash !== scriptHashNow || e.negctlHash !== c.hash;
}
/**
 * @param {object[]} controls loaded, valid controls
 * @param {{mode:'all'|'sample'|'draw'|'id', frac?:number, count?:number, seed?:string, ids?:string[], tierMax?:string, store?:object, scriptHashOf?:(c)=>string|null}} s
 */
export function select(controls, s) {
  const max = tierRank(s.tierMax == null ? (s.mode === 'all' ? 'heavy' : s.mode === 'sample' ? 'T-full' : 'heavy') : s.tierMax);
  const ok = controls.filter((c) => c.nc && !c.errors.length);
  const eligible = ok.filter((c) => tierRank(c.nc.tier || 'T-fast') <= max).sort((a, b) => (a.nc.id < b.nc.id ? -1 : 1));
  if (s.mode === 'all') return eligible;
  if (s.mode === 'id') {
    const out = [];
    for (const id of s.ids) {
      const hit = ok.filter((c) => c.nc.id === id || c.stem === id || c.nc.criterion === id);
      if (!hit.length) throw new Error(`no negative control matches "${id}" (an NC id, a file stem or a criterion id)`);
      for (const h of hit) if (!out.includes(h)) out.push(h);
    }
    return out;
  }
  if (s.mode === 'draw') {
    if (eligible.length < s.count) throw new Error(`only ${eligible.length} controls available, cannot draw ${s.count}`);
    return shuffle(eligible, s.seed).slice(0, s.count);
  }
  if (s.mode === 'sample') {
    const n = s.count != null ? s.count : Math.max(1, Math.ceil(eligible.length * s.frac));
    const pick = shuffle(eligible, s.seed).slice(0, n);
    const store = s.store || {};
    for (const c of eligible) if (!pick.includes(c) && isStale(c, store, s.scriptHashOf ? s.scriptHashOf(c) : null)) pick.push(c);
    return pick.sort((a, b) => (a.nc.id < b.nc.id ? -1 : 1));
  }
  throw new Error('unknown selection mode ' + s.mode);
}

// ---------------------------------------------------------------------------------------------------------------- the pool
/** Run `items` with at most `jobs` at once and at most `chromiumMax` controls that need chromium; `quiet` controls run alone. LPT order by costS. */
export async function runPool(items, { jobs = 3, chromiumMax = 2, run, onDone }) {
  const queue = items.slice().sort((a, b) => (b.nc.costS || 30) - (a.nc.costS || 30));
  const running = new Set();
  const results = [];
  let chromium = 0, quietRunning = false;
  await new Promise((resolve) => {
    const pump = () => {
      for (let i = 0; i < queue.length && running.size < jobs;) {
        const c = queue[i];
        const needs = c.nc.needs || [];
        const isQuiet = needs.includes('quiet'), isChrome = needs.includes('chromium');
        const blocked = quietRunning || (isQuiet && running.size > 0) || (isChrome && chromium >= chromiumMax);
        if (blocked) { i++; continue; }
        queue.splice(i, 1);
        running.add(c); if (isChrome) chromium++; if (isQuiet) quietRunning = true;
        run(c).then((r) => { results.push(r); if (onDone) onDone(r); }, (e) => { const r = { id: c.nc.id, criterion: c.nc.criterion, result: 'error', detail: String(e && e.stack || e), failed: [], missing: [], extra: [], secs: 0 }; results.push(r); if (onDone) onDone(r); })
          .finally(() => { running.delete(c); if (isChrome) chromium--; if (isQuiet) quietRunning = false; pump(); });
        if (isQuiet) break;
      }
      if (!running.size && !queue.length) resolve();
      else if (!running.size && queue.length) { /* only blocked items remain with nothing running: cannot happen */ resolve(); }
    };
    pump();
  });
  return results.sort((a, b) => (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------------------- lint of the manifest of controls
/** Hygiene of the whole set: file shape, naming, uniqueness, and (given the criteria manifest) a control file per criterion (PL15). */
export function lintControls(controls, manifest) {
  const problems = [];
  for (const c of controls) for (const e of c.errors) problems.push(`${c.file}: ${e}`);
  if (manifest) {
    const have = new Set(controls.filter((c) => c.nc).map((c) => c.nc.criterion));
    const prim = new Set(controls.map((c) => c.stem));
    for (const m of manifest.criteria) {
      if (!have.has(m.id)) problems.push(`criterion ${m.id} (${m.file}) has no negative control (tests/negctl/${m.id}.mjs)`);
      else if (!prim.has(m.id)) problems.push(`criterion ${m.id} has controls but no primary file tests/negctl/${m.id}.mjs`);
    }
    const ids = new Set(manifest.criteria.map((m) => m.id));
    for (const c of controls) if (c.nc && c.nc.criterion && !ids.has(c.nc.criterion)) problems.push(`${c.file}: criterion ${c.nc.criterion} is not in the criteria manifest (stale control or manifest drift)`);
  }
  return problems;
}

export { makeSnapshot, hashTree };
