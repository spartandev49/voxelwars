// Shared plumbing of the golden recorders (TOOLS-GOLDEN; docs/eras/spec/VF.md 3.6 "Common rules"): hashing helpers, the data-only normaliser, a deep diff
// that names the first differences, and `recordCli`, the one CLI every g<N>_record.mjs uses.
//
// recordCli contract (identical for g2, g3, g4, g7):
//   node tools/golden/g<N>_record.mjs [--worktree=<dir>] [--out=<file>] [--check] [--engine=node|chromium (g2 only)] [--regime=baked (g6 also: default_meta)] [--help]
//   (default)  record: refuses unless `git rev-parse HEAD` of the worktree is the baseline sha; collects TWICE in two fresh child processes and refuses to
//              write unless both runs are byte-identical (determinism self-check, VF 3.6 rule 2); writes the record through makeRecord/writeRecord (rule 3).
//   --check    collect once from the worktree and compare with the committed file (data only); exit 1 and the first differences on any mismatch.
//   --emit=<f> (internal) collect and write the data as canonical JSON to <f>; this is what the two child processes run.
// exit: 0 ok, 1 refused / mismatch / failure, 2 usage
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { assertBaseline, BASELINE_WORKTREE, BASELINE_TAG, BASELINE_SHA } from './baseline.mjs';
import { makeRecord, writeRecord, readRecord, canonicalJSON } from '../lib/records.mjs';
import { fingerprint } from '../lib/fingerprint.mjs';
import { ROOT } from '../lib/paths.mjs';
import { fnv32 } from './hash_core.mjs';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
/** First 12 hex digits of sha256: the per-key hashes (diff output), not a security boundary. */
export const sha12 = (s) => sha256(s).slice(0, 12);
export { fnv32 };

/**
 * Data-only deep clone: plain objects (own enumerable keys, `undefined` dropped like JSON does), arrays, strings, finite numbers, booleans, null.
 * Anything else (function, RegExp, Map, Set, Date, class instance, NaN, Infinity, undefined inside an array) throws with its path, so a text module
 * that grows a non-JSON value cannot be silently half-hashed.  With `onFunction(path)` a function that is the VALUE OF AN OBJECT KEY is dropped and reported
 * (achievement predicates next to their text); a function as an array element still throws.
 */
export function norm(v, at = '$', onFunction = null) {
  if (typeof v === 'function' && onFunction) { onFunction(at); return undefined; }
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new TypeError(`norm: non-finite number at ${at}`); return v; }
  if (Array.isArray(v)) return v.map((x, i) => { const n = norm(x, `${at}[${i}]`, onFunction); if (n === undefined) throw new TypeError(`norm: undefined or function array element at ${at}[${i}]`); return n; });
  if (typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`norm: non-plain object (${(v.constructor && v.constructor.name) || 'unknown'}) at ${at}`);
    const o = {};
    for (const k of Object.keys(v)) { if (v[k] === undefined) continue; const n = norm(v[k], `${at}.${k}`, onFunction); if (n !== undefined) o[k] = n; }
    return o;
  }
  throw new TypeError(`norm: ${typeof v} at ${at}`);
}

/** Deep differences between two JSON values -> [{path, a, b}] (at most `max`), arrays by index, objects by sorted key union. */
export function deepDiff(a, b, max = 8, at = '$', out = []) {
  if (out.length >= max) return out;
  const brief = (x) => { const s = JSON.stringify(x); return s === undefined ? 'undefined' : s.length > 70 ? s.slice(0, 67) + '...' : s; };
  if (a === b) return out;
  const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a, tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
  if (ta !== tb || (ta !== 'array' && ta !== 'object')) { out.push({ path: at, a: brief(a), b: brief(b) }); return out; }
  if (ta === 'array') {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n && out.length < max; i++) deepDiff(a[i], b[i], max, `${at}[${i}]`, out);
    return out;
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const k of keys) { if (out.length >= max) break; deepDiff(a[k], b[k], max, `${at}.${k}`, out); }
  return out;
}

/** {changed:[keys with different values], missing:[keys only in `want`], extra:[keys only in `have`]} for two plain maps (key order is not compared). */
export function mapDiff(want, have) {
  const changed = [], missing = [], extra = [];
  for (const k of Object.keys(want)) { if (!(k in have)) missing.push(k); else if (canonicalJSON(want[k]) !== canonicalJSON(have[k])) changed.push(k); }
  for (const k of Object.keys(have)) if (!(k in want)) extra.push(k);
  return { changed, missing, extra };
}

const MAIN_FILE = (url) => new URL(url).pathname;
/** True when `importMetaUrl` is the script node was started with. */
export const isMain = (importMetaUrl) => !!process.argv[1] && path.resolve(process.argv[1]) === path.resolve(MAIN_FILE(importMetaUrl));

function helpFrom(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((l, i, arr) => arr.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
}

/**
 * spec = { script (absolute path of the g<N>_record.mjs), id ('g2'), kind (record kind), defaultOut, collect(opts) -> {data, meta?} (async; opts = {worktree, engine}),
 *          engines? (['node'] default; g2 adds 'chromium'), engineVersion?(opts, data) -> string for chromium records, outFor?(opts) -> default out path per engine }
 */
export async function recordCli(spec, argv) {
  const opt = { worktree: BASELINE_WORKTREE, out: null, check: false, emit: null, engine: 'node', regime: 'baked' };
  const engines = spec.engines || ['node'], regimes = spec.regimes || ['baked'];
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(helpFrom(spec.script)); return 0; }
    if (a === '--check') { opt.check = true; continue; }
    const m = /^--(worktree|out|emit|engine|regime)=(.+)$/.exec(a);
    if (!m) { console.error(`${spec.id}: unknown argument: ${a} (try --help)`); return 2; }
    if (m[1] === 'regime') {
      if (!regimes.includes(m[2])) { console.error(`${spec.id}: only --regime=${regimes.join('|')} exists for ${spec.id.toUpperCase()}: its record does not depend on the timing regime except for clip ids, which VF 3.6.2 records in the golden (baked) regime; default_meta variants exist for G1 and G6 only`); return 2; }
      opt.regime = m[2]; continue;
    }
    if (m[1] === 'engine') { if (!engines.includes(m[2])) { console.error(`${spec.id}: --engine must be ${engines.join('|')}`); return 2; } opt.engine = m[2]; } else opt[m[1]] = path.resolve(m[2]);
  }
  opt.out = opt.out || (spec.outFor ? spec.outFor(opt) : spec.defaultOut);
  const rel = (p) => path.relative(ROOT, p) || p;

  if (opt.emit) {                                     // child mode: no refusal output formatting, just the data
    try { assertBaseline(opt.worktree); } catch (e) { console.error(e.message); return 1; }
    const res = await spec.collect({ worktree: opt.worktree, engine: opt.engine, regime: opt.regime });    // { data, meta? }: meta (browser version) is not compared
    if (!res || typeof res.data !== 'object') throw new Error(`${spec.id}: collect must return { data, meta? }`);
    fs.writeFileSync(opt.emit, canonicalJSON({ data: res.data, meta: res.meta || {}, companions: res.companions || {} }) + '\n');
    return 0;
  }
  try { assertBaseline(opt.worktree); } catch (e) { console.error(`${spec.id}: refusing to run: ${e.message}`); return 1; }
  try { os.setPriority(0, 10); } catch { /* not allowed: carry on at normal priority */ }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `vw-${spec.id}-`));
  const run = (n) => {
    const f = path.join(tmp, `run${n}.json`), t0 = Date.now();
    const r = spawnSync(process.execPath, [spec.script, `--emit=${f}`, `--worktree=${opt.worktree}`, `--engine=${opt.engine}`, `--regime=${opt.regime}`], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 20 * 60 * 1000 });
    if (r.status !== 0) throw new Error(`collection run ${n} failed (exit ${r.status}${r.signal ? ', ' + r.signal : ''}): ${((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-6).join(' | ')}`);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return { data: j.data, meta: j.meta, companions: j.companions || {}, text: canonicalJSON({ d: j.data, c: j.companions || {} }), secs: (Date.now() - t0) / 1000 };
  };
  try {
    const A = run(1);
    if (opt.check) {
      const want = readRecord(opt.out), have = A.data;
      let dd = deepDiff(want.data, have);
      let ok = dd.length === 0 && want.kind === spec.kind && want.engine === opt.engine && want.regime === opt.regime;
      const lines = [];
      if (want.kind !== spec.kind) lines.push(`  kind ${want.kind} != ${spec.kind}`);
      if (want.engine !== opt.engine) lines.push(`  record engine ${want.engine} != ${opt.engine}`);
      if (want.regime !== opt.regime) lines.push(`  record regime ${want.regime} != ${opt.regime}`);
      for (const d of dd) lines.push(`  ${d.path}: recorded ${d.a} | fresh ${d.b}`);
      for (const comp of spec.companions || []) {
        const cw = readRecord(comp.out), cd = deepDiff(cw.data, A.companions[comp.name] || {});
        if (cd.length || cw.kind !== comp.kind) ok = false;
        for (const d of cd) lines.push(`  [${comp.name}] ${d.path}: recorded ${d.a} | fresh ${d.b}`);
      }
      console.log(`${ok ? 'PASS' : 'FAIL'} ${spec.id} ${rel(opt.out)}${(spec.companions || []).map((x) => ' + ' + rel(x.out)).join('')} ${ok ? 'equal a fresh collection from' : 'DIFFER from a fresh collection from'} ${rel(opt.worktree)} (${A.secs.toFixed(1)} s)`);
      for (const l of lines) console.log(l);
      return ok ? 0 : 1;
    }
    const B = run(2);
    if (A.text !== B.text) {
      const dd = deepDiff(A.data, B.data, 5);
      console.error(`${spec.id}: REFUSING to write: two runs of the baseline disagree (non-deterministic collection)`);
      for (const d of dd) console.error(`  ${d.path}: run1 ${d.a} | run2 ${d.b}`);
      return 1;
    }
    const data = A.data;
    const engineVersion = opt.engine === 'chromium' ? A.meta.engineVersion : undefined;
    if (opt.engine === 'chromium' && !engineVersion) throw new Error('chromium collection did not report its version');
    const rec = makeRecord(spec.kind, data, { engine: opt.engine, regime: opt.regime, engineVersion, root: opt.worktree, tag: BASELINE_TAG, fingerprint: fingerprint(opt.worktree, ['ancient']) });
    if (rec.sha !== BASELINE_SHA) throw new Error('record sha is not the baseline sha');
    const { written } = writeRecord(opt.out, rec);
    for (const comp of spec.companions || []) {
      if (!A.companions[comp.name]) throw new Error(`collection did not produce the companion ${comp.name}`);
      writeRecord(comp.out, makeRecord(comp.kind, A.companions[comp.name], { engine: opt.engine, regime: opt.regime, engineVersion, root: opt.worktree, tag: BASELINE_TAG, fingerprint: fingerprint(opt.worktree, ['ancient']) }));
    }
    console.log(`${written ? 'wrote' : 'unchanged'} ${rel(opt.out)}${(spec.companions || []).map((x) => ' + ' + rel(x.out)).join('')} (${spec.kind}, engine ${opt.engine}, baseline ${BASELINE_SHA.slice(0, 7)}; two identical runs of ${A.secs.toFixed(1)} s and ${B.secs.toFixed(1)} s) ${spec.summary ? spec.summary(data) : ''}`.trim());
    return 0;
  } catch (e) {
    console.error(`${spec.id}: ${e && e.message}`);
    return 1;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
