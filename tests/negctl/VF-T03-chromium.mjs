// NC-VF-G1-chromium: flip one chain digest of the Chromium record -> VF-T03-chromium/g1/digest_equal must go red (the browser column compares, it does not just load the page).
// The page is the v8 fragment of release/v8 (no build needed for this control); NC-VF-G1-chromium-engine below rebuilds the page from a mutated source tree.
export default {
  id: 'NC-VF-G1-chromium', criterion: 'VF-T03-chromium',
  expectRed: ['VF-T03-chromium/g1/digest_equal'],
  alsoRed: ['VF-T03-chromium/g1/chain'],
  tier: 'T-full', needs: ['chromium'], costS: 20,
  mutate(c) { c.edit('tests/golden/g1_digests.chromium.baked.json', /("chain": \[)(\d+)/, (m, a, d) => a + (+d + 1)); },
  run: ['node', 'tests/golden/g1_chromium.slow.test.mjs', '--page=release/v8/index.html', '--case=A-alpine-easy'],
};
