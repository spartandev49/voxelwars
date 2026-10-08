// NC-VF-T26-wbs-tolerance: class counts get a 100% tolerance instead of 5%
export default {
  id: 'NC-VF-T26-wbs-tolerance', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/class_tolerance_five_percent'],
  alsoRed: ['VF-T26-wbs/class_formula_factors', 'VF-T26-wbs/cli_check_and_class_failure'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /Math\.floor\(\(rules\.tolerance \?\? 0\.05\) \* expected \+ 1e-9\)/, 'expected');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
