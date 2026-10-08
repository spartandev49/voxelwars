// NC-VF-T26-PL02: PL02 (ER and G ids) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL02', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL02'],
  alsoRed: ['VF-T26-lint/missing_inputs_are_failures'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL02\(x\) \{/, 'function PL02(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
