// NC-VF-G1-fixture: a fixture changes after the digests were recorded (one world seed) -> g1/fixtures must go red (the record names the fixture hashes it was made with).
export default {
  id: 'NC-VF-G1-fixture', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/fixtures'],
  alsoRed: ['VF-T03/g1/chain', 'VF-T03/g1/walk', 'VF-T03/g1/evhash', 'VF-T03/g1/tuple', 'VF-T03/g1/digest_equal'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_matrix.json', /("id": "A-alpine-easy",[\s\S]*?"seed": )(\d+)/, (m, a, d) => a + (+d + 100)); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
