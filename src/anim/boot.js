// Boot: bake every authored clip and register them together with the retargeted UAL clips (spec.md §7).
import { bakeAll } from './dsl.js';
import './clips/index.js';
import { convertUAL } from './ual.js';

/**
 * registerAllClips(ClipLib, opts)
 *   opts.humanoid   : parsed assets/anim/humanoid_clips.json (the build inlines it; Node tests read it from disk) or null
 *   opts.alternates : also register the UAL version of every clip that an authored clip replaced, as 'ual_<id>' (review tooling)
 *   opts.onReport   : function(string) for a one-line summary
 */
export function registerAllClips(ClipLib, opts = {}) {
  const baked = bakeAll();
  const have = new Set(baked.filter((c) => c.rig === 'hum1').map((c) => c.id));
  for (const c of baked) ClipLib.register(c);
  let n = 0, alt = 0;
  if (opts.humanoid && opts.humanoid.clips) {
    for (const id of Object.keys(opts.humanoid.clips)) {
      if (have.has(id)) { if (opts.alternates) { ClipLib.register(convertUAL(id, opts.humanoid.clips[id], { id: 'ual_' + id })); alt++; } continue; }
      ClipLib.register(convertUAL(id, opts.humanoid.clips[id])); n++;
    }
  }
  if (opts.onReport) opts.onReport(`registered ${baked.length} authored + ${n} retargeted clips (+${alt} alternates)`);
  return { authored: baked.length, retargeted: n };
}
