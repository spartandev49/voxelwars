// @gate-noscan  (plumbing only: its path literals are not test inputs; see tools/lib/gate_cache.mjs)
// Criteria registry client (VF 3.4). Every check registers `criterion(id, meta)` and counts assertions through the returned handle.
// At process exit one JSON line per criterion is appended to $VW_CRITERIA_OUT (default <gate dir>/criteria/<pid>.jsonl); the gate merges the lines into
// .cache/gate/criteria.json. UNVERIFIED rules (zero assertions, skipped, no negative control, negctl not proven) are evaluated by the merge, not here.
// Owner: TOOLS-VERIFY (registry builder). Created by TOOLS-GATE so the call sites of gate tests exist from day one; the API below is the VF 3.4 API unchanged.
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TIERS = ['T-fast', 'T-era', 'T-full', 'release', 'heavy'];
const JUDGES = ['script', 'panel', 'agent'];
const ENGINES = ['node', 'chromium'];
const arr = (v) => (v == null ? null : Array.isArray(v) ? v.map(String) : [String(v)]);
const registry = new Map();       // id -> state of this process
let hooked = false;

function outFile() {
  if (process.env.VW_CRITERIA_OUT) return process.env.VW_CRITERIA_OUT;
  const gate = process.env.VW_GATE_DIR || path.join(process.env.VW_MAIN_ROOT || ROOT, '.cache/gate');
  return path.join(gate, 'criteria', process.pid + '.jsonl');
}

function scriptInfo() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : '';
  let hash = '';
  try { hash = crypto.createHash('sha256').update(fs.readFileSync(argv1)).digest('hex'); } catch { /* repl / eval */ }
  return { file: argv1 ? path.relative(ROOT, argv1).split(path.sep).join('/') : '', scriptHash: hash };
}

function flush(exitCode) {
  const lines = [];
  for (const s of registry.values()) {
    if (s.flushed) continue;
    s.flushed = true;
    const failures = s.failures.slice();
    if (exitCode && !failures.length && !s.skipped) failures.push('exit:' + exitCode);
    lines.push(JSON.stringify({
      id: s.id, er: arr(s.meta.er), owner: s.meta.owner || null, tier: s.meta.tier || null, negctl: s.meta.negctl || null, text: s.meta.text || '',
      judge: s.meta.judge || 'script', engine: s.meta.engine || 'node', era: s.meta.era || process.env.VW_ERA || null,
      file: s.file, scriptHash: s.scriptHash, assertions: s.n, failures, skipped: s.skipped || null,
      seconds: +((Date.now() - s.t0) / 1000).toFixed(3), treeHash: process.env.VW_TREEHASH || null, at: new Date().toISOString(),
    }));
  }
  if (!lines.length) return;
  try { const f = outFile(); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.appendFileSync(f, lines.join('\n') + '\n'); } catch { /* read-only tree: the run itself still reports through the exit code */ }
}

/**
 * @param {string} id  criterion id, unique per run (AR-Txx, VF-Txx, GATE-Txx, S29, ...)
 * @param {{er?:string|string[], owner?:string, tier?:'T-fast'|'T-era'|'T-full'|'release'|'heavy', negctl?:string, text?:string, judge?:'script'|'panel'|'agent', engine?:'node'|'chromium', era?:string[]}} meta
 */
export function criterion(id, meta = {}) {
  if (typeof id !== 'string' || !id) throw new TypeError('criterion(id): id must be a non-empty string');
  if (meta.tier && !TIERS.includes(meta.tier)) throw new RangeError(`criterion ${id}: tier must be one of ${TIERS.join(', ')}`);
  if (meta.judge && !JUDGES.includes(meta.judge)) throw new RangeError(`criterion ${id}: judge must be one of ${JUDGES.join(', ')}`);
  if (meta.engine && !ENGINES.includes(meta.engine)) throw new RangeError(`criterion ${id}: engine must be one of ${ENGINES.join(', ')}`);
  if (registry.has(id)) throw new Error(`criterion ${id} registered twice in one process`);
  const st = { id, meta, n: 0, failures: [], skipped: null, flushed: false, t0: Date.now(), ...scriptInfo() };
  registry.set(id, st);
  if (!hooked) { hooked = true; process.on('exit', (code) => flush(code)); }
  const fail = (label) => { if (!st.failures.includes(label)) st.failures.push(label); };
  const wrapFn = (name, fn) => (...a) => {
    st.n++;
    try {
      const r = fn(...a);
      if (r && typeof r.then === 'function') return r.catch((e) => { fail(`assert.${name}`); throw e; });
      return r;
    } catch (e) { fail(`assert.${name}`); throw e; }
  };
  const counted = new Proxy(assert, {
    apply: (t, th, a) => wrapFn('ok', t)(...a),
    get: (t, k) => (typeof t[k] === 'function' && k !== 'AssertionError' ? wrapFn(String(k), t[k].bind(t)) : t[k]),
  });
  return {
    id,
    /** counts one assertion; records `label` as failed and throws when `cond` is falsy */
    check(label, cond, msg) {
      st.n++;
      if (!cond) { fail(label); throw new assert.AssertionError({ message: `${id}/${label}${msg ? ': ' + msg : ''}`, actual: cond, expected: true, operator: 'check' }); }
      return true;
    },
    /** counts one assertion and records the failure without throwing (collect-all style) */
    soft(label, cond) { st.n++; if (!cond) fail(label); return !!cond; },
    assert: counted,
    skip(reason) { st.skipped = String(reason || 'skipped'); },
    done() { flush(0); },
    get assertions() { return st.n; },
    get failures() { return st.failures.slice(); },
  };
}

/** Test helper for the registry's own tests: forget all criteria without writing. */
export function _resetForTests() { registry.clear(); }
