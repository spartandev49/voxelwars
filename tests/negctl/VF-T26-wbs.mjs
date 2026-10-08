// NC-VF-T26-wbs: the critical path takes the shortest finish instead of the longest: the path-bound duration collapses.
export default {
  id: 'NC-VF-T26-wbs', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/critical_path'],
  alsoRed: ['VF-T26-wbs/path_bound_and_reported_duration', 'VF-T26-wbs/float', 'VF-T26-wbs/cli_report', 'VF-T26-wbs/float_report_by_iso_week', 'VF-T26-wbs/resource_bound_wins_on_a_wide_project', 'VF-T26-wbs/cli_json'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /const length = Math\.max\(0, \.\.\.ef\.values\(\)\);/, 'const length = Math.min(...ef.values());');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
