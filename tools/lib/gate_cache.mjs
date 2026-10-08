// Closure cache for gate tests (VF 3.8.3; owner TOOLS-GATE).
// A test is skipped only when a PASS was stored for the SAME key; the key is
//   sha256( test path, node version, VW_ERA, content of tests/_eras.mjs, sha256 of every file of the test's closure )
// where the closure is
//   1. the import graph of the test (every static and literal-dynamic import, resolved on disk), plus
//   2. every repo file the closure's tests/ and tools/ sources NAME by a string literal (data files, fixtures, scripts, whole directories),
//      with the import graph of the named .js/.mjs files, because tests bundle entries and spawn tools at run time.
// Conservative by construction: a test is NOT cacheable (always runs) when it has `// @nocache` or `// @serial`, a `.serial`/`.browser` suffix, a dynamic
// import(<expr>), eval / new Function / createRequire in its closure sources, a source file that does not parse, or it names state outside the tree
// (.cache other than the read-only externals below). A library that only PLUMBS paths (tests/lib/criteria.mjs, tools/lib/paths.mjs) carries `// @gate-noscan` and its
// string literals are not treated as inputs. Over-approximation only costs hits; --verify-cache re-runs a seeded sample of hits to catch what the heuristics miss.
//
// Per-file facts (imports, literals, flags) are memoised by file sha in <gate dir>/facts.json, so a warm analysis of all tests is a graph walk (~100 ms).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { build } from 'esbuild';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const DATA_EXT = /\.(json|md|txt|csv|html|css|mp3|ogg|wav|png|jpg|jpeg|js|mjs|cjs|wasm|bin|py|sh)$/;
const STR_RE = /'((?:[^'\\\n]|\\.){2,200})'|"((?:[^"\\\n]|\\.){2,200})"|`((?:[^`\\$\n]|\\.){2,200})`/g;
/** Read-only inputs outside the tree that tests may name: hashed into the key by externalHash() instead of making the test uncacheable. */
export const EXTERNALS = ['cdn', 'fonts', 'fonts_uib', 'baseline'];
const RESOLVE_TRY = ['', '.js', '.mjs', '.json', '/index.js', '/index.mjs'];
const isJs = (p) => /\.(m?js)$/.test(p);
const skipFacts = (p) => p.includes('/syntax_bad/');

/** Lookup structure over a treeHash() file list. */
export function makeIndex(files) {
  const sha = new Map(), byBase = new Map(), dirs = new Map();
  for (const f of files) {
    sha.set(f.path, f.sha);
    const b = path.posix.basename(f.path);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(f.path);
    let d = path.posix.dirname(f.path);
    while (d && d !== '.') { if (!dirs.has(d)) dirs.set(d, []); dirs.get(d).push(f.path); d = path.posix.dirname(d); }
  }
  return { sha, byBase, dirs };
}

function textFacts(rel, text, wantLits) {
  const dyn = /\bimport\(\s*[^'"`\s)]/.test(text) || /\bimport\(\s*`[^`]*\$\{/.test(text);
  const ev = /(?<![\w$.])eval\(|new Function\(|createRequire\(/.test(text);
  const lit = [];
  if (wantLits && !/^\s*\/\/\s*@gate-noscan\b/m.test(text)) { const seen = new Set(); for (const m of text.matchAll(STR_RE)) { const s = (m[1] ?? m[2] ?? m[3]); if (!/\s/.test(s) || s.includes('/')) { if (!seen.has(s)) { seen.add(s); lit.push(s); } } } }
  return { dyn, ev, lit };
}

/** Collect the facts of every JS file of the index whose sha is not memoised yet. */
export async function loadFacts(root, files, memoPath) {
  let memo = {};
  try { const j = JSON.parse(fs.readFileSync(memoPath, 'utf8')); if (j && j.v === 1) memo = j.facts; } catch { /* first run */ }
  const need = files.filter((f) => isJs(f.path) && !skipFacts(f.path) && !memo[f.sha]);
  const byPath = new Map();
  if (need.length) {
    const rec = new Map();
    const plugin = { name: 'rec', setup(b) { b.onResolve({ filter: /.*/ }, (a) => { if (a.kind === 'entry-point') return undefined; const imp = path.relative(root, a.importer).split(path.sep).join('/'); if (!rec.has(imp)) rec.set(imp, []); rec.get(imp).push(a.path); return { path: a.path, external: true }; }); } };
    const run = async (batch) => build({ entryPoints: batch.map((f) => f.path), absWorkingDir: root, bundle: true, write: false, outdir: path.join(root, '.cache/gate/_esb'), format: 'esm', logLevel: 'silent', plugins: [plugin] });
    const bad = new Set();
    try { await run(need); } catch { for (const f of need) { rec.delete(f.path); try { await run([f]); } catch { bad.add(f.path); } } }
    for (const f of need) {
      const text = fs.readFileSync(path.join(root, f.path), 'utf8');
      const wantLits = f.path.startsWith('tests/') || f.path.startsWith('tools/');
      memo[f.sha] = { imp: [...new Set(rec.get(f.path) || [])].sort(), ...textFacts(f.path, text, wantLits), bad: bad.has(f.path) };
    }
  }
  const live = new Set(files.map((f) => f.sha));
  const pruned = {};
  for (const k of Object.keys(memo)) if (live.has(k)) pruned[k] = memo[k];
  if (need.length || Object.keys(pruned).length !== Object.keys(memo).length) {
    fs.mkdirSync(path.dirname(memoPath), { recursive: true });
    const tmp = memoPath + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify({ v: 1, facts: pruned })); fs.renameSync(tmp, memoPath);
  }
  for (const f of files) if (pruned[f.sha]) byPath.set(f.path, pruned[f.sha]);
  return byPath;
}

function resolveSpec(fromRel, spec, index) {
  if (!(spec.startsWith('.') || spec.startsWith('/'))) return null;   // bare / node: => external
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  for (const ext of RESOLVE_TRY) if (index.sha.has(base + ext)) return base + ext;
  return null;
}

/**
 * @param {Map<string,object>} facts from loadFacts
 * @returns {{test:string, files:string[], cacheable:boolean, why:string[], browser:boolean}}
 */
export function analyzeTest(testRel, index, facts, testText) {
  const why = [];
  if (/\.(serial|browser)\.test\.mjs$/.test(testRel)) why.push('serial/browser suffix');
  if (/^\s*\/\/\s*@nocache\b/m.test(testText)) why.push('@nocache');
  if (/^\s*\/\/\s*@serial\b/m.test(testText)) why.push('@serial');
  const closure = new Set(), externals = new Set();
  let browser = false;
  const stack = [testRel];
  while (stack.length) {
    const f = stack.pop();
    if (closure.has(f)) continue;
    closure.add(f);
    if (!isJs(f) || skipFacts(f)) continue;
    const fa = facts.get(f);
    if (!fa) { why.push(`no facts for ${f}`); continue; }
    if (fa.bad) why.push(`does not parse: ${f}`);
    if (fa.dyn) why.push(`dynamic import(<expr>) in ${f}`);
    if (fa.ev) why.push(`eval/createRequire in ${f}`);
    for (const spec of fa.imp) {
      if (spec === 'playwright-core') browser = true;
      const r = resolveSpec(f, spec, index);
      if (r) stack.push(r);
    }
    const dirOf = path.posix.dirname(f);
    for (const raw of fa.lit) {
      const lit = raw.replace(/^\.\//, '');
      if (/^\.cache(\/|$)/.test(lit)) {
        const ext = EXTERNALS.find((e) => lit === '.cache/' + e || lit.startsWith('.cache/' + e + '/'));
        if (ext) externals.add(ext); else why.push(`names ${lit} in ${f}`);
        continue;
      }
      let hit = false;
      for (const c of [path.posix.normalize(lit), path.posix.normalize(path.posix.join(dirOf, lit))]) {
        if (c.startsWith('..') || c === '.') continue;
        if (index.sha.has(c)) { hit = true; stack.push(c); }
        else if (index.dirs.has(c)) { hit = true; for (const p of index.dirs.get(c)) closure.add(p); }   // a named directory is hashed, not descended into
      }
      if (!hit && !lit.includes('/') && DATA_EXT.test(lit) && index.byBase.has(lit)) for (const p of index.byBase.get(lit)) closure.add(p);   // bare file name: every file of that name is hashed
    }
  }
  return { test: testRel, files: [...closure].filter((p) => index.sha.has(p)).sort(), externals: [...externals].sort(), cacheable: why.length === 0, why: [...new Set(why)], browser };
}

/** Cache key of an analysed test under a context. Null when not cacheable. */
export function cacheKey(analysis, index, ctx) {
  if (!analysis.cacheable) return null;
  const parts = [`test:${analysis.test}`, `node:${ctx.nodeVersion}`, `era:${ctx.era}`, `eras:${ctx.erasHelperSha || '-'}`];
  for (const f of analysis.files) parts.push(`${f}:${index.sha.get(f)}`);
  for (const e of analysis.externals || []) { const h = ctx.externalHash ? ctx.externalHash(e) : null; if (!h) return null; parts.push(`ext:${e}:${h}`); }
  return sha256(parts.join('\n'));
}

/** Hash of a read-only external input under <mainRoot>/.cache: file contents for cdn/fonts*, the checked-out commit for the baseline worktree. Null when absent. */
export function makeExternalHasher(mainRoot) {
  const memo = new Map();
  const walk = (dir, rel, out) => { for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = path.join(dir, e.name); let st; try { st = fs.statSync(p); } catch { continue; } if (st.isDirectory()) walk(p, rel + e.name + '/', out); else out.push(`${rel}${e.name}:${sha256(fs.readFileSync(p))}`); } return out; };
  return (name) => {
    if (memo.has(name)) return memo.get(name);
    let h = null;
    const dir = path.join(mainRoot, '.cache', name);
    try {
      if (name === 'baseline') {
        const wt = path.join(dir, 'ancient-v8');
        const gitFile = fs.readFileSync(path.join(wt, '.git'), 'utf8').trim();
        const gitdir = path.resolve(wt, gitFile.replace(/^gitdir:\s*/, ''));
        h = sha256('baseline:' + fs.readFileSync(path.join(gitdir, 'HEAD'), 'utf8').trim());
      } else if (fs.existsSync(dir)) h = sha256(walk(dir, '', []).join('\n'));
    } catch { h = null; }
    memo.set(name, h);
    return h;
  };
}

export function cacheGet(dir, key) {
  if (!key) return null;
  try { const e = JSON.parse(fs.readFileSync(path.join(dir, key + '.json'), 'utf8')); return e && e.v === 1 && e.status === 'PASS' ? e : null; } catch { return null; }
}
export function cachePut(dir, key, entry) {
  if (!key) return;
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, key + '.json');
  const tmp = f + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify({ v: 1, ...entry }));
  fs.renameSync(tmp, f);
}
export function cachePrune(dir, { maxEntries = 3000, maxAgeDays = 21 } = {}) {
  if (!fs.existsSync(dir)) return 0;
  const rows = fs.readdirSync(dir).map((n) => ({ n, m: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.m - a.m);
  let removed = 0;
  rows.forEach((r, i) => { if (i >= maxEntries || Date.now() - r.m > maxAgeDays * 86400000) { fs.rmSync(path.join(dir, r.n), { force: true }); removed++; } });
  return removed;
}

/** Deterministic seeded pick of `frac` of the items (at least 1 when any); seed = hex string (the treeHash). */
export function seededSample(items, frac, seedHex) {
  if (!items.length) return [];
  let s = parseInt(seedHex.slice(0, 8), 16) >>> 0;
  const rnd = () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, Math.max(1, Math.ceil(items.length * frac)));
}
