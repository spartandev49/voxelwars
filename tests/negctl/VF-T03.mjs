// NC-VF-09 (docs/eras/spec/VF.md 3.13): flip one chain digest of the baked node record -> g1/digest_equal (and the chain label) must go red; a golden that cannot be told apart from its mutation proves nothing.
// VF names AP-T10/golden_log as a further red label (the golden_log rule of the AP lint, TOOLS-GATE); it is allowed here, not required.
export default {
  id: 'NC-VF-09', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/digest_equal'],
  alsoRed: ['VF-T03/g1/chain', 'AP-T10/golden_log'],
  tier: 'T-fast', needs: [], costS: 8,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /("chain": \[)(\d+)/, (m, a, d) => a + (+d + 1)); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-alpine-easy'],
};
