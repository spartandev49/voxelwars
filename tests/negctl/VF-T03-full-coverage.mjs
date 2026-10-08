// NC-VF-G1-fullcov: the full selection silently drops cases (12 of 83 run) -> VF-T03-full/g1/coverage must go red.
export default {
  id: 'NC-VF-G1-fullcov', criterion: 'VF-T03-full',
  expectRed: ['VF-T03-full/g1/coverage'],
  alsoRed: [],
  tier: 'T-full', needs: [], costS: 25,
  mutate(c) { c.edit('tools/golden/g1_lib.mjs', /: fx\.cases\.slice\(\);/, ': fx.cases.slice(0, 12);'); },
  run: ['node', 'tests/golden/g1_sim_full.slow.test.mjs'],
};
