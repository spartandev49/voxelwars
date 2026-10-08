// NC-VF-G1-full: flip one chain digest of a NON-core case (H-waves) and run the full-tier test through the two-worker pool -> VF-T03-full/g1/digest_equal must go red.
// Proves that the cases outside the core subset are compared and that the process pool reports a divergence of a worker.
export default {
  id: 'NC-VF-G1-full', criterion: 'VF-T03-full',
  expectRed: ['VF-T03-full/g1/digest_equal'],
  alsoRed: ['VF-T03-full/g1/chain'],
  tier: 'T-full', needs: [], costS: 12,
  mutate(c) { c.edit('tests/golden/g1_digests.node.baked.json', /("H-waves": \{\s*"chain": \[)(\d+)/, (m, a, d) => a + (+d + 1)); },
  run: ['node', 'tests/golden/g1_sim_full.slow.test.mjs', '--case=H-waves,H-stalemate', '--jobs=2'],
};
