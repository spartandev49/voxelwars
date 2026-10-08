// NC-VF-G1-legacy: World.stateHash() stops hashing the tick counter (the method changed unnoticed) -> g1/legacy_hash must go red. The frozen copy in tests/golden/legacy_hash.mjs
// still hashes the old way, so the chain stays equal: ONLY the equality check can see this change.
export default {
  id: 'NC-VF-G1-legacy', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/legacy_hash'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('src/sim/world.js', /mix\(this\.rng\.s\); mix\(this\.tickN\);/, 'mix(this.rng.s);'); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
