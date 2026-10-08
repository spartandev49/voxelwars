// NC-VF-T26-wbs-reviewer: the reviewer capacity is multiplied by 100: no queue ever forms
export default {
  id: 'NC-VF-T26-wbs-reviewer', criterion: 'VF-T26-wbs',
  expectRed: ['VF-T26-wbs/reviewer_queue_and_multiplicity'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/wbs.mjs', /const cap = mult \* \(\(24 \* R\.uPath\.high\) \/ h\);/, 'const cap = 100 * mult * ((24 * R.uPath.high) / h);');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
