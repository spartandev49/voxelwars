// centaur_archer: a quad1 horse body (no equine neck/head: the human torso grows from the shoulders) composed with a hum1 upper body.
//   quad1 sub-rig (prefix ''):  body, legFL, legFR, legBL, legBR, tail, saddle (team pad over the withers/back)
//   hum1 sub-rig  (prefix 'r_'): r_body (waist), r_head, r_crest?, r_armUL, r_armLL, r_armUR, r_armLR, r_weapon (bow), r_back (quiver), no legs.
//   Attach: 'torso' on body = waist joint (the r_body pivot sits exactly there), 'saddle' on the pad.
import { composeModels } from '../../../voxel/compose.js';
import { assembleQuad, horseDescription } from './quad1.js';
import { buildFixtureRider } from './fixture_rider.js';
import { newModel } from './common.js';

/** Copy a humanoid ModelDef without its legs and re-seat its body at the origin (waist). */
export function stripLegs(model, id) {
  const out = newModel(id, Object.assign({}, model.meta, { rig: 'hum1', kind: 'humanoid_upper' }));
  const drop = new Set(['legUL', 'legLL', 'legUR', 'legLR']);
  for (const p of model.parts) {
    if (drop.has(p.id)) continue;
    const origin = p.id === 'body' ? [0, 0, 0] : p.originVox;
    out.addPart(p.id, p.grid, { parent: p.parent, origin, pivot: p.pivot, rest: p.rest.slice(), shadow: p.shadow });
  }
  for (const [k, a] of Object.entries(model.attach)) if (out.byId[a.part]) out.attach[k] = { part: a.part, at: a.at.slice() };
  return out;
}

export function buildCentaur(o = {}) {
  const sp = horseDescription({ coat: o.coat || 'chestnut', saddle: 'pad', bridle: false, k: 1, blaze: false, socks: o.socks || ['FR', 'BL'], trim: o.trim });
  const horse = assembleQuad(o.id ? o.id + '_body' : 'centaur_body', sp, { species: 'centaur', rig: 'quad1', kind: 'beast' }, { skip: ['neck', 'head', 'mane', 'ears'] });
  const bp = horse.byId.body.pivot;
  // waist joint: front-top of the barrel (voxel coords of the body grid)
  horse.addAttach('torso', 'body', [bp[0], bp[1] + 10.2, bp[2] + 10.4]);
  const torso = stripLegs(o.rider || buildFixtureRider('centaur'), 'centaur_torso');
  const out = composeModels(o.id || 'centaur_archer', [{ model: horse }, { model: torso, prefix: 'r_', on: 'torso', offset: [0, 0, 0] }]);
  out.meta.kind = 'beast';
  out.meta.species = 'centaur';
  out.meta.riderPrefix = 'r_';
  return out;
}
