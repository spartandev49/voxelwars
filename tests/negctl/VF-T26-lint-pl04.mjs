// NC-VF-T26-PL04: PL04 (section cross-references) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL04', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL04'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL04\(x\) \{/, 'function PL04(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
