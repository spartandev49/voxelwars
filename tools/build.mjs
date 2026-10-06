// Build VOXELWARS into a hostable page.
//   dist/voxelwars.html        full standalone document (open locally, or host anywhere; audio is referenced as assets/...)
//   dist/artifact/index.html   page FRAGMENT for the claude.ai Artifact tool (it wraps doctype/head/body itself)
//   dist/artifact/files.json   map {published path -> local source} of the supporting files (audio, vfx)
// Usage: node tools/build.mjs [--minify] [--no-sourcemap]
import { build } from 'esbuild';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const minify = args.has('--minify');
const VERSION = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

// ---------- registries ----------
import { spawnSync } from 'child_process';
const gr = spawnSync('node', [path.join(root, 'tools/gen-registry.mjs')], { encoding: 'utf8' });
if (gr.status !== 0) { console.error(gr.stderr); process.exit(1); }

// ---------- JS bundle ----------
const noThree = { name: 'no-three-import', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ errors: [{ text: "import from 'three' is forbidden: use window.THREE (CDN global)" }] })); } };
const result = await build({
  plugins: [noThree],
  entryPoints: [path.join(root, 'src/app/main.js')],
  bundle: true, write: false, format: 'iife', target: ['chrome100', 'firefox100', 'safari15'],
  minify, legalComments: 'none', logLevel: 'warning',
  define: { __VW_VERSION__: JSON.stringify(VERSION), __VW_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
});
let js = result.outputFiles[0].text;
// make the bundle safe to inline in a <script> element
js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ---------- CSS ----------
const cssFiles = ['src/ui/boot.css', 'src/ui/kit.css', 'src/ui/screens.css', 'src/ui/hud.css', 'src/ui/editors.css', 'src/ui/editors_arena.css', 'src/ui/editors_soldier.css'].filter(exists);
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
const inlineJs = `window.__VW_MANIFEST__=${JSON.stringify(manifest)};window.__VW_CREDITS__=${JSON.stringify(credits)};window.__VW_CORE_AUDIO__=${JSON.stringify(core)};window.__VW_UAL_CLIPS__=${ual};`;
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

fs.mkdirSync(path.join(root, 'dist/artifact'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/voxelwars.html'), standalone);
fs.writeFileSync(path.join(root, 'dist/artifact/index.html'), fragment);
fs.writeFileSync(path.join(root, 'dist/artifact/files.json'), JSON.stringify(files, null, 1));

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
console.log(`built v${VERSION}: html ${kb(Buffer.byteLength(fragment))}, js ${kb(Buffer.byteLength(js))}, css ${kb(Buffer.byteLength(css))}, ${Object.keys(files).length} asset files ${kb(assetBytes)}`);
console.log(`CSP lint OK (${loads.length} external tags)`);
