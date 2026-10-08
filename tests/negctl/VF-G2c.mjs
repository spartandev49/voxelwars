// NC-VF-G2c: two faults, one per label. (1) the same Gen.put draw swap as NC-VF-G2, generated inside Chromium -> replay_equal must go red.
// (2) one hash of the Node record is changed in a case that is not on the frozen cross-engine list -> the Node/Chromium record comparison must report a NEW difference.
export default {
  id: 'NC-VF-G2c', criterion: 'VF-G2c',
  expectRed: ['VF-G2c/replay_equal', 'VF-G2c/cross_engine_known'],
  alsoRed: [],
  tier: 'T-era', needs: ['chromium'], costS: 20,
  mutate(c) {
    c.edit('src/world/gen.js', /s = o\.s \?\? rng\.range\(0\.9, 1\.25\), r = o\.r \?\? rng\.range\(0, TAU\), v = /, 'r = o.r ?? rng.range(0, TAU), s = o.s ?? rng.range(0.9, 1.25), v = ');
    c.edit('tests/world/gen_golden.json', /("marathon\/large\/1": \[")([0-9a-f])/, (m, a, d) => a + (d === '0' ? '1' : '0'));
  },
  run: ['node', 'tests/golden/g2_gen_chromium.test.mjs'],
};
