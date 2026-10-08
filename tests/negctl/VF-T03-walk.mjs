// NC-VF-G1-walk: flip one statwalk digest of the record -> g1/walk must go red (the independent witness is wired in, not decorative).
export default {
  id: 'NC-VF-G1-walk', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/walk'],
  alsoRed: ['VF-T03/g1/digest_equal'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /("walk": \[)(\d+)/, (m, a, d) => a + (+d + 1)); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
