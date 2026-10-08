// NC-VF-T26-wbs-noregret: no_regret is no longer mandatory on every row
export default {
  id: 'NC-VF-T26-wbs-noregret', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/csv_errors'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /if \(!\/\^\(yes\|no\|true\|false\|1\|0\)\$\/i\.test\(o\.no_regret\)\) errors\.push/, 'if (false) errors.push');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
