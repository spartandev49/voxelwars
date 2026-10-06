// composeModels: merge several ModelDefs into ONE (so a mounted unit / chariot / howdah elephant renders as a single skinned instance).
//
// items[0] is the base model (parts keep their ids). Every further item is attached to a base attach point and its parts are
// prefixed (e.g. 'r_body', 'r_armUL' for a rider). The result records `meta.subrigs = [{prefix, rig, parts:[ids]}]` so the
// animator can pose each sub-model with its own rig clips, synchronised by the unit's state.
//
// All items must share the same voxelSize (0.1 for everything shipped).
import { ModelDef } from './model.js';

/**
 * @param {string} id
 * @param {Array<{model:ModelDef, prefix?:string, on?:string, offset?:number[], rot?:number[]}>} items
 *   on: attach point name registered on the BASE model (addAttach) or on a previous item as 'prefix:name'.
 *   offset: extra voxel offset added to the attach point; rot: static rest rotation for the item's root part(s)
 */
export function composeModels(id, items) {
  const base = items[0].model;
  const out = new ModelDef(id, base.voxelSize);
  out.meta = Object.assign({}, base.meta, { subrigs: [] });
  const attach = Object.create(null);           // name -> {part:newId, at:[x,y,z]}
  const addItem = (item, isBase) => {
    const m = item.model, prefix = isBase ? '' : (item.prefix || 'x_');
    if (Math.abs(m.voxelSize - out.voxelSize) > 1e-9) throw new Error(`composeModels ${id}: voxelSize mismatch (${m.id})`);
    const ids = [];
    for (const p of m.parts) {
      let parent, origin;
      if (p.parent) { parent = prefix + p.parent; origin = p.originVox.slice(); }
      else if (isBase) { parent = null; origin = p.originVox.slice(); }
      else {
        const a = attach[item.on];
        if (!a) throw new Error(`composeModels ${id}: unknown attach '${item.on}' for ${m.id}`);
        const host = out.byId[a.part];
        const off = item.offset || [0, 0, 0];
        parent = a.part;
        origin = [a.at[0] - host.pivot[0] + off[0] + p.originVox[0], a.at[1] - host.pivot[1] + off[1] + p.originVox[1], a.at[2] - host.pivot[2] + off[2] + p.originVox[2]];
      }
      const rest = p.rest.slice();
      if (!isBase && !p.parent && item.rot) { rest[0] += item.rot[0]; rest[1] += item.rot[1]; rest[2] += item.rot[2]; }
      out.addPart(prefix + p.id, p.grid, { parent, origin, pivot: p.pivot, rest, shadow: p.shadow });
      ids.push(prefix + p.id);
    }
    for (const k of Object.keys(m.attach)) attach[(isBase ? '' : prefix) + k] = { part: prefix + m.attach[k].part, at: m.attach[k].at.slice() };
    for (const k of Object.keys(attach)) out.attach[k] = attach[k];
    out.meta.subrigs.push({ prefix, rig: m.meta.rig || 'unknown', parts: ids, kind: m.meta.kind || '' });
  };
  items.forEach((it, i) => addItem(it, i === 0));
  return out;
}
