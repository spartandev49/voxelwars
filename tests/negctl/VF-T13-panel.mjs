// NC-VF-T13-panel: a criterion judged by a panel or an agent is reported as plain PASS.
export default {
  id: 'NC-VF-T13-panel', criterion: 'VF-T13',
  expectRed: ['VF-T13/PANEL_never_plain_pass'],
  alsoRed: [],
  tier: 'T-fast', needs: [], costS: 4,
  mutate(c) {
  c.edit('tools/lib/criteria_merge.mjs', /l\.judge === 'panel' \|\| l\.judge === 'agent'/, 'false');
  },
  run: ['node', 'tests/verify/criteria.test.mjs'],
};
