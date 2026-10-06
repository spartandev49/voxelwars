// Fixture registry: createFixture(name, opts) -> ModelDef (async because beast builders are imported lazily).
import { makeHum1Ref, makeHumLiteRef, makeQuad1Ref, makeMountedRef, makeSoldier } from './rigs.js';

const FACTORIES = {
  hum1: async (o) => makeHum1Ref(o),
  hum_lite: async () => makeHumLiteRef(),
  soldier: async (o) => makeSoldier(o),
  quad1: async (o) => makeQuad1Ref(o),
  mounted: async (o) => makeMountedRef(o),
};

// 'u:<builder>' = a shipped unit model from beasts/index.js BUILDERS (mounted units, animals, siege, elephant, chariot, ...)
async function unitFixture(name, o) {
  const mod = await import('../../src/content/era_ancient/beasts/index.js');
  const b = mod.BUILDERS[name];
  if (!b) throw new Error('unknown unit builder ' + name);
  return b(o);
}
export function registerFixture(name, factory) { FACTORIES[name] = factory; }
export function fixtureNames() { return Object.keys(FACTORIES); }
export async function createFixture(name, opts = {}) {
  if (name.startsWith('u:')) return unitFixture(name.slice(2), opts);
  const f = FACTORIES[name];
  if (!f) throw new Error('unknown fixture ' + name);
  return f(opts);
}
