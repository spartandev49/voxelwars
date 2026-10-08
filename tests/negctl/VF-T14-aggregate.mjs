// NC-VF-T14-aggregate: the aggregate of a criterion ignores a changed check script: an old proof stays valid for an edited check.
export default {
  id: 'NC-VF-T14-aggregate', criterion: 'VF-T14',
  expectRed: ['VF-T14/aggregate_script_change_invalidates'],
  alsoRed: ['VF-T14/aggregate_worst_result_wins'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /if \(e\.scriptHash !== scriptHash \|\| e\.negctlHash !== c\.hash\) \{ pending\.push\(c\.nc\.id\); continue; \}/, '');
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
