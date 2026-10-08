// NC-VF-T26-PL03: PL03 (D codes) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL03', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL03'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL03\(x\) \{/, 'function PL03(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
