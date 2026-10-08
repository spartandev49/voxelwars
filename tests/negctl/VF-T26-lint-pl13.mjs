// NC-VF-T26-PL13: PL13 (cuts ids) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL13', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL13'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL13\(x\) \{/, 'function PL13(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
