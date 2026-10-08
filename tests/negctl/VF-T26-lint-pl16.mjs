// NC-VF-T26-PL16: PL16 (placeholder markers) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL16', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL16'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL16\(x\) \{/, 'function PL16(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
