// NC-VF-T26-PL08: PL08 (spec sections 1-7) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL08', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL08'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL08\(x\) \{/, 'function PL08(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
