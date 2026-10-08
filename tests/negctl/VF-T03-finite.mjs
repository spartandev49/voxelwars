// NC-VF-G1-finite: a NaN appears in a unit field the witness reads (the render-only gait phase, which never feeds back into the sim) -> g1/finite must go red.
// The chain does not see it (it hashes x z hp only), the walk sees a changed digest; ONLY the non-finite counter names it for what it is.
export default {
  id: 'NC-VF-G1-finite', criterion: 'VF-T03',
  expectRed: ['VF-T03/g1/finite'],
  alsoRed: ['VF-T03/g1/walk', 'VF-T03/g1/digest_equal'],
  tier: 'T-fast', needs: [], costS: 10,
  mutate(c) { c.edit('src/sim/combat.js', /(let raw = base \* \(0\.9 \+ w\.rng\.next\(\) \* 0\.2\);)/, '$1 if (dst.id === 1) dst.gait = NaN;'); },
  run: ['node', 'tests/golden/g1_sim.test.mjs', '--case=A-marathon-normal'],
};
