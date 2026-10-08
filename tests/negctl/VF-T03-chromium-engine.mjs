// NC-VF-G1-chromium-engine: one extra w.rng.next() inside applyDamage for ranged hits, the page REBUILT from the mutated tree (private minified build) -> the Chromium column's
// g1/chain must go red. This is the control that proves the browser column tests the build under test and not a fixed page.
export default {
  id: 'NC-VF-G1-chromium-engine', criterion: 'VF-T03-chromium',
  expectRed: ['VF-T03-chromium/g1/chain'],
  alsoRed: ['VF-T03-chromium/g1/digest_equal', 'VF-T03-chromium/g1/walk', 'VF-T03-chromium/g1/evhash', 'VF-T03-chromium/g1/tuple'],
  tier: 'T-full', needs: ['chromium', 'build'], costS: 60,
  mutate(c) { c.edit('src/sim/combat.js', /(let raw = base \* \(0\.9 \+ w\.rng\.next\(\) \* 0\.2\);)/, '$1 if (o.proj) w.rng.next();'); },
  run: ['node', 'tests/golden/g1_chromium.slow.test.mjs', '--case=A-marathon-normal'],
};
