// NC-VF-T26-strict: --strict stops failing on PENDING: an announced-but-missing input would pass the P0 exit.
export default {
  id: 'NC-VF-T26-strict', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/cli_exit_0_with_pending'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /\(o\.strict && r\.status === 'PENDING'\)/, 'false');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
