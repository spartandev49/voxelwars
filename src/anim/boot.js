// Boot: bake every authored clip and register them together with the retargeted UAL clips (spec.md §7).
import { bakeAll } from './dsl.js';

/**
 * registerAllClips(ClipLib, opts)
 *   opts.humanoid : parsed assets/anim/humanoid_clips.json (the build inlines it; Node tests read it from disk) or null
 *   opts.onReport : function(string) for a one-line summary
 */
export function registerAllClips(ClipLib, opts = {}) {
  const baked = bakeAll();
  for (const c of baked) ClipLib.register(c);
  if (opts.onReport) opts.onReport(`registered ${baked.length} authored clips`);
  return { authored: baked.length };
}
