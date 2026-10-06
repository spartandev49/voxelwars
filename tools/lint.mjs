// Project lint (spec.md §0). Usage: node tools/lint.mjs [--quiet]. Exit 1 on violations.
// Escape hatch: put `lint-allow:<rule>` in a comment on the same line.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PURE = ['src/sim/', 'src/content/', 'src/voxel/', 'src/anim/', 'src/core/', 'src/world/', 'src/save/'];
// The only browser adapters inside pure directories (spec §0.1): gsap shim and the localStorage wrapper.
const ADAPTERS = ['src/core/tween.js', 'src/save/store.js'];
const NO_RANDOM = ['src/sim/', 'src/content/'];
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name === '_generated' || e.name === 'node_modules') continue; walk(p); } else if (/\.(js|mjs)$/.test(e.name)) files.push(p); } })(path.join(root, 'src'));
const rules = [
  { id: 'pure-dom', test: (rel, l) => !ADAPTERS.includes(rel) && PURE.some((p) => rel.startsWith(p)) && /\b(window|document|navigator|localStorage|AudioContext|requestAnimationFrame)\b/.test(l), msg: 'pure module touches the browser (window/document/localStorage/AudioContext)' },
  { id: 'pure-three', test: (rel, l) => PURE.some((p) => rel.startsWith(p)) && /\bTHREE\b/.test(l), msg: 'pure module uses THREE' },
  { id: 'math-random', test: (rel, l) => NO_RANDOM.some((p) => rel.startsWith(p)) && /Math\.random\s*\(/.test(l), msg: 'Math.random in sim/content (use the seeded RNG)' },
  { id: 'import-three', test: (rel, l) => /from\s+['"]three['"]|require\(['"]three['"]\)/.test(l), msg: "import from 'three' (use window.THREE)" },
  { id: 'dialogs', test: (rel, l) => /(^|[^.\w])(alert|confirm|prompt)\s*\(/.test(l), msg: 'alert/confirm/prompt are dead in the viewer; use in-page modals' },
  { id: 'eval', test: (rel, l) => /\beval\s*\(|new Function\s*\(/.test(l), msg: 'eval / new Function' },
  { id: 'innerHTML', test: (rel, l) => /\.innerHTML\s*[+]?=/.test(l), msg: 'innerHTML assignment (use textContent; static markup needs lint-allow:innerHTML)' },
  { id: 'location-search', test: (rel, l) => /location\.search|URLSearchParams\(\s*(window\.)?location/.test(l) && !rel.startsWith('tests/'), msg: 'query strings never reach the page' },
  { id: 'abs-fetch', test: (rel, l) => /fetch\(\s*['"`]https?:/.test(l) || /XMLHttpRequest/.test(l), msg: 'network access to non-relative URL' },
  { id: 'dilution', test: (rel, l) => /\b(TODO|FIXME|XXX|lorem ipsum)\b|your[-_ ]?(value|key|name)[-_ ]?here|coming soon/i.test(l), msg: 'placeholder / dilution marker' },
];
let bad = 0;
for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const src = fs.readFileSync(f, 'utf8').split('\n');
  let inBlock = false;
  src.forEach((raw, i) => {
    let l = raw;
    if (inBlock) { const e = l.indexOf('*/'); if (e < 0) return; l = l.slice(e + 2); inBlock = false; }
    // strip block comments on one line, then line comments (keep the lint-allow marker check on the raw line)
    l = l.replace(/\/\*.*?\*\//g, '');
    const bs = l.indexOf('/*'); if (bs >= 0) { l = l.slice(0, bs); inBlock = true; }
    const code = l.replace(/(^|[^:'"`])\/\/.*$/, '$1').replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
    for (const r of rules) {
      const probe = r.id === 'dilution' ? raw : code;
      if (r.test(rel, probe) && !raw.includes('lint-allow:' + r.id)) { console.error(`${rel}:${i + 1}: [${r.id}] ${r.msg}\n    ${raw.trim().slice(0, 140)}`); bad++; }
    }
  });
}
if (!process.argv.includes('--quiet')) console.log(bad ? `lint: ${bad} violation(s)` : `lint OK (${files.length} files)`);
process.exit(bad ? 1 : 0);
