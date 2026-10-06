// Shared helpers for tests/anim: boot the clip library from disk (the build inlines the same JSON) and build reference models.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClipLib } from '../../src/anim/clips.js';
import { registerAllClips } from '../../src/anim/boot.js';
import { Animator } from '../../src/anim/animator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const HUMANOID_JSON = path.join(root, 'assets/anim/humanoid_clips.json');
export function loadHumanoid() { return JSON.parse(fs.readFileSync(HUMANOID_JSON, 'utf8')); }

let booted = null;
/** register all clips once per process; returns the boot summary */
export function boot(opts = {}) {
  if (!booted) { const msgs = []; booted = Object.assign(registerAllClips(ClipLib, Object.assign({ humanoid: loadHumanoid(), onReport: (m) => msgs.push(m) }, opts)), { msgs }); }
  return booted;
}
export { ClipLib, Animator };

/** collect animator warnings into an array while fn runs */
export function collectWarnings(fn) {
  const out = [], old = Animator.warn;
  Animator.warnings.clear(); Animator.warn = (m) => out.push(m);
  try { fn(); } finally { Animator.warn = old; }
  return out;
}
export const approx = (a, b, tol, msg) => { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg || 'approx'}: ${a} vs ${b} (tol ${tol})`); };
export const ok = (name) => console.log('ok  ' + name);
