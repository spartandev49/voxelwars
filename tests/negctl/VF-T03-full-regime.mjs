// NC-VF-G1-regime: the baked record claims to be a default_meta record (bit equality is only defined inside one regime, AR 3.7.4) -> VF-T03-full/g1/record must go red.
export default {
  id: 'NC-VF-G1-regime', criterion: 'VF-T03-full',
  expectRed: ['VF-T03-full/g1/record'],
  alsoRed: [],
  tier: 'T-full', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /"regime": "baked"/, '"regime": "default_meta"'); },
  run: ['node', 'tests/golden/g1_sim_full.slow.test.mjs', '--case=D-boulder'],
};
