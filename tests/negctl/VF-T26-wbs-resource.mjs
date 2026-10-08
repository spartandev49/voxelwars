// NC-VF-T26-wbs-resource: resource-bound days use the wrong divisor (c x u low instead of high)
export default {
  id: 'NC-VF-T26-wbs-resource', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/resource_bound_formula'],
  alsoRed: ['VF-T26-wbs/cli_report', 'VF-T26-wbs/pasted_block_passes_PL12'],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /\(N \* h\) \/ R\.cxu\.high \/ 24/, '(N * h) / R.cxu.low / 24');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
