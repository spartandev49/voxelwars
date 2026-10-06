// BEASTS public surface (pure JS, deterministic ModelDef factories, voxelSize 0.1, <= 48 parts each).
//
//   BUILDERS[builderId](opts?) -> ModelDef       builder ids are the ones UnitDefs name (spec 6): kind 'mounted' | 'beast' | 'bespoke'
//   buildMounted({mount:'horse'|'camel', mountColors, rider})   a quad1 mount + hum1 rider composed through composeModels (prefix r_)
//   buildBeast(builderId, opts) / buildBespoke(builderId, opts) the same factories by unit kind
//   SHEET_MODELS                                    every model + species variants for tools/shot_beasts.mjs and the tests
//
// opts accepted by every builder: {id?, rider?: ModelDef}; crew-carrying builders also take lite crew models (compileSoldier(bp,{lite:true}).model): war_elephant {crew:[a,b]},
// chariot_archer {driver, archer}, catapult {crew:[c1,c2,c3]}, ballista {crew:[c1,c2]}. `rider` (a compiled hum1 soldier from UNITS-LIB's compileSoldier) replaces the
// stand-in rider of mounted units (the centaur takes it too: its legs are dropped, the waist is re-seated). Without `rider` a stand-in
// hum1 rider (beasts/fixture_rider.js) is used so the model is always complete.
//
// Every model sets meta: {rig, kind, species, subrigs:[{prefix, rig, parts, kind}], clipMap, weaponStyle?, gait?, legLen?, builder}.
// `meta.clipMap` re-targets the SIM's generic clip ids to the clip ids authored for the model's rigs ({simClip: rigClip}); everything
// that is not listed falls through to the Animator's default chain (species-qualified clip, then the plain id, then fallbacks).
import { buildHorse, buildCamel, buildHound, buildGoat } from './quad1.js';
import { buildMounted } from './mounted.js';
import { buildCentaur } from './centaur.js';
import { buildChicken } from './chicken.js';
import { buildWarElephant } from './elephant.js';
import { buildChariotArcher } from './chariot.js';
import { buildCatapult } from './catapult.js';
import { buildBallista } from './ballista.js';
import { buildTrojan } from './trojan.js';
import { modelBounds } from './common.js';

export { buildMounted, buildHorse, buildCamel, buildHound, buildGoat, buildCentaur, buildChicken, buildWarElephant, buildChariotArcher, buildCatapult, buildBallista, buildTrojan };
export { buildHumLite } from './hum_lite.js';
export { buildFixtureRider } from './fixture_rider.js';

/** Mount presets of the mounted units (UnitDef.model = {kind:'mounted', mount, mountColors, rider}); riderKind picks the stand-in rider. */
export const MOUNT_PRESETS = {
  companion_cavalry: { mount: 'horse', mountColors: { coat: 'white', trim: 0xe8c040 }, riderKind: 'greek', weaponStyle: 'thrust' },
  equites: { mount: 'horse', mountColors: { coat: 'chestnut', blaze: true, socks: ['FR', 'BL'], trim: 0xc8a050 }, riderKind: 'roman', weaponStyle: 'thrust' },
  cataphract: { mount: 'horse', mountColors: { coat: 'black', barded: true, trim: 0xe8c040 }, riderKind: 'cataphract', weaponStyle: 'thrust' },
  camel_rider: { mount: 'camel', mountColors: { coat: 'camel', trim: 0xe8c040 }, riderKind: 'camel', weaponStyle: 'thrust' },
  numidian: { mount: 'horse', mountColors: { coat: 'dun', k: 0.9, saddle: 'pad', bridle: true, socks: ['FL'], trim: 0xd8b060 }, riderKind: 'numidian', weaponStyle: 'throw' },
  hannibal: { mount: 'horse', mountColors: { coat: 'black', plume: true, blaze: true, socks: ['FL', 'BR'], trim: 0xe8c040 }, riderKind: 'hannibal', weaponStyle: 'thrust' },
};

function mounted(key, o) {
  const p = MOUNT_PRESETS[key];
  const m = buildMounted({ id: o.id || key, mount: p.mount, mountColors: Object.assign({}, p.mountColors, o.mountColors), rider: o.rider, riderKind: p.riderKind });
  m.meta.weaponStyle = p.weaponStyle;
  m.meta.clipMap = {};
  return m;
}

const reg = (m, key, extra) => { m.meta.builder = key; Object.assign(m.meta, extra); return m; };

export const BUILDER_KIND = {
  companion_cavalry: 'mounted', equites: 'mounted', cataphract: 'mounted', camel_rider: 'mounted', numidian: 'mounted', hannibal: 'mounted',
  centaur_archer: 'beast', warhound: 'beast', battle_goat: 'beast', sacred_chicken: 'beast',
  war_elephant: 'bespoke', chariot_archer: 'bespoke', catapult: 'bespoke', ballista: 'bespoke', trojan_horse: 'bespoke',
};

export const BUILDERS = {
  companion_cavalry: (o = {}) => reg(mounted('companion_cavalry', o), 'companion_cavalry'),
  equites: (o = {}) => reg(mounted('equites', o), 'equites'),
  cataphract: (o = {}) => reg(mounted('cataphract', o), 'cataphract'),
  camel_rider: (o = {}) => reg(mounted('camel_rider', o), 'camel_rider'),
  numidian: (o = {}) => reg(mounted('numidian', o), 'numidian'),
  hannibal: (o = {}) => reg(mounted('hannibal', o), 'hannibal'),

  centaur_archer: (o = {}) => reg(buildCentaur({ id: o.id || 'centaur_archer', rider: o.rider }), 'centaur_archer', { weaponStyle: 'shoot', clipMap: { strike_bash: 'ride_strike', strike_thrust: 'ride_strike' } }),
  warhound: (o = {}) => reg(withSubrig(buildHound({ id: o.id || 'warhound', coat: o.coat })), 'warhound', { clipMap: { strike_thrust: 'strike_bite', strike_slash_1: 'strike_bite', strike_gore: 'strike_bite', strike_headbutt: 'strike_bite', taunt: 'idle' } }),
  battle_goat: (o = {}) => reg(withSubrig(buildGoat({ id: o.id || 'battle_goat', coat: o.coat })), 'battle_goat', { clipMap: { strike_thrust: 'strike_headbutt', strike_slash_1: 'strike_headbutt', strike_gore: 'strike_headbutt', strike_bite: 'strike_headbutt' } }),
  sacred_chicken: (o = {}) => reg(withSubrig(buildChicken({ id: o.id || 'sacred_chicken' })), 'sacred_chicken', { clipMap: { strike_thrust: 'strike_peck', strike_slash_1: 'strike_peck', strike_bite: 'strike_peck', strike_gore: 'strike_peck', cheer: 'flap', taunt: 'flap' } }),

  war_elephant: (o = {}) => reg(buildWarElephant({ id: o.id || 'war_elephant', crew: o.crew }), 'war_elephant', { weaponStyle: 'shoot', clipMap: { strike_thrust: 'strike_gore', strike_slash_1: 'strike_gore', strike_bite: 'strike_gore', strike_headbutt: 'strike_gore', cast: 'trumpet', taunt: 'trumpet', cheer: 'trumpet' } }),
  chariot_archer: (o = {}) => reg(buildChariotArcher({ id: o.id || 'chariot_archer', driver: o.driver, archer: o.archer }), 'chariot_archer', { weaponStyle: 'shoot', clipMap: { strike_thrust: 'strike_ram', strike_slash_1: 'strike_ram', strike_gore: 'strike_ram', strike_headbutt: 'strike_ram' } }),
  catapult: (o = {}) => reg(buildCatapult({ id: o.id || 'catapult', crew: o.crew }), 'catapult', { clipMap: { throw: 'launch', shoot_bow: 'launch', cast: 'launch' } }),
  ballista: (o = {}) => reg(buildBallista({ id: o.id || 'ballista', crew: o.crew }), 'ballista', { clipMap: { throw: 'launch', shoot_bow: 'launch', cast: 'launch' } }),
  trojan_horse: (o = {}) => reg(withSubrig(buildTrojan({ id: o.id || 'trojan_horse' })), 'trojan_horse'),
};

/** single-rig models get an explicit subrigs record so every shipped model carries one */
function withSubrig(m) {
  if (!m.meta.subrigs) m.meta.subrigs = [{ prefix: '', rig: m.meta.rig, parts: m.parts.map((p) => p.id), kind: m.meta.kind || '' }];
  if (!m.meta.clipMap) m.meta.clipMap = {};
  return m;
}
for (const k of Object.keys(BUILDERS)) {
  const f = BUILDERS[k];
  BUILDERS[k] = (o = {}) => {
    const m = withSubrig(f(o)); m.meta.kind = BUILDER_KIND[k];
    const b = modelBounds(m); m.meta.height = +b.max[1].toFixed(2); m.meta.footprint = [+b.size[0].toFixed(2), +b.size[2].toFixed(2)];   // true rest-pose extents (u) for bars/cameras
    return m;
  };
}

export function buildBeast(builder, opts = {}) {
  if (BUILDER_KIND[builder] !== 'beast') throw new Error(`buildBeast: '${builder}' is not a beast builder`);
  return BUILDERS[builder](opts);
}
export function buildBespoke(builder, opts = {}) {
  if (BUILDER_KIND[builder] !== 'bespoke') throw new Error(`buildBespoke: '${builder}' is not a bespoke builder`);
  return BUILDERS[builder](opts);
}

/** every model (units + species variants) for the sheets and the generic tests */
export const SHEET_MODELS = [
  ...Object.keys(MOUNT_PRESETS).map((k) => ({ id: k, group: 'mount', label: k.replace(/_/g, ' '), make: () => BUILDERS[k]() })),
  { id: 'centaur_archer', group: 'mount', label: 'centaur archer', make: () => BUILDERS.centaur_archer() },
  { id: 'horse_white', group: 'beast', label: 'horse (white)', make: () => buildHorse({ id: 'horse_white', coat: 'white' }) },
  { id: 'horse_chestnut', group: 'beast', label: 'horse (chestnut)', make: () => buildHorse({ id: 'horse_chestnut', coat: 'chestnut', blaze: true, socks: ['FL', 'BR'] }) },
  { id: 'horse_black', group: 'beast', label: 'horse (black)', make: () => buildHorse({ id: 'horse_black', coat: 'black', plume: true }) },
  { id: 'horse_barded', group: 'beast', label: 'horse (barded)', make: () => buildHorse({ id: 'horse_barded', coat: 'black', barded: true }) },
  { id: 'camel', group: 'beast', label: 'camel', make: () => buildCamel({ id: 'camel' }) },
  { id: 'warhound', group: 'beast', label: 'warhound', make: () => BUILDERS.warhound() },
  { id: 'battle_goat', group: 'beast', label: 'battle goat', make: () => BUILDERS.battle_goat() },
  { id: 'sacred_chicken', group: 'beast', label: 'sacred chicken', make: () => BUILDERS.sacred_chicken() },
  { id: 'catapult', group: 'siege', label: 'catapult', make: () => BUILDERS.catapult() },
  { id: 'ballista', group: 'siege', label: 'ballista', make: () => BUILDERS.ballista() },
  { id: 'chariot_archer', group: 'siege', label: 'chariot archer', make: () => BUILDERS.chariot_archer() },
  { id: 'trojan_horse', group: 'big', label: 'trojan horse', make: () => BUILDERS.trojan_horse() },
  { id: 'war_elephant', group: 'big', label: 'war elephant', make: () => BUILDERS.war_elephant() },
];
