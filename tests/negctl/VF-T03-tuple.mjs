// NC-VF-G1-tuple: change the winner in the result tuple of the first case in the record -> g1/tuple must go red.
export default {
  id: 'NC-VF-G1-tuple', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/tuple'],
  alsoRed: ['VF-T03/g1/digest_equal'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /("result": \[)(-?\d+)/, (m, a, d) => a + (+d === 1 ? 0 : 1)); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
