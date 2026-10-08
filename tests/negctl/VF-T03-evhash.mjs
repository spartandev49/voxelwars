// NC-VF-G1-evhash: flip the event hash of one case in the record -> g1/evhash must go red.
export default {
  id: 'NC-VF-G1-evhash', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/evhash'],
  alsoRed: ['VF-T03/g1/digest_equal'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /("evHash": )(\d+)/, (m, a, d) => a + (+d + 1)); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
