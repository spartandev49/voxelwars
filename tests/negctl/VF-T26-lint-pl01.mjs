// NC-VF-T26-PL01: PL01 (S ids of plan, spec/M and manifest) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL01', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL01'],
  alsoRed: ['VF-T26-lint/missing_inputs_are_failures', 'VF-T26-lint/pending_is_reported_as_pending', 'VF-T26-lint/cli_exit_0_with_pending'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL01\(x\) \{/, 'function PL01(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
