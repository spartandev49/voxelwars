// Prop model registry for the Ancient era: one pure builder per catalog id.
//   buildProp(type, stage, variant, rng?) -> ModelDef (one part 'root', voxelSize 0.1, pivot at the ground centre of the footprint, front = +Z)
//   stage 0 intact, 1 cracked (<= 60% hp), 2 collapsed rubble. Indestructible props return the intact model for every stage.
// Deterministic: the default RNG is seeded from (type, stage, variant). The renderer (render/props.js) and the tests share this entry point.
import * as nature from './nature.js';
import * as crowd from './crowd.js';
import { RNG, hashString, measure, colorHistogram } from './kit.js';

const SPECS = Object.assign({}, nature.MODELS, crowd.MODELS);
const BUILD = Object.assign({}, nature.BUILDERS, crowd.BUILDERS);

export const PROP_MODEL_IDS = Object.keys(BUILD);

export function hasPropModel(type) { return !!BUILD[type]; }
/** number of distinct visual variants of a prop type (arena props carry v = 0..3; the renderer wraps it). */
export function variantCount(type) { return SPECS[type] ? SPECS[type].variants || 1 : 1; }
/** true when stages 1 and 2 are never shown (indestructible props). */
export function isStaticProp(type) { return !!(SPECS[type] && SPECS[type].indestructible); }
export function propRng(type, stage, variant) { return new RNG((hashString(type) ^ Math.imul(stage + 1, 7919) ^ Math.imul(variant + 1, 104729)) >>> 0); }

export function buildProp(type, stage = 0, variant = 0, rng = null) {
  const b = BUILD[type];
  if (!b) throw new Error('No prop model for ' + type);
  return b(stage, variant, rng || propRng(type, stage | 0, variant | 0));
}

const DEBRIS_CACHE = Object.create(null);
/** Debris/rubble palette (0xRRGGBB list, most characteristic first) for CubeFX.rubble/debrisBurst. Non-empty for every prop id. */
export function debrisColors(type) {
  if (DEBRIS_CACHE[type]) return DEBRIS_CACHE[type];
  const s = SPECS[type];
  let cols = s && s.pal && s.pal.length ? s.pal.slice() : [];
  if (!cols.length && BUILD[type]) cols = colorHistogram(buildProp(type, 0, 0)).slice(0, 6).map((e) => e.rgb);
  if (!cols.length) cols = [0xb8b2a4, 0x9a958a, 0x7a756c];
  return (DEBRIS_CACHE[type] = cols);
}

export { measure, colorHistogram };
export { buildSpectator, SPECTATOR_VARIANTS } from './crowd.js';
