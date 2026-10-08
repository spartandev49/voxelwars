// NC-VF-73: PL12 (session arithmetic) is skipped: the rule answers PASS whatever the documents say (VF 3.13 row 73)
export default {
  id: 'NC-VF-73', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL12'],
  alsoRed: ['VF-T26-lint/one_defect_fails_one_rule', 'VF-T26-lint/cli_exit_1_on_fail'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL12\(x\) \{/, 'function PL12(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
