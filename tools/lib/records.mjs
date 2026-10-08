// Stored records, comparators and record states (docs/eras/spec/AR.md 3.7.5, docs/eras/spec/VF.md 3.1, 3.7, 3.10).
//
// Every stored artefact (goldens G1..G12, feasibility/balance/perf records, v8_fields) is written by makeRecord(kind, data, ctx) so that it names the
// engine (node | chromium), its version, the timing regime (baked | default_meta), the fingerprints of the tree it was produced from and the commit:
//   { schema:1, kind, engine, engineVersion, regime, engineHash:{simCore,shared}, renderHash?, eraHash:{<era>:hex}, tag, sha, dirty, box:{cpus,platform,arch},
//     data, witness?:[{treeHash,at,sample,digest}], staleSince?:{landing,at} }
//
// Comparator classes (AR 3.7.5, with the VF 3.10 amendment PC-1):
//   (a) bit equality inside one engine and regime ......... assertComparable(a, b, 'a') + firstDivergence(ha, hb)
//   (b) cross-engine / cross-regime statistics ............ assertComparable(a, b, 'b') + compareStats(a, b, {n})
//   (c) outcome-critical margins ............................ marginCheck({node:[..10 wins], chromium:[..10 wins]})
// Record states for MEASUREMENT records (feasibility, balance, era_fingerprint, perf; goldens never go stale, VF-D6): classifyRecord().
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fingerprint, REPO_ROOT } from './fingerprint.mjs';

export const SCHEMA = 1;
export const ENGINES = ['node', 'chromium'];
export const REGIMES = ['baked', 'default_meta'];
/** Kinds that can be STALE-ENGINE (amber); goldens are excluded (VF-D6). */
export const MEASUREMENT_KINDS = ['feasibility', 'balance', 'era_fingerprint', 'perf'];
/** Measurement kinds that are re-measured, never witness-refreshed. */
export const REMEASURE_ONLY = ['perf', 'readability'];
export const MAX_STALE_LANDINGS = 6;
export const MAX_STALE_DAYS = 4;

export class CrossEngineError extends Error {
  constructor(message, diff) { super(message); this.name = 'CrossEngineError'; this.diff = diff; this.code = 'CROSS_ENGINE'; }
}

// ---------------------------------------------------------------------------------------------------------------- serialisation
/** Deterministic JSON: object keys sorted, arrays of primitives on one line, everything else indented by one space. Rejects undefined and non-finite numbers. */
export function canonicalJSON(value) {
  const prim = (v) => v === null || typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number';
  const go = (v, ind) => {
    if (v === undefined || typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') throw new TypeError('canonicalJSON: unserialisable value of type ' + typeof v);
    if (typeof v === 'number') { if (!Number.isFinite(v)) throw new TypeError('canonicalJSON: non-finite number ' + v); return JSON.stringify(v); }
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      if (v.every(prim)) return '[' + v.map((x) => go(x, '')).join(',') + ']';
      const pad = ind + ' ';
      return '[\n' + v.map((x) => pad + go(x, pad)).join(',\n') + '\n' + ind + ']';
    }
    if (ArrayBuffer.isView(v)) return go(Array.from(v), ind);
    const keys = Object.keys(v).sort();
    if (!keys.length) return '{}';
    const pad = ind + ' ';
    return '{\n' + keys.map((k) => pad + JSON.stringify(k) + ': ' + go(v[k], pad)).join(',\n') + '\n' + ind + '}';
  };
  return go(value, '');
}

// ---------------------------------------------------------------------------------------------------------------- records
function git(root, ...args) { const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; }
const HEX64 = /^[0-9a-f]{64}$/;

/** engine major: 'v22.22.0' -> 22, '141.0.7390.37' -> 141, 'HeadlessChrome/141.0.7390.37' -> 141, anything else -> NaN. */
export function engineMajor(v) {
  const m = /^(?:[A-Za-z]+\/)?v?(\d+)(?:\.|$)/.exec(String(v || ''));
  return m ? +m[1] : NaN;
}

/**
 * makeRecord(kind, data, ctx) -> record (not written).
 * ctx: { engine:'node'|'chromium', regime:'baked'|'default_meta', engineVersion? (default process.version for node; REQUIRED for chromium),
 *        root? (tree the data was produced from; default this repo), eras? (default ['ancient']), render? (true adds renderHash), tag?, fingerprint? (precomputed) }
 */
export function makeRecord(kind, data, ctx = {}) {
  if (!/^[a-z][a-z0-9_]*$/.test(kind || '')) throw new TypeError('makeRecord: kind must be lower_snake_case, got ' + JSON.stringify(kind));
  if (!ENGINES.includes(ctx.engine)) throw new TypeError(`makeRecord: ctx.engine must be one of ${ENGINES.join('|')}`);
  if (!REGIMES.includes(ctx.regime)) throw new TypeError(`makeRecord: ctx.regime must be one of ${REGIMES.join('|')} (a record that does not name its timing regime cannot be compared)`);
  let engineVersion = ctx.engineVersion;
  if (!engineVersion && ctx.engine === 'node') engineVersion = process.version;
  if (!engineVersion) throw new TypeError('makeRecord: ctx.engineVersion is required for engine ' + ctx.engine);
  if (!Number.isFinite(engineMajor(engineVersion))) throw new TypeError('makeRecord: unparseable engineVersion ' + engineVersion);
  if (data === null || typeof data !== 'object') throw new TypeError('makeRecord: data must be an object');
  const root = path.resolve(ctx.root || REPO_ROOT), eras = ctx.eras || ['ancient'];
  const fp = ctx.fingerprint || fingerprint(root, eras);
  const sha = git(root, 'rev-parse', 'HEAD');
  const rec = { schema: SCHEMA, kind, engine: ctx.engine, engineVersion, regime: ctx.regime, engineHash: fp.engineHash };
  if (ctx.render) rec.renderHash = fp.renderHash;
  rec.eraHash = fp.eraHash;
  rec.tag = ctx.tag || (sha ? sha.slice(0, 10) : 'untracked');
  rec.sha = sha;
  const dirty = sha ? git(root, 'status', '--porcelain', '--', 'src', 'assets', 'package.json', 'tools/build.mjs') : null;
  rec.dirty = dirty === null ? null : dirty.length > 0;
  rec.box = { cpus: os.cpus().length, platform: process.platform, arch: process.arch };
  rec.data = JSON.parse(canonicalJSON(data));          // throws on undefined / NaN / Infinity and detaches the record from the caller's object
  return rec;
}

/** Problems of a record (empty list = well-formed). */
export function validateRecord(rec) {
  const p = [];
  if (!rec || typeof rec !== 'object') return ['not an object'];
  if (rec.schema !== SCHEMA) p.push('schema must be ' + SCHEMA);
  if (!/^[a-z][a-z0-9_]*$/.test(rec.kind || '')) p.push('kind');
  if (!ENGINES.includes(rec.engine)) p.push('engine');
  if (!Number.isFinite(engineMajor(rec.engineVersion))) p.push('engineVersion');
  if (!REGIMES.includes(rec.regime)) p.push('regime');
  const eh = rec.engineHash;
  if (!eh || !HEX64.test(eh.simCore || '') || !HEX64.test(eh.shared || '')) p.push('engineHash');
  if (rec.renderHash !== undefined && !HEX64.test(rec.renderHash)) p.push('renderHash');
  if (!rec.eraHash || typeof rec.eraHash !== 'object' || !Object.keys(rec.eraHash).length || !Object.values(rec.eraHash).every((h) => HEX64.test(h))) p.push('eraHash');
  if (typeof rec.tag !== 'string' || !rec.tag) p.push('tag');
  if (rec.data === null || typeof rec.data !== 'object') p.push('data');
  if (rec.witness !== undefined && !(Array.isArray(rec.witness) && rec.witness.every((w) => w && typeof w.treeHash === 'string' && typeof w.at === 'string' && Number.isInteger(w.sample) && w.sample > 0 && /^[0-9a-f]{64}$/.test(w.digest || '')))) p.push('witness');
  if (rec.staleSince !== undefined && !(rec.staleSince && Number.isInteger(rec.staleSince.landing) && typeof rec.staleSince.at === 'string')) p.push('staleSince');
  return p;
}
/** Write a record file (validated, canonical, trailing newline). Rewrites nothing when the bytes are identical (no mtime churn). */
export function writeRecord(file, rec) {
  const bad = validateRecord(rec);
  if (bad.length) throw new Error(`writeRecord ${file}: malformed record (${bad.join(', ')})`);
  const text = canonicalJSON(rec) + '\n';
  try { if (fs.readFileSync(file, 'utf8') === text) return { written: false }; } catch { /* new file */ }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return { written: true };
}
export function readRecord(file) {
  const rec = JSON.parse(fs.readFileSync(file, 'utf8')), bad = validateRecord(rec);
  if (bad.length) throw new Error(`${file}: malformed record (${bad.join(', ')})`);
  return rec;
}

// ---------------------------------------------------------------------------------------------------------------- comparators
/**
 * Class (a): throws CrossEngineError when `engine`, the engine MAJOR version or `regime` differ.
 * Class (b): the two records must come from the SAME build (engineHash and eraHash equal); engine and regime may differ (that is what (b) compares).
 * Class (c): outcome sets, no constraint.
 */
export function assertComparable(a, b, cls = 'a') {
  if (cls !== 'a' && cls !== 'b' && cls !== 'c') throw new TypeError('comparator class must be a, b or c');
  if (!a || !b) throw new TypeError('assertComparable needs two records');
  if (cls === 'c') return true;
  const diff = [];
  const d = (field, x, y) => { if (x !== y) diff.push({ field, a: x, b: y }); };
  if (cls === 'a') {
    d('engine', a.engine, b.engine);
    const ma = engineMajor(a.engineVersion), mb = engineMajor(b.engineVersion);
    if (!Number.isFinite(ma) || !Number.isFinite(mb) || ma !== mb) diff.push({ field: 'engineVersion', a: a.engineVersion, b: b.engineVersion });
    d('regime', a.regime, b.regime);
    if (diff.length) throw new CrossEngineError(`class (a) comparison across ${diff.map((x) => `${x.field} (${x.a} vs ${x.b})`).join(', ')}: bit equality is only defined inside one engine, engine major and timing regime`, diff);
    return true;
  }
  const ea = a.engineHash || {}, eb = b.engineHash || {};
  d('engineHash.simCore', ea.simCore, eb.simCore); d('engineHash.shared', ea.shared, eb.shared);
  const ka = Object.keys(a.eraHash || {}).sort(), kb = Object.keys(b.eraHash || {}).sort();
  d('eraHash.keys', ka.join(','), kb.join(','));
  for (const k of ka) d('eraHash.' + k, (a.eraHash || {})[k], (b.eraHash || {})[k]);
  if (diff.length) throw new CrossEngineError('class (b) comparison needs the same build: ' + diff.map((x) => x.field).join(', ') + ' differ', diff);
  return true;
}

/**
 * First divergence of two hash chains sampled every `every` ticks (default 100, first sample at tick `first` = 100).
 * -> null when identical, else { index, tick, a, b, reason:'value'|'length' }.
 */
export function firstDivergence(ha, hb, { every = 100, first = 100 } = {}) {
  const n = Math.min(ha.length, hb.length);
  for (let i = 0; i < n; i++) if (ha[i] !== hb[i]) return { index: i, tick: first + i * every, a: ha[i], b: hb[i], reason: 'value' };
  if (ha.length !== hb.length) return { index: n, tick: first + n * every, a: ha[n], b: hb[n], reason: 'length' };
  return null;
}

const median = (s) => { const a = Float64Array.from(s).sort(), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
function sampleStats(x) {
  const wins = x.wins || (x.results || x).map((r) => r.win), ticks = x.endTicks || (x.results || x).map((r) => r.endTick);
  if (!wins || !ticks || wins.length !== ticks.length || !wins.length) throw new TypeError('compareStats: a sample is {wins:[..], endTicks:[..]} or [{win, endTick}..] of equal, non-zero length');
  const n = wins.length, p = wins.reduce((s, v) => s + (+v), 0) / n;
  const mean = ticks.reduce((s, v) => s + v, 0) / n;
  const varT = n > 1 ? ticks.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1) : 0;
  return { n, p, varWin: p * (1 - p), med: median(ticks), varT };
}
/**
 * Class (b) statistic (VF 3.10, PC-1): a DETECTABLE difference test. The two samples differ when the win-rate difference exceeds
 * max(floorWin, 2.58 SE) or the relative median-end-tick difference exceeds max(floorTick, 2.58 SE).
 * -> { n:[na,nb], dWin, seWin, tolWin, dTick, seTick, tolTick, ok }   (n = 200: about 12.9 points and 7.2%; n = 600: 7.5 points and 4.2%)
 */
export function compareStats(a, b, { n, floorWin = 0.03, floorTick = 0.02, z = 2.58 } = {}) {
  const A = sampleStats(a), B = sampleStats(b);
  if (n !== undefined && (A.n < n || B.n < n)) throw new RangeError(`compareStats: need n >= ${n} battles per side, got ${A.n} and ${B.n}`);
  const seWin = Math.sqrt(A.varWin / A.n + B.varWin / B.n);
  const ref = (A.med + B.med) / 2 || 1;
  const seTick = 1.2533 * Math.sqrt(A.varT / A.n + B.varT / B.n) / ref;
  const dWin = Math.abs(A.p - B.p), dTick = Math.abs(A.med - B.med) / ref;
  const tolWin = Math.max(floorWin, z * seWin), tolTick = Math.max(floorTick, z * seTick);
  return { n: [A.n, B.n], dWin, seWin, tolWin, dTick, seTick, tolTick, ok: dWin <= tolWin && dTick <= tolTick };
}
/** The rule the plan and AR 3.7.5 originally wrote ("within 3 points, median end tick within 2%"); kept only to document PC-1 (identical populations fail it about 77% of the time at n = 200). */
export function legacyCompareStats(a, b) {
  const A = sampleStats(a), B = sampleStats(b), ref = (A.med + B.med) / 2 || 1;
  const dWin = Math.abs(A.p - B.p), dTick = Math.abs(A.med - B.med) / ref;
  return { dWin, dTick, ok: dWin <= 0.03 && dTick <= 0.02 };
}

/**
 * Class (c): outcome-critical data must win >= `need` of `of` seeds in EVERY listed engine.
 * results: { node:[bool|{win}..], chromium:[..] } -> { ok, need, of, engines:{ node:{wins, n, ok, reason?}, chromium:{..} }, reason? }
 */
export function marginCheck(results, { need = 8, of = 10, engines = ['node', 'chromium'] } = {}) {
  const out = { ok: true, need, of, engines: {} };
  for (const e of engines) {
    const arr = results && results[e];
    if (!Array.isArray(arr)) { out.engines[e] = { wins: 0, n: 0, ok: false, reason: 'no results' }; out.ok = false; continue; }
    const wins = arr.filter((r) => (r && typeof r === 'object' ? r.win : r)).length;
    const ok = arr.length === of && wins >= need;
    out.engines[e] = { wins, n: arr.length, ok, ...(arr.length === of ? {} : { reason: `expected ${of} seeds, got ${arr.length}` }) };
    if (!ok) out.ok = false;
  }
  if (!out.ok) out.reason = Object.entries(out.engines).filter(([, v]) => !v.ok).map(([e, v]) => `${e}: ${v.reason || `${v.wins}/${v.n} wins < ${need}`}`).join('; ');
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- record states
const dayNo = (t) => Math.floor(Date.parse(String(t).slice(0, 10) + 'T00:00:00Z') / 86400000);
/**
 * Classify a measurement record against the current tree (VF 3.7).
 *   cur  = { engineHash, eraHash, landings (module landings so far, lines of docs/eras/ledger/landings.jsonl), now (ISO date or time) }
 *   opts = { era, witness: boolean | () => boolean (the replay witness on the current tree; required whenever the engine differs),
 *            required (a missing record is red only when required and `frozen`), frozen (the era is past its E-FREEZE) }
 * -> { state, red, amber, reason, ageLandings?, ageDays? }   states: CURRENT, STALE-ENGINE (amber), RED-WITNESS, RED-ERA, RED-AGE, MISSING
 */
export function classifyRecord(rec, cur, opts) {
  const era = opts && opts.era;
  if (!era) throw new TypeError('classifyRecord: opts.era is required');
  if (rec === null || rec === undefined) {
    const red = !!(opts.required !== false && opts.frozen);
    return { state: 'MISSING', red, amber: false, reason: red ? 'required record absent after E-FREEZE' : 'record absent (not yet required)' };
  }
  if (!MEASUREMENT_KINDS.includes(rec.kind)) throw new TypeError(`classifyRecord: kind "${rec.kind}" has no stale states (goldens pass or fail, VF-D6); measurement kinds: ${MEASUREMENT_KINDS.join(', ')}`);
  if (rec.eraHash[era] === undefined) return { state: 'RED-ERA', red: true, amber: false, reason: `record has no eraHash for ${era}` };
  if (rec.eraHash[era] !== cur.eraHash[era]) return { state: 'RED-ERA', red: true, amber: false, reason: `eraHash(${era}) differs` };
  const same = rec.engineHash.simCore === cur.engineHash.simCore && rec.engineHash.shared === cur.engineHash.shared;
  if (same) return { state: 'CURRENT', red: false, amber: false, reason: 'engineHash and eraHash equal' };
  let ok = opts.witness;
  if (typeof ok === 'function') ok = ok();
  if (typeof ok !== 'boolean') throw new TypeError('classifyRecord: the engine differs, so the replay witness result (boolean) is required');
  if (!ok) return { state: 'RED-WITNESS', red: true, amber: false, reason: 'engine differs and the replay witness failed' };
  const s = rec.staleSince;
  const ageLandings = s ? cur.landings - s.landing : 0, ageDays = s ? dayNo(cur.now) - dayNo(s.at) : 0;
  if (ageLandings > MAX_STALE_LANDINGS || ageDays > MAX_STALE_DAYS) return { state: 'RED-AGE', red: true, amber: false, reason: `stale for ${ageLandings} landings / ${ageDays} days (caps ${MAX_STALE_LANDINGS} / ${MAX_STALE_DAYS})`, ageLandings, ageDays };
  return { state: 'STALE-ENGINE', red: false, amber: true, reason: 'engine differs, eraHash equal, witness green', ageLandings, ageDays };
}
/** A copy of `rec` carrying `staleSince` (set once, when the record is first found stale). */
export function markStale(rec, cur) {
  if (rec.staleSince) return rec;
  return { ...rec, staleSince: { landing: cur.landings, at: new Date(cur.now).toISOString() } };
}
/** Number of module landings recorded so far (docs/eras/ledger/landings.jsonl, one JSON line per SIM hand-back). */
export function landingsCount(root = REPO_ROOT) {
  try { return fs.readFileSync(path.join(root, 'docs/eras/ledger/landings.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).length; } catch { return 0; }
}

// ---------------------------------------------------------------------------------------------------------------- witness refresh
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
function mulberry32(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Seeded shuffle of the stored battles (seed = sha256(R.eraHash[era] + treeHash)) -> first k entries, ids in selection order. */
export function selectWitnessSample(rec, era, treeHash, k = 30) {
  const battles = rec.data && rec.data.battles;
  if (!Array.isArray(battles) || !battles.length) throw new Error('record has no data.battles to re-run (entries {id, tuple:[win,endTick,stars,endDigest]})');
  const idx = battles.map((b, i) => i).sort((x, y) => (String(battles[x].id) < String(battles[y].id) ? -1 : 1));
  const rnd = mulberry32(parseInt(sha256(rec.eraHash[era] + treeHash).slice(0, 8), 16));
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, Math.min(k, idx.length)).map((i) => battles[i]);
}
/**
 * Witness refresh (VF 3.7): promotes a STALE-ENGINE record to the current engineHash WITHOUT changing a datum.
 *   (1) opts.witnessSet(era) -> { green, digest } must be green on the current tree (Ancient: G1 core 12 + G6 15);
 *   (2) the seeded sample of 30 stored battles is re-run through opts.rerun(entry) -> tuple and must be bit-equal to the stored tuple;
 *   (3) only then: engineHash replaced, witness entry appended, staleSince dropped.   Otherwise the record is returned unchanged.
 * Perf and readability records are re-measured, never refreshed. -> { refreshed, record, reason, sample?, logLine? }
 */
export async function refreshRecord(rec, cur, opts) {
  const { era, treeHash, witnessSet, rerun, name = rec.kind, now = new Date(), k = 30 } = opts;
  if (REMEASURE_ONLY.includes(rec.kind)) throw new Error(`${rec.kind} records are re-measured, never refreshed`);
  if (!MEASUREMENT_KINDS.includes(rec.kind)) throw new Error(`${rec.kind} is not a measurement record`);
  if (rec.eraHash[era] !== cur.eraHash[era]) return { refreshed: false, record: rec, reason: `eraHash(${era}) differs: RED-ERA, a refresh cannot help` };
  if (rec.engineHash.simCore === cur.engineHash.simCore && rec.engineHash.shared === cur.engineHash.shared) return { refreshed: false, record: rec, reason: 'record is CURRENT' };
  const w = await witnessSet(era);
  if (!w || w.green !== true) return { refreshed: false, record: rec, reason: 'witness set is not green' };
  const sample = selectWitnessSample(rec, era, treeHash, k), got = [];
  for (const entry of sample) {
    const tuple = await rerun(entry);
    got.push([entry.id, tuple]);
    if (!Array.isArray(tuple) || tuple.length !== entry.tuple.length || tuple.some((v, i) => v !== entry.tuple[i])) return { refreshed: false, record: rec, reason: `battle ${entry.id} re-ran to ${JSON.stringify(tuple)}, stored ${JSON.stringify(entry.tuple)}`, sample: sample.map((s) => s.id) };
  }
  const next = { ...rec, engineHash: { ...cur.engineHash }, witness: [...(rec.witness || []), { treeHash, at: new Date(now).toISOString(), sample: sample.length, digest: sha256(JSON.stringify(got) + '|' + (w.digest || '')) }] };
  delete next.staleSince;
  return { refreshed: true, record: next, reason: 'witness green and sample bit-equal', sample: sample.map((s) => s.id), logLine: `witness refresh ${name} ${treeHash}` };
}
