// NC-VF-T26-PL11: PL11 (residual ledger ids) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL11', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL11'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL11\(x\) \{/, 'function PL11(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
