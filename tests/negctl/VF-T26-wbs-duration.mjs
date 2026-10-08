// NC-VF-T26-wbs-duration: the reported duration ignores the resource bound (path-bound only)
export default {
  id: 'NC-VF-T26-wbs-duration', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/resource_bound_wins_on_a_wide_project'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /Math\.max\(res\.path\.low, res\.resource\.high\)/, 'res.path.low');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
