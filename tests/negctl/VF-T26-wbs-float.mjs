// NC-VF-T26-wbs-float: every WP gets float 0 (the float report lists nothing useful)
export default {
  id: 'NC-VF-T26-wbs-float', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/float'],
  alsoRed: ['VF-T26-wbs/float_report_by_iso_week'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /\[n, ls\.get\(n\) - es\.get\(n\)\]/, '[n, 0]');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
