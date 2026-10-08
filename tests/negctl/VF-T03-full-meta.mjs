// NC-VF-G1-meta: flip one digest of the default_meta record and compare under --regime=default_meta -> VF-T03-full/g1/digest_equal must go red (the second regime is compared, not ignored).
export default {
  id: 'NC-VF-G1-meta', criterion: 'VF-T03-full',
  expectRed: ['VF-T03-full/g1/digest_equal'],
  alsoRed: ['VF-T03-full/g1/chain'],
  tier: 'T-full', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.default_meta.json', /("D-boulder": \{\s*"chain": \[)(\d+)/, (m, a, d) => a + (+d + 1)); },
  run: ['node', 'tests/golden/g1_sim_full.slow.test.mjs', '--regime=default_meta', '--case=D-boulder'],
};
