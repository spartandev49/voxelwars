// NC-VF-T26-PL15: PL15 (negative control per criterion) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL15', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL15'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL15\(x\) \{/, 'function PL15(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
