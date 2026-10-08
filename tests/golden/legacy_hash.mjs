// The frozen legacy state hash (docs/eras/spec/VF.md 3.6.1): the verbatim body of World.stateHash() as shipped in Ancient v8 (src/sim/world.js:899-905
// at 4aafd2e). G1 asserts legacyStateHash(w) === w.stateHash() at every sampled tick on every build under test, so the method itself cannot change
// unnoticed. Do not edit; a change here is a golden re-record (two signers, docs/eras/golden_log.md).
export function legacyStateHash(w) {
  let h = 2166136261 >>> 0;
  const mix = (v) => { h ^= (Math.fround(v) * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
  for (const u of w.units) { mix(u.id); mix(u.x); mix(u.z); mix(u.hp); mix(u.team); }
  mix(w.rng.s); mix(w.tickN);
  return h >>> 0;
}
