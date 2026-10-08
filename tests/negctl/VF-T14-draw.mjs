// NC-VF-T14-draw: --draw ignores the seed: every QA agent would get the same eight controls.
export default {
  id: 'NC-VF-T14-draw', criterion: 'VF-T14',
  expectRed: ['VF-T14/select_draw_eight_distinct'],
  alsoRed: ['VF-T14/cli_draw_prints_eight_distinct_ids'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/lib/negctl.mjs', /return shuffle\(eligible, s\.seed\)\.slice\(0, s\.count\);/, "return shuffle(eligible, 'fixed').slice(0, s.count);");
  },
  run: ['node', 'tests/verify/negctl_runner.test.mjs'],
};
