// Loads the Ancient v8 baseline (.cache/baseline/ancient-v8, sha 4aafd2e3...) as an importable module graph for the golden recorders.
//
//   const B = await loadBaseline({ regime: 'baked' });      // or 'default_meta'
//   B.H        tools/lib/harness.mjs of the BASELINE (buildWorld, DEFS, getArena, ...)
//   B.World    the baseline's sim/world.js World
//   B.sha      the verified commit
//
// Rules (docs/eras/spec/VF.md 3.6): a recorder refuses to run when `git rev-parse HEAD` of the worktree is not the baseline sha;
// regime 'baked' = registerAllClips(ClipLib, {humanoid: JSON.parse(assets/anim/humanoid_clips.json)}) called first, exactly what app/main.js does;
// 'default_meta' = no bake (what tools/lib/harness.mjs does by itself). The regime is process-global state of the loaded module graph:
// load one regime per process.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MAIN_ROOT } from '../lib/paths.mjs';

export const BASELINE_SHA = '4aafd2e3fb83f20e1b19e0db8465c117032ba3b7';
export const BASELINE_TAG = 'ancient-v8';
// the baseline lives in the shared working tree (MAIN_ROOT), also when a tool runs inside a gate snapshot
export const BASELINE_WORKTREE = path.join(MAIN_ROOT, '.cache', 'baseline', 'ancient-v8');

/** git rev-parse HEAD of a directory (null when it is not a git checkout). */
export function headOf(dir) {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}
/** Throws unless `dir` is a checkout of the baseline sha with its src/ present. */
export function assertBaseline(dir = BASELINE_WORKTREE) {
  const abs = path.resolve(dir), head = headOf(abs);
  if (head !== BASELINE_SHA) throw new Error(`worktree ${abs} is at ${head || 'no git HEAD'}, not the baseline ${BASELINE_SHA} (recreate with: git worktree add -f .cache/baseline/ancient-v8 4aafd2e)`);
  if (!fs.existsSync(path.join(abs, 'src', 'sim', 'world.js'))) throw new Error(`worktree ${abs} has no src/sim/world.js`);
  return abs;
}

const loaded = new Map();
export async function loadBaseline({ worktree = BASELINE_WORKTREE, regime = 'baked' } = {}) {
  if (regime !== 'baked' && regime !== 'default_meta') throw new Error("regime must be 'baked' or 'default_meta'");
  const wt = assertBaseline(worktree);
  const prev = loaded.get(wt);
  if (prev) { if (prev.regime !== regime) throw new Error(`baseline already loaded with regime ${prev.regime} in this process; use a separate process for ${regime}`); return prev; }
  const imp = (rel) => import(pathToFileURL(path.join(wt, rel)).href);
  const [H, W, Clips, Boot] = await Promise.all([imp('tools/lib/harness.mjs'), imp('src/sim/world.js'), imp('src/anim/clips.js'), imp('src/anim/boot.js')]);
  let report = null;
  if (regime === 'baked') {
    const humanoid = JSON.parse(fs.readFileSync(path.join(wt, 'assets', 'anim', 'humanoid_clips.json'), 'utf8'));
    report = Boot.registerAllClips(Clips.ClipLib, { humanoid });
  }
  const B = { wt, sha: BASELINE_SHA, regime, H, World: W.World, ClipLib: Clips.ClipLib, bakeReport: report, imp };
  loaded.set(wt, B);
  return B;
}
