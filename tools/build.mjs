// Build VOXELWARS into a hostable page.
//   dist/voxelwars.html        full standalone document (open locally, or host anywhere; audio is referenced as assets/...)
//   dist/artifact/index.html   page FRAGMENT for the claude.ai Artifact tool (it wraps doctype/head/body itself)
//   dist/artifact/files.json   map {published path -> local source} of the supporting files (audio, vfx)
//   dist/artifact/files.manifest.json   {published path -> {sha256, bytes}} of the same files (rollback / read-back material)
// Usage: node tools/build.mjs [--minify] [--out=<dir>] [--report] [--budget] [--quiet] [--help]
//   (no --out)   legacy behaviour: writes dist/ and regenerates the tracked src/_generated/ (files whose content is identical are not rewritten)
//   --out=<dir>  PRIVATE build: everything is written under <dir> (relative to the repo root unless absolute), the registry is generated into <dir>/_generated and
//                redirected there by a resolve plugin; dist/ and the tracked src/_generated/ are not touched (the gate builds this way, in a snapshot)
//   --report     also write <outdir>/report/bytes.json + bytes.md (per-family bytes, packed fragment, published file count; AR 3.11.2)
//   --budget     enforce the size budget (fragment <= 5,000,000 B when minified, warn at 4,500,000; published set <= 500 files): exit 3 on a breach
//   VW_BUILD_DATE=YYYY-MM-DD pins the build date (provenance); the build is otherwise a pure function of the tree
import { build, transform } from 'esbuild';
import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { familyOf } from './lib/families.mjs';
import { checkBudget } from './lib/size_budget.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawArgs = process.argv.slice(2);
const KNOWN = ['--minify', '--report', '--budget', '--quiet', '--help'];
for (const a of rawArgs) if (!KNOWN.includes(a) && !a.startsWith('--out=')) { console.error(`build: unknown option ${a} (see --help)`); process.exit(2); }
if (rawArgs.includes('--help')) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(5, 11).map((l) => l.slice(3)).join('\n')); process.exit(0); }
if (rawArgs.includes('--out=')) { console.error('build: --out needs a directory'); process.exit(2); }
const args = new Set(rawArgs);
const minify = args.has('--minify');
const quiet = args.has('--quiet');
const outArg = (rawArgs.find((a) => a.startsWith('--out=')) || '').slice(6);
const outDir = outArg ? path.resolve(root, outArg) : path.join(root, 'dist');
const genDir = outArg ? path.join(outDir, '_generated') : null;
const VERSION = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

// ---------- registries ----------
import { spawnSync } from 'child_process';
const gr = spawnSync('node', [path.join(root, 'tools/gen-registry.mjs'), ...(genDir ? ['--out=' + genDir] : [])], { encoding: 'utf8' });
if (gr.status !== 0) { console.error(gr.stderr); process.exit(1); }
// private build: imports of src/_generated/registry.*.js are redirected to the files just generated in <out>/_generated (the tracked tree is never written)
const trackedGen = path.join(root, 'src/_generated');
const redirectGenerated = { name: 'redirect-generated', setup(b) { b.onResolve({ filter: /(^|\/)registry\.[a-z]+\.js$/ }, (a) => { if (!genDir || !a.resolveDir) return undefined; const abs = path.resolve(a.resolveDir, a.path); return path.dirname(abs) === trackedGen ? { path: path.join(genDir, path.basename(abs)) } : undefined; }); } };

// ---------- JS bundle ----------
const noThree = { name: 'no-three-import', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ errors: [{ text: "import from 'three' is forbidden: use window.THREE (CDN global)" }] })); } };
const result = await build({
  plugins: [noThree, redirectGenerated], metafile: true,
  entryPoints: [path.join(root, 'src/app/main.js')],
  bundle: true, write: false, format: 'iife', target: ['chrome100', 'firefox100', 'safari15'],
  minify, legalComments: 'none', logLevel: 'warning',
  define: { __VW_VERSION__: JSON.stringify(VERSION), __VW_BUILD__: JSON.stringify(process.env.VW_BUILD_DATE || new Date().toISOString().slice(0, 10)) },
});
let js = result.outputFiles[0].text;
// make the bundle safe to inline in a <script> element
js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ---------- CSS ----------
const cssFiles = ['src/ui/boot.css', 'src/ui/kit.css', 'src/ui/screens.css', 'src/ui/hud.css', 'src/ui/editors_arena.css', 'src/ui/editors_soldier.css'];
const cssMissing = cssFiles.filter((f) => !exists(f));
if (cssMissing.length) { console.error('build: CSS file(s) missing (a typo in the list would silently drop styles): ' + cssMissing.join(', ')); process.exit(1); }
let css = cssFiles.map(read).join('\n');
if (minify) css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

// ---------- audio / asset manifest (files published alongside the page, fetched at runtime) ----------
const files = {};
let manifest = { sfx: [], music: [], vfx: [] };
if (exists('assets/manifest.json')) {
  manifest = JSON.parse(read('assets/manifest.json'));
  for (const kind of ['sfx', 'music'])   // vfx sprites are not used by the voxel-particle renderer: not shipped
   for (const e of manifest[kind] || []) {
    const rel = e.path || `${kind === 'vfx' ? 'vfx' : 'audio/' + kind}/${e.file}`;
    const p = rel.startsWith('assets/') ? rel : `assets/${rel}`;
    if (!exists(p)) { console.warn('manifest file missing:', p); continue; }
    files[p] = p;
  }
}
// the vfx sprites are not shipped, so their credit line is not either
const credits = exists('assets/CREDITS.md') ? read('assets/CREDITS.md').split('\n').filter((l) => !/Kenney Particle Pack/.test(l)).join('\n').replace('audio / sprites', 'audio') : '';

// ---------- templates ----------
const FONTS = 'https://fonts.googleapis.com/css2?family=Bungee&family=Cinzel:wght@500;700&family=Rubik:wght@400;500;600;700&display=swap';
// Inline loader: three (required; GSAP is not used and not loaded) with a CDN fallback chain cdnjs -> jsDelivr -> unpkg (same pinned versions).
const LOADER = `(function(){var L={three:['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js','https://unpkg.com/three@0.128.0/build/three.min.js']};function load(u,i){return new Promise(function(res){if(i>=u.length)return res(false);var s=document.createElement('script');s.src=u[i];s.onload=function(){res(true)};s.onerror=function(){s.remove();load(u,i+1).then(res)};document.head.appendChild(s)})}window.__vwReady=load(L.three,0).then(function(t){return{three:t}})})();`;
const cdnTags = `<script>${LOADER}</script>`;

const bodyHtml = `<div id="vw-root"><div id="vw-boot"><div class="boot-logo">VOXELWARS</div><div class="boot-bar"><i></i></div><div class="boot-msg">Polishing helmets…</div></div></div>`;
const noscript = `<noscript>VOXELWARS needs JavaScript and WebGL.</noscript>`;

const title = '<title>VOXELWARS</title>';
const head = `${title}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
${css}
</style>
${cdnTags}`;
// core audio (guaranteed fallback) embedded as base64; retargeted animation clips inlined as JSON
const core = {};
for (const kind of ['sfx', 'music']) for (const e of manifest[kind] || []) if (e.core) { const rel = e.path || `audio/${kind}/${e.file}`; const p = rel.startsWith('assets/') ? rel : `assets/${rel}`; if (exists(p)) core[e.id] = fs.readFileSync(path.join(root, p)).toString('base64'); }
const ualPath = ['src/anim/data/humanoid_clips.json', 'assets/anim/humanoid_clips.json'].find(exists);
const ual = ualPath ? read(ualPath) : 'null';
const inlineJs = `window.__VW_MANIFEST__=${JSON.stringify(manifest)};window.__VW_CREDITS__=${JSON.stringify(credits)};window.__VW_CORE_AUDIO__=${JSON.stringify(core)};window.__VW_UAL_CLIPS__=${ual};window.__VW_FILES__=${JSON.stringify(Object.keys(files))};`;
const inlineData = `<script>${inlineJs}</script>`;
const script = `<script>\n${js}\n</script>`;

// The Artifact fragment ships its code deflated + base64 inside an inert <script type=text/plain>, inflated at load by DecompressionStream and run as an
// inline script (allowed by the artifact CSP: 'unsafe-inline'; no eval). Smaller page, and the publisher's page scanner no longer misreads game data as a review page.
const packB64 = zlib.deflateRawSync(Buffer.from(`${inlineJs}\n${js}`, 'utf8'), { level: 9 }).toString('base64');
const PACK_LOADER = `(function(){var el=document.getElementById('vw-pack');function fail(m){var b=document.querySelector('#vw-boot .boot-msg');if(b)b.textContent=m;console.error(m);}
if(!el||typeof DecompressionStream==='undefined'||typeof Blob==='undefined'||!Blob.prototype.stream){fail('This browser is too old for VOXELWARS (it needs DecompressionStream and WebGL2). Try a current Chrome, Edge, Firefox or Safari.');return;}
var bin=atob(el.textContent.trim()),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(function(t){var s=document.createElement('script');s.textContent=t;document.body.appendChild(s);},function(e){fail('Could not unpack the game: '+(e&&e.message));});})();`;
const packed = `<script type="text/plain" id="vw-pack">${packB64}</script>\n<script>${PACK_LOADER}</script>`;
const fragment = `${head}\n${bodyHtml}\n${noscript}\n${packed}\n`;
const standalone = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>html,body{margin:0;padding:0;height:100%;background:#0b0d1a}</style>
${head}
</head><body>
${bodyHtml}
${noscript}
${inlineData}
${script}
</body></html>
`;

fs.mkdirSync(path.join(outDir, 'artifact'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'voxelwars.html'), standalone);
fs.writeFileSync(path.join(outDir, 'artifact/index.html'), fragment);
fs.writeFileSync(path.join(outDir, 'artifact/files.json'), JSON.stringify(files, null, 1));
// files.manifest.json (sibling of files.json, same key order): {path: {sha256, bytes}} of every published supporting file; rollback and read-back material (docs/eras/spec/VF.md 3.5, AR 3.11.3).
const filesManifest = {};
for (const f of Object.keys(files)) { const buf = fs.readFileSync(path.join(root, files[f])); filesManifest[f] = { sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length }; }
fs.writeFileSync(path.join(outDir, 'artifact/files.manifest.json'), JSON.stringify(filesManifest));

// ---------- CSP lint: every external load must be on the artifact allowlist ----------
const ALLOW = [/^https:\/\/cdnjs\.cloudflare\.com\//, /^https:\/\/cdn\.jsdelivr\.net\/npm\//, /^https:\/\/unpkg\.com\//, /^https:\/\/fonts\.googleapis\.com(\/|$)/, /^https:\/\/fonts\.gstatic\.com(\/|$)/];
const loads = [...standalone.matchAll(/(?:src|href)=["'](https?:[^"']+)["']/g)].map((m) => m[1]);
const bad = loads.filter((u) => !ALLOW.some((r) => r.test(u)));
if (bad.length) { console.error('CSP LINT FAILED, non-allowlisted loads:\n' + bad.join('\n')); process.exit(1); }
const cssUrls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, '')).filter((u) => /^https?:/.test(u));
if (cssUrls.length) { console.error('CSP LINT FAILED, CSS url():\n' + cssUrls.join('\n')); process.exit(1); }

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
let assetBytes = 0;
for (const f of Object.keys(files)) assetBytes += fs.statSync(path.join(root, f)).size;
if (!quiet) {
  console.log(`built v${VERSION}: html ${kb(Buffer.byteLength(fragment))}, js ${kb(Buffer.byteLength(js))}, css ${kb(Buffer.byteLength(css))}, ${Object.keys(files).length} asset files ${kb(assetBytes)}`);
  console.log(`CSP lint OK (${loads.length} external tags)`);
}

// ---------- byte report + budget (AR 3.11.2) ----------
const dflt = (x) => zlib.deflateRawSync(typeof x === 'string' ? Buffer.from(x) : x, { level: 9 }).length;
const report = {
  schema: 1, version: VERSION, minified: minify, fragmentBytes: Buffer.byteLength(fragment), standaloneBytes: Buffer.byteLength(standalone), jsBytes: Buffer.byteLength(js), cssBytes: Buffer.byteLength(css),
  packBytes: packB64.length, publishedFiles: Object.keys(files).length, publishedBytes: assetBytes,
  nonJs: { coreAudio: { raw: JSON.stringify(core).length, packed: Math.ceil(dflt(JSON.stringify(core)) * 4 / 3) }, humanoidClips: { raw: ual.length, packed: Math.ceil(dflt(ual) * 4 / 3) }, manifest: { raw: JSON.stringify(manifest).length, packed: Math.ceil(dflt(JSON.stringify(manifest)) * 4 / 3) }, credits: { raw: credits.length, packed: Math.ceil(dflt(credits) * 4 / 3) } },
};
if (args.has('--report')) {
  const outputs = Object.values(result.metafile.outputs);
  const fam = new Map();
  for (const o of outputs) for (const [inp, v] of Object.entries(o.inputs || {})) {
    const f = familyOf(inp.startsWith('..') || path.isAbsolute(inp) ? inp.replace(/^(\.\.\/)+/, '') : inp);
    const row = fam.get(f) || { family: f, files: 0, raw: 0, texts: [] };
    row.files++; row.raw += v.bytesInOutput;
    if (v.bytesInOutput > 0 && /\.(m?js)$/.test(inp)) row.texts.push(path.join(root, inp.startsWith('..') ? inp.replace(/^(\.\.\/)+/, '') : inp));
    fam.set(f, row);
  }
  // deflated = deflate-raw(9) of the family's minified sources (each file minified on its own: an estimate whose error is printed as `calibration`)
  const rows = [];
  for (const row of [...fam.values()].sort((a, b) => (a.family < b.family ? -1 : 1))) {
    let sum = '';
    for (const t of row.texts) { if (!fs.existsSync(t)) continue; try { sum += (await transform(fs.readFileSync(t, 'utf8'), { loader: 'js', format: 'esm', minify: true, legalComments: 'none' })).code; } catch { /* non-parseable input is reported by the build itself */ } }
    const deflated = sum ? dflt(sum) : 0;
    rows.push({ family: row.family, files: row.files, raw: row.raw, deflated, packed: Math.ceil(deflated * 4 / 3) });
  }
  const jsPacked = Math.ceil(dflt(js) * 4 / 3);
  report.families = rows; report.jsPackedMeasured = jsPacked;
  report.calibration = rows.reduce((a, r) => a + r.packed, 0) ? +(jsPacked / rows.reduce((a, r) => a + r.packed, 0)).toFixed(3) : null;
  const baseFile = path.join(root, 'tests/baseline/bytes_ancient_v8.json');
  let base = null; try { base = JSON.parse(fs.readFileSync(baseFile, 'utf8')); } catch { /* no baseline recorded yet */ }
  if (base && base.families) for (const r of rows) { const b = base.families.find((x) => x.family === r.family); r.deltaRaw = r.raw - (b ? b.raw : 0); }
  fs.mkdirSync(path.join(outDir, 'report'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report/bytes.json'), JSON.stringify(report, null, 1));
  const md = ['# Byte report (' + (minify ? 'minified' : 'unminified') + ')', '', `fragment ${report.fragmentBytes} B, standalone ${report.standaloneBytes} B, js ${report.jsBytes} B (measured pack ${jsPacked} B, calibration ${report.calibration}), published files ${report.publishedFiles}`, '', '| family | files | raw | deflated | packed |' + (base ? ' delta raw |' : ''), '|---|---|---|---|---|' + (base ? '---|' : '')]
    .concat(rows.map((r) => `| ${r.family} | ${r.files} | ${r.raw} | ${r.deflated} | ${r.packed} |` + (base ? ` ${r.deltaRaw} |` : ''))).join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, 'report/bytes.md'), md);
  if (!quiet) console.log(`byte report: ${rows.length} families, packed js ${jsPacked} B, calibration ${report.calibration} -> ${path.relative(root, path.join(outDir, 'report'))}/`);
}
if (args.has('--budget')) {
  const b = checkBudget(report, null);
  for (const c of b.checks.filter((x) => !x.ok)) console.error(`${c.level === 'fail' ? 'BUDGET FAIL' : 'budget warn'}: ${c.msg}`);
  if (b.status === 'FAIL') process.exit(3);
}
