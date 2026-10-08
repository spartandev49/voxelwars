// Fingerprints of the simulation, shared-render and era sources (docs/eras/spec/AR.md 3.7.6, docs/eras/spec/VF.md 3.7).
//
//   engineHash(root)      -> { simCore, shared }     sim records compare simCore (+ eraHash), G11 compares simCore + shared
//   renderHash(root)      -> hex                     render goldens (G8, G12) compare shared + renderHash
//   eraHash(era, root)    -> hex                     era data that decides a battle (stats, arenas, campaign, puzzles, ...)
//   fingerprint(root, eras) -> { engineHash, renderHash, eraHash: { <era>: hex } }
//
// Every hash is sha256 over the sorted list of  path \0 sha256(file bytes) \n  (paths are repo-relative with '/'; the sort is plain string order).
// File lists are RECURSIVE (the old simHash() of tests/campaign/_lib.mjs read only direct children and missed src/sim/abilities/*).
// A pattern that matches nothing is not an error here (a worktree older than the registry has no registry.js); it is reported in
// describe(...).unmatched so a test can pin exactly which patterns resolve on a given tree.
//
// CLI:  node tools/lib/fingerprint.mjs [--root=<dir>] [--era=ancient,medieval] [--list=simCore|shared|render|era:<id>] [--json] [--help]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------------------------------------------- pattern tables
/** AR 3.7.6, table "simCore". */
export const SIM_CORE = [
  'src/sim/**', 'src/world/**', 'src/core/**',
  'src/content/{registry,eras.config,stat_helpers}.js', 'src/content/shared/**',
  'src/_generated/registry.eras.js',
  'src/anim/{clips,dsl,boot,kin,gait,ual,ual_adopt}.js',
  'src/anim/clips/{hum1_*,poses,index}.js',
  'assets/anim/humanoid_clips.json',
];
/** AR 3.7.6, table "shared": the Ancient kits that produce pixels for every era. */
export const SHARED = [
  'src/voxel/**', 'src/anim/animator.js',
  'src/content/era_ancient/{blueprints.js,parts/_kit.js,parts/_base.js,parts/_registry.js,beasts/common.js,beasts/quad1.js,props/models/kit.js}',
];
/** AR 3.7.6, table "renderHash". */
export const RENDER = ['src/render/**'];
/** AR 3.7.6, "eraHash(ancient)": the explicit list (stats.js arenas.js campaign*.js puzzles*.js survival.js daily.js sim_text.js lesson_text.js
 *  wave_names.js props/catalog.js data.js manifest.js pack.js) plus the 4 non-hum1 rig clip files. */
export const ANCIENT_ERA = [
  'src/content/era_ancient/{stats,arenas,survival,daily,sim_text,lesson_text,wave_names,data,manifest,pack}.js',
  'src/content/era_ancient/{campaign,puzzles}*.js',
  'src/content/era_ancient/props/catalog.js',
  'src/anim/clips/{quad1,elephant1,siege,chicken1}.js',
];
/** Presentation-only subtrees of an era (text and models are covered by G4/G8/G10, not by sim records). */
export const ERA_PRESENTATION = ['humor/**', 'units/**', 'beasts/**', 'parts/**', 'props/models/**', '**/*_text.js'];
/** *_text.js files that DO feed the simulation (barks, lessons, campaign scripting) and therefore stay in eraHash. */
export const ERA_TEXT_KEEP = ['sim_text.js', 'lesson_text.js', 'campaign_text.js'];

// ---------------------------------------------------------------------------------------------------------------- glob
/** Expand {a,b} alternatives (nesting allowed) into plain patterns. */
export function expandBraces(p) {
  const i = p.indexOf('{');
  if (i < 0) return [p];
  let depth = 0, j = i;
  for (; j < p.length; j++) { if (p[j] === '{') depth++; else if (p[j] === '}' && --depth === 0) break; }
  if (depth !== 0) throw new Error('unbalanced brace in pattern: ' + p);
  const inner = p.slice(i + 1, j), parts = [];
  let d = 0, cur = '';
  for (const ch of inner) { if (ch === '{') d++; if (ch === '}') d--; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur);
  const out = [];
  for (const alt of parts) for (const rest of expandBraces(p.slice(j + 1))) out.push(...expandBraces(p.slice(0, i) + alt).map((h) => h + rest));
  return out;
}
/** Glob (no braces) -> RegExp over a repo-relative '/' path. '**' crosses directories, '*' and '?' do not. */
export function globToRegExp(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*') {
      if (g[i + 1] === '*') { i++; if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*'; } else re += '[^/]*';
    } else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}
function walk(abs, rel, out) {
  let ents; try { ents = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const a = path.join(abs, e.name), r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) walk(a, r, out);
    else if (e.isFile()) out.push(r);
    else if (e.isSymbolicLink()) { try { const st = fs.statSync(a); if (st.isDirectory()) walk(a, r, out); else if (st.isFile()) out.push(r); } catch { /* dangling link: not a file */ } }
  }
}
/** Files under `root` matched by the patterns, plus the (brace-expanded) patterns that matched nothing. */
export function matchPatterns(root, patterns) {
  const files = new Set(), unmatched = [];
  for (const pat of patterns) for (const g of expandBraces(pat)) {
    let n = 0;
    if (!/[*?]/.test(g)) {
      try { if (fs.statSync(path.join(root, g)).isFile()) { files.add(g); n++; } } catch { /* absent */ }
    } else {
      const segs = g.split('/'), lit = [];
      for (const s of segs) { if (/[*?]/.test(s)) break; lit.push(s); }
      const base = lit.join('/'), found = [];
      walk(path.join(root, base), base, found);
      const re = globToRegExp(g);
      for (const f of found) if (re.test(f)) { files.add(f); n++; }
    }
    if (!n) unmatched.push(g);
  }
  return { files: [...files].sort(), unmatched };
}

// ---------------------------------------------------------------------------------------------------------------- hashing
/** sha256 of the sorted `path \0 sha256(bytes) \n` list; throws when a listed file cannot be read. */
export function hashFiles(root, files) {
  const lines = [...files].sort().map((f) => f + '\0' + crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex') + '\n');
  return crypto.createHash('sha256').update(lines.join('')).digest('hex');
}

/** Quoted string literals of `key: [ ... ]` in an era manifest source (cheap static read; the manifest is a leaf module of plain data). */
export function manifestList(src, key) {
  const m = new RegExp('\\b' + key + '\\s*:\\s*\\[([^\\]]*)\\]').exec(src);
  if (!m) return [];
  return [...m[1].matchAll(/(['"`])([^'"`]+)\1/g)].map((x) => x[2]);
}
/** Patterns contributed by the era manifest: rig clip files and sim ability files it names. */
function manifestPatterns(root, era, manifest) {
  let rigs = [], abilities = [];
  if (manifest) { rigs = manifest.rigs || []; abilities = manifest.abilities || []; }
  else {
    let src = null; try { src = fs.readFileSync(path.join(root, `src/content/era_${era}/manifest.js`), 'utf8'); } catch { /* the era has no manifest yet */ }
    if (src) { rigs = manifestList(src, 'rigs'); abilities = manifestList(src, 'abilities'); }
  }
  const out = [];
  for (const r of rigs) out.push(`src/anim/clips/${r}.js`);
  for (const a of abilities) out.push(`src/sim/abilities/${a.replace(/\.js$/, '')}.js`);
  return out;
}

/** The files of one hash. kind: 'simCore' | 'shared' | 'render' | 'era' (needs `era`). */
export function describe(kind, root = REPO_ROOT, era = null, opts = {}) {
  if (kind === 'simCore') return matchPatterns(root, SIM_CORE);
  if (kind === 'shared') return matchPatterns(root, SHARED);
  if (kind === 'render') return matchPatterns(root, RENDER);
  if (kind !== 'era') throw new Error('unknown fingerprint kind: ' + kind);
  if (!/^[a-z][a-z0-9_]*$/.test(era || '')) throw new Error('bad era id: ' + era);
  const extra = manifestPatterns(root, era, opts.manifest);
  if (era === 'ancient') {
    const r = matchPatterns(root, [...ANCIENT_ERA, ...extra]);
    return r;
  }
  const dir = `src/content/era_${era}`;
  const all = matchPatterns(root, [dir + '/**', `src/anim/clips/${era}/**`, ...extra]);
  const dropped = matchPatterns(root, ERA_PRESENTATION.map((p) => `${dir}/${p}`)).files;
  const drop = new Set(dropped.filter((f) => !ERA_TEXT_KEEP.some((k) => f === `${dir}/${k}` || f.endsWith('/' + k))));
  return { files: all.files.filter((f) => !drop.has(f)), unmatched: all.unmatched };
}

export function simCoreHash(root = REPO_ROOT) { return hashFiles(root, describe('simCore', root).files); }
export function sharedHash(root = REPO_ROOT) { return hashFiles(root, describe('shared', root).files); }
/** { simCore, shared } */
export function engineHash(root = REPO_ROOT) { return { simCore: simCoreHash(root), shared: sharedHash(root) }; }
export function renderHash(root = REPO_ROOT) { return hashFiles(root, describe('render', root).files); }
export function eraHash(era, root = REPO_ROOT, opts = {}) { return hashFiles(root, describe('era', root, era, opts).files); }
export function fingerprint(root = REPO_ROOT, eras = ['ancient']) {
  const e = {};
  for (const id of eras) e[id] = eraHash(id, root);
  return { engineHash: engineHash(root), renderHash: renderHash(root), eraHash: e };
}

// ---------------------------------------------------------------------------------------------------------------- CLI
const HELP = `fingerprint: sha256 fingerprints of the sim / shared / render / era sources (AR 3.7.6)
usage: node tools/lib/fingerprint.mjs [--root=<dir>] [--era=ancient,medieval] [--list=<what>] [--json] [--help]
  --root=<dir>   tree to hash (default: this repository; use .cache/baseline/ancient-v8 for the v8 baseline)
  --era=<ids>    eras for eraHash (default: ancient)
  --list=<what>  print the file list (and unmatched patterns) of simCore | shared | render | era:<id> instead of the hashes
  --json         machine-readable output
exit: 0 ok, 2 usage error`;
async function main(argv) {
  const opt = {};
  for (const a of argv) {
    if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if (!m || !['root', 'era', 'list', 'json'].includes(m[1])) { console.error('unknown argument: ' + a + '\n' + HELP); return 2; }
    opt[m[1]] = m[2] === undefined ? true : m[2];
  }
  const root = path.resolve(opt.root || REPO_ROOT);
  if (!fs.existsSync(path.join(root, 'src'))) { console.error('no src/ under ' + root); return 2; }
  if (opt.list) {
    const w = String(opt.list), d = w.startsWith('era:') ? describe('era', root, w.slice(4)) : describe(w, root);
    if (opt.json) console.log(JSON.stringify(d));
    else { console.log(d.files.join('\n')); if (d.unmatched.length) console.log('# unmatched patterns: ' + d.unmatched.join(' ')); }
    return 0;
  }
  const eras = String(opt.era || 'ancient').split(',').filter(Boolean);
  const fp = fingerprint(root, eras);
  if (opt.json) console.log(JSON.stringify(fp, null, 1));
  else {
    console.log(`simCore  ${fp.engineHash.simCore}  (${describe('simCore', root).files.length} files)`);
    console.log(`shared   ${fp.engineHash.shared}  (${describe('shared', root).files.length} files)`);
    console.log(`render   ${fp.renderHash}  (${describe('render', root).files.length} files)`);
    for (const e of eras) console.log(`era.${e}`.padEnd(8) + ` ${fp.eraHash[e]}  (${describe('era', root, e).files.length} files)`);
  }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.stack || e); process.exit(1); });
