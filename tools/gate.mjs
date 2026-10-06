// The gate: lint + syntax check + all unit tests (+ build when the app exists). Usage: node tools/gate.mjs [--fast] [--only=<substr>]
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fast = process.argv.includes('--fast');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
let fail = 0;
const step = (name, cmd, args, opt = {}) => {
  const t = Date.now();
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: opt.timeout || 300000 });
  const ok = r.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  if (!ok) { fail++; console.log((r.stdout || '').split('\n').slice(-25).join('\n')); console.log((r.stderr || '').split('\n').slice(-25).join('\n')); }
};
step('lint', 'node', ['tools/lint.mjs', '--quiet']);
// syntax check every source file
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.(js|mjs)$/.test(e.name)) files.push(p); } })(path.join(root, 'src'));
let syntaxBad = 0;
for (const f of files) { const r = spawnSync('node', ['--check', f], { encoding: 'utf8' }); if (r.status !== 0) { // ES module syntax in .js: retry as module
  const t = spawnSync('node', ['--input-type=module', '--check'], { input: fs.readFileSync(f, 'utf8'), encoding: 'utf8' });
  if (t.status !== 0) { syntaxBad++; console.log('syntax error:', path.relative(root, f), (t.stderr || r.stderr).split('\n').slice(0, 4).join(' | ')); } } }
console.log(`${syntaxBad ? 'FAIL' : 'PASS'}  syntax (${files.length} files)`); if (syntaxBad) fail++;
// tests
const tests = []; (function walk(d) { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.test\.mjs$/.test(e.name)) tests.push(p); } })(path.join(root, 'tests'));
for (const t of tests.sort()) { const rel = path.relative(root, t); if (only && !rel.includes(only)) continue; if (fast && /slow|fuzz|balance/.test(rel)) continue; step('test ' + rel, 'node', [rel], { timeout: 600000 }); }
if (!only) step('contracts', 'node', ['tools/contracts.mjs']);
if (fs.existsSync(path.join(root, 'src/app/main.js')) && !only) {
  step('build', 'node', ['tools/build.mjs']);
  // full gate: boot the REAL build (and the packed artifact fragment) in Chromium under the artifact CSP; any console error/warning/CSP violation fails
  if (!fast) { step('smoke (standalone)', 'node', ['tools/smoke.mjs', '--battle=6'], { timeout: 600000 }); step('smoke (artifact fragment)', 'node', ['tools/smoke.mjs', '--page=dist/artifact/index.html', '--battle=6'], { timeout: 600000 });
    step('tour (every menu and editor screen)', 'node', ['tools/tour.mjs'], { timeout: 900000 }); step('flow (title to results and rematch, by clicking)', 'node', ['tools/flow.mjs'], { timeout: 900000 }); step('modes (campaign, puzzle, survival, daily)', 'node', ['tools/modes.mjs'], { timeout: 1200000 }); }
}
console.log(fail ? `GATE FAILED (${fail})` : 'GATE PASSED');
process.exit(fail ? 1 : 0);
