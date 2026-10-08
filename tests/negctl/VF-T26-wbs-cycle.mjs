// NC-VF-T26-wbs-cycle: dependency cycles are no longer detected
export default {
  id: 'NC-VF-T26-wbs-cycle', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/cycle_detected'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /if \(order\.length !== wps\.length\)/, 'if (false)');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
