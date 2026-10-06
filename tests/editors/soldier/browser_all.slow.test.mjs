// EDITORS-B browser suite: drives the REAL built page (artifact CSP, headless Chromium) through the Soldier Workshop and Voxel Painter scenarios in
// tests/editors/soldier/browser/*.mjs via tools/shot_editors_b.mjs. Every scenario must report zero failed checks and zero console errors or warnings.
// Skipped (with a note, exit 0) when Chromium or the cached three.js is not available. Screenshots land in .cache/editors_b/.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const chrome = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
if (!fs.existsSync(chrome) || !fs.existsSync(path.join(root, '.cache/cdn/three.min.js'))) { console.log('SKIP: Chromium or .cache/cdn/three.min.js is missing, so the browser scenarios cannot run here'); process.exit(0); }

const scenarios = [
  ['workshop_parts', '1280x720'], ['workshop_roster', '1280x720'], ['workshop_battle', '1280x720'],
  ['painter_tools', '1280x720'], ['painter_extras', '1280x720'],
  ['workshop_tour', '960x540'], ['painter_look', '960x540'],
];
let failed = 0, built = false;
for (const [name, size] of scenarios) {
  const args = ['tools/shot_editors_b.mjs', name, '--size=' + size, '--timeout=240000'];
  if (built) args.push('--no-build');
  const t = Date.now();
  const r = spawnSync('node', args, { cwd: root, encoding: 'utf8', timeout: 900000 });
  built = true;
  const out = (r.stdout || '') + (r.stderr || '');
  const passes = (out.match(/^\s+PASS /gm) || []).length;
  const ok = r.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} @ ${size}  (${passes} checks, ${((Date.now() - t) / 1000).toFixed(0)}s)`);
  if (!ok) { failed++; console.log(out.split('\n').filter((l) => /FAIL|PROBLEMS|driver|console\.|pageerror|CSP/.test(l)).slice(0, 12).join('\n')); }
}
if (failed) { console.log(`${failed} browser scenario(s) failed`); process.exit(1); }
console.log('all browser scenarios passed');
