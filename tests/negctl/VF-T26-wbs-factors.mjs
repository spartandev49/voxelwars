// NC-VF-T26-wbs-factors: the wpsPerItem factor of a class (rig = 3 WPs) is ignored
export default {
  id: 'NC-VF-T26-wbs-factors', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/class_formula_factors'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /\(c\.wpsPerItem \|\| 1\)/, '1');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
