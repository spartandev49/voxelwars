// NC-VF-G2 (spec/W WC01 mutation): swap the two rng draws in Gen.put (scale before rotation) -> every arena that places a prop with default scale/rotation
// changes, so both the 96 recipe/size/seed cases and the 16 preset defaults must turn red. Proves VF-G2 detects a one-line change of the generator.
export default {
  id: 'NC-VF-G2', criterion: 'VF-G2',
  expectRed: ['VF-G2/cases_equal', 'VF-G2/presets_equal'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
    c.edit('src/world/gen.js', /s = o\.s \?\? rng\.range\(0\.9, 1\.25\), r = o\.r \?\? rng\.range\(0, TAU\), v = /, 'r = o.r ?? rng.range(0, TAU), s = o.s ?? rng.range(0.9, 1.25), v = ');
  },
  run: ['node', 'tests/golden/g2_gen.test.mjs'],
};
