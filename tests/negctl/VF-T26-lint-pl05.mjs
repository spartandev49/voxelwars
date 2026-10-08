// NC-VF-T26-PL05: PL05 (section 1 counts) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL05', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL05'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL05\(x\) \{/, 'function PL05(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
