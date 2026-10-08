// G1 Chromium column (docs/eras/spec/VF.md 3.6, rule 5 and 3.6.1): the CORE 12 battles of the sim matrix run inside a built page in headless Chromium
// (SwiftShader), through `new (game.world.constructor)({arena, seed, rules, defs})`, hashed by the very same source as the Node column (tools/golden/g1_core.mjs,
// tools/lib/statwalk_core.mjs and tests/golden/legacy_hash.mjs are injected into the page). Chromium digests are never compared with Node digests (V8 and Node
// differ by an ulp in sin/cos/pow, VF-D5): this column compares Chromium with Chromium, baseline build with candidate build.
//
// usage: node tools/golden/g1_chromium.mjs [--check] [--page=<html>] [--rebuild] [--worktree=<dir>] [--out-dir=<dir>] [--only=id,id] [--timeout-s=N] [--help]
//   (default)  record: the page is the Ancient v8 fragment release/v8/index.html (its sha256 must equal release/v8/PAGE.sha256, and VF-L04 proves that
//              building the baseline sources reproduces it byte for byte; --rebuild builds the baseline sources again here and demands the same bytes).
//              The worktree HEAD must be the baseline sha. The 12 core cases run in two fresh page loads; the digests must be identical before
//              tests/golden/g1_digests.chromium.baked.json is written.
//   --check    run the page of THIS tree (--page=<html>, else $VW_PAGE_FRAGMENT of the gate, else a private minified build) and compare with the record.
//              Exit 1 on any difference. Needs a Chromium of the same major version as the record (else a cross-engine error, exit 1).
// exit: 0 ok, 1 mismatch / refused / failure, 2 usage
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { assertBaseline, BASELINE_WORKTREE, BASELINE_TAG } from './baseline.mjs';
import { makeRecord, writeRecord, readRecord, canonicalJSON, assertComparable, validateRecord } from '../lib/records.mjs';
import { CHROMIUM, CHROMIUM_ARGS, MAIN_ROOT } from '../lib/paths.mjs';
import { loadFixtures, compareDigest, digestShapeProblems, fixtureHashes } from './g1_lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_DIR = path.join(REPO, 'tests', 'golden');
export const CHROMIUM_RECORD = 'g1_digests.chromium.baked.json';
const SRC = {
  core: path.join(REPO, 'tools/golden/g1_core.mjs'), statwalk: path.join(REPO, 'tools/lib/statwalk_core.mjs'), legacy: path.join(REPO, 'tests/golden/legacy_hash.mjs'),
  spec: path.join(REPO, 'tests/golden/v8_fields.json'),
};
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
const wrapPage = (h) => (/^\s*<!doctype/i.test(h) ? h : '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + h + '</body></html>');
const MIME = { '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg', '.js': 'text/javascript' };

function usage() { return fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'); }

/** ES module text -> plain script text (exports dropped); refuses a module that imports anything (the page has no module graph). */
export function toScript(text, file) {
  if (/^\s*import\s/m.test(text) || /\bimport\s*\(/.test(text)) throw new Error(`${file} imports something; it cannot be injected into a page`);
  return text.replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '').replace(/^export\s+(default\s+)?/gm, '');
}
function injection() {
  const part = (f, names) => `(() => {\n${toScript(fs.readFileSync(f, 'utf8'), f)}\nreturn { ${names} };\n})()`;
  return `(() => {\n const core = ${part(SRC.core, 'simulate, makeEventHasher')};\n const sw = ${part(SRC.statwalk, 'createStatwalk')};\n const lg = ${part(SRC.legacy, 'legacyStateHash')};\n window.__g1 = { core, sw, lg, arenas: {} };\n return true;\n})()`;
}

/** The page of the Ancient baseline: release/v8/index.html verified against PAGE.sha256; with rebuild, a hermetic build of the baseline sources must reproduce it. */
function baselinePage(wt, rebuild) {
  const rel = path.join(REPO, 'release', 'v8'), file = path.join(rel, 'index.html');
  const bytes = fs.readFileSync(file), want = fs.readFileSync(path.join(rel, 'PAGE.sha256'), 'utf8').trim().split(/\s+/)[0];
  if (sha256(bytes) !== want) throw new Error(`release/v8/index.html does not match release/v8/PAGE.sha256 (${sha256(bytes).slice(0, 12)} vs ${want.slice(0, 12)})`);
  if (rebuild) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-g1-build-'));
    try {
      fs.cpSync(path.join(wt, 'src'), path.join(dir, 'src'), { recursive: true });
      fs.cpSync(path.join(REPO, 'tools'), path.join(dir, 'tools'), { recursive: true });
      fs.copyFileSync(path.join(REPO, 'package.json'), path.join(dir, 'package.json'));
      fs.symlinkSync(path.join(MAIN_ROOT, 'assets'), path.join(dir, 'assets')); fs.symlinkSync(path.join(MAIN_ROOT, 'node_modules'), path.join(dir, 'node_modules'));
      const r = spawnSync('node', [path.join(dir, 'tools/build.mjs'), '--minify', '--quiet'], { cwd: dir, encoding: 'utf8', env: { ...process.env, VW_BUILD_DATE: '2026-10-08' }, timeout: 180000 });
      if (r.status !== 0) throw new Error('baseline rebuild failed: ' + (r.stderr || r.stdout).split('\n').slice(-3).join(' | '));
      const built = fs.readFileSync(path.join(dir, 'dist/artifact/index.html'));
      if (Buffer.compare(built, bytes) !== 0) throw new Error('the rebuild of the baseline sources differs from release/v8/index.html');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  return { html: bytes.toString('utf8'), sha: sha256(bytes), bytes: bytes.length, origin: 'release/v8/index.html' + (rebuild ? ' (rebuild identical)' : '') };
}
/** The page of the tree under test: --page, else the gate's $VW_PAGE_FRAGMENT, else a private minified build of this tree. */
function candidatePage(pageArg) {
  // an explicit --page must exist; the gate's env var only names the build step's output, which a filtered run (--only) never made: then build here
  const envPage = process.env.VW_PAGE_FRAGMENT && fs.existsSync(path.resolve(process.env.VW_PAGE_FRAGMENT)) ? process.env.VW_PAGE_FRAGMENT : null;
  const f = pageArg || envPage;
  if (f) { const b = fs.readFileSync(path.resolve(f)); return { html: b.toString('utf8'), sha: sha256(b), bytes: b.length, origin: path.resolve(f) }; }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-g1-cand-'));
  try {
    const r = spawnSync('node', [path.join(REPO, 'tools/build.mjs'), '--minify', '--quiet', '--out=' + out], { cwd: REPO, encoding: 'utf8', timeout: 240000 });
    if (r.status !== 0) throw new Error('build of this tree failed: ' + (r.stderr || r.stdout).split('\n').slice(-3).join(' | '));
    const b = fs.readFileSync(path.join(out, 'artifact', 'index.html'));
    return { html: b.toString('utf8'), sha: sha256(b), bytes: b.length, origin: 'private build of this tree' };
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
}

/** Serve the page under the artifact CSP on a loopback port (three/gsap from .cache/cdn, audio from assets/, fonts empty). */
function serve(html) {
  const cdn = path.join(MAIN_ROOT, '.cache', 'cdn');
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/' || u.pathname === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP }); res.end(wrapPage(html)); return; }
    const f = path.join(MAIN_ROOT, decodeURIComponent(u.pathname));
    if (f.startsWith(path.join(MAIN_ROOT, 'assets')) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); return; }
    res.writeHead(404); res.end('not found');
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port, cdn })));
}

/** One fresh page load: runs `cases` in the page and returns { engineVersion, results: Map id -> run result }. */
async function runInPage(page, fx, cases, opts) {
  const injected = injection(), walkSpec = JSON.parse(fs.readFileSync(SRC.spec, 'utf8')).data;
  await page.goto(opts.url);
  await page.waitForSelector('body[data-vw-ready="1"]', { timeout: opts.timeoutMs });
  await page.evaluate(injected);
  await page.evaluate((spec) => { const G = window.__g1; G.walk = G.sw.createStatwalk(spec); }, walkSpec);
  // arenas through the game itself (generateArena is inside the bundle): one begin() per recipe, the arena of the begun world is kept as a clone
  const recipes = [...new Set(cases.map((c) => c.arena))];
  const info = await page.evaluate(async ({ recipes: rs, size, seed }) => {
    const G = window.__g1, g = window.__vw.game;
    for (const r of rs) { const s = g.newSetup('quick', { arena: { presetId: r, size, seed } }); await g.begin(s); G.arenas[r] = g.world.arena.clone(); }
    G.W = g.world.constructor; G.defs = g.content.defs;
    return { world: typeof G.W === 'function', defs: Object.keys(G.defs).length, version: window.__vw.version || '' };
  }, { recipes, size: fx.matrix.params.arenaSize, seed: fx.matrix.params.arenaSeed });
  if (!info.world || info.defs !== 43) throw new Error(`page did not expose the Ancient World/defs (defs ${info.defs})`);
  const results = new Map();
  for (const spec of cases) {
    const arm = fx.armies[spec.armies], inputs = spec.inputs ? fx.inputs.logs[spec.inputs] : [];
    const r = await page.evaluate(({ spec: sp, a, b, inputs: ins, params, eventFields, hooks }) => {
      const G = window.__g1, W = G.W, defs = G.defs;
      const w = new W({ arena: G.arenas[sp.arena], seed: sp.seed, rules: sp.rules || {}, defs });
      if (a && a.length) w.addPlacements(0, a, { defs });
      if (b && b.length) w.addPlacements(1, b, { defs });
      for (const e of ins) w.input(e.tick, e.cmd);
      return G.core.simulate(w, sp, params, eventFields, { legacyStateHash: G.lg.legacyStateHash, statwalkDetail: G.walk.detail }, { hooks });
    }, { spec, a: arm.a, b: arm.b, inputs, params: fx.matrix.params, eventFields: fx.matrix.eventFields, hooks: !!opts.hooks });
    results.set(spec.id, r);
    if (opts.verbose) console.log(`  ${spec.id} ${r.digest.result[2]} ticks ${r.ms.toFixed(0)} ms`);
  }
  return { results, info };
}

async function withBrowser(html, fn, opts) {
  const { srv, port, cdn } = await serve(html);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: CHROMIUM_ARGS });
  try {
    const engineVersion = browser.version();
    const out = [];
    for (let i = 0; i < opts.loads; i++) {
      const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }), page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      await page.route('**/*', (route) => {
        const u = new URL(route.request().url());
        if (u.hostname === '127.0.0.1') return route.continue();
        if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
        for (const k of ['three.min.js', 'gsap.min.js']) if (u.pathname.endsWith(k)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(cdn, k)) });
        return route.abort();
      });
      try { out.push(await fn(page, `http://127.0.0.1:${port}/index.html`)); } finally { await ctx.close(); }
      if (errors.length) throw new Error('page errors: ' + errors.slice(0, 3).join(' | '));
    }
    return { engineVersion, loads: out };
  } finally { await browser.close(); srv.close(); }
}

/** Problems of one run that a digest cannot say about itself. */
function audit(fx, results) {
  const p = [];
  for (const [id, r] of results) {
    if (r.legacyBad !== null) p.push(`${id}: legacyStateHash != World.stateHash() at tick ${r.legacyBad}`);
    if (r.nan) p.push(`${id}: statwalk saw ${r.nan} NaN value(s)`);
    p.push(...digestShapeProblems(id, r.digest, fx.matrix.params));
  }
  return p;
}

/**
 * Run the page of the tree under test and compare with the stored Chromium record.
 * -> { fails:[{label,msg}], engineVersion, page:{origin,sha,bytes}, secs, results, record }   labels as in the Node column (g1/chain, g1/walk, g1/evhash, g1/tuple, g1/digest_equal,
 *    g1/legacy_hash, g1/finite, g1/record, g1/fixtures, g1/record_shape)
 */
export async function checkCandidate({ outDir = DEFAULT_DIR, page: pageArg = null, only = null, timeoutS = 90, verbose = false, fx = null, cases = null } = {}) {
  fx = fx || loadFixtures(outDir);
  cases = cases || fx.cases.filter((c) => (only ? only.includes(c.id) : fx.core.includes(c.id)));
  const file = path.join(outDir, CHROMIUM_RECORD), rec = readRecord(file), page = candidatePage(pageArg), t0 = Date.now(), fails = [];
  const add = (label, msg) => fails.push({ label, msg });
  const { engineVersion, loads } = await withBrowser(page.html, (pg, url) => runInPage(pg, fx, cases, { timeoutMs: timeoutS * 1000, verbose, url, hooks: false }), { loads: 1 });
  const results = loads[0].results;
  try { assertComparable({ engine: 'chromium', engineVersion, regime: 'baked' }, rec, 'a'); } catch (e) { add('g1/record', e.message); }
  for (const id of results.keys()) {
    const r = results.get(id);
    if (r.legacyBad !== null) add('g1/legacy_hash', `${id}: legacyStateHash != World.stateHash() at tick ${r.legacyBad}`);
    if (r.nan) add('g1/finite', `${id}: statwalk saw ${r.nan} NaN value(s)`);
  }
  for (const m of audit(fx, results)) if (/uint32|samples|tuple|end tick/.test(m)) add('g1/record_shape', m);
  const fh = fixtureHashes(fx); for (const k of Object.keys(fh)) if (rec.data.fixtures[k] !== fh[k]) add('g1/fixtures', `the record was made with a different ${k} fixture`);
  for (const c of cases) {
    const d = rec.data.cases[c.id]; if (!d) { add('g1/record', `${c.id}: not in the record`); continue; }
    for (const f of compareDigest(c.id, d, results.get(c.id).digest)) add(f.label, f.msg);
  }
  return { fails, engineVersion, page, secs: (Date.now() - t0) / 1000, results, record: rec };
}

export async function main(argv) {
  const opt = { check: false, page: null, rebuild: false, worktree: BASELINE_WORKTREE, outDir: DEFAULT_DIR, only: null, timeoutS: 90, verbose: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(usage()); return 0; }
    if (a === '--check') { opt.check = true; continue; }
    if (a === '--rebuild') { opt.rebuild = true; continue; }
    if (a === '--verbose') { opt.verbose = true; continue; }
    const m = /^--(page|worktree|out-dir|only|timeout-s)=(.+)$/.exec(a);
    if (!m) { console.error('unknown argument: ' + a + '\n(see --help)'); return 2; }
    const [, k, v] = m;
    if (k === 'page') opt.page = v; else if (k === 'worktree') opt.worktree = path.resolve(v); else if (k === 'out-dir') opt.outDir = path.resolve(v);
    else if (k === 'only') opt.only = v.split(',').filter(Boolean); else opt.timeoutS = +v;
  }
  const fx = loadFixtures(opt.outDir);
  const cases = fx.cases.filter((c) => (opt.only ? opt.only.includes(c.id) : fx.core.includes(c.id)));
  if (opt.only && cases.length !== opt.only.length) { console.error('unknown case id in --only'); return 2; }
  const file = path.join(opt.outDir, CHROMIUM_RECORD);
  const runOpts = { timeoutMs: opt.timeoutS * 1000, verbose: opt.verbose };

  if (opt.check) {
    const r = await checkCandidate({ outDir: opt.outDir, page: opt.page, only: opt.only, timeoutS: opt.timeoutS, verbose: opt.verbose, fx, cases });
    console.log(`${r.fails.length ? 'FAIL' : 'PASS'} g1 chromium ${r.engineVersion || '?'}: ${cases.length} cases of ${r.page.origin} (${r.page.bytes} B, sha ${r.page.sha.slice(0, 12)}) vs ${path.relative(REPO, file)} in ${r.secs.toFixed(0)} s${r.fails.length ? '\n  ' + r.fails.slice(0, 10).map((f) => f.msg).join('\n  ') : ''}`);
    return r.fails.length ? 1 : 0;
  }

  // ---- record
  const wt = assertBaseline(opt.worktree);
  const page = baselinePage(wt, opt.rebuild);
  const t0 = Date.now();
  const { engineVersion, loads } = await withBrowser(page.html, (pg, url) => runInPage(pg, fx, cases, { ...runOpts, url, hooks: true }), { loads: 2 });
  const problems = audit(fx, loads[0].results);
  for (const c of cases) if (canonicalJSON(loads[0].results.get(c.id).digest) !== canonicalJSON(loads[1].results.get(c.id).digest)) problems.push(`${c.id}: two page loads of the baseline disagree (not deterministic)`);
  if (problems.length) { console.error(`REFUSED: ${problems.length} problem(s)\n  ` + problems.slice(0, 10).join('\n  ')); return 1; }
  if (opt.only) { console.log(`--only given: ${cases.length} cases agree in two loads, nothing written`); return 0; }
  const data = { params: fx.matrix.params, order: cases.map((c) => c.id), core: fx.core, runs: 2, fixtures: fixtureHashes(fx), page: { origin: page.origin, sha256: page.sha, bytes: page.bytes }, cases: {}, exercise: {} };
  for (const c of cases) { const r = loads[0].results.get(c.id); data.cases[c.id] = r.digest; data.exercise[c.id] = r.exercise; }
  const rec = makeRecord('g1_digests', data, { engine: 'chromium', engineVersion, regime: 'baked', root: wt, tag: BASELINE_TAG });
  const bad = validateRecord(rec); if (bad.length) throw new Error('record invalid: ' + bad.join(','));
  const { written } = writeRecord(file, rec);
  console.log(`recorded chromium ${engineVersion}: ${cases.length} cases x 2 page loads identical in ${((Date.now() - t0) / 1000).toFixed(0)} s; ${written ? 'wrote' : 'unchanged'} ${path.relative(REPO, file)}`);
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
