// NC-VF-T26-wbs-phaseorder: a WP may depend on a WP of a later phase
export default {
  id: 'NC-VF-T26-wbs-phaseorder', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/csv_pred_in_a_later_phase_is_an_error'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /if \(q && phaseIx\[q\.phase\] > phaseIx\[w\.phase\]\)/, 'if (false)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
