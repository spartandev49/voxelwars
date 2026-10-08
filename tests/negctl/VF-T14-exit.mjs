// NC-VF-T14-exit: the CLI exits 0 whatever the results: a vacuous control would no longer fail the gate step.
export default {
  id: 'NC-VF-T14-exit', criterion: 'VF-T14',
  expectRed: ['VF-T14/cli_vacuous_control_exit_1'],
  alsoRed: ['VF-T14/cli_all_exit_1_when_one_control_is_vacuous'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/negcontrols.mjs', /return okN === results\.length \? 0 : 1;/, 'return 0;');
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
