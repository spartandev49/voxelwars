// NC-VF-T26-PL10: PL10 (E-FREEZE prefix sets) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL10', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL10'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL10\(x\) \{/, 'function PL10(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
