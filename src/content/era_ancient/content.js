// Content assembly: merges the numeric truth (stats.js) with models (units/*, beasts/*) and text (humor/*) into full UnitDefs and
// provides modelFor(def, unit) for the renderer. Pure (no DOM/THREE) so tests and the balance harness can use it.
import { STAT_TABLE, FACTIONS } from './stats.js';
import { buildSimDefs } from '../../sim/defs.js';
import { fallbackHumanoid, fallbackBeast } from './fallback_model.js';
import { UNIT_MODEL_MODULES, BEAST_MODULES, HUMOR_MODULES, PART_MODULES } from '../../_generated/registry.content.js';

function collect(mods, name) { const out = {}; for (const k of Object.keys(mods)) { const m = mods[k]; const v = m[name] || (m.default && m.default[name]); if (v) Object.assign(out, v); } return out; }

export function buildContent() {
  const MODELS = collect(UNIT_MODEL_MODULES, 'MODELS');
  const BUILDERS = collect(BEAST_MODULES, 'BUILDERS');
  const TEXT = collect(HUMOR_MODULES, 'UNIT_TEXT');
  const extra = {};
  for (const id of Object.keys(STAT_TABLE)) { extra[id] = { model: MODELS[id] || null, text: TEXT[id] || null, name: (TEXT[id] && TEXT[id].name) || undefined }; }
  const defs = buildSimDefs(extra);
  for (const id of Object.keys(defs)) { const d = defs[id]; if (!d.name || d.name === id) d.name = id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '); }
  const cache = new Map();
  let compile = null;
  // compileSoldier is optional until UNITS-LIB lands
  const bp = Object.values(PART_MODULES).length ? null : null;
  function setCompiler(fn) { compile = fn; }
  /** @returns {{model:import('../../voxel/model.js').ModelDef, scale?:number[], glow?:number}} */
  function modelFor(def, unit) {
    const key = unit && unit.custom ? 'c:' + (unit.custom.id || def.id) : def.id;
    let r = cache.get(key); if (r) return r;
    const spec = unit && unit.custom ? { kind: 'humanoid', blueprint: unit.custom.blueprint } : def.model;
    try {
      if (spec && spec.kind === 'humanoid' && compile) { const c = compile(spec.blueprint || spec.bp, { teamTint: true }); r = { model: c.model, scale: c.scale }; }
      else if (spec && (spec.kind === 'mounted' || spec.kind === 'beast' || spec.kind === 'bespoke') && BUILDERS[spec.builder || spec.mount || def.id]) { const b = BUILDERS[spec.builder || def.id](spec, compile); r = { model: b.model || b, scale: b.scale }; }
      else if (BUILDERS[def.id]) { const b = BUILDERS[def.id](spec || {}, compile); r = { model: b.model || b, scale: b.scale }; }
    } catch (e) { console.warn('model build failed for', def.id, e); }
    if (!r) { const isBeast = def.role === 'cavalry' || def.role === 'beast' || def.role === 'siege' || (def.tags && def.tags.indexOf('animal') >= 0); r = { model: isBeast ? fallbackBeast(def) : fallbackHumanoid(def) }; }
    cache.set(key, r); return r;
  }
  return { defs, factions: FACTIONS, modelFor, setCompiler, unitList: () => Object.values(defs), MODELS, BUILDERS };
}
