// NC-VF-G1-shape: a sample is deleted from a stored chain (the record would then hide a divergence at that tick) -> g1/record_shape must go red.
export default {
  id: 'NC-VF-G1-shape', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/record_shape'],
  alsoRed: ['VF-T03/g1/chain', 'VF-T03/g1/digest_equal'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /("chain": \[)(\d+),/, '$1'); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
