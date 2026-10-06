// Boot: bake every authored clip and register them together with the retargeted UAL clips (spec.md §7).
import { bakeAll } from './dsl.js';
import './clips/index.js';
import { convertUAL, buildAdopted } from './ual.js';

/**
 * registerAllClips(ClipLib, opts)
 *   opts.humanoid   : parsed assets/anim/humanoid_clips.json (the build inlines it; Node tests read it from disk) or null
 *   opts.alternates : also register the UAL version of every clip that an authored clip replaced, as 'ual_<id>' (review tooling)
 *   opts.onReport   : function(string) for a one-line summary
 */
export function registerAllClips(ClipLib, opts = {}) {
  const baked = bakeAll();
  const authored = new Map(baked.filter((c) => c.rig === 'hum1').map((c) => [c.id, c]));
  const adopted = buildAdopted(opts.humanoid, (id, why) => { if (opts.onReport) opts.onReport(`UAL clip '${id}' rejected at boot: ${why}`); });
  const replaced = new Set();
  for (const a of adopted) if (a.entry.use !== 'extra' && authored.has(a.entry.id)) replaced.add(a.entry.id);
  // authored clips first (every id), then the adopted UAL clips replace their authored twins in the plain slot
  for (const c of baked) {
    if (c.rig === 'hum1' && replaced.has(c.id)) { if (opts.alternates) ClipLib.register(Object.assign({}, c, { id: 'authored_' + c.id })); continue; }
    ClipLib.register(c);
  }
  for (const a of adopted) ClipLib.register(a.clip);
  let alt = 0;
  if (opts.alternates && opts.humanoid && opts.humanoid.clips) {
    for (const id of Object.keys(opts.humanoid.clips)) { ClipLib.register(convertUAL(id, opts.humanoid.clips[id], { id: 'ual_' + id })); alt++; }
  }
  if (opts.onReport) opts.onReport(`registered ${baked.length} authored clips, ${adopted.length} UAL clips (${replaced.size} replace an authored twin)${alt ? `, ${alt} alternates` : ''}`);
  return { authored: baked.length, adopted: adopted.length, replaced: Array.from(replaced) };
}
