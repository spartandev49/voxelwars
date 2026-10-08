// NC-VF-T26-PL09: PL09 (ER script rows) is skipped: the rule answers PASS whatever the documents say
export default {
  id: 'NC-VF-T26-PL09', criterion: 'VF-T26-lint',
  expectRed: ['VF-T26-lint/PL09'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 12,
  mutate(c) {
  c.edit('tools/plan_lint.mjs', /function PL09\(x\) \{/, 'function PL09(x) { return pass("skipped");');
  },
  run: ['node', 'tests/verify/program_tools.test.mjs'],
};
