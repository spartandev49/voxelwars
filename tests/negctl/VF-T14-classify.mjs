// NC-VF-T14-classify: red-as-expected no longer requires every expectRed label: a check that stays green is accepted as proven.
export default {
  id: 'NC-VF-T14-classify', criterion: 'VF-T14',
  expectRed: ['VF-T14/classify_stayed_green'],
  alsoRed: ['VF-T14/classify_rules', 'VF-T14/cli_vacuous_control_exit_1', 'VF-T14/cli_store_keeps_stayed_green', 'VF-T14/cli_all_exit_1_when_one_control_is_vacuous', 'VF-T14/aggregate_worst_result_wins'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /if \(!missing\.length && !extra\.length\) return \{ result: 'red-as-expected'/, "if (!extra.length) return { result: 'red-as-expected'");
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
