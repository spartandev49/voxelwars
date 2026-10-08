// NC-VF-T26-wbs-isoweek: ISO weeks are computed from the wrong Thursday
export default {
  id: 'NC-VF-T26-wbs-isoweek', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/iso_week'],
  alsoRed: ['VF-T26-wbs/float_report_by_iso_week', 'VF-T26-wbs/cli_start_date_moves_the_float_weeks'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /t\.setUTCDate\(t\.getUTCDate\(\) \+ 4 - day\)/, 't.setUTCDate(t.getUTCDate() + 3 - day)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
