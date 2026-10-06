// centaur_archer: a quad1 horse body (see quad1.js) composed with a hum1 upper body.
//   quad1 sub-rig (prefix ''): body, neck (a short thick chest/withers rise, NOT an equine neck: pivot (0,7.6,10.6) on the body, rises 5.5 up / 2.6 forward),
//     legFL, legFR, legBL, legBR, tail, saddle (team pad over the back). There is NO `head`, `mane`, `ears` (clips drop missing parts).
//   hum1 sub-rig (prefix 'r_', reported as rig 'hum_lite' = hum1 clips minus legs): r_body (the WAIST), r_head, r_crest?, r_armUL, r_armLL,
//     r_armUR, r_armLR, r_weapon (bow, vertical along +Y at rest, string toward the archer), r_back (quiver). Played with ride_* clips (shoot = ride_shoot).
//   Attach: 'torso' on body = the waist joint at body-local (0, +12.6, +13) (the r_body pivot sits exactly there); 'saddle' on the pad.
//   The torso follows the BODY (not the neck): the chest rise may nod a little under it. meta.weaponStyle 'shoot'; gait recipe as the horse.
import { composeModels } from '../../../voxel/compose.js';
import { assembleQuad, horseDescription } from './quad1.js';
import { buildFixtureRider } from './fixture_rider.js';
import { newModel, LG, V, resolveCoat } from './common.js';

/** Copy a humanoid ModelDef without its legs and re-seat its body at the origin (waist). */
export function stripLegs(model, id) {
  const out = newModel(id, Object.assign({}, model.meta, { rig: 'hum_lite', kind: 'humanoid_upper' }));   // hum1 skeleton minus legs: reported as hum_lite so clips for hum1 apply and the missing legs are ignored silently
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
  // the equine neck becomes a short, thick chest/withers rise the human torso grows from (no head: the human head is r_head)
  const col = resolveCoat(o.coat || 'chestnut');
  const neck = new LG(12, 18, 16, 6, 5, 6);
  neck.tube([0, 0, 0], [0, 5.5, 2.6], 5.4, 4.6, V(col.main), 1.0);
  neck.paint((x, y, z) => (y < 0.2 ? V(col.light) : undefined));
  sp.parts.neck = { lg: neck, origin: [0, 7.6, 10.6], parent: 'body' };
  const horse = assembleQuad(o.id ? o.id + '_body' : 'centaur_body', sp, { species: 'centaur', rig: 'quad1', kind: 'beast' }, { skip: ['head', 'mane', 'ears'] });
  const bp = horse.byId.body.pivot;
  // waist joint: top of the chest rise (voxel coords of the body grid)
  horse.addAttach('torso', 'body', [bp[0], bp[1] + 12.6, bp[2] + 13.0]);
  const torso = stripLegs(o.rider || buildFixtureRider('centaur'), 'centaur_torso');
  const out = composeModels(o.id || 'centaur_archer', [{ model: horse }, { model: torso, prefix: 'r_', on: 'torso', offset: [0, 0, 0] }]);
  out.meta.kind = 'beast';
  out.meta.species = 'centaur';
  out.meta.riderPrefix = 'r_';
  return out;
}
