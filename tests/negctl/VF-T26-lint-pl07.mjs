// NC-VF-T26-PL07: PL07 (section 14 owners) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL07', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL07'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL07\(x\) \{/, 'function PL07(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
