// NC-VF-T26-PL14: PL14 (traceability rows) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL14', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL14'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL14\(x\) \{/, 'function PL14(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
