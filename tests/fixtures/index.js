// Fixture registry: createFixture(name, opts) -> ModelDef (async because beast builders are imported lazily).
import { makeHum1Ref, makeHumLiteRef, makeQuad1Ref, makeMountedRef } from './rigs.js';

const FACTORIES = {
  hum1: async (o) => makeHum1Ref(o),
  hum_lite: async () => makeHumLiteRef(),
  quad1: async (o) => makeQuad1Ref(o),
  mounted: async (o) => makeMountedRef(o),
};

export function registerFixture(name, factory) { FACTORIES[name] = factory; }
export function fixtureNames() { return Object.keys(FACTORIES); }
export async function createFixture(name, opts = {}) {
  const f = FACTORIES[name];
  if (!f) throw new Error('unknown fixture ' + name);
  return f(opts);
}
